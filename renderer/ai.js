// AI integration for Call Summary AI

class AIService {
    constructor() {
        this.apiEndpoints = {
            openai: 'https://api.openai.com/v1/chat/completions',
            gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
            whisper: 'https://api.openai.com/v1/audio/transcriptions'
        };
    }

    async generateSummary(transcript, config) {
        const provider = config.summarization.provider;
        const providerConfig = config.summarization[provider];
        
        const prompt = this.createSummaryPrompt(transcript);
        
        switch (provider) {
            case 'openai':
                return await this.callOpenAI(prompt, providerConfig);
            case 'azure-openai':
                return await this.callAzureOpenAI(prompt, providerConfig);
            case 'gemini':
                return await this.callGemini(prompt, providerConfig);
            case 'deepseek':
                return await this.callDeepSeek(prompt, providerConfig);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    createSummaryPrompt(transcript) {
        return `Please analyze this call transcript and provide a comprehensive summary:

TRANSCRIPT:
${transcript}

Please provide a structured summary with the following sections:

## 📋 Call Overview
- Brief description of the call purpose and participants

## 🎯 Key Topics Discussed
- Main topics covered during the call
- Important points raised by each participant

## ✅ Action Items
- Specific tasks assigned with responsible parties
- Deadlines and deliverables mentioned

## 🔄 Next Steps
- Follow-up actions required
- Scheduled meetings or checkpoints

## 📊 Decisions Made
- Key decisions reached during the call
- Any approvals or rejections

## ⚠️ Issues & Blockers
- Problems identified that need resolution
- Dependencies or blockers mentioned

Please be concise but comprehensive, focusing on actionable information.`;
    }

    async callOpenAI(prompt, config, retryCount = 0) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }

        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        try {
            const response = await fetch(this.apiEndpoints.openai, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at analyzing business calls and creating structured summaries. Focus on actionable insights and clear organization.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                
                // Check if this is a retryable error
                if (this.isRetryableError(response.status) && retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
                    console.warn(`OpenAI API error ${response.status}, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callOpenAI(prompt, config, retryCount + 1);
                }
                
                throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI API');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error
                if (retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callOpenAI(prompt, config, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async callAzureOpenAI(prompt, config, retryCount = 0) {
        if (!config.apiKey || !config.endpoint || !config.deployment) {
            throw new Error('Azure OpenAI requires API key, endpoint, and deployment name');
        }

        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            // Normalize endpoint URL to avoid double slashes
            const normalizedEndpoint = config.endpoint.replace(/\/+$/, '');
            const url = `${normalizedEndpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=2024-02-15-preview`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': config.apiKey
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at analyzing business calls and creating structured summaries. Focus on actionable insights and clear organization.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                
                // Check if this is a retryable error
                if (this.isRetryableError(response.status) && retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Azure OpenAI API error ${response.status}, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callAzureOpenAI(prompt, config, retryCount + 1);
                }
                
                throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from Azure OpenAI API');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error
                if (retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callAzureOpenAI(prompt, config, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async callGemini(prompt, config, retryCount = 0) {
        if (!config.apiKey) {
            throw new Error('Gemini API key is required');
        }

        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            const model = config.model || 'gemini-1.5-flash';
            const url = `${this.apiEndpoints.gemini}/${model}:generateContent?key=${config.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an expert at analyzing business calls and creating structured summaries. Focus on actionable insights and clear organization.\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 1500
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                
                // Check if this is a retryable error
                if (this.isRetryableError(response.status) && retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Gemini API error ${response.status}, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callGemini(prompt, config, retryCount + 1);
                }
                
                throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }

            return data.candidates[0].content.parts[0].text;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error
                if (retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callGemini(prompt, config, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async callDeepSeek(prompt, config, retryCount = 0) {
        if (!config.apiKey) {
            throw new Error('DeepSeek API key is required');
        }

        const maxRetries = 3;
        const baseDelay = 1000;

        try {
            const endpoint = config.endpoint || 'https://api.deepseek.com/v1';
            const url = `${endpoint}/chat/completions`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at analyzing business calls and creating structured summaries. Focus on actionable insights and clear organization.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
                
                // Check if this is a retryable error
                if (this.isRetryableError(response.status) && retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`DeepSeek API error ${response.status}, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callDeepSeek(prompt, config, retryCount + 1);
                }
                
                throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from DeepSeek API');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error
                if (retryCount < maxRetries) {
                    const delay = baseDelay * Math.pow(2, retryCount);
                    console.warn(`Network error, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.callDeepSeek(prompt, config, retryCount + 1);
                }
            }
            throw error;
        }
    }

    async testConnection(config) {
        const testPrompt = "This is a test message to verify API connectivity. Please respond with 'API connection successful'.";
        
        try {
            const response = await this.generateSummary(testPrompt, config);
            return {
                success: true,
                message: 'API connection successful',
                response: response.substring(0, 100) + '...'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async transcribeAudio(audioBlob, config, progressCallback = null) {
        // Use the new TranscriptionService for all transcription operations
        if (!window.TranscriptionService) {
            throw new Error('TranscriptionService not available. Please ensure transcription-service.js is loaded.');
        }
        
        const transcriptionService = new window.TranscriptionService();
        return await transcriptionService.transcribeAudio(audioBlob, config, progressCallback);
    }

    // Legacy method for backward compatibility - delegates to TranscriptionService
    async transcribeWithAzureWhisper(audioBlob, config) {
        if (!window.TranscriptionService) {
            throw new Error('TranscriptionService not available. Please ensure transcription-service.js is loaded.');
        }
        
        const transcriptionService = new window.TranscriptionService();
        return await transcriptionService.transcribeWithAzureWhisper(audioBlob, config);
    }

    // Legacy method for backward compatibility - delegates to TranscriptionService
    async transcribeWithWhisper(audioBlob, apiKey, language = 'auto') {
        if (!window.TranscriptionService) {
            throw new Error('TranscriptionService not available. Please ensure transcription-service.js is loaded.');
        }
        
        const config = { apiKey, language };
        const transcriptionService = new window.TranscriptionService();
        return await transcriptionService.transcribeWithOpenAIWhisper(audioBlob, config);
    }

    // Transcription methods moved to TranscriptionService
    // This class now focuses on text analysis and summarization

    validateConfig(config) {
        const errors = [];

        // Validate transcription config
        if (!config.transcription?.provider) {
            errors.push('Transcription provider must be selected');
        } else {
            const transcriptionProvider = config.transcription.provider;
            const transcriptionConfig = config.transcription[transcriptionProvider];

            switch (transcriptionProvider) {
                case 'azure-batch':
                    if (!transcriptionConfig?.speechKey) errors.push('Azure Speech Service key is required');
                    if (!transcriptionConfig?.region) errors.push('Azure Speech Service region is required');
                    break;
                case 'openai-whisper':
                    if (!transcriptionConfig?.apiKey) errors.push('OpenAI API key is required for Whisper');
                    break;
                case 'azure-whisper':
                    if (!transcriptionConfig?.apiKey) errors.push('Azure OpenAI API key is required');
                    if (!transcriptionConfig?.endpoint) errors.push('Azure OpenAI endpoint is required');
                    if (!transcriptionConfig?.deployment) errors.push('Azure OpenAI Whisper deployment is required');
                    break;
            }
        }

        // Validate summarization config
        if (!config.summarization?.provider) {
            errors.push('Summarization provider must be selected');
        } else {
            const summaryProvider = config.summarization.provider;
            const summaryConfig = config.summarization[summaryProvider];

            switch (summaryProvider) {
                case 'openai':
                    if (!summaryConfig?.apiKey) errors.push('OpenAI API key is required');
                    break;
                case 'azure-openai':
                    if (!summaryConfig?.apiKey) errors.push('Azure OpenAI API key is required');
                    if (!summaryConfig?.endpoint) errors.push('Azure OpenAI endpoint is required');
                    if (!summaryConfig?.deployment) errors.push('Azure OpenAI deployment is required');
                    break;
                case 'gemini':
                    if (!summaryConfig?.apiKey) errors.push('Gemini API key is required');
                    break;
                case 'deepseek':
                    if (!summaryConfig?.apiKey) errors.push('DeepSeek API key is required');
                    break;
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getModelInfo(provider, model) {
        const modelInfo = {
            openai: {
                'gpt-4o-mini': {
                    name: 'GPT-4o-mini',
                    description: 'Fast and cost-effective, great for call summaries',
                    costPer1k: '$0.00015',
                    maxTokens: 128000
                },
                'gpt-4o': {
                    name: 'GPT-4o',
                    description: 'Most capable model, best quality summaries',
                    costPer1k: '$0.005',
                    maxTokens: 128000
                },
                'gpt-3.5-turbo': {
                    name: 'GPT-3.5 Turbo',
                    description: 'Good balance of speed and quality',
                    costPer1k: '$0.0005',
                    maxTokens: 16385
                }
            },
            azure: {
                'gpt-4o': {
                    name: 'GPT-4o (Azure)',
                    description: 'Enterprise-grade GPT-4o deployment',
                    maxTokens: 128000
                },
                'gpt-35-turbo': {
                    name: 'GPT-3.5 Turbo (Azure)',
                    description: 'Enterprise-grade GPT-3.5 deployment',
                    maxTokens: 16385
                }
            },
            gemini: {
                'gemini-1.5-flash': {
                    name: 'Gemini 1.5 Flash',
                    description: 'Fast and efficient, optimized for speed',
                    costPer1k: '$0.00035',
                    maxTokens: 1000000
                },
                'gemini-1.5-pro': {
                    name: 'Gemini 1.5 Pro',
                    description: 'Most capable Gemini model',
                    costPer1k: '$0.0035',
                    maxTokens: 2000000
                },
                'gemini-pro': {
                    name: 'Gemini Pro',
                    description: 'Previous generation Gemini model',
                    costPer1k: '$0.0005',
                    maxTokens: 32768
                }
            }
        };

        return modelInfo[provider]?.[model] || {
            name: model,
            description: 'Model information not available',
            maxTokens: 'Unknown'
        };
    }

    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    estimateCost(provider, model, inputTokens, outputTokens = 500) {
        const pricing = {
            openai: {
                'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
                'gpt-4o': { input: 0.005, output: 0.015 },
                'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
            },
            gemini: {
                'gemini-1.5-flash': { input: 0.00035, output: 0.00105 },
                'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
                'gemini-pro': { input: 0.0005, output: 0.0015 }
            }
        };

        const modelPricing = pricing[provider]?.[model];
        if (!modelPricing) return null;

        const inputCost = (inputTokens / 1000) * modelPricing.input;
        const outputCost = (outputTokens / 1000) * modelPricing.output;

        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            currency: 'USD'
        };
    }

    /**
     * Determine if an HTTP status code indicates a retryable error
     */
    isRetryableError(statusCode) {
        // Retry on server errors (5xx) and rate limiting (429)
        return statusCode >= 500 || statusCode === 429;
    }

    /**
     * Detect language from transcript text
     */
    detectLanguage(text) {
        // Simple language detection based on common patterns
        // In a production app, you might use a proper language detection library
        
        const patterns = {
            'en': /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
            'es': /\b(el|la|los|las|y|o|pero|en|de|con|por|para)\b/gi,
            'fr': /\b(le|la|les|et|ou|mais|dans|de|avec|par|pour)\b/gi,
            'de': /\b(der|die|das|und|oder|aber|in|von|mit|für)\b/gi,
            'it': /\b(il|la|i|le|e|o|ma|in|di|con|per)\b/gi,
            'pt': /\b(o|a|os|as|e|ou|mas|em|de|com|por|para)\b/gi
        };

        let maxMatches = 0;
        let detectedLanguage = 'en'; // Default to English

        for (const [lang, pattern] of Object.entries(patterns)) {
            const matches = (text.match(pattern) || []).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedLanguage = lang;
            }
        }

        return detectedLanguage;
    }

    /**
     * Get supported languages for transcription providers
     */
    getSupportedLanguages(provider) {
        const languages = {
            'azure-batch': [
                { code: 'en-US', name: 'English (US)' },
                { code: 'en-GB', name: 'English (UK)' },
                { code: 'es-ES', name: 'Spanish (Spain)' },
                { code: 'es-MX', name: 'Spanish (Mexico)' },
                { code: 'fr-FR', name: 'French (France)' },
                { code: 'de-DE', name: 'German (Germany)' },
                { code: 'it-IT', name: 'Italian (Italy)' },
                { code: 'pt-BR', name: 'Portuguese (Brazil)' },
                { code: 'ja-JP', name: 'Japanese (Japan)' },
                { code: 'ko-KR', name: 'Korean (Korea)' },
                { code: 'zh-CN', name: 'Chinese (Simplified)' }
            ],
            'openai-whisper': [
                { code: 'auto', name: 'Auto-detect' },
                { code: 'en', name: 'English' },
                { code: 'es', name: 'Spanish' },
                { code: 'fr', name: 'French' },
                { code: 'de', name: 'German' },
                { code: 'it', name: 'Italian' },
                { code: 'pt', name: 'Portuguese' },
                { code: 'ja', name: 'Japanese' },
                { code: 'ko', name: 'Korean' },
                { code: 'zh', name: 'Chinese' }
            ],
            'azure-whisper': [
                { code: 'auto', name: 'Auto-detect' },
                { code: 'en', name: 'English' },
                { code: 'es', name: 'Spanish' },
                { code: 'fr', name: 'French' },
                { code: 'de', name: 'German' },
                { code: 'it', name: 'Italian' },
                { code: 'pt', name: 'Portuguese' },
                { code: 'ja', name: 'Japanese' },
                { code: 'ko', name: 'Korean' },
                { code: 'zh', name: 'Chinese' }
            ]
        };

        return languages[provider] || languages['openai-whisper'];
    }
}

// Add AI service to app
window.app = window.app || {};
window.app.getAISummary = async function(transcript) {
    const aiService = new AIService();
    return await aiService.generateSummary(transcript, this.currentConfig);
};

// Export for use in other modules
window.AIService = AIService;