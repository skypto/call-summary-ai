/**
 * Template Processing Engine
 * Handles template execution with AI providers and variable substitution
 */
class TemplateProcessor {
    constructor(aiService) {
        this.aiService = aiService;
        this.processingQueue = [];
        this.isProcessing = false;
    }

    /**
     * Process template with AI provider
     */
    async processTemplate(template, variables, config) {
        try {
            // Validate inputs
            if (!template || !template.prompt) {
                throw new Error('Invalid template provided');
            }

            if (!variables.transcript) {
                throw new Error('Transcript is required for template processing');
            }

            // Process template variables
            const processedPrompt = this.substituteVariables(template.prompt, variables);

            // Get AI provider configuration
            const provider = config.summarization?.provider || 'openai';
            const providerConfig = config.summarization?.[provider];

            if (!providerConfig) {
                throw new Error(`No configuration found for provider: ${provider}`);
            }

            // Execute with AI provider
            const result = await this.executeWithProvider(processedPrompt, provider, providerConfig);

            return {
                success: true,
                result,
                template: template.name,
                provider,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Template processing error:', error);
            return {
                success: false,
                error: error.message,
                template: template.name
            };
        }
    }

    /**
     * Process multiple templates in batch
     */
    async processBatch(templates, variables, config, onProgress) {
        const results = [];
        const total = templates.length;

        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];
            
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total,
                    template: template.name,
                    progress: ((i + 1) / total) * 100
                });
            }

            const result = await this.processTemplate(template, variables, config);
            results.push(result);

            // Small delay between requests to avoid rate limiting
            if (i < templates.length - 1) {
                await this.delay(500);
            }
        }

        return results;
    }

    /**
     * Execute template with specific AI provider
     */
    async executeWithProvider(prompt, provider, providerConfig) {
        switch (provider) {
            case 'openai':
                return await this.executeOpenAI(prompt, providerConfig);
            case 'azure-openai':
                return await this.executeAzureOpenAI(prompt, providerConfig);
            case 'gemini':
                return await this.executeGemini(prompt, providerConfig);
            case 'deepseek':
                return await this.executeDeepSeek(prompt, providerConfig);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Execute with OpenAI
     */
    async executeOpenAI(prompt, config) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    /**
     * Execute with Azure OpenAI
     */
    async executeAzureOpenAI(prompt, config) {
        const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=2024-02-15-preview`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Azure OpenAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    /**
     * Execute with Google Gemini
     */
    async executeGemini(prompt, config) {
        const model = config.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4000
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }

    /**
     * Execute with DeepSeek
     */
    async executeDeepSeek(prompt, config) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model || 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`DeepSeek API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    /**
     * Substitute variables in template prompt
     */
    substituteVariables(prompt, variables) {
        let result = prompt;
        
        // Default variables
        const defaultVars = {
            transcript: variables.transcript || '',
            date: variables.date || new Date().toLocaleDateString(),
            duration: variables.duration || 'Unknown',
            filename: variables.filename || 'Unknown',
            timestamp: new Date().toISOString()
        };

        // Merge with provided variables
        const allVars = { ...defaultVars, ...variables };

        // Replace variables in prompt
        Object.keys(allVars).forEach(key => {
            const regex = new RegExp(`\\{${key}\\}`, 'g');
            result = result.replace(regex, allVars[key]);
        });

        return result;
    }

    /**
     * Validate template before processing
     */
    validateTemplate(template) {
        if (!template) {
            return { valid: false, error: 'Template is required' };
        }

        if (!template.prompt || template.prompt.trim().length === 0) {
            return { valid: false, error: 'Template prompt is required' };
        }

        if (template.prompt.length > 50000) {
            return { valid: false, error: 'Template prompt is too long (max 50,000 characters)' };
        }

        return { valid: true };
    }

    /**
     * Validate processing variables
     */
    validateVariables(variables) {
        if (!variables) {
            return { valid: false, error: 'Variables are required' };
        }

        if (!variables.transcript || variables.transcript.trim().length === 0) {
            return { valid: false, error: 'Transcript is required' };
        }

        if (variables.transcript.length > 100000) {
            return { valid: false, error: 'Transcript is too long (max 100,000 characters)' };
        }

        return { valid: true };
    }

    /**
     * Estimate processing cost (tokens)
     */
    estimateTokens(prompt) {
        // Rough estimation: 1 token ≈ 4 characters for English text
        return Math.ceil(prompt.length / 4);
    }

    /**
     * Estimate processing time based on provider and prompt length
     */
    estimateProcessingTime(prompt, provider) {
        const tokens = this.estimateTokens(prompt);
        
        // Rough estimates in seconds based on typical API response times
        const baseTime = {
            'openai': 2,
            'azure-openai': 2,
            'gemini': 1.5,
            'deepseek': 3
        };

        const tokensPerSecond = {
            'openai': 100,
            'azure-openai': 100,
            'gemini': 150,
            'deepseek': 80
        };

        const base = baseTime[provider] || 2;
        const processing = tokens / (tokensPerSecond[provider] || 100);
        
        return Math.max(base, processing);
    }

    /**
     * Format processing result for display
     */
    formatResult(result, template) {
        if (!result.success) {
            return {
                html: `<div class="error-result">
                    <h4><i class="fas fa-exclamation-triangle"></i> Processing Failed</h4>
                    <p><strong>Template:</strong> ${template.name}</p>
                    <p><strong>Error:</strong> ${result.error}</p>
                </div>`,
                text: `Processing Failed\nTemplate: ${template.name}\nError: ${result.error}`
            };
        }

        const timestamp = new Date(result.processedAt).toLocaleString();
        
        return {
            html: `<div class="success-result">
                <div class="result-header">
                    <h4><i class="fas fa-check-circle"></i> ${result.template}</h4>
                    <div class="result-meta">
                        <span class="provider-badge">${result.provider}</span>
                        <span class="timestamp">${timestamp}</span>
                    </div>
                </div>
                <div class="result-content">
                    ${this.formatResultContent(result.result)}
                </div>
            </div>`,
            text: `${result.template}\n\nProcessed with ${result.provider} at ${timestamp}\n\n${result.result}`
        };
    }

    /**
     * Format result content with markdown-like formatting
     */
    formatResultContent(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.)/gm, '<p>$1')
            .replace(/(.)$/gm, '$1</p>');
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cancel ongoing processing
     */
    cancelProcessing() {
        this.isProcessing = false;
        this.processingQueue = [];
    }

    /**
     * Get processing status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            queueLength: this.processingQueue.length
        };
    }
}

// Initialize template processor when DOM is loaded
if (typeof window !== 'undefined') {
    window.templateProcessor = new TemplateProcessor();
}