/**
 * Help Content - Comprehensive help documentation and guides
 */
window.helpContent = {
    
    /**
     * Quick Start Guide
     */
    quickStart: {
        title: 'Quick Start Guide',
        sections: [
            {
                title: '1. Set Up Your Audio',
                content: `
                    <ol>
                        <li>Connect your microphone or headset</li>
                        <li>Select your input device from the dropdown</li>
                        <li>Click "Test Mic" to verify it's working</li>
                        <li>Adjust audio levels if needed</li>
                    </ol>
                `,
                tips: [
                    'Use a quality headset for best results',
                    'Ensure your microphone has permission to access audio'
                ]
            },
            {
                title: '2. Configure AI Services',
                content: `
                    <ol>
                        <li>Go to the AI Settings tab</li>
                        <li>Enter your API keys for transcription services</li>
                        <li>Choose your preferred AI providers</li>
                        <li>Test the connection to ensure everything works</li>
                    </ol>
                `,
                tips: [
                    'You can use multiple AI providers for different purposes',
                    'API keys are stored securely on your device'
                ]
            },
            {
                title: '3. Start Recording',
                content: `
                    <ol>
                        <li>Click the "Start Recording" button or press F9</li>
                        <li>Speak clearly into your microphone</li>
                        <li>Monitor the audio levels to ensure good quality</li>
                        <li>Press F9 again or click "Stop" when finished</li>
                    </ol>
                `,
                tips: [
                    'Keep background noise to a minimum',
                    'Speak at a consistent volume and pace'
                ]
            },
            {
                title: '4. Transcribe and Analyze',
                content: `
                    <ol>
                        <li>After recording, click "Start Transcription"</li>
                        <li>Wait for the AI to convert speech to text</li>
                        <li>Review and edit the transcript if needed</li>
                        <li>Use analysis templates to extract insights</li>
                    </ol>
                `,
                tips: [
                    'Longer recordings take more time to transcribe',
                    'You can edit transcripts to improve accuracy'
                ]
            }
        ]
    },

    /**
     * Keyboard Shortcuts Guide
     */
    keyboardShortcuts: {
        title: 'Keyboard Shortcuts',
        sections: [
            {
                title: 'Recording Controls',
                shortcuts: [
                    { key: 'F9', description: 'Start/Stop recording' },
                    { key: 'F10', description: 'Force stop recording' },
                    { key: 'Ctrl+R', description: 'Refresh audio devices' }
                ]
            },
            {
                title: 'Navigation',
                shortcuts: [
                    { key: 'Ctrl+1', description: 'Go to Recording tab' },
                    { key: 'Ctrl+2', description: 'Go to AI Settings tab' },
                    { key: 'Ctrl+3', description: 'Go to History tab' },
                    { key: 'Ctrl+4', description: 'Go to Templates tab' }
                ]
            },
            {
                title: 'AI Functions',
                shortcuts: [
                    { key: 'Ctrl+T', description: 'Start transcription' },
                    { key: 'Ctrl+Q', description: 'Open Q&A interface' }
                ]
            },
            {
                title: 'General',
                shortcuts: [
                    { key: 'F1 or ?', description: 'Show help' },
                    { key: 'Ctrl+Shift+T', description: 'Toggle theme' },
                    { key: 'Escape', description: 'Close modal/cancel action' },
                    { key: 'Tab', description: 'Navigate between elements' }
                ]
            }
        ]
    },

    /**
     * Troubleshooting Guide
     */
    troubleshooting: {
        title: 'Troubleshooting',
        sections: [
            {
                title: 'Audio Issues',
                problems: [
                    {
                        problem: 'No microphone detected',
                        solutions: [
                            'Check that your microphone is properly connected',
                            'Ensure microphone drivers are installed',
                            'Try refreshing the device list',
                            'Check browser permissions for microphone access'
                        ]
                    },
                    {
                        problem: 'Poor audio quality',
                        solutions: [
                            'Move closer to the microphone',
                            'Reduce background noise',
                            'Check microphone settings in your OS',
                            'Try a different microphone or headset'
                        ]
                    },
                    {
                        problem: 'Recording not starting',
                        solutions: [
                            'Grant microphone permission when prompted',
                            'Check if another application is using the microphone',
                            'Try refreshing the page',
                            'Restart your browser'
                        ]
                    }
                ]
            },
            {
                title: 'Transcription Issues',
                problems: [
                    {
                        problem: 'Transcription fails to start',
                        solutions: [
                            'Check your internet connection',
                            'Verify your API key is correct',
                            'Ensure you have sufficient API credits',
                            'Try a different transcription provider'
                        ]
                    },
                    {
                        problem: 'Poor transcription accuracy',
                        solutions: [
                            'Speak more clearly and slowly',
                            'Reduce background noise',
                            'Use a better quality microphone',
                            'Try a different AI provider',
                            'Edit the transcript manually'
                        ]
                    },
                    {
                        problem: 'Transcription takes too long',
                        solutions: [
                            'Check your internet speed',
                            'Try transcribing shorter segments',
                            'Use a faster transcription service',
                            'Be patient with longer recordings'
                        ]
                    }
                ]
            },
            {
                title: 'AI Analysis Issues',
                problems: [
                    {
                        problem: 'Analysis not generating results',
                        solutions: [
                            'Ensure you have a transcript first',
                            'Check your AI provider API key',
                            'Verify you have API credits remaining',
                            'Try a simpler analysis template'
                        ]
                    },
                    {
                        problem: 'Poor analysis quality',
                        solutions: [
                            'Improve your transcript accuracy first',
                            'Try different analysis templates',
                            'Use more specific prompts',
                            'Provide more context in your recording'
                        ]
                    }
                ]
            }
        ]
    },

    /**
     * Best Practices Guide
     */
    bestPractices: {
        title: 'Best Practices',
        sections: [
            {
                title: 'Recording Quality',
                practices: [
                    {
                        title: 'Use Quality Equipment',
                        description: 'Invest in a good headset or external microphone for clearer audio.',
                        benefits: ['Better transcription accuracy', 'More professional recordings', 'Reduced background noise']
                    },
                    {
                        title: 'Control Your Environment',
                        description: 'Record in a quiet space with minimal echo and background noise.',
                        benefits: ['Cleaner audio', 'Better AI processing', 'More professional results']
                    },
                    {
                        title: 'Speak Clearly',
                        description: 'Articulate words clearly and maintain consistent volume.',
                        benefits: ['Higher transcription accuracy', 'Better AI analysis', 'Easier to review later']
                    }
                ]
            },
            {
                title: 'AI Configuration',
                practices: [
                    {
                        title: 'Choose the Right Provider',
                        description: 'Different AI services excel at different tasks. Experiment to find what works best.',
                        benefits: ['Better accuracy', 'Cost optimization', 'Feature availability']
                    },
                    {
                        title: 'Customize Templates',
                        description: 'Create custom analysis templates for your specific use cases.',
                        benefits: ['More relevant insights', 'Consistent formatting', 'Time savings']
                    },
                    {
                        title: 'Review and Edit',
                        description: 'Always review AI-generated content and make corrections as needed.',
                        benefits: ['Higher accuracy', 'Better insights', 'Professional quality']
                    }
                ]
            },
            {
                title: 'Organization',
                practices: [
                    {
                        title: 'Use Descriptive Names',
                        description: 'Give your recordings clear, descriptive names for easy identification.',
                        benefits: ['Easy to find later', 'Better organization', 'Professional appearance']
                    },
                    {
                        title: 'Regular Backups',
                        description: 'Export important recordings and transcripts regularly.',
                        benefits: ['Data protection', 'Portability', 'Long-term access']
                    },
                    {
                        title: 'Tag and Categorize',
                        description: 'Use tags and categories to organize your recordings by project or type.',
                        benefits: ['Quick filtering', 'Better search', 'Improved workflow']
                    }
                ]
            }
        ]
    },

    /**
     * Privacy and Security Guide
     */
    privacySecurity: {
        title: 'Privacy & Security',
        sections: [
            {
                title: 'Data Storage',
                content: `
                    <p>Your recordings and transcripts are stored locally on your device by default. This ensures:</p>
                    <ul>
                        <li>Complete control over your data</li>
                        <li>No unauthorized access</li>
                        <li>Compliance with privacy regulations</li>
                        <li>Offline access to your recordings</li>
                    </ul>
                `
            },
            {
                title: 'AI Processing',
                content: `
                    <p>When using AI services for transcription and analysis:</p>
                    <ul>
                        <li>Audio is sent to your chosen AI provider</li>
                        <li>Processing happens on their secure servers</li>
                        <li>You control which providers to use</li>
                        <li>API keys are encrypted and stored locally</li>
                    </ul>
                `
            },
            {
                title: 'Best Practices',
                content: `
                    <ul>
                        <li>Only record with consent from all participants</li>
                        <li>Be aware of local recording laws</li>
                        <li>Use strong, unique API keys</li>
                        <li>Regularly review and delete old recordings</li>
                        <li>Keep your browser and system updated</li>
                    </ul>
                `
            }
        ]
    },

    /**
     * API Configuration Guide
     */
    apiConfiguration: {
        title: 'API Configuration',
        providers: [
            {
                name: 'OpenAI Whisper',
                description: 'Fast and accurate speech-to-text transcription',
                setup: [
                    'Sign up at platform.openai.com',
                    'Generate an API key in your account settings',
                    'Enter the key in the AI Settings tab',
                    'Test the connection'
                ],
                features: ['Multiple languages', 'Fast processing', 'High accuracy'],
                pricing: 'Pay per minute of audio processed'
            },
            {
                name: 'Azure Speech Services',
                description: 'Enterprise-grade transcription with speaker diarization',
                setup: [
                    'Create an Azure account',
                    'Set up a Speech Services resource',
                    'Get your subscription key and region',
                    'Configure in AI Settings'
                ],
                features: ['Speaker identification', 'Custom models', 'Batch processing'],
                pricing: 'Pay per hour of audio processed'
            },
            {
                name: 'Google Gemini',
                description: 'Advanced AI for text analysis and summarization',
                setup: [
                    'Get access to Google AI Studio',
                    'Generate an API key',
                    'Enter the key in AI Settings',
                    'Select Gemini as your analysis provider'
                ],
                features: ['Advanced reasoning', 'Long context', 'Multimodal capabilities'],
                pricing: 'Pay per token processed'
            }
        ]
    }
};

