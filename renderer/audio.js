// Audio processing utilities for Call Summary AI

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.isAnalyzing = false;
        this.permissionStatus = 'unknown';
        this.deviceCache = null;
        this.deviceChangeListeners = [];
        this.fallbackDevices = [
            { deviceId: 'default', label: 'Default Microphone', kind: 'audioinput' },
            { deviceId: 'communications', label: 'Communications Device', kind: 'audioinput' }
        ];
        
        // Listen for device changes
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', () => {
                this.handleDeviceChange();
            });
        }
    }

    async initializeAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            return false;
        }
    }

    async checkPermissionStatus() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return { status: 'unsupported', message: 'Media devices API not supported' };
            }

            // Try to get permission status if available
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const permission = await navigator.permissions.query({ name: 'microphone' });
                    this.permissionStatus = permission.state;
                    return { status: permission.state, message: `Permission ${permission.state}` };
                } catch (e) {
                    // Fallback if permission query fails
                }
            }

            // Fallback: Try to enumerate devices to check permission
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasLabels = devices.some(device => device.label && device.label.trim() !== '');
            
            if (hasLabels) {
                this.permissionStatus = 'granted';
                return { status: 'granted', message: 'Permission granted' };
            } else {
                this.permissionStatus = 'prompt';
                return { status: 'prompt', message: 'Permission required' };
            }
        } catch (error) {
            this.permissionStatus = 'denied';
            return { status: 'denied', message: error.message };
        }
    }

    async requestPermissions(options = {}) {
        const constraints = {
            audio: {
                sampleRate: options.sampleRate || 44100,
                channelCount: options.channels || 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        try {
            console.log('Requesting microphone permission with constraints:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Test the stream briefly
            const tracks = stream.getTracks();
            if (tracks.length === 0) {
                throw new Error('No audio tracks available');
            }

            // Verify the track is active
            const audioTrack = tracks[0];
            if (audioTrack.readyState !== 'live') {
                throw new Error('Audio track is not active');
            }

            console.log('Permission granted, audio track active:', {
                label: audioTrack.label,
                kind: audioTrack.kind,
                readyState: audioTrack.readyState,
                enabled: audioTrack.enabled
            });

            // Stop the test stream
            tracks.forEach(track => track.stop());
            
            this.permissionStatus = 'granted';
            return { success: true, message: 'Permission granted successfully' };
            
        } catch (error) {
            console.error('Permission request failed:', error);
            this.permissionStatus = 'denied';
            
            let userMessage = 'Permission denied';
            if (error.name === 'NotAllowedError') {
                userMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            } else if (error.name === 'NotFoundError') {
                userMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                userMessage = 'Microphone is already in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                userMessage = 'Microphone does not support the requested settings.';
            } else if (error.name === 'SecurityError') {
                userMessage = 'Microphone access blocked due to security restrictions.';
            }
            
            return { success: false, message: userMessage, error: error.name };
        }
    }

    async getAudioDevices(forceRefresh = false) {
        try {
            // Return cached devices if available and not forcing refresh
            if (!forceRefresh && this.deviceCache) {
                return this.deviceCache;
            }

            console.log('Enumerating audio devices...');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                console.warn('Device enumeration not supported, using fallback devices');
                return this.getFallbackDevices();
            }

            // Check permission status first
            const permissionCheck = await this.checkPermissionStatus();
            console.log('Permission status:', permissionCheck);

            // Enumerate devices
            let devices = await navigator.mediaDevices.enumerateDevices();
            console.log('Raw devices:', devices);

            // If no labels and permission not granted, request permission
            const hasLabels = devices.some(device => device.label && device.label.trim() !== '');
            if (!hasLabels && this.permissionStatus !== 'granted') {
                console.log('No device labels found, requesting permission...');
                const permissionResult = await this.requestPermissions();
                
                if (permissionResult.success) {
                    // Re-enumerate after permission granted
                    devices = await navigator.mediaDevices.enumerateDevices();
                    console.log('Devices after permission:', devices);
                } else {
                    console.warn('Permission denied, using fallback devices');
                    return this.getFallbackDevices();
                }
            }

            // Filter and validate devices
            const inputDevices = devices
                .filter(device => device.kind === 'audioinput')
                .map(device => this.validateDevice(device));
                
            const outputDevices = devices
                .filter(device => device.kind === 'audiooutput')
                .map(device => this.validateDevice(device));

            // Add fallback devices if no real devices found
            if (inputDevices.length === 0) {
                console.log('No input devices found, adding fallback devices');
                inputDevices.push(...this.fallbackDevices);
            }

            const result = {
                input: inputDevices,
                output: outputDevices,
                timestamp: Date.now()
            };

            // Cache the result
            this.deviceCache = result;
            
            console.log('Final device list:', result);
            return result;
            
        } catch (error) {
            console.error('Error getting audio devices:', error);
            
            // Return fallback devices on error
            const fallback = this.getFallbackDevices();
            console.log('Using fallback devices due to error:', fallback);
            return fallback;
        }
    }

    validateDevice(device) {
        return {
            deviceId: device.deviceId || 'unknown',
            label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} (${device.deviceId.substring(0, 8)})`,
            kind: device.kind,
            groupId: device.groupId || null
        };
    }

    getFallbackDevices() {
        return {
            input: [...this.fallbackDevices],
            output: [
                { deviceId: 'default', label: 'Default Speakers', kind: 'audiooutput' },
                { deviceId: 'communications', label: 'Communications Device', kind: 'audiooutput' }
            ],
            timestamp: Date.now(),
            fallback: true
        };
    }

    handleDeviceChange() {
        console.log('Device change detected, clearing cache');
        this.deviceCache = null;
        
        // Notify listeners
        this.deviceChangeListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in device change listener:', error);
            }
        });
    }

    onDeviceChange(callback) {
        this.deviceChangeListeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.deviceChangeListeners.indexOf(callback);
            if (index > -1) {
                this.deviceChangeListeners.splice(index, 1);
            }
        };
    }

    async createRecordingStream(deviceId, options = {}) {
        const constraints = {
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                sampleRate: options.sampleRate || 44100,
                channelCount: options.channels || 2,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Ensure audio context is properly initialized before connecting
            if (!this.audioContext || this.audioContext.state === 'closed') {
                await this.initializeAudioContext();
            }
            
            // Resume audio context if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Connect to analyser for visualization
            if (this.audioContext && this.analyser && this.audioContext.state === 'running') {
                try {
                    const source = this.audioContext.createMediaStreamSource(stream);
                    source.connect(this.analyser);
                    console.log('Audio stream connected to analyser for visualization');
                } catch (connectionError) {
                    console.warn('Failed to connect stream to analyser:', connectionError);
                    // Don't fail the entire function, just log the warning
                }
            }
            
            return stream;
        } catch (error) {
            console.error('Error creating recording stream:', error);
            throw new Error('Failed to access microphone: ' + error.message);
        }
    }

    startVisualization(canvas, options = {}) {
        if (!this.analyser || !canvas) return;

        // Ensure audio context is running
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(error => {
                console.warn('Failed to resume audio context for visualization:', error);
            });
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Visualization options
        const visualizationType = options.type || 'waveform'; // 'waveform', 'frequency', 'level'
        const colorScheme = options.colorScheme || 'blue';
        const smoothing = options.smoothing !== undefined ? options.smoothing : 0.8;
        
        this.analyser.smoothingTimeConstant = smoothing;
        this.isAnalyzing = true;

        // Store previous frame data for smoother animation
        let previousData = new Array(this.dataArray.length).fill(0);

        const draw = () => {
            if (!this.isAnalyzing) return;

            requestAnimationFrame(draw);

            // Clear canvas
            ctx.fillStyle = options.backgroundColor || '#1e293b';
            ctx.fillRect(0, 0, width, height);

            if (visualizationType === 'waveform') {
                this.drawWaveform(ctx, width, height, previousData, colorScheme);
            } else if (visualizationType === 'frequency') {
                this.drawFrequencyBars(ctx, width, height, previousData, colorScheme);
            } else if (visualizationType === 'level') {
                this.drawLevelMeter(ctx, width, height, colorScheme);
            }
        };

        draw();
    }

    drawWaveform(ctx, width, height, previousData, colorScheme) {
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Create gradient
        const gradient = this.createGradient(ctx, width, height, colorScheme);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / this.dataArray.length;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            // Smooth the data
            const currentValue = this.dataArray[i] / 128.0;
            const smoothedValue = previousData[i] * 0.7 + currentValue * 0.3;
            previousData[i] = smoothedValue;
            
            const y = (smoothedValue * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    }

    drawFrequencyBars(ctx, width, height, previousData, colorScheme) {
        this.analyser.getByteFrequencyData(this.dataArray);

        const barWidth = width / this.dataArray.length * 2.5;
        const gradient = this.createGradient(ctx, width, height, colorScheme);
        
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            // Smooth the data
            const currentValue = this.dataArray[i];
            const smoothedValue = previousData[i] * 0.8 + currentValue * 0.2;
            previousData[i] = smoothedValue;
            
            const barHeight = (smoothedValue / 255) * height;

            // Create per-bar gradient
            const barGradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            if (colorScheme === 'blue') {
                barGradient.addColorStop(0, '#3b82f6');
                barGradient.addColorStop(1, '#1e40af');
            } else if (colorScheme === 'green') {
                barGradient.addColorStop(0, '#10b981');
                barGradient.addColorStop(1, '#047857');
            } else if (colorScheme === 'red') {
                barGradient.addColorStop(0, '#ef4444');
                barGradient.addColorStop(1, '#b91c1c');
            }

            ctx.fillStyle = barGradient;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    drawLevelMeter(ctx, width, height, colorScheme) {
        const level = this.calculateAudioLevel();
        
        // Draw background
        ctx.fillStyle = '#374151';
        ctx.fillRect(0, 0, width, height);
        
        // Draw level bar
        const levelWidth = width * level;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        
        if (level < 0.3) {
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#059669');
        } else if (level < 0.7) {
            gradient.addColorStop(0, '#f59e0b');
            gradient.addColorStop(1, '#d97706');
        } else {
            gradient.addColorStop(0, '#ef4444');
            gradient.addColorStop(1, '#dc2626');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, levelWidth, height);
        
        // Draw level text
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(level * 100)}%`, width / 2, height / 2 + 4);
    }

    createGradient(ctx, width, height, colorScheme) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        
        switch (colorScheme) {
            case 'blue':
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(0.5, '#2563eb');
                gradient.addColorStop(1, '#1e40af');
                break;
            case 'green':
                gradient.addColorStop(0, '#10b981');
                gradient.addColorStop(0.5, '#059669');
                gradient.addColorStop(1, '#047857');
                break;
            case 'red':
                gradient.addColorStop(0, '#ef4444');
                gradient.addColorStop(0.5, '#dc2626');
                gradient.addColorStop(1, '#b91c1c');
                break;
            case 'rainbow':
                gradient.addColorStop(0, '#ef4444');
                gradient.addColorStop(0.33, '#f59e0b');
                gradient.addColorStop(0.66, '#10b981');
                gradient.addColorStop(1, '#3b82f6');
                break;
            default:
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(1, '#1e40af');
        }
        
        return gradient;
    }

    stopVisualization() {
        this.isAnalyzing = false;
    }

    async convertBlobToWav(blob) {
        return new Promise((resolve, reject) => {
            // Validate input blob
            if (!blob || blob.size === 0) {
                reject(new Error('Invalid or empty blob provided'));
                return;
            }

            console.log('Converting blob to WAV:', {
                size: blob.size,
                type: blob.type
            });

            const reader = new FileReader();
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                reject(new Error('WAV conversion timed out after 30 seconds'));
            }, 30000);
            
            reader.onload = () => {
                clearTimeout(timeout);
                try {
                    const arrayBuffer = reader.result;
                    console.log('FileReader completed, arrayBuffer info:', {
                        byteLength: arrayBuffer ? arrayBuffer.byteLength : 'null',
                        constructor: arrayBuffer ? arrayBuffer.constructor.name : 'null'
                    });
                    
                    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                        reject(new Error('Failed to read blob data'));
                        return;
                    }
                    
                    this.processAudioBuffer(arrayBuffer)
                        .then(wavBlob => {
                            console.log('WAV conversion completed:', {
                                originalSize: blob.size,
                                wavSize: wavBlob.size,
                                type: wavBlob.type
                            });
                            resolve(wavBlob);
                        })
                        .catch(error => {
                            console.error('Audio buffer processing failed:', error);
                            reject(new Error('Audio processing failed: ' + error.message));
                        });
                } catch (error) {
                    console.error('Blob processing error:', error);
                    reject(new Error('Failed to process blob: ' + error.message));
                }
            };
            
            reader.onerror = (error) => {
                clearTimeout(timeout);
                console.error('FileReader error:', error);
                reject(new Error('Failed to read blob data'));
            };
            
            reader.onabort = () => {
                clearTimeout(timeout);
                reject(new Error('Blob reading was aborted'));
            };
            
            try {
                reader.readAsArrayBuffer(blob);
            } catch (error) {
                clearTimeout(timeout);
                reject(new Error('Failed to start reading blob: ' + error.message));
            }
        });
    }

    async processAudioBuffer(arrayBuffer) {
        // Always create a fresh AudioContext for processing to avoid state issues
        let processingContext = null;
        
        try {
            console.log('Creating new AudioContext for processing...');
            
            // Add retry logic for AudioContext creation
            let retries = 3;
            while (retries > 0) {
                try {
                    processingContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext created successfully, state:', processingContext.state);
                    break;
                } catch (contextError) {
                    console.warn(`AudioContext creation failed, retries left: ${retries - 1}`, contextError);
                    retries--;
                    if (retries === 0) throw contextError;
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            // Ensure context is running
            if (processingContext.state === 'suspended') {
                console.log('Resuming suspended AudioContext...');
                await processingContext.resume();
            }
            
            console.log('Decoding audio data...');
            console.log('ArrayBuffer info:', {
                byteLength: arrayBuffer.byteLength,
                constructor: arrayBuffer.constructor.name
            });
            
            // Validate arrayBuffer
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Invalid or empty arrayBuffer for decoding');
            }
            
            // Add timeout to decodeAudioData to prevent hanging
            const decodePromise = processingContext.decodeAudioData(arrayBuffer.slice()); // Create a copy
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    console.error('Audio decoding timed out, forcing rejection');
                    reject(new Error('Audio decoding timed out after 5 seconds'));
                }, 5000); // Reduced timeout
            });
            
            let audioBuffer;
            try {
                audioBuffer = await Promise.race([decodePromise, timeoutPromise]);
            } catch (timeoutError) {
                console.error('Decode timeout caught, attempting cleanup:', timeoutError);
                // Force close the context and throw
                if (processingContext && processingContext.state !== 'closed') {
                    try {
                        await processingContext.close();
                    } catch (closeError) {
                        console.warn('Failed to close context after timeout:', closeError);
                    }
                }
                throw timeoutError;
            }
            console.log('Audio data decoded successfully, creating WAV...');
            
            const wavBlob = this.audioBufferToWav(audioBuffer);
            
            // Clean up the processing context
            if (processingContext && processingContext.state !== 'closed') {
                console.log('Closing processing AudioContext...');
                await processingContext.close();
                console.log('Processing AudioContext closed');
            }
            
            return wavBlob;
        } catch (error) {
            console.error('Error processing audio buffer:', error);
            
            // Clean up on error
            if (processingContext && processingContext.state !== 'closed') {
                try {
                    console.log('Cleaning up AudioContext after error...');
                    await processingContext.close();
                } catch (closeError) {
                    console.warn('Failed to close audio context:', closeError);
                }
            }
            
            throw new Error('Failed to process audio data: ' + error.message);
        }
    }

    audioBufferToWav(audioBuffer) {
        try {
            const numberOfChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const length = audioBuffer.length * numberOfChannels * 2;
            
            console.log('Creating WAV from audio buffer:', {
                channels: numberOfChannels,
                sampleRate: sampleRate,
                length: audioBuffer.length,
                duration: audioBuffer.duration
            });
            
            // Create WAV file buffer
            const buffer = new ArrayBuffer(44 + length);
            const view = new DataView(buffer);
            
            // Helper function to write strings to buffer
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };
            
            // WAV file header
            writeString(0, 'RIFF');                          // ChunkID
            view.setUint32(4, 36 + length, true);            // ChunkSize
            writeString(8, 'WAVE');                          // Format
            writeString(12, 'fmt ');                         // Subchunk1ID
            view.setUint32(16, 16, true);                    // Subchunk1Size (PCM = 16)
            view.setUint16(20, 1, true);                     // AudioFormat (PCM = 1)
            view.setUint16(22, numberOfChannels, true);      // NumChannels
            view.setUint32(24, sampleRate, true);            // SampleRate
            view.setUint32(28, sampleRate * numberOfChannels * 2, true); // ByteRate
            view.setUint16(32, numberOfChannels * 2, true);  // BlockAlign
            view.setUint16(34, 16, true);                    // BitsPerSample
            writeString(36, 'data');                         // Subchunk2ID
            view.setUint32(40, length, true);                // Subchunk2Size
            
            // Convert and write audio data
            let offset = 44;
            for (let i = 0; i < audioBuffer.length; i++) {
                for (let channel = 0; channel < numberOfChannels; channel++) {
                    // Get sample and clamp to valid range
                    let sample = audioBuffer.getChannelData(channel)[i];
                    sample = Math.max(-1, Math.min(1, sample));
                    
                    // Convert to 16-bit PCM
                    const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                    view.setInt16(offset, pcmSample, true);
                    offset += 2;
                }
            }
            
            const wavBlob = new Blob([buffer], { type: 'audio/wav' });
            
            console.log('WAV creation successful:', {
                bufferSize: buffer.byteLength,
                blobSize: wavBlob.size,
                type: wavBlob.type
            });
            
            return wavBlob;
            
        } catch (error) {
            console.error('Error creating WAV from audio buffer:', error);
            throw new Error('Failed to create WAV file: ' + error.message);
        }
    }

    calculateAudioLevel() {
        if (!this.audioContext || !this.analyser) return 0;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate RMS (Root Mean Square) for more accurate level
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        
        const rms = Math.sqrt(sum / this.dataArray.length);
        return Math.min(rms / 255, 1.0); // Normalize to 0-1 and clamp
    }

    getDetailedAudioLevels() {
        if (!this.audioContext || !this.analyser) {
            return { level: 0, peak: 0, frequency: [] };
        }

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate overall level (RMS)
        let sum = 0;
        let peak = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const value = this.dataArray[i];
            sum += value * value;
            peak = Math.max(peak, value);
        }
        
        const rms = Math.sqrt(sum / this.dataArray.length);
        
        return {
            level: Math.min(rms / 255, 1.0),
            peak: Math.min(peak / 255, 1.0),
            frequency: Array.from(this.dataArray).map(v => v / 255)
        };
    }

    startLevelMonitoring(callback, interval = 50) {
        if (this.levelMonitoringInterval) {
            clearInterval(this.levelMonitoringInterval);
        }

        this.levelMonitoringInterval = setInterval(() => {
            if (this.isAnalyzing && callback) {
                const levels = this.getDetailedAudioLevels();
                callback(levels);
            }
        }, interval);
    }

    stopLevelMonitoring() {
        if (this.levelMonitoringInterval) {
            clearInterval(this.levelMonitoringInterval);
            this.levelMonitoringInterval = null;
        }
    }

    async testAudioDevice(deviceId, options = {}) {
        const testDuration = options.duration || 3000; // 3 seconds default
        const testOptions = {
            sampleRate: options.sampleRate || 16000,
            channels: options.channels || 1
        };

        console.log(`Testing audio device: ${deviceId} for ${testDuration}ms`);
        
        try {
            // Create test stream
            const stream = await this.createRecordingStream(deviceId, testOptions);
            
            if (!stream || stream.getTracks().length === 0) {
                throw new Error('No audio tracks in stream');
            }

            const audioTrack = stream.getTracks()[0];
            
            // Check if track is active
            if (audioTrack.readyState !== 'live') {
                throw new Error(`Audio track not active: ${audioTrack.readyState}`);
            }

            // Test audio levels for a brief period
            const testResult = await this.performAudioLevelTest(stream, testDuration);
            
            // Clean up
            stream.getTracks().forEach(track => track.stop());
            
            console.log(`Device test completed:`, testResult);
            
            return {
                success: true,
                deviceId: deviceId,
                trackLabel: audioTrack.label,
                trackSettings: audioTrack.getSettings ? audioTrack.getSettings() : null,
                audioLevels: testResult.audioLevels,
                hasAudio: testResult.hasAudio,
                averageLevel: testResult.averageLevel,
                maxLevel: testResult.maxLevel,
                duration: testDuration
            };
            
        } catch (error) {
            console.error(`Audio device test failed for ${deviceId}:`, error);
            
            return {
                success: false,
                deviceId: deviceId,
                error: error.message,
                errorType: error.name || 'UnknownError'
            };
        }
    }

    async performAudioLevelTest(stream, duration) {
        return new Promise((resolve) => {
            // Initialize audio context for level testing
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            
            analyser.fftSize = 256;
            source.connect(analyser);
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            const levels = [];
            let maxLevel = 0;
            let totalLevel = 0;
            let sampleCount = 0;
            
            const sampleInterval = 100; // Sample every 100ms
            const samples = Math.floor(duration / sampleInterval);
            
            const sampleAudio = () => {
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate RMS level
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / bufferLength);
                const normalizedLevel = rms / 255;
                
                levels.push(normalizedLevel);
                totalLevel += normalizedLevel;
                maxLevel = Math.max(maxLevel, normalizedLevel);
                sampleCount++;
                
                if (sampleCount < samples) {
                    setTimeout(sampleAudio, sampleInterval);
                } else {
                    // Test complete
                    audioContext.close();
                    
                    const averageLevel = totalLevel / sampleCount;
                    const hasAudio = maxLevel > 0.01; // Threshold for detecting audio
                    
                    resolve({
                        audioLevels: levels,
                        averageLevel: averageLevel,
                        maxLevel: maxLevel,
                        hasAudio: hasAudio,
                        sampleCount: sampleCount
                    });
                }
            };
            
            // Start sampling
            setTimeout(sampleAudio, sampleInterval);
        });
    }

    async validateDeviceCapabilities(deviceId) {
        const capabilities = {
            deviceId: deviceId,
            supported: false,
            sampleRates: [],
            channelCounts: [],
            constraints: null,
            error: null
        };

        try {
            // Test different configurations
            const testConfigs = [
                { sampleRate: 44100, channelCount: 2 },
                { sampleRate: 44100, channelCount: 1 },
                { sampleRate: 22050, channelCount: 1 },
                { sampleRate: 16000, channelCount: 1 }
            ];

            for (const config of testConfigs) {
                try {
                    const constraints = {
                        audio: {
                            deviceId: deviceId ? { exact: deviceId } : undefined,
                            sampleRate: { exact: config.sampleRate },
                            channelCount: { exact: config.channelCount }
                        }
                    };

                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Success - add to supported configurations
                    if (!capabilities.sampleRates.includes(config.sampleRate)) {
                        capabilities.sampleRates.push(config.sampleRate);
                    }
                    if (!capabilities.channelCounts.includes(config.channelCount)) {
                        capabilities.channelCounts.push(config.channelCount);
                    }
                    
                    capabilities.supported = true;
                    
                    // Get actual track settings
                    const track = stream.getTracks()[0];
                    if (track.getSettings) {
                        capabilities.constraints = track.getSettings();
                    }
                    
                    // Clean up
                    stream.getTracks().forEach(track => track.stop());
                    
                } catch (configError) {
                    // This configuration not supported, continue testing
                    console.log(`Config not supported for ${deviceId}:`, config, configError.message);
                }
            }

            return capabilities;
            
        } catch (error) {
            capabilities.error = error.message;
            return capabilities;
        }
    }

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    async getAudioInfo(blob) {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.onloadedmetadata = () => {
                resolve({
                    duration: audio.duration,
                    size: blob.size,
                    type: blob.type
                });
            };
            audio.src = URL.createObjectURL(blob);
        });
    }

    async cleanup() {
        this.stopVisualization();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                console.log('Closing AudioContext...');
                await this.audioContext.close();
                console.log('AudioContext closed successfully');
            } catch (error) {
                console.warn('Error closing AudioContext:', error);
            }
        }
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        
        // Add a small delay to ensure cleanup completes
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Backward compatibility - AudioProcessor alias
class AudioProcessor extends AudioManager {
    constructor() {
        super();
        console.warn('AudioProcessor is deprecated, use AudioManager instead');
    }
}

// Export for use in main app
window.AudioManager = AudioManager;
window.AudioProcessor = AudioProcessor; // Backward compatibility