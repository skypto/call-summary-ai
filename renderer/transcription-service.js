// Transcription Service for Call Summary AI
// Handles Azure Batch Transcription, OpenAI Whisper, and Azure Whisper

class TranscriptionService {
    constructor() {
        this.activeJobs = new Map(); // Track active transcription jobs
        this.jobCallbacks = new Map(); // Store progress callbacks
        this.retryAttempts = new Map(); // Track retry attempts
        this.maxRetries = 3;
        this.pollInterval = 5000; // 5 seconds
    }

    /**
     * Main transcription method - routes to appropriate provider
     */
    async transcribeAudio(audioBlob, config, progressCallback = null) {
        const provider = config.transcription.provider;
        const providerConfig = config.transcription[provider];
        
        // Generate unique job ID
        const jobId = this.generateJobId();
        
        // Store progress callback
        if (progressCallback) {
            this.jobCallbacks.set(jobId, progressCallback);
        }
        
        try {
            // Update progress
            this.updateProgress(jobId, 'initializing', 0, 'Initializing transcription...');
            
            let result;
            switch (provider) {
                case 'azure-batch':
                    result = await this.transcribeWithAzureBatch(audioBlob, providerConfig, jobId);
                    break;
                case 'openai-whisper':
                    result = await this.transcribeWithOpenAIWhisper(audioBlob, providerConfig, jobId);
                    break;
                case 'azure-whisper':
                    result = await this.transcribeWithAzureWhisper(audioBlob, providerConfig, jobId);
                    break;
                default:
                    throw new Error(`Unsupported transcription provider: ${provider}`);
            }
            
            // Update progress to completed
            this.updateProgress(jobId, 'completed', 100, 'Transcription completed successfully');
            
            // Clean up
            this.cleanupJob(jobId);
            
            return {
                success: true,
                text: result.text,
                confidence: result.confidence || null,
                speakerDiarization: result.speakerDiarization || null,
                processingTime: result.processingTime || null,
                provider: provider,
                jobId: jobId
            };
            
        } catch (error) {
            console.error(`Transcription failed for job ${jobId}:`, error);
            
            // Update progress to failed
            this.updateProgress(jobId, 'failed', 0, `Transcription failed: ${error.message}`);
            
            // Clean up
            this.cleanupJob(jobId);
            
            throw error;
        }
    }

    /**
     * Azure Batch Transcription with Blob Storage integration
     */
    async transcribeWithAzureBatch(audioBlob, config, jobId) {
        if (!config.speechKey || !config.region) {
            throw new Error('Azure Speech Service key and region are required');
        }

        if (!config.storageAccount || !config.storageKey || !config.containerName) {
            throw new Error('Azure Blob Storage configuration is required for batch transcription');
        }

        const baseUrl = `https://${config.region}.api.cognitive.microsoft.com/speechtotext/v3.1`;
        
        try {
            // Step 1: Upload audio to Azure Blob Storage
            this.updateProgress(jobId, 'uploading', 10, 'Uploading audio to Azure Blob Storage...');
            const blobUrl = await this.uploadToAzureBlob(audioBlob, config, jobId);
            
            // Step 2: Create transcription job
            this.updateProgress(jobId, 'creating_job', 20, 'Creating transcription job...');
            const transcriptionJob = await this.createAzureTranscriptionJob(blobUrl, config, baseUrl);
            
            // Store job info
            this.activeJobs.set(jobId, {
                provider: 'azure-batch',
                azureJobUrl: transcriptionJob.self,
                config: config,
                baseUrl: baseUrl,
                startTime: Date.now()
            });
            
            // Step 3: Poll for completion
            this.updateProgress(jobId, 'processing', 30, 'Processing transcription...');
            const result = await this.pollAzureTranscriptionJob(jobId);
            
            return result;
            
        } catch (error) {
            console.error('Azure Batch Transcription error:', error);
            throw new Error(`Azure Batch Transcription failed: ${error.message}`);
        }
    }

