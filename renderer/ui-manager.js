/**
 * UI Manager - Handles UI/UX enhancements, theme management, and accessibility
 */
class UIManager {
    constructor() {
        this.theme = 'auto';
        this.keyboardShortcuts = new Map();
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.isKeyboardNavigation = false;
        
        this.init();
    }

    /**
     * Initialize UI Manager
     */
    init() {
        this.setupThemeSystem();
        this.setupKeyboardNavigation();
        this.setupAccessibility();
        this.setupToastSystem();
        this.setupLoadingSystem();
        this.setupErrorHandling();
        this.registerDefaultShortcuts();
        
        console.log('UI Manager initialized');
    }

    /**
     * Theme Management
     */
    setupThemeSystem() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('app-theme') || 'auto';
        this.setTheme(savedTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (this.theme === 'auto') {
                    this.applyTheme();
                }
            });
        }

        // Create theme toggle if it doesn't exist
        this.createThemeToggle();
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('app-theme', theme);
        this.applyTheme();
    }

    applyTheme() {
        const root = document.documentElement;
        
        if (this.theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else if (this.theme === 'light') {
            root.setAttribute('data-theme', 'light');
        } else {
            // Auto theme - use system preference
            root.removeAttribute('data-theme');
        }

        // Update theme toggle icons
        this.updateThemeToggle();
    }

    createThemeToggle() {
        const headerControls = document.querySelector('.header-controls');
        if (!headerControls || document.querySelector('.theme-toggle')) return;

        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle focusable';
        themeToggle.setAttribute('type', 'button');
        themeToggle.setAttribute('aria-label', 'Toggle theme');
        themeToggle.setAttribute('title', 'Toggle theme (Ctrl+Shift+T)');
        themeToggle.innerHTML = `
            <i class="fas fa-sun theme-toggle-icon light-icon" aria-hidden="true"></i>
            <i class="fas fa-moon theme-toggle-icon dark-icon" aria-hidden="true"></i>
            <i class="fas fa-display theme-toggle-icon auto-icon" aria-hidden="true"></i>
        `;

        themeToggle.addEventListener('click', () => this.cycleTheme());
        themeToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.cycleTheme();
            }
        });

        // Insert before status indicator
        const statusIndicator = headerControls.querySelector('.status-indicator');
        headerControls.insertBefore(themeToggle, statusIndicator);
        this.updateThemeToggle();
    }

    cycleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.setTheme(themes[nextIndex]);
    }

    updateThemeToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (!toggle) return;

        const icons = toggle.querySelectorAll('.theme-toggle-icon');
        icons.forEach(icon => icon.classList.remove('active'));

        const activeIcon = toggle.querySelector(`.${this.theme}-icon`);
        if (activeIcon) {
            activeIcon.classList.add('active');
        }

        toggle.setAttribute('aria-label', `Current theme: ${this.theme}. Click to change.`);
    }

    /**
     * Keyboard Navigation
     */
    setupKeyboardNavigation() {
        // Detect keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.isKeyboardNavigation = true;
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            this.isKeyboardNavigation = false;
            document.body.classList.remove('keyboard-navigation');
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });
    }

    registerShortcut(key, callback, description) {
        this.keyboardShortcuts.set(key, { callback, description });
    }

    handleKeyboardShortcut(event) {
        const key = this.getShortcutKey(event);
        const shortcut = this.keyboardShortcuts.get(key);
        
        if (shortcut && !this.isInputFocused()) {
            event.preventDefault();
            shortcut.callback(event);
        }
    }

    getShortcutKey(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        parts.push(event.key);
        return parts.join('+');
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        return activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
    }

    registerDefaultShortcuts() {
        // Recording shortcuts
        this.registerShortcut('F9', () => {
            const recordBtn = document.querySelector('.record-btn');
            if (recordBtn) recordBtn.click();
        }, 'Toggle recording');

        this.registerShortcut('F10', () => {
            const recordBtn = document.querySelector('.record-btn');
            if (recordBtn && recordBtn.textContent.includes('Stop')) {
                recordBtn.click();
            }
        }, 'Force stop recording');

        // AI shortcuts

        // Navigation shortcuts
        this.registerShortcut('Ctrl+1', () => this.switchTab('recording'), 'Go to Recording tab');
        this.registerShortcut('Ctrl+2', () => this.switchTab('settings'), 'Go to AI Settings tab');
        this.registerShortcut('Ctrl+3', () => this.switchTab('history'), 'Go to History tab');
        this.registerShortcut('Ctrl+4', () => this.switchTab('templates'), 'Go to Templates tab');

        // Theme shortcut
        this.registerShortcut('Ctrl+Shift+t', () => this.cycleTheme(), 'Toggle theme');

        // Help shortcut
        this.registerShortcut('F1', () => this.showKeyboardShortcuts(), 'Show keyboard shortcuts');
        this.registerShortcut('?', () => this.showKeyboardShortcuts(), 'Show keyboard shortcuts');
    }

    switchTab(tabName) {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) tab.click();
    }

    showKeyboardShortcuts() {
        const shortcuts = Array.from(this.keyboardShortcuts.entries());
        const shortcutList = shortcuts.map(([key, { description }]) => 
            `<div class="shortcut-item">
                <kbd class="keyboard-hint">${key.replace('Ctrl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')}</kbd>
                <span>${description}</span>
            </div>`
        ).join('');

        this.showModal('Keyboard Shortcuts', `
            <div class="shortcuts-list">
                ${shortcutList}
            </div>
            <style>
                .shortcuts-list { display: grid; gap: 1rem; }
                .shortcut-item { display: flex; justify-content: space-between; align-items: center; }
                .shortcut-item kbd { margin-right: 1rem; }
            </style>
        `);
    }

    /**
     * Accessibility Features
     */
    setupAccessibility() {
        // Add skip links
        this.addSkipLinks();
        
        // Setup ARIA live regions
        this.setupLiveRegions();
        
        // Enhance form accessibility
        this.enhanceFormAccessibility();
        
        // Setup focus management
        this.setupFocusManagement();
    }

    addSkipLinks() {
        if (document.querySelector('.skip-link')) return;

        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add main content ID if it doesn't exist
        const mainContent = document.querySelector('.content-area');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
        }
    }

    setupLiveRegions() {
        // Create live region for announcements
        if (!document.querySelector('#live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'live-region';
            liveRegion.className = 'live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }
    }

    announceToScreenReader(message) {
        const liveRegion = document.querySelector('#live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    enhanceFormAccessibility() {
        // Add proper labels and descriptions
        document.querySelectorAll('input, select, textarea').forEach(input => {
            if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
                const label = input.closest('.form-group')?.querySelector('label');
                if (label && !label.getAttribute('for')) {
                    const id = input.id || `input-${Math.random().toString(36).substr(2, 9)}`;
                    input.id = id;
                    label.setAttribute('for', id);
                }
            }
        });
    }

    setupFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) {
                    this.trapFocus(e, modal);
                }
            }
        });
    }

    trapFocus(event, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Toast Notification System
     */
    setupToastSystem() {
        if (!document.querySelector('.toast-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container';
            this.toastContainer.setAttribute('aria-live', 'polite');
            document.body.appendChild(this.toastContainer);
        } else {
            this.toastContainer = document.querySelector('.toast-container');
        }
    }

    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="${icons[type]} toast-icon" aria-hidden="true"></i>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
            <div class="toast-progress"></div>
        `;

        // Close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // Auto-remove after duration
        const progressBar = toast.querySelector('.toast-progress');
        if (duration > 0) {
            progressBar.style.animationDuration = `${duration}ms`;
            setTimeout(() => this.removeToast(toast), duration);
        } else {
            progressBar.style.display = 'none';
        }

        this.toastContainer.appendChild(toast);
        
        // Announce to screen readers
        this.announceToScreenReader(message);

        return toast;
    }

    removeToast(toast) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    /**
     * Loading System
     */
    setupLoadingSystem() {
        if (!document.querySelector('.loading-overlay')) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'loading-overlay';
            this.loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <h3 class="loading-title">Loading...</h3>
                    <p class="loading-message">Please wait while we process your request.</p>
                </div>
            `;
            document.body.appendChild(this.loadingOverlay);
        } else {
            this.loadingOverlay = document.querySelector('.loading-overlay');
        }
    }

    showLoading(title = 'Loading...', message = 'Please wait while we process your request.') {
        const titleEl = this.loadingOverlay.querySelector('.loading-title');
        const messageEl = this.loadingOverlay.querySelector('.loading-message');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        this.loadingOverlay.classList.add('active');
        this.loadingOverlay.setAttribute('aria-hidden', 'false');
        
        // Announce to screen readers
        this.announceToScreenReader(`${title}. ${message}`);
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('active');
        this.loadingOverlay.setAttribute('aria-hidden', 'true');
    }

    /**
     * Progress Management
     */
    updateProgress(selector, progress, text = '') {
        const progressBar = document.querySelector(selector);
        if (!progressBar) return;

        const fill = progressBar.querySelector('.progress-fill');
        const textEl = progressBar.querySelector('.progress-value');

        if (fill) {
            fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }

        if (textEl && text) {
            textEl.textContent = text;
        }

        // Announce progress to screen readers at intervals
        if (progress % 25 === 0 || progress === 100) {
            this.announceToScreenReader(`Progress: ${progress}%`);
        }
    }

    /**
     * Error Handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError('An unexpected error occurred. Please try again.');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An error occurred while processing your request.');
        });
    }

    showError(message, title = 'Error', actions = []) {
        const errorHtml = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle error-message-icon" aria-hidden="true"></i>
                <div class="error-message-content">
                    <div class="error-message-title">${title}</div>
                    <div class="error-message-description">${message}</div>
                    ${actions.length > 0 ? `
                        <div class="error-message-actions">
                            ${actions.map(action => `
                                <button class="btn btn-sm ${action.class || 'btn-primary'}" 
                                        onclick="${action.onclick}">
                                    ${action.text}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Show as toast for non-critical errors
        this.showToast(message, 'error', 8000);

        return errorHtml;
    }

    showSuccess(message, title = 'Success') {
        this.showToast(message, 'success', 4000);
    }

    showWarning(message, title = 'Warning') {
        this.showToast(message, 'warning', 6000);
    }

    showInfo(message, title = 'Info') {
        this.showToast(message, 'info', 4000);
    }

    /**
     * Modal Management
     */
    showModal(title, content, actions = []) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modal-title">${title}</h2>
                    <button class="modal-close" aria-label="Close modal">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-footer">
                        ${actions.map(action => `
                            <button class="btn ${action.class || 'btn-primary'}" 
                                    onclick="${action.onclick}">
                                ${action.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Close handlers
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal(modal));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeModal(modal);
            }
        });

        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => {
            modal.classList.add('active');
            // Focus first focusable element
            const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 10);

        return modal;
    }

    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    /**
     * Utility Methods
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize UI Manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.uiManager = new UIManager();
    });
} else {
    window.uiManager = new UIManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}