/**
 * Help Content Manager - Manages and displays help content
 */
class HelpContentManager {
    constructor() {
        this.currentSection = null;
    }

    showQuickStart() {
        this.showHelpSection(window.helpContent.quickStart);
    }

    showKeyboardShortcuts() {
        const content = this.formatKeyboardShortcuts(window.helpContent.keyboardShortcuts);
        if (window.uiManager) {
            window.uiManager.showModal('Keyboard Shortcuts', content);
        }
    }

    showTroubleshooting() {
        const content = this.formatTroubleshooting(window.helpContent.troubleshooting);
        if (window.uiManager) {
            window.uiManager.showModal('Troubleshooting Guide', content);
        }
    }

    showBestPractices() {
        const content = this.formatBestPractices(window.helpContent.bestPractices);
        if (window.uiManager) {
            window.uiManager.showModal('Best Practices', content);
        }
    }

    showPrivacySecurity() {
        const content = this.formatPrivacySecurity(window.helpContent.privacySecurity);
        if (window.uiManager) {
            window.uiManager.showModal('Privacy & Security', content);
        }
    }

    showApiConfiguration() {
        const content = this.formatApiConfiguration(window.helpContent.apiConfiguration);
        if (window.uiManager) {
            window.uiManager.showModal('API Configuration', content);
        }
    }