    /**
     * Upload audio blob to Azure Blob Storage
     */
    async uploadToAzureBlob(audioBlob, config, jobId) {
        const { storageAccount, storageKey, containerName } = config;
        
        // Generate unique blob name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const blobName = `transcription-${jobId}-${timestamp}.wav`;
        
        // Create blob URL
        const blobUrl = `https://${storageAccount}.blob.core.windows.net/${containerName}/${blobName}`;
        
        try {
            // Convert blob to ArrayBuffer for upload
            const arrayBuffer = await audioBlob.arrayBuffer();
            
            // Create authorization header using Shared Key
            const authHeader = await this.createBlobAuthHeader(
                'PUT',
                storageAccount,
                storageKey,
                containerName,
                blobName,
                arrayBuffer.byteLength,
                'audio/wav'
            );
            
            // Upload to blob storage
            const response = await fetch(blobUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'audio/wav',
                    'Content-Length': arrayBuffer.byteLength.toString(),
                    'x-ms-blob-type': 'BlockBlob',
                    'x-ms-version': '2020-04-08'
                },
                body: arrayBuffer
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to upload to blob storage: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            return blobUrl;
            
        } catch (error) {
            console.error('Blob upload error:', error);
            throw new Error(`Failed to upload audio to Azure Blob Storage: ${error.message}`);
        }
    }

    /**
     * Create Azure Blob Storage authorization header
     */
    async createBlobAuthHeader(method, storageAccount, storageKey, containerName, blobName, contentLength, contentType) {
        const date = new Date().toUTCString();
        
        // Create string to sign
        const stringToSign = [
            method,
            '', // Content-Encoding
            '', // Content-Language
            contentLength.toString(), // Content-Length
            '', // Content-MD5
            contentType, // Content-Type
            '', // Date
            '', // If-Modified-Since
            '', // If-Match
            '', // If-None-Match
            '', // If-Unmodified-Since
            '', // Range
            `x-ms-blob-type:BlockBlob\nx-ms-version:2020-04-08`, // Canonicalized Headers
            `/${storageAccount}/${containerName}/${blobName}` // Canonicalized Resource
        ].join('\n');
        
        // Create signature
        const signature = await this.createHmacSignature(storageKey, stringToSign);
        
        return `SharedKey ${storageAccount}:${signature}`;
    }

    /**
     * Create HMAC-SHA256 signature for Azure authentication
     */
    async createHmacSignature(key, message) {
        // Decode base64 key
        const keyBuffer = Uint8Array.from(atob(key), c => c.charCodeAt(0));
        
        // Import key for HMAC
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        // Create signature
        const messageBuffer = new TextEncoder().encode(message);
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageBuffer);
        
