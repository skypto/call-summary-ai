/**
 * Help System - Provides contextual help, tooltips, and onboarding
 */
class HelpSystem {
    constructor() {
        this.tooltips = new Map();
        this.onboardingSteps = [];
        this.currentStep = 0;
        this.isOnboardingActive = false;
        this.helpData = {};
        
        this.init();
    }

    /**
     * Initialize Help System
     */
    init() {
        this.loadHelpData();
        this.setupTooltips();
        this.setupContextualHelp();
        this.checkFirstRun();
        
        console.log('Help System initialized');
    }

    /**
     * Load help data and content
     */
    loadHelpData() {
        this.helpData = {
            tooltips: {
                // Keep only tooltips that are not in the restricted areas
                'transcription-provider': {
                    title: 'Transcription Service',
                    content: 'Select which AI service to use for converting speech to text.',
                    position: 'right'
                },
                'summary-provider': {
                    title: 'AI Analysis Provider',
                    content: 'Choose which AI service to use for generating summaries and analysis.',
                    position: 'right'
                }
            },
            
            onboarding: [
                {
                    target: '.nav-tab[data-tab="record"]',
                    title: 'Welcome to Call Summary AI!',
                    content: 'Let\'s take a quick tour to get you started. This is the Record tab where you\'ll capture your audio.',
                    position: 'bottom',
                    showNext: true
                },
                {
                    target: '#device-select',
                    title: 'Select Your Microphone',
                    content: 'First, choose your audio input device. Make sure your microphone is connected and working.',
                    position: 'bottom',
                    showNext: true,
                    action: () => this.highlightElement('#device-select')
                },
                {
                    target: '.record-btn',
                    title: 'Start Recording',
                    content: 'Click this button to start recording. You can also use the F9 keyboard shortcut anytime.',
                    position: 'top',
                    showNext: true,
                    action: () => this.highlightElement('.record-btn')
                },
                {
                    target: '.nav-tab[data-tab="summary"]',
                    title: 'AI Analysis',
                    content: 'After recording, visit the Summary tab to transcribe and analyze your audio with AI.',
                    position: 'bottom',
                    showNext: true,
                    action: () => this.switchToTab('summary')
                },
                {
                    target: '.provider-selection',
                    title: 'Choose AI Providers',
                    content: 'Configure your preferred AI services for transcription and analysis in the Config tab.',
                    position: 'top',
                    showNext: true,
                    action: () => this.switchToTab('config')
                },
                {
                    target: '.nav-tab[data-tab="history"]',
                    title: 'Recording History',
                    content: 'All your recordings are saved here. You can search, replay, and manage them easily.',
                    position: 'bottom',
                    showNext: false,
                    action: () => this.switchToTab('history')
                }
            ],

            contextualHelp: {
                'record': {
                    title: 'Recording Audio',
                    sections: [
                        {
                            title: 'Getting Started',
                            content: 'Select your microphone, choose quality settings, and click Record to start capturing audio.'
                        },
                        {
                            title: 'Keyboard Shortcuts',
                            content: 'Use F9 to start/stop recording and F10 to force stop recording.'
                        },
                        {
                            title: 'Audio Quality',
                            content: 'Higher quality settings provide better transcription accuracy but use more storage space.'
                        }
                    ]
                },
                'summary': {
                    title: 'AI Analysis & Transcription',
                    sections: [
                        {
                            title: 'Transcription',
                            content: 'Convert your recorded audio to text using advanced AI speech recognition services.'
                        },
                        {
                            title: 'Analysis Templates',
                            content: 'Use pre-built templates to extract summaries, action items, contacts, and insights from your transcripts.'
                        },
                        {
                            title: 'Custom Analysis',
                            content: 'Create your own templates with custom prompts for specific analysis needs.'
                        }
                    ]
                },
                'history': {
                    title: 'Managing Recordings',
                    sections: [
                        {
                            title: 'Search & Filter',
                            content: 'Find recordings by title, date, duration, or search within transcript content.'
                        },
                        {
                            title: 'Playback & Review',
                            content: 'Click on any recording to play it back and review transcripts and analysis results.'
                        },
                        {
                            title: 'Export & Share',
                            content: 'Export recordings, transcripts, and analysis results in various formats.'
                        }
                    ]
                },
                'config': {
                    title: 'Configuration & Settings',
                    sections: [
                        {
                            title: 'AI Providers',
                            content: 'Configure API keys and settings for transcription and analysis services.'
                        },
                        {
                            title: 'Audio Settings',
                            content: 'Set default recording quality, device preferences, and audio processing options.'
                        },
                        {
                            title: 'Privacy & Security',
                            content: 'Manage data retention, encryption settings, and privacy preferences.'
                        }
                    ]
                }
            }
        };
    }