    formatKeyboardShortcuts(data) {
        let html = '<div class="help-content keyboard-shortcuts">';
        
        data.sections.forEach(section => {
            html += `<div class="help-section">
                <h4>${section.title}</h4>
                <div class="shortcuts-list">`;
            
            section.shortcuts.forEach(shortcut => {
                html += `<div class="shortcut-item">
                    <kbd class="keyboard-hint">${shortcut.key}</kbd>
                    <span>${shortcut.description}</span>
                </div>`;
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        return html;
    }

    formatTroubleshooting(data) {
        let html = '<div class="help-content troubleshooting">';
        
        data.sections.forEach(section => {
            html += `<div class="help-section">
                <h4>${section.title}</h4>`;
            
            section.problems.forEach(item => {
                html += `<div class="problem-item">
                    <h5>${item.problem}</h5>
                    <ul>`;
                
                item.solutions.forEach(solution => {
                    html += `<li>${solution}</li>`;
                });
                
                html += '</ul></div>';
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    formatBestPractices(data) {
        let html = '<div class="help-content best-practices">';
        
        data.sections.forEach(section => {
            html += `<div class="help-section">
                <h4>${section.title}</h4>`;
            
            section.practices.forEach(practice => {
                html += `<div class="practice-item">
                    <h5>${practice.title}</h5>
                    <p>${practice.description}</p>
                    <div class="benefits">
                        <strong>Benefits:</strong>
                        <ul>`;
                
                practice.benefits.forEach(benefit => {
                    html += `<li>${benefit}</li>`;
                });
                
                html += '</ul></div></div>';
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    formatPrivacySecurity(data) {
        let html = '<div class="help-content privacy-security">';
        
        data.sections.forEach(section => {
            html += `<div class="help-section">
                <h4>${section.title}</h4>
                ${section.content}
            </div>`;
        });
        
        html += '</div>';
        return html;
    }

    formatApiConfiguration(data) {
        let html = '<div class="help-content api-configuration">';
        
        data.providers.forEach(provider => {
            html += `<div class="provider-section">
                <h4>${provider.name}</h4>
                <p>${provider.description}</p>
                
                <div class="setup-steps">
                    <h5>Setup Steps:</h5>
                    <ol>`;
            
            provider.setup.forEach(step => {
                html += `<li>${step}</li>`;
            });
            
            html += `</ol>
                </div>
                
                <div class="features">
                    <h5>Features:</h5>
                    <ul>`;
            
            provider.features.forEach(feature => {
                html += `<li>${feature}</li>`;
            });
            
            html += `</ul>
                </div>
                
                <div class="pricing">
                    <h5>Pricing:</h5>
                    <p>${provider.pricing}</p>
                </div>
            </div>`;
        });
        
        html += '</div>';
        return html;
    }

    showHelpSection(section) {
        let html = `<div class="help-content">`;
        
        section.sections.forEach(item => {
            html += `<div class="help-section">
                <h4>${item.title}</h4>
                ${item.content}`;
            
            if (item.tips) {
                html += `<div class="tips">
                    <h5>💡 Tips:</h5>
                    <ul>`;
                
                item.tips.forEach(tip => {
                    html += `<li>${tip}</li>`;
                });
                
                html += '</ul></div>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        
        if (window.uiManager) {
            window.uiManager.showModal(section.title, html, [
                {
                    text: 'Start Tour',
                    class: 'btn-primary',
                    onclick: 'window.helpSystem.startOnboarding(); window.uiManager.closeModal(document.querySelector(".modal-overlay"));'
                }
            ]);
        }
    }
}

// Initialize Help Content Manager
window.helpContentManager = new HelpContentManager();

console.log('Help Content system loaded');