        // Convert to base64
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }

    /**
     * Create Azure Speech transcription job
     */
    async createAzureTranscriptionJob(audioUrl, config, baseUrl) {
        const jobConfig = {
            contentUrls: [audioUrl],
            properties: {
                diarizationEnabled: config.enableDiarization || false,
                wordLevelTimestampsEnabled: true,
                punctuationMode: 'DictatedAndAutomatic',
                profanityFilterMode: 'Masked',
                addWordLevelTimestamps: true
            },
            locale: config.language || 'en-US',
            displayName: `Call Transcription ${new Date().toISOString()}`
        };

        // Add speaker diarization settings if enabled
        if (config.enableDiarization) {
            jobConfig.properties.diarization = {
                speakers: {
                    minCount: 1,
                    maxCount: 10
                }
            };
        }

        const response = await fetch(`${baseUrl}/transcriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': config.speechKey
            },
            body: JSON.stringify(jobConfig)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Failed to create transcription job: ${error.message || response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Poll Azure transcription job for completion
     */
    async pollAzureTranscriptionJob(jobId) {
        const jobInfo = this.activeJobs.get(jobId);
        if (!jobInfo) {
            throw new Error('Job not found');
        }

        const maxAttempts = 120; // 10 minutes with 5-second intervals
        let attempts = 0;
        let lastProgress = 30;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(jobInfo.azureJobUrl, {
                    headers: {
                        'Ocp-Apim-Subscription-Key': jobInfo.config.speechKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to check transcription status: ${response.statusText}`);
                }

                const job = await response.json();
                
                // Update progress based on status
                const progress = Math.min(30 + (attempts / maxAttempts) * 60, 90);
                this.updateProgress(jobId, 'processing', progress, `Processing... Status: ${job.status}`);

                if (job.status === 'Succeeded') {
                    // Get the transcription results
                    this.updateProgress(jobId, 'downloading', 95, 'Downloading transcription results...');
                    
                    const resultsResponse = await fetch(job.links.files, {
                        headers: {
                            'Ocp-Apim-Subscription-Key': jobInfo.config.speechKey
                        }
                    });

                    if (!resultsResponse.ok) {
                        throw new Error('Failed to get transcription files');
                    }

                    const files = await resultsResponse.json();
                    const transcriptFile = files.values.find(f => f.kind === 'Transcription');
                    
                    if (!transcriptFile) {
                        throw new Error('Transcription file not found in results');
                    }

                    const transcriptResponse = await fetch(transcriptFile.links.contentUrl);
                    if (!transcriptResponse.ok) {
                        throw new Error('Failed to download transcription content');
                    }

                    const transcript = await transcriptResponse.json();
                    const processingTime = Date.now() - jobInfo.startTime;
                    
                    return this.formatAzureTranscript(transcript, processingTime);
                    
                } else if (job.status === 'Failed') {
                    const errorMessage = job.properties?.error?.message || 'Unknown error';
                    throw new Error(`Transcription failed: ${errorMessage}`);
                } else if (job.status === 'Cancelled') {
                    throw new Error('Transcription was cancelled');
                }

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, this.pollInterval));
                attempts++;
                
            } catch (error) {
                if (error.message.includes('Transcription failed') || error.message.includes('cancelled')) {
                    throw error; // Don't retry these errors
                }
                
                console.warn(`Polling attempt ${attempts + 1} failed:`, error.message);
                attempts++;
                
                if (attempts >= maxAttempts) {
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, this.pollInterval));
            }
        }

        throw new Error('Transcription timed out after 10 minutes');
    }

    /**
     * Format Azure transcript results
     */
    formatAzureTranscript(transcript, processingTime) {
        let formattedText = '';
        let confidence = 0;
        let totalPhrases = 0;
        const speakerSegments = [];
        
        if (transcript.recognizedPhrases && transcript.recognizedPhrases.length > 0) {
            transcript.recognizedPhrases.forEach(phrase => {
                if (phrase.nBest && phrase.nBest[0]) {
                    const best = phrase.nBest[0];
                    
                    // Add to confidence calculation
                    if (best.confidence !== undefined) {
                        confidence += best.confidence;
                        totalPhrases++;
                    }
                    
                    // Format with speaker if available
                    if (best.speaker !== undefined) {
                        formattedText += `Speaker ${best.speaker}: `;
                        
                        // Store speaker segment for diarization
                        speakerSegments.push({
                            speaker: `Speaker ${best.speaker}`,
                            text: best.display,
                            startTime: phrase.offset || 0,
                            endTime: (phrase.offset || 0) + (phrase.duration || 0)
                        });
                    }
                    
                    formattedText += best.display + '\n\n';
                }
            });
        }

        // Calculate average confidence
        const avgConfidence = totalPhrases > 0 ? confidence / totalPhrases : null;

        return {
            text: formattedText.trim(),
            confidence: avgConfidence,
            speakerDiarization: speakerSegments.length > 0 ? speakerSegments : null,
            processingTime: processingTime
        };
    } 
   /**
     * OpenAI Whisper transcription
     */
    async transcribeWithOpenAIWhisper(audioBlob, config, jobId) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }

        const startTime = Date.now();
        
        try {
            this.updateProgress(jobId, 'uploading', 20, 'Uploading audio to OpenAI...');
            
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', 'whisper-1');
            
            if (config.language && config.language !== 'auto') {
                formData.append('language', config.language);
            }
            
            // Add response format for timestamps if needed
            formData.append('response_format', 'verbose_json');
            formData.append('timestamp_granularities[]', 'word');

            this.updateProgress(jobId, 'processing', 50, 'Processing with OpenAI Whisper...');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                throw new Error(`OpenAI Whisper API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const processingTime = Date.now() - startTime;

            return {
                text: data.text,
                confidence: null, // OpenAI doesn't provide confidence scores
                speakerDiarization: null, // OpenAI Whisper doesn't support speaker diarization
                processingTime: processingTime
            };
            
        } catch (error) {
            console.error('OpenAI Whisper transcription error:', error);
            throw new Error(`OpenAI Whisper transcription failed: ${error.message}`);
        }
    }

    /**
     * Azure OpenAI Whisper transcription
     */
    async transcribeWithAzureWhisper(audioBlob, config, jobId) {
        if (!config.apiKey || !config.endpoint || !config.deployment) {
            throw new Error('Azure OpenAI API key, endpoint, and deployment are required');
        }

        const startTime = Date.now();
        
        try {
            this.updateProgress(jobId, 'uploading', 20, 'Uploading audio to Azure OpenAI...');
            
            // Normalize endpoint URL
            const normalizedEndpoint = config.endpoint.replace(/\/+$/, '');
            const url = `${normalizedEndpoint}/openai/deployments/${config.deployment}/audio/transcriptions?api-version=2024-02-15-preview`;
            
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', 'whisper-1');
            
            if (config.language && config.language !== 'auto') {
                formData.append('language', config.language);
            }
            
            // Add response format for timestamps
            formData.append('response_format', 'verbose_json');

            this.updateProgress(jobId, 'processing', 50, 'Processing with Azure OpenAI Whisper...');

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'api-key': config.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                throw new Error(`Azure Whisper API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const processingTime = Date.now() - startTime;

            return {
                text: data.text,
                confidence: null, // Azure Whisper doesn't provide confidence scores
                speakerDiarization: null, // Azure Whisper doesn't support speaker diarization
                processingTime: processingTime
            };
            
        } catch (error) {
            console.error('Azure Whisper transcription error:', error);
            throw new Error(`Azure Whisper transcription failed: ${error.message}`);
        }
    }

    /**
     * Cancel active transcription job
     */
    async cancelTranscription(jobId) {
        const jobInfo = this.activeJobs.get(jobId);
        if (!jobInfo) {
            return { success: false, message: 'Job not found' };
        }

        try {
            if (jobInfo.provider === 'azure-batch') {
                // Cancel Azure batch job
                const response = await fetch(jobInfo.azureJobUrl, {
                    method: 'DELETE',
                    headers: {
                        'Ocp-Apim-Subscription-Key': jobInfo.config.speechKey
                    }
                });
                
                if (response.ok) {
                    this.updateProgress(jobId, 'cancelled', 0, 'Transcription cancelled by user');
                    this.cleanupJob(jobId);
                    return { success: true, message: 'Transcription cancelled successfully' };
                }
            }
            
            // For other providers, just clean up locally
            this.updateProgress(jobId, 'cancelled', 0, 'Transcription cancelled by user');
            this.cleanupJob(jobId);
            return { success: true, message: 'Transcription cancelled' };
            
        } catch (error) {
            console.error('Error cancelling transcription:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Retry failed transcription
     */
    async retryTranscription(jobId, audioBlob, config) {
        const retryCount = this.retryAttempts.get(jobId) || 0;
        
        if (retryCount >= this.maxRetries) {
            throw new Error(`Maximum retry attempts (${this.maxRetries}) exceeded for job ${jobId}`);
        }
        
        // Increment retry count
        this.retryAttempts.set(jobId, retryCount + 1);
        
        // Clean up previous job state
        this.cleanupJob(jobId);
        
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.transcribeAudio(audioBlob, config, this.jobCallbacks.get(jobId));
    }

    /**
     * Get transcription status
     */
    getTranscriptionStatus(jobId) {
        const jobInfo = this.activeJobs.get(jobId);
        if (!jobInfo) {
            return { status: 'not_found', message: 'Job not found' };
        }
        
        return {
            status: jobInfo.status || 'processing',
            progress: jobInfo.progress || 0,
            message: jobInfo.message || 'Processing...',
            provider: jobInfo.provider,
            startTime: jobInfo.startTime
        };
    }

    /**
     * List all active transcription jobs
     */
    getActiveJobs() {
        const jobs = [];
        for (const [jobId, jobInfo] of this.activeJobs.entries()) {
            jobs.push({
                jobId,
                status: jobInfo.status || 'processing',
                progress: jobInfo.progress || 0,
                message: jobInfo.message || 'Processing...',
                provider: jobInfo.provider,
                startTime: jobInfo.startTime
            });
        }
        return jobs;
    }

    /**
     * Validate transcription configuration
     */
    validateConfig(config) {
        const errors = [];
        
        if (!config.transcription?.provider) {
            errors.push('Transcription provider must be selected');
            return { isValid: false, errors };
        }
        
        const provider = config.transcription.provider;
        const providerConfig = config.transcription[provider];
        
        switch (provider) {
            case 'azure-batch':
                if (!providerConfig?.speechKey) {
                    errors.push('Azure Speech Service key is required');
                }
                if (!providerConfig?.region) {
                    errors.push('Azure Speech Service region is required');
                }
                if (!providerConfig?.storageAccount) {
                    errors.push('Azure Storage Account name is required for batch transcription');
                }
                if (!providerConfig?.storageKey) {
                    errors.push('Azure Storage Account key is required for batch transcription');
                }
                if (!providerConfig?.containerName) {
                    errors.push('Azure Storage Container name is required for batch transcription');
                }
                break;
                
            case 'openai-whisper':
                if (!providerConfig?.apiKey) {
                    errors.push('OpenAI API key is required');
                }
                break;
                
            case 'azure-whisper':
                if (!providerConfig?.apiKey) {
                    errors.push('Azure OpenAI API key is required');
                }
                if (!providerConfig?.endpoint) {
                    errors.push('Azure OpenAI endpoint is required');
                }
                if (!providerConfig?.deployment) {
                    errors.push('Azure OpenAI Whisper deployment name is required');
                }
                break;
                
            default:
                errors.push(`Unsupported transcription provider: ${provider}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Test transcription provider connection
     */
    async testConnection(config) {
        const validation = this.validateConfig(config);
        if (!validation.isValid) {
            return {
                success: false,
                message: 'Configuration validation failed: ' + validation.errors.join(', ')
            };
        }
        
        const provider = config.transcription.provider;
        const providerConfig = config.transcription[provider];
        
        try {
            switch (provider) {
                case 'azure-batch':
                    return await this.testAzureBatchConnection(providerConfig);
                case 'openai-whisper':
                    return await this.testOpenAIConnection(providerConfig);
                case 'azure-whisper':
                    return await this.testAzureWhisperConnection(providerConfig);
                default:
                    return {
                        success: false,
                        message: `Connection test not implemented for provider: ${provider}`
                    };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Test Azure Batch Transcription connection
     */
    async testAzureBatchConnection(config) {
        try {
            // Test Speech Service connection
            const baseUrl = `https://${config.region}.api.cognitive.microsoft.com/speechtotext/v3.1`;
            const response = await fetch(`${baseUrl}/transcriptions`, {
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.speechKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`Speech Service connection failed: ${response.statusText}`);
            }
            
            // Test Blob Storage connection
            const storageUrl = `https://${config.storageAccount}.blob.core.windows.net/${config.containerName}?restype=container`;
            const authHeader = await this.createBlobAuthHeader(
                'GET',
                config.storageAccount,
                config.storageKey,
                config.containerName,
                '',
                0,
                ''
            );
            
            const storageResponse = await fetch(storageUrl, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'x-ms-version': '2020-04-08'
                }
            });
            
            if (!storageResponse.ok) {
                throw new Error(`Blob Storage connection failed: ${storageResponse.statusText}`);
            }
            
            return {
                success: true,
                message: 'Azure Batch Transcription connection successful'
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Azure Batch connection test failed: ${error.message}`
            };
        }
    }

    /**
     * Test OpenAI Whisper connection
     */
    async testOpenAIConnection(config) {
        try {
            // Test with a minimal request to models endpoint
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                throw new Error(error.error?.message || response.statusText);
            }
            
            return {
                success: true,
                message: 'OpenAI Whisper connection successful'
            };
            
        } catch (error) {
            return {
                success: false,
                message: `OpenAI connection test failed: ${error.message}`
            };
        }
    }

    /**
     * Test Azure OpenAI Whisper connection
     */
    async testAzureWhisperConnection(config) {
        try {
            const normalizedEndpoint = config.endpoint.replace(/\/+$/, '');
            const url = `${normalizedEndpoint}/openai/deployments?api-version=2024-02-15-preview`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'api-key': config.apiKey
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                throw new Error(error.error?.message || response.statusText);
            }
            
            const data = await response.json();
            const hasWhisperDeployment = data.data?.some(d => d.id === config.deployment);
            
            if (!hasWhisperDeployment) {
                throw new Error(`Whisper deployment '${config.deployment}' not found`);
            }
            
            return {
                success: true,
                message: 'Azure OpenAI Whisper connection successful'
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Azure OpenAI connection test failed: ${error.message}`
            };
        }
    }

    // Utility methods
    generateJobId() {
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    updateProgress(jobId, status, progress, message) {
        const jobInfo = this.activeJobs.get(jobId);
        if (jobInfo) {
            jobInfo.status = status;
            jobInfo.progress = progress;
            jobInfo.message = message;
        }
        
        const callback = this.jobCallbacks.get(jobId);
        if (callback) {
            callback({
                jobId,
                status,
                progress,
                message
            });
        }
    }

    cleanupJob(jobId) {
        this.activeJobs.delete(jobId);
        this.jobCallbacks.delete(jobId);
        this.retryAttempts.delete(jobId);
    }
}

// Export for use in other modules
window.TranscriptionService = TranscriptionService;