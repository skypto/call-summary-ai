// Progress Manager for Call Summary AI
// Handles real-time progress tracking, status management, and UI updates

class ProgressManager {
    constructor() {
        this.activeOperations = new Map(); // Track active operations
        this.progressCallbacks = new Map(); // Store progress update callbacks
        this.statusPersistence = new Map(); // Persist status for recovery
        this.eventListeners = new Map(); // Event listeners for progress updates
    }

    /**
     * Start tracking a new operation
     */
    startOperation(operationId, type, description) {
        const operation = {
            id: operationId,
            type: type, // 'transcription', 'analysis', 'upload', etc.
            description: description,
            status: 'initializing',
            progress: 0,
            message: 'Starting...',
            startTime: Date.now(),
            lastUpdate: Date.now(),
            cancellable: true,
            retryable: false,
            error: null
        };

        this.activeOperations.set(operationId, operation);
        this.persistStatus(operationId, operation);
        this.notifyListeners(operationId, operation);

        return operation;
    }

    /**
     * Update operation progress
     */
    updateProgress(operationId, status, progress, message, metadata = {}) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            console.warn(`Operation ${operationId} not found for progress update`);
            return;
        }

        // Update operation data
        operation.status = status;
        operation.progress = Math.max(0, Math.min(100, progress)); // Clamp between 0-100
        operation.message = message;
        operation.lastUpdate = Date.now();
        
        // Add metadata
        Object.assign(operation, metadata);

        // Update cancellable/retryable flags based on status
        switch (status) {
            case 'completed':
            case 'failed':
            case 'cancelled':
                operation.cancellable = false;
                operation.retryable = status === 'failed';
                break;
            case 'processing':
            case 'uploading':
            case 'downloading':
                operation.cancellable = true;
                operation.retryable = false;
                break;
        }

        this.activeOperations.set(operationId, operation);
        this.persistStatus(operationId, operation);
        this.notifyListeners(operationId, operation);

        // Auto-cleanup completed operations after delay
        if (status === 'completed') {
            setTimeout(() => {
                this.completeOperation(operationId);
            }, 5000); // Keep completed operations visible for 5 seconds
        }
    }

    /**
     * Mark operation as failed with error details
     */
    failOperation(operationId, error, retryable = true) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        operation.status = 'failed';
        operation.progress = 0;
        operation.message = `Failed: ${error.message || error}`;
        operation.error = error;
        operation.cancellable = false;
        operation.retryable = retryable;
        operation.lastUpdate = Date.now();

        this.activeOperations.set(operationId, operation);
        this.persistStatus(operationId, operation);
        this.notifyListeners(operationId, operation);
    }

    /**
     * Cancel an active operation
     */
    async cancelOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (!operation || !operation.cancellable) {
            return { success: false, message: 'Operation cannot be cancelled' };
        }

        try {
            // Call operation-specific cancellation logic
            const cancelResult = await this.performCancellation(operation);
            
            if (cancelResult.success) {
                operation.status = 'cancelled';
                operation.progress = 0;
                operation.message = 'Cancelled by user';
                operation.cancellable = false;
                operation.retryable = true;
                operation.lastUpdate = Date.now();

                this.activeOperations.set(operationId, operation);
                this.persistStatus(operationId, operation);
                this.notifyListeners(operationId, operation);

                return { success: true, message: 'Operation cancelled successfully' };
            } else {
                return cancelResult;
            }
        } catch (error) {
            console.error('Error cancelling operation:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Perform operation-specific cancellation
     */
    async performCancellation(operation) {
        switch (operation.type) {
            case 'transcription':
                // Cancel transcription job
                if (window.TranscriptionService) {
                    const transcriptionService = new window.TranscriptionService();
                    return await transcriptionService.cancelTranscription(operation.id);
                }
                break;
            
            case 'upload':
            case 'download':
                // For file operations, we can't really cancel fetch requests
                // but we can mark them as cancelled
                return { success: true, message: 'File operation cancelled' };
            
            default:
                return { success: true, message: 'Operation cancelled' };
        }

        return { success: true, message: 'Operation cancelled' };
    }

    /**
     * Complete and cleanup operation
     */
    completeOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (operation) {
            this.notifyListeners(operationId, { ...operation, status: 'cleanup' });
        }

        this.activeOperations.delete(operationId);
        this.progressCallbacks.delete(operationId);
        this.clearPersistedStatus(operationId);
    }

    /**
     * Get operation status
     */
    getOperationStatus(operationId) {
        return this.activeOperations.get(operationId) || null;
    }

    /**
     * Get all active operations
     */
    getActiveOperations() {
        return Array.from(this.activeOperations.values());
    }

    /**
     * Get operations by type
     */
    getOperationsByType(type) {
        return Array.from(this.activeOperations.values()).filter(op => op.type === type);
    }

    /**
     * Register progress callback for specific operation
     */
    onProgress(operationId, callback) {
        if (!this.progressCallbacks.has(operationId)) {
            this.progressCallbacks.set(operationId, []);
        }
        this.progressCallbacks.get(operationId).push(callback);
    }

    /**
     * Register event listener for all operations
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify progress callbacks and event listeners
     */
    notifyListeners(operationId, operation) {
        // Notify operation-specific callbacks
        const callbacks = this.progressCallbacks.get(operationId);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(operation);
                } catch (error) {
                    console.error('Error in progress callback:', error);
                }
            });
        }

        // Notify global event listeners
        const eventType = `progress_${operation.status}`;
        const listeners = this.eventListeners.get(eventType) || [];
        const allListeners = this.eventListeners.get('progress') || [];
        
        [...listeners, ...allListeners].forEach(callback => {
            try {
                callback(operation);
            } catch (error) {
                console.error('Error in event listener:', error);
            }
        });
    }

    /**
     * Persist operation status for recovery
     */
    persistStatus(operationId, operation) {
        try {
            const persistData = {
                id: operation.id,
                type: operation.type,
                description: operation.description,
                status: operation.status,
                progress: operation.progress,
                message: operation.message,
                startTime: operation.startTime,
                lastUpdate: operation.lastUpdate,
                retryable: operation.retryable
            };

            localStorage.setItem(`progress_${operationId}`, JSON.stringify(persistData));
            this.statusPersistence.set(operationId, persistData);
        } catch (error) {
            console.warn('Failed to persist operation status:', error);
        }
    }

    /**
     * Clear persisted status
     */
    clearPersistedStatus(operationId) {
        try {
            localStorage.removeItem(`progress_${operationId}`);
            this.statusPersistence.delete(operationId);
        } catch (error) {
            console.warn('Failed to clear persisted status:', error);
        }
    }

    /**
     * Recover operations from persistence (on app restart)
     */
    recoverOperations() {
        const recovered = [];
        
        try {
            // Scan localStorage for persisted operations
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('progress_')) {
                    const operationId = key.replace('progress_', '');
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    // Only recover operations that were in progress
                    if (data.status === 'processing' || data.status === 'uploading' || data.status === 'downloading') {
                        // Mark as failed since the app was restarted
                        data.status = 'failed';
                        data.message = 'Operation interrupted by app restart';
                        data.retryable = true;
                        data.cancellable = false;
                        
                        this.activeOperations.set(operationId, data);
                        recovered.push(data);
                    } else {
                        // Clean up completed/failed operations
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.error('Error recovering operations:', error);
        }

        return recovered;
    }

    /**
     * Create progress UI element
     */
    createProgressElement(operationId, container) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return null;

        const progressElement = document.createElement('div');
        progressElement.className = 'progress-item';
        progressElement.id = `progress-${operationId}`;
        
        progressElement.innerHTML = `
            <div class="progress-header">
                <span class="progress-title">${operation.description}</span>
                <span class="progress-status">${operation.status}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${operation.progress}%"></div>
                </div>
                <span class="progress-percentage">${Math.round(operation.progress)}%</span>
            </div>
            <div class="progress-message">${operation.message}</div>
            <div class="progress-actions">
                ${operation.cancellable ? `<button class="btn-cancel" onclick="progressManager.cancelOperation('${operationId}')">Cancel</button>` : ''}
                ${operation.retryable ? `<button class="btn-retry" onclick="progressManager.retryOperation('${operationId}')">Retry</button>` : ''}
            </div>
        `;

        // Add status-specific styling
        progressElement.classList.add(`status-${operation.status}`);

        if (container) {
            container.appendChild(progressElement);
        }

        // Register for updates
        this.onProgress(operationId, (updatedOperation) => {
            this.updateProgressElement(operationId, updatedOperation);
        });

        return progressElement;
    }

    /**
     * Update existing progress UI element
     */
    updateProgressElement(operationId, operation) {
        const element = document.getElementById(`progress-${operationId}`);
        if (!element) return;

        // Update progress bar
        const progressFill = element.querySelector('.progress-fill');
        const progressPercentage = element.querySelector('.progress-percentage');
        if (progressFill && progressPercentage) {
            progressFill.style.width = `${operation.progress}%`;
            progressPercentage.textContent = `${Math.round(operation.progress)}%`;
        }

        // Update status and message
        const statusElement = element.querySelector('.progress-status');
        const messageElement = element.querySelector('.progress-message');
        if (statusElement) statusElement.textContent = operation.status;
        if (messageElement) messageElement.textContent = operation.message;

        // Update actions
        const actionsElement = element.querySelector('.progress-actions');
        if (actionsElement) {
            actionsElement.innerHTML = `
                ${operation.cancellable ? `<button class="btn-cancel" onclick="progressManager.cancelOperation('${operationId}')">Cancel</button>` : ''}
                ${operation.retryable ? `<button class="btn-retry" onclick="progressManager.retryOperation('${operationId}')">Retry</button>` : ''}
            `;
        }

        // Update styling
        element.className = `progress-item status-${operation.status}`;

        // Auto-remove completed operations
        if (operation.status === 'cleanup') {
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300); // Small delay for smooth removal
        }
    }

    /**
     * Show progress in notification area
     */
    showProgressNotification(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        // Create or update notification
        const notificationId = `progress-notification-${operationId}`;
        let notification = document.getElementById(notificationId);
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = notificationId;
            notification.className = 'progress-notification';
            
            const notificationContainer = document.querySelector('.notification-container') || document.body;
            notificationContainer.appendChild(notification);
        }

        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${operation.description}</div>
                <div class="notification-progress">
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${operation.progress}%"></div>
                    </div>
                    <span class="mini-progress-text">${operation.message}</span>
                </div>
            </div>
            ${operation.cancellable ? `<button class="notification-cancel" onclick="progressManager.cancelOperation('${operationId}')">×</button>` : ''}
        `;

        notification.className = `progress-notification status-${operation.status}`;

        // Auto-remove completed notifications
        if (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }

    /**
     * Retry a failed operation (placeholder - implement in specific contexts)
     */
    async retryOperation(operationId) {
        const operation = this.activeOperations.get(operationId);
        if (!operation || !operation.retryable) {
            return { success: false, message: 'Operation cannot be retried' };
        }

        // This is a placeholder - actual retry logic should be implemented
        // in the specific context where the operation was started
        console.log(`Retry requested for operation ${operationId}`);
        
        // Emit retry event for listeners to handle
        const retryListeners = this.eventListeners.get('retry') || [];
        retryListeners.forEach(callback => {
            try {
                callback(operation);
            } catch (error) {
                console.error('Error in retry listener:', error);
            }
        });

        return { success: true, message: 'Retry initiated' };
    }

    /**
     * Clear all completed operations
     */
    clearCompleted() {
        const completed = [];
        for (const [operationId, operation] of this.activeOperations.entries()) {
            if (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') {
                completed.push(operationId);
            }
        }

        completed.forEach(operationId => {
            this.completeOperation(operationId);
        });

        return completed.length;
    }

    /**
     * Get operation statistics
     */
    getStatistics() {
        const operations = Array.from(this.activeOperations.values());
        
        return {
            total: operations.length,
            active: operations.filter(op => op.status === 'processing' || op.status === 'uploading' || op.status === 'downloading').length,
            completed: operations.filter(op => op.status === 'completed').length,
            failed: operations.filter(op => op.status === 'failed').length,
            cancelled: operations.filter(op => op.status === 'cancelled').length
        };
    }
}

// Create global instance
window.progressManager = new ProgressManager();

// Export for use in other modules
window.ProgressManager = ProgressManager;