    /**
     * Tooltip System
     */
    setupTooltips() {
        // Create tooltip container
        if (!document.querySelector('.tooltip-container')) {
            const container = document.createElement('div');
            container.className = 'tooltip-container';
            container.innerHTML = `
                <div class="tooltip" role="tooltip">
                    <div class="tooltip-arrow"></div>
                    <div class="tooltip-title"></div>
                    <div class="tooltip-content"></div>
                </div>
            `;
            document.body.appendChild(container);
        }

        this.tooltip = document.querySelector('.tooltip');
        this.setupTooltipEvents();
    }

    setupTooltipEvents() {
        // Add tooltip triggers to elements
        Object.keys(this.helpData.tooltips).forEach(selector => {
            const elements = document.querySelectorAll(`[data-tooltip="${selector}"], .${selector}, #${selector}`);
            elements.forEach(element => {
                this.addTooltipToElement(element, selector);
            });
        });

        // Auto-detect elements with data-tooltip attribute
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            const tooltipKey = element.getAttribute('data-tooltip');
            if (this.helpData.tooltips[tooltipKey]) {
                this.addTooltipToElement(element, tooltipKey);
            }
        });
    }

    addTooltipToElement(element, tooltipKey) {
        const tooltipData = this.helpData.tooltips[tooltipKey];
        if (!tooltipData) return;

        let showTimeout, hideTimeout;

        const showTooltip = (e) => {
            clearTimeout(hideTimeout);
            showTimeout = setTimeout(() => {
                this.showTooltip(e.target, tooltipData);
            }, 500);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = setTimeout(() => {
                this.hideTooltip();
            }, 100);
        };

        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('focus', showTooltip);
        element.addEventListener('blur', hideTooltip);

        // Add ARIA attributes
        element.setAttribute('aria-describedby', 'tooltip');
    }

    showTooltip(element, data) {
        const tooltip = this.tooltip;
        const titleEl = tooltip.querySelector('.tooltip-title');
        const contentEl = tooltip.querySelector('.tooltip-content');

        titleEl.textContent = data.title;
        contentEl.textContent = data.content;

        tooltip.className = `tooltip tooltip-${data.position || 'top'}`;
        tooltip.style.display = 'block';

        this.positionTooltip(element, data.position || 'top');
        
        setTimeout(() => {
            tooltip.classList.add('tooltip-visible');
        }, 10);
    }

    hideTooltip() {
        const tooltip = this.tooltip;
        tooltip.classList.remove('tooltip-visible');
        setTimeout(() => {
            tooltip.style.display = 'none';
        }, 200);
    }

    positionTooltip(element, position) {
        const tooltip = this.tooltip;
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top, left;

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = rect.bottom + 10;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + 10;
                break;
        }

        // Keep tooltip within viewport
        top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    /**
     * Onboarding System
     */
    checkFirstRun() {
        const hasSeenOnboarding = localStorage.getItem('app-onboarding-completed');
        if (!hasSeenOnboarding) {
            setTimeout(() => {
                this.startOnboarding();
            }, 1000);
        }
    }

    startOnboarding() {
        this.isOnboardingActive = true;
        this.currentStep = 0;
        this.createOnboardingOverlay();
        this.showOnboardingStep(0);
    }

    createOnboardingOverlay() {
        if (document.querySelector('.onboarding-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-spotlight"></div>
            <div class="onboarding-popup">
                <div class="onboarding-header">
                    <h3 class="onboarding-title"></h3>
                    <button class="onboarding-close" aria-label="Skip onboarding">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="onboarding-content"></div>
                <div class="onboarding-footer">
                    <div class="onboarding-progress">
                        <span class="progress-text">Step <span class="current-step">1</span> of <span class="total-steps">${this.helpData.onboarding.length}</span></span>
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                    <div class="onboarding-actions">
                        <button class="btn btn-outline onboarding-prev" style="display: none;">Previous</button>
                        <button class="btn btn-primary onboarding-next">Next</button>
                        <button class="btn btn-success onboarding-finish" style="display: none;">Get Started</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Event listeners
        overlay.querySelector('.onboarding-close').addEventListener('click', () => this.skipOnboarding());
        overlay.querySelector('.onboarding-prev').addEventListener('click', () => this.previousStep());
        overlay.querySelector('.onboarding-next').addEventListener('click', () => this.nextStep());
        overlay.querySelector('.onboarding-finish').addEventListener('click', () => this.finishOnboarding());

        // Keyboard navigation
        document.addEventListener('keydown', this.handleOnboardingKeyboard.bind(this));
    }

    showOnboardingStep(stepIndex) {
        const step = this.helpData.onboarding[stepIndex];
        if (!step) return;

        const overlay = document.querySelector('.onboarding-overlay');
        const popup = overlay.querySelector('.onboarding-popup');
        const spotlight = overlay.querySelector('.onboarding-spotlight');

        // Update content
        overlay.querySelector('.onboarding-title').textContent = step.title;
        overlay.querySelector('.onboarding-content').textContent = step.content;
        overlay.querySelector('.current-step').textContent = stepIndex + 1;

        // Update progress
        const progress = ((stepIndex + 1) / this.helpData.onboarding.length) * 100;
        overlay.querySelector('.progress-fill').style.width = `${progress}%`;

        // Update buttons
        const prevBtn = overlay.querySelector('.onboarding-prev');
        const nextBtn = overlay.querySelector('.onboarding-next');
        const finishBtn = overlay.querySelector('.onboarding-finish');

        prevBtn.style.display = stepIndex > 0 ? 'block' : 'none';
        
        if (stepIndex === this.helpData.onboarding.length - 1) {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            finishBtn.style.display = 'none';
        }

        // Position spotlight and popup
        this.positionOnboardingElements(step, spotlight, popup);

        // Execute step action
        if (step.action) {
            step.action();
        }

        // Show overlay
        overlay.classList.add('active');
    }

    positionOnboardingElements(step, spotlight, popup) {
        const target = document.querySelector(step.target);
        if (!target) return;

        const rect = target.getBoundingClientRect();
        
        // Position spotlight
        spotlight.style.top = `${rect.top - 10}px`;
        spotlight.style.left = `${rect.left - 10}px`;
        spotlight.style.width = `${rect.width + 20}px`;
        spotlight.style.height = `${rect.height + 20}px`;

        // Position popup
        const popupRect = popup.getBoundingClientRect();
        let popupTop, popupLeft;

        switch (step.position) {
            case 'top':
                popupTop = rect.top - popupRect.height - 20;
                popupLeft = rect.left + (rect.width - popupRect.width) / 2;
                break;
            case 'bottom':
                popupTop = rect.bottom + 20;
                popupLeft = rect.left + (rect.width - popupRect.width) / 2;
                break;
            case 'left':
                popupTop = rect.top + (rect.height - popupRect.height) / 2;
                popupLeft = rect.left - popupRect.width - 20;
                break;
            case 'right':
                popupTop = rect.top + (rect.height - popupRect.height) / 2;
                popupLeft = rect.right + 20;
                break;
            default:
                popupTop = rect.bottom + 20;
                popupLeft = rect.left + (rect.width - popupRect.width) / 2;
        }

        // Keep popup within viewport
        popupTop = Math.max(20, Math.min(popupTop, window.innerHeight - popupRect.height - 20));
        popupLeft = Math.max(20, Math.min(popupLeft, window.innerWidth - popupRect.width - 20));

        popup.style.top = `${popupTop}px`;
        popup.style.left = `${popupLeft}px`;
    }

    nextStep() {
        if (this.currentStep < this.helpData.onboarding.length - 1) {
            this.currentStep++;
            this.showOnboardingStep(this.currentStep);
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showOnboardingStep(this.currentStep);
        }
    }

    skipOnboarding() {
        this.finishOnboarding();
    }

    finishOnboarding() {
        this.isOnboardingActive = false;
        localStorage.setItem('app-onboarding-completed', 'true');
        
        const overlay = document.querySelector('.onboarding-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }

        document.removeEventListener('keydown', this.handleOnboardingKeyboard);
        
        if (window.uiManager) {
            window.uiManager.showToast('Welcome! You\'re all set to start recording and analyzing your calls.', 'success');
        }
    }

    handleOnboardingKeyboard(event) {
        if (!this.isOnboardingActive) return;

        switch (event.key) {
            case 'Escape':
                this.skipOnboarding();
                break;
            case 'ArrowRight':
            case 'Enter':
                if (this.currentStep < this.helpData.onboarding.length - 1) {
                    this.nextStep();
                } else {
                    this.finishOnboarding();
                }
                break;
            case 'ArrowLeft':
                if (this.currentStep > 0) {
                    this.previousStep();
                }
                break;
        }
    }

    /**
     * Contextual Help
     */
    setupContextualHelp() {
        // Add help buttons to each tab
        document.querySelectorAll('.tab-content').forEach(tab => {
            const tabId = tab.id.replace('-tab', '');
            if (this.helpData.contextualHelp[tabId]) {
                this.addHelpButton(tab, tabId);
            }
        });
    }

    addHelpButton(container, tabId) {
        if (container.querySelector('.help-button')) return;

        const helpButton = document.createElement('button');
        helpButton.className = 'help-button btn btn-outline';
        helpButton.innerHTML = '<i class="fas fa-question-circle"></i> Help';
        helpButton.setAttribute('aria-label', `Get help for ${tabId} section`);
        
        helpButton.addEventListener('click', () => {
            this.showContextualHelp(tabId);
        });

        // Add to section header if it exists
        const sectionHeader = container.querySelector('.section-header');
        if (sectionHeader) {
            sectionHeader.appendChild(helpButton);
        } else {
            // Create a header
            const header = document.createElement('div');
            header.className = 'section-header';
            header.innerHTML = `<h2><i class="fas fa-info-circle"></i> ${tabId.charAt(0).toUpperCase() + tabId.slice(1)}</h2>`;
            header.appendChild(helpButton);
            container.insertBefore(header, container.firstChild);
        }
    }

    showContextualHelp(tabId) {
        const helpData = this.helpData.contextualHelp[tabId];
        if (!helpData) return;

        const content = `
            <div class="contextual-help">
                ${helpData.sections.map(section => `
                    <div class="help-section">
                        <h4>${section.title}</h4>
                        <p>${section.content}</p>
                    </div>
                `).join('')}
            </div>
        `;

        if (window.uiManager) {
            window.uiManager.showModal(helpData.title, content, [
                {
                    text: 'Start Tour',
                    class: 'btn-primary',
                    onclick: 'window.helpSystem.startOnboarding(); window.uiManager.closeModal(document.querySelector(".modal-overlay"));'
                },
                {
                    text: 'Close',
                    class: 'btn-outline',
                    onclick: 'window.uiManager.closeModal(document.querySelector(".modal-overlay"));'
                }
            ]);
        }
    }

    /**
     * Utility Methods
     */
    highlightElement(selector) {
        const element = document.querySelector(selector);
        if (!element) return;

        element.classList.add('highlight-pulse');
        setTimeout(() => {
            element.classList.remove('highlight-pulse');
        }, 2000);
    }

    switchToTab(tabName) {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) {
            setTimeout(() => {
                tab.click();
            }, 500);
        }
    }

    restartOnboarding() {
        localStorage.removeItem('app-onboarding-completed');
        this.startOnboarding();
    }

    addTooltip(selector, title, content, position = 'top') {
        this.helpData.tooltips[selector] = { title, content, position };
        
        // Apply to existing elements
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            this.addTooltipToElement(element, selector);
        });
    }
}

// Initialize Help System when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.helpSystem = new HelpSystem();
    });
} else {
    window.helpSystem = new HelpSystem();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HelpSystem;
}