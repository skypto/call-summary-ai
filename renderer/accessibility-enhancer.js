/**
 * Accessibility Enhancer - Ensures comprehensive accessibility compliance
 */
class AccessibilityEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.enhanceExistingElements();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupFocusManagement();
        this.monitorDynamicContent();
        
        console.log('Accessibility Enhancer initialized');
    }

    /**
     * Enhance existing elements with accessibility attributes
     */
    enhanceExistingElements() {
        // Enhance buttons
        document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach(button => {
            const text = button.textContent.trim();
            const icon = button.querySelector('i');
            
            if (!text && icon) {
                // Button with only icon - add aria-label based on icon class
                const iconClass = icon.className;
                let label = this.getAriaLabelFromIcon(iconClass);
                if (label) {
                    button.setAttribute('aria-label', label);
                }
            }
            
            // Add role if not present
            if (!button.getAttribute('role')) {
                button.setAttribute('role', 'button');
            }
        });

        // Enhance form controls
        document.querySelectorAll('input, select, textarea').forEach(control => {
            // Ensure all form controls have labels
            if (!control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')) {
                const label = this.findLabelForControl(control);
                if (label) {
                    const labelId = label.id || `label-${this.generateId()}`;
                    label.id = labelId;
                    control.setAttribute('aria-labelledby', labelId);
                }
            }

            // Add required indicator for screen readers
            if (control.hasAttribute('required')) {
                const currentLabel = control.getAttribute('aria-label') || '';
                if (!currentLabel.includes('required')) {
                    control.setAttribute('aria-label', `${currentLabel} (required)`.trim());
                }
            }

            // Enhance error states
            if (control.classList.contains('error') || control.getAttribute('aria-invalid') === 'true') {
                this.addErrorDescription(control);
            }
        });

        // Enhance navigation
        document.querySelectorAll('.nav-tab').forEach((tab, index) => {
            if (!tab.getAttribute('tabindex')) {
                tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            }
        });

        // Enhance modals
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (!modal.getAttribute('role')) {
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
            }
        });

        // Enhance progress bars
        document.querySelectorAll('.progress-bar').forEach(progressBar => {
            if (!progressBar.getAttribute('role')) {
                progressBar.setAttribute('role', 'progressbar');
                progressBar.setAttribute('aria-valuemin', '0');
                progressBar.setAttribute('aria-valuemax', '100');
                progressBar.setAttribute('aria-valuenow', '0');
            }
        });

        // Enhance status indicators
        document.querySelectorAll('.status-indicator').forEach(indicator => {
            if (!indicator.getAttribute('role')) {
                indicator.setAttribute('role', 'status');
                indicator.setAttribute('aria-live', 'polite');
            }
        });
    }

    /**
     * Setup comprehensive keyboard navigation
     */
    setupKeyboardNavigation() {
        // Tab navigation for custom components
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabNavigation(e);
            } else if (e.key === 'Enter' || e.key === ' ') {
                this.handleActivation(e);
            } else if (e.key.startsWith('Arrow')) {
                this.handleArrowNavigation(e);
            }
        });

        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.handleEscape(e);
            }
        });
    }

    handleTabNavigation(event) {
        const activeElement = document.activeElement;
        
        // Handle tab navigation within tab panels
        if (activeElement && activeElement.classList.contains('nav-tab')) {
            const tabs = Array.from(document.querySelectorAll('.nav-tab'));
            const currentIndex = tabs.indexOf(activeElement);
            
            if (event.shiftKey) {
                // Shift+Tab - go to previous tab
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                tabs[prevIndex].focus();
                event.preventDefault();
            } else {
                // Tab - go to next tab
                const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                tabs[nextIndex].focus();
                event.preventDefault();
            }
        }
    }

    handleActivation(event) {
        const target = event.target;
        
        // Handle space/enter on custom elements
        if (target.classList.contains('nav-tab') || 
            target.classList.contains('category-tab') ||
            target.classList.contains('template-card')) {
            target.click();
            event.preventDefault();
        }
    }

    handleArrowNavigation(event) {
        const activeElement = document.activeElement;
        
        // Arrow navigation for tab lists
        if (activeElement && activeElement.classList.contains('nav-tab')) {
            const tabs = Array.from(document.querySelectorAll('.nav-tab'));
            const currentIndex = tabs.indexOf(activeElement);
            let newIndex;

            switch (event.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                    break;
                default:
                    return;
            }

            tabs[newIndex].focus();
            event.preventDefault();
        }

        // Arrow navigation for template grid
        if (activeElement && activeElement.classList.contains('template-card')) {
            const cards = Array.from(document.querySelectorAll('.template-card:not([style*="display: none"])'));
            const currentIndex = cards.indexOf(activeElement);
            let newIndex;

            switch (event.key) {
                case 'ArrowLeft':
                    newIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
                    break;
                case 'ArrowRight':
                    newIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
                    break;
                case 'ArrowUp':
                    // Move up one row (assuming 3 columns)
                    newIndex = currentIndex - 3;
                    if (newIndex < 0) newIndex = currentIndex;
                    break;
                case 'ArrowDown':
                    // Move down one row
                    newIndex = currentIndex + 3;
                    if (newIndex >= cards.length) newIndex = currentIndex;
                    break;
                default:
                    return;
            }

            if (cards[newIndex]) {
                cards[newIndex].focus();
                event.preventDefault();
            }
        }
    }

    handleEscape(event) {
        // Close modals
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            const closeBtn = activeModal.querySelector('.modal-close');
            if (closeBtn) closeBtn.click();
            event.preventDefault();
            return;
        }

        // Close dropdowns or other overlays
        const activeDropdown = document.querySelector('.dropdown.active');
        if (activeDropdown) {
            activeDropdown.classList.remove('active');
            event.preventDefault();
        }
    }

    /**
     * Setup screen reader support
     */
    setupScreenReaderSupport() {
        // Create live regions if they don't exist
        this.ensureLiveRegions();

        // Announce page changes
        this.setupPageChangeAnnouncements();

        // Announce dynamic content changes
        this.setupContentChangeAnnouncements();
    }

    ensureLiveRegions() {
        const regions = [
            { id: 'sr-live-polite', level: 'polite' },
            { id: 'sr-live-assertive', level: 'assertive' },
            { id: 'sr-status', level: 'polite', role: 'status' }
        ];

        regions.forEach(region => {
            if (!document.getElementById(region.id)) {
                const liveRegion = document.createElement('div');
                liveRegion.id = region.id;
                liveRegion.className = 'sr-only';
                liveRegion.setAttribute('aria-live', region.level);
                if (region.role) {
                    liveRegion.setAttribute('role', region.role);
                }
                document.body.appendChild(liveRegion);
            }
        });
    }

    announceToScreenReader(message, level = 'polite') {
        const regionId = level === 'assertive' ? 'sr-live-assertive' : 'sr-live-polite';
        const region = document.getElementById(regionId);
        
        if (region) {
            region.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }

    announceStatus(message) {
        const statusRegion = document.getElementById('sr-status');
        if (statusRegion) {
            statusRegion.textContent = message;
            setTimeout(() => {
                statusRegion.textContent = '';
            }, 2000);
        }
    }

    setupPageChangeAnnouncements() {
        // Announce tab changes
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                const tabName = e.target.textContent.trim();
                setTimeout(() => {
                    this.announceToScreenReader(`Switched to ${tabName} tab`);
                }, 100);
            }
        });
    }

    setupContentChangeAnnouncements() {
        // Announce when content is loaded
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleNewContent(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    handleNewContent(element) {
        // Announce important new content
        if (element.classList && element.classList.contains('transcription-result')) {
            this.announceToScreenReader('Transcription completed and ready for review');
        } else if (element.classList && element.classList.contains('analysis-results')) {
            this.announceToScreenReader('AI analysis completed');
        } else if (element.classList && element.classList.contains('toast')) {
            // Toast messages are already announced by the UI Manager
            return;
        }

        // Enhance new elements
        this.enhanceElement(element);
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Focus trap for modals
        document.addEventListener('focusin', (e) => {
            const activeModal = document.querySelector('.modal-overlay.active');
            if (activeModal && !activeModal.contains(e.target)) {
                const firstFocusable = activeModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            }
        });

        // Restore focus when modals close
        this.setupFocusRestoration();
    }

    setupFocusRestoration() {
        let lastFocusedElement = null;

        // Store focus before modal opens
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal-trigger]')) {
                lastFocusedElement = e.target;
            }
        });

        // Restore focus when modal closes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList.contains('modal-overlay') && 
                        !target.classList.contains('active') && 
                        lastFocusedElement) {
                        setTimeout(() => {
                            lastFocusedElement.focus();
                            lastFocusedElement = null;
                        }, 100);
                    }
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        });
    }

    /**
     * Monitor and enhance dynamic content
     */
    monitorDynamicContent() {
        // Set up mutation observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.enhanceElement(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    enhanceElement(element) {
        // Enhance buttons
        const buttons = element.querySelectorAll ? element.querySelectorAll('button') : [];
        buttons.forEach(button => {
            if (!button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')) {
                const text = button.textContent.trim();
                const icon = button.querySelector('i');
                
                if (!text && icon) {
                    const label = this.getAriaLabelFromIcon(icon.className);
                    if (label) {
                        button.setAttribute('aria-label', label);
                    }
                }
            }
        });

        // Enhance form controls
        const controls = element.querySelectorAll ? element.querySelectorAll('input, select, textarea') : [];
        controls.forEach(control => {
            if (!control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')) {
                const label = this.findLabelForControl(control);
                if (label) {
                    const labelId = label.id || `label-${this.generateId()}`;
                    label.id = labelId;
                    control.setAttribute('aria-labelledby', labelId);
                }
            }
        });
    }

    /**
     * Utility methods
     */
    getAriaLabelFromIcon(iconClass) {
        const iconMap = {
            'fa-play': 'Play',
            'fa-pause': 'Pause',
            'fa-stop': 'Stop',
            'fa-record-vinyl': 'Record',
            'fa-microphone': 'Microphone',
            'fa-volume-up': 'Volume',
            'fa-cog': 'Settings',
            'fa-history': 'History',
            'fa-magic': 'Templates',
            'fa-save': 'Save',
            'fa-download': 'Download',
            'fa-upload': 'Upload',
            'fa-copy': 'Copy',
            'fa-edit': 'Edit',
            'fa-trash': 'Delete',
            'fa-times': 'Close',
            'fa-check': 'Confirm',
            'fa-plus': 'Add',
            'fa-minus': 'Remove',
            'fa-search': 'Search',
            'fa-filter': 'Filter',
            'fa-sort': 'Sort',
            'fa-refresh': 'Refresh',
            'fa-sync-alt': 'Refresh',
            'fa-info-circle': 'Information',
            'fa-question-circle': 'Help',
            'fa-exclamation-triangle': 'Warning',
            'fa-exclamation-circle': 'Error'
        };

        for (const [iconClass, label] of Object.entries(iconMap)) {
            if (iconClass.includes(iconClass)) {
                return label;
            }
        }

        return null;
    }

    findLabelForControl(control) {
        // Look for associated label
        if (control.id) {
            const label = document.querySelector(`label[for="${control.id}"]`);
            if (label) return label;
        }

        // Look for parent label
        const parentLabel = control.closest('label');
        if (parentLabel) return parentLabel;

        // Look for sibling label
        const formGroup = control.closest('.form-group');
        if (formGroup) {
            const label = formGroup.querySelector('label');
            if (label) return label;
        }

        return null;
    }

    addErrorDescription(control) {
        const errorId = `error-${control.id || this.generateId()}`;
        let errorElement = document.getElementById(errorId);

        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'form-error';
            errorElement.setAttribute('role', 'alert');
            
            const formGroup = control.closest('.form-group');
            if (formGroup) {
                formGroup.appendChild(errorElement);
            } else {
                control.parentNode.insertBefore(errorElement, control.nextSibling);
            }
        }

        control.setAttribute('aria-describedby', errorId);
        control.setAttribute('aria-invalid', 'true');
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Public API methods
     */
    announceMessage(message, level = 'polite') {
        this.announceToScreenReader(message, level);
    }

    announceStatusChange(message) {
        this.announceStatus(message);
    }

    enhanceNewElement(element) {
        this.enhanceElement(element);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityEnhancer = new AccessibilityEnhancer();
    });
} else {
    window.accessibilityEnhancer = new AccessibilityEnhancer();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityEnhancer;
}