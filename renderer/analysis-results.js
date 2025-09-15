/**
 * Analysis Results Interface
 * Handles display, formatting, export, and history of analysis results
 */
class AnalysisResultsManager {
    constructor() {
        this.currentResults = [];
        this.resultsHistory = [];
        this.storageKey = 'analysisResultsHistory';
        this.maxHistoryItems = 100;
        this.init();
    }

    init() {
        this.loadResultsHistory();
        this.setupEventListeners();
    }

    /**
     * Display analysis results
     */
    displayResults(results, templateName) {
        const resultsContainer = document.getElementById('analysisResults');
        const resultsTitle = document.getElementById('resultsTitle');
        const resultsText = document.getElementById('resultsText');

        if (!resultsContainer || !resultsTitle || !resultsText) {
            console.error('Analysis results elements not found');
            return;
        }

        // Store current results
        this.currentResults = Array.isArray(results) ? results : [results];
        
        // Update title
        resultsTitle.textContent = templateName || 'Analysis Results';

        // Format and display results
        const formattedResults = this.formatResults(this.currentResults);
        resultsText.innerHTML = formattedResults.html;

        // Show results container
        resultsContainer.style.display = 'block';

        // Add to history
        this.addToHistory({
            id: this.generateId(),
            templateName: templateName || 'Analysis',
            results: this.currentResults,
            timestamp: new Date().toISOString(),
            recordingId: this.getCurrentRecordingId()
        });

        // Enable export buttons
        this.updateActionButtons(true);
    }

    /**
     * Format results for display
     */
    formatResults(results) {
        if (!Array.isArray(results)) {
            results = [results];
        }

        let html = '';
        let text = '';

        results.forEach((result, index) => {
            if (result.success) {
                const formattedResult = this.formatSingleResult(result);
                html += formattedResult.html;
                text += formattedResult.text;
                
                if (index < results.length - 1) {
                    html += '<hr class="result-separator">';
                    text += '\n' + '='.repeat(50) + '\n';
                }
            } else {
                html += this.formatError(result);
                text += `Error: ${result.error}\n`;
            }
        });

        return { html, text };
    }

    /**
     * Format single result
     */
    formatSingleResult(result) {
        const timestamp = result.processedAt ? 
            new Date(result.processedAt).toLocaleString() : 
            new Date().toLocaleString();

        const html = `
            <div class="analysis-result-item" data-result-id="${result.id || 'unknown'}">
                <div class="result-header">
                    <div class="result-info">
                        <h4 class="result-title">${result.template || 'Analysis'}</h4>
                        <div class="result-meta">
                            <span class="provider-badge ${result.provider || 'unknown'}">${result.provider || 'Unknown'}</span>
                            <span class="timestamp">${timestamp}</span>
                        </div>
                    </div>
                    <div class="result-actions">
                        <button class="btn btn-sm btn-outline" onclick="analysisResults.copyResult('${result.id || 'current'}')" title="Copy this result">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="analysisResults.exportResult('${result.id || 'current'}')" title="Export this result">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
                <div class="result-content">
                    ${this.formatContent(result.result || result.content || '')}
                </div>
            </div>
        `;

        const text = `${result.template || 'Analysis'}\nProcessed with ${result.provider || 'Unknown'} at ${timestamp}\n\n${result.result || result.content || ''}\n`;

        return { html, text };
    }

    /**
     * Format content with syntax highlighting and structure
     */
    formatContent(content) {
        if (!content) return '<p class="no-content">No content available</p>';

        // Convert markdown-like formatting to HTML
        let formatted = content
            // Headers
            .replace(/^### (.*$)/gm, '<h5 class="result-h3">$1</h5>')
            .replace(/^## (.*$)/gm, '<h4 class="result-h2">$1</h4>')
            .replace(/^# (.*$)/gm, '<h3 class="result-h1">$1</h3>')
            
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Lists
            .replace(/^[\s]*[-*+] (.*$)/gm, '<li>$1</li>')
            .replace(/^[\s]*\d+\. (.*$)/gm, '<li class="numbered">$1</li>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            
            // Links (basic)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            
            // Line breaks and paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // Wrap in paragraphs if not already wrapped
        if (!formatted.startsWith('<')) {
            formatted = '<p>' + formatted + '</p>';
        }

        // Clean up list formatting
        formatted = formatted.replace(/(<li>.*?<\/li>)/gs, (match) => {
            return '<ul class="result-list">' + match + '</ul>';
        });

        formatted = formatted.replace(/(<li class="numbered">.*?<\/li>)/gs, (match) => {
            return '<ol class="result-list numbered">' + match.replace(/class="numbered"/g, '') + '</ol>';
        });

        return formatted;
    }

    /**
     * Format error result
     */
    formatError(result) {
        return `
            <div class="analysis-result-error">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Analysis Failed</h4>
                </div>
                <div class="error-content">
                    <p><strong>Template:</strong> ${result.template || 'Unknown'}</p>
                    <p><strong>Error:</strong> ${result.error || 'Unknown error occurred'}</p>
                </div>
            </div>
        `;
    }

    /**
     * Copy results to clipboard
     */
    async copyResults() {
        if (this.currentResults.length === 0) {
            this.showNotification('No results to copy', 'warning');
            return;
        }

        try {
            const formatted = this.formatResults(this.currentResults);
            await navigator.clipboard.writeText(formatted.text);
            this.showNotification('Results copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy results', 'error');
        }
    }

    /**
     * Copy single result
     */
    async copyResult(resultId) {
        const result = this.findResult(resultId);
        if (!result) {
            this.showNotification('Result not found', 'error');
            return;
        }

        try {
            const formatted = this.formatSingleResult(result);
            await navigator.clipboard.writeText(formatted.text);
            this.showNotification('Result copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy result', 'error');
        }
    }

    /**
     * Export results
     */
    async exportResults() {
        if (this.currentResults.length === 0) {
            this.showNotification('No results to export', 'warning');
            return;
        }

        const exportModal = this.createExportModal();
        document.body.appendChild(exportModal);
    }

    /**
     * Export single result
     */
    async exportResult(resultId) {
        const result = this.findResult(resultId);
        if (!result) {
            this.showNotification('Result not found', 'error');
            return;
        }

        this.currentResults = [result];
        await this.exportResults();
    }

    /**
     * Create export modal
     */
    createExportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay export-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Export Analysis Results</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="form-group">
                            <label>Export Format:</label>
                            <select id="exportResultsFormat" class="form-control">
                                <option value="txt">Plain Text (.txt)</option>
                                <option value="html">HTML Document (.html)</option>
                                <option value="json">JSON Data (.json)</option>
                                <option value="md">Markdown (.md)</option>
                                <option value="pdf">PDF Document (.pdf)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Include:</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="includeMetadata" checked>
                                    <span class="checkbox-custom"></span>
                                    Metadata (timestamps, providers)
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="includeFormatting" checked>
                                    <span class="checkbox-custom"></span>
                                    Formatting and structure
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" id="includeHistory">
                                    <span class="checkbox-custom"></span>
                                    Include analysis history
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="exportResultsFilename">Filename:</label>
                            <input type="text" id="exportResultsFilename" class="form-control" 
                                   value="analysis-results-${new Date().toISOString().split('T')[0]}" 
                                   placeholder="Enter filename">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="analysisResults.performExport(this.closest('.modal-overlay'))">
                        <i class="fas fa-download"></i> Export
                    </button>
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Perform the actual export
     */
    async performExport(modal) {
        const format = modal.querySelector('#exportResultsFormat').value;
        const filename = modal.querySelector('#exportResultsFilename').value.trim();
        const includeMetadata = modal.querySelector('#includeMetadata').checked;
        const includeFormatting = modal.querySelector('#includeFormatting').checked;
        const includeHistory = modal.querySelector('#includeHistory').checked;

        if (!filename) {
            this.showNotification('Please enter a filename', 'warning');
            return;
        }

        try {
            const exportData = this.generateExportData(format, {
                includeMetadata,
                includeFormatting,
                includeHistory
            });

            const fullFilename = filename.includes('.') ? filename : `${filename}.${format}`;

            // Use Electron's save dialog
            const saveResult = await ipcRenderer.invoke('save-file-dialog', {
                title: 'Export Analysis Results',
                defaultPath: fullFilename,
                filters: this.getFileFilters(format)
            });

            if (!saveResult.canceled) {
                const writeResult = await ipcRenderer.invoke('save-file', saveResult.filePath, exportData);
                if (writeResult.success) {
                    this.showNotification('Results exported successfully!', 'success');
                    modal.remove();
                } else {
                    this.showNotification('Export failed: ' + writeResult.error, 'error');
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    /**
     * Generate export data in specified format
     */
    generateExportData(format, options) {
        const results = options.includeHistory ? this.resultsHistory : this.currentResults;
        
        switch (format) {
            case 'txt':
                return this.generateTextExport(results, options);
            case 'html':
                return this.generateHTMLExport(results, options);
            case 'json':
                return this.generateJSONExport(results, options);
            case 'md':
                return this.generateMarkdownExport(results, options);
            case 'pdf':
                return this.generatePDFExport(results, options);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Generate text export
     */
    generateTextExport(results, options) {
        let content = 'ANALYSIS RESULTS EXPORT\n';
        content += '='.repeat(50) + '\n\n';
        
        if (options.includeMetadata) {
            content += `Exported: ${new Date().toLocaleString()}\n`;
            content += `Total Results: ${results.length}\n\n`;
        }

        results.forEach((item, index) => {
            if (item.results) {
                // History item
                content += `Recording: ${item.templateName}\n`;
                if (options.includeMetadata) {
                    content += `Date: ${new Date(item.timestamp).toLocaleString()}\n`;
                }
                content += '-'.repeat(30) + '\n';
                
                item.results.forEach(result => {
                    if (result.success) {
                        content += `${result.template || 'Analysis'}\n`;
                        content += `${result.result || result.content || ''}\n\n`;
                    }
                });
            } else {
                // Direct result
                content += `${item.template || 'Analysis'}\n`;
                if (options.includeMetadata && item.processedAt) {
                    content += `Processed: ${new Date(item.processedAt).toLocaleString()}\n`;
                    content += `Provider: ${item.provider || 'Unknown'}\n`;
                }
                content += '-'.repeat(30) + '\n';
                content += `${item.result || item.content || ''}\n\n`;
            }
            
            if (index < results.length - 1) {
                content += '='.repeat(50) + '\n\n';
            }
        });

        return content;
    }

    /**
     * Generate HTML export
     */
    generateHTMLExport(results, options) {
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analysis Results Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .result-item { margin-bottom: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .result-header { margin-bottom: 15px; }
        .result-title { margin: 0; color: #1e293b; }
        .result-meta { font-size: 0.9em; color: #64748b; margin-top: 5px; }
        .provider-badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
        .result-content { margin-top: 15px; }
        .result-list { margin: 10px 0; }
        .code-block { background: #f1f5f9; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .inline-code { background: #f1f5f9; padding: 2px 4px; border-radius: 2px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Analysis Results Export</h1>`;
        
        if (options.includeMetadata) {
            html += `
        <p>Exported: ${new Date().toLocaleString()}</p>
        <p>Total Results: ${results.length}</p>`;
        }
        
        html += `
    </div>
    <div class="content">`;

        results.forEach(item => {
            if (item.results) {
                // History item
                html += `<div class="result-item">`;
                html += `<div class="result-header">`;
                html += `<h2 class="result-title">${item.templateName}</h2>`;
                if (options.includeMetadata) {
                    html += `<div class="result-meta">Date: ${new Date(item.timestamp).toLocaleString()}</div>`;
                }
                html += `</div>`;
                
                item.results.forEach(result => {
                    if (result.success) {
                        html += `<h3>${result.template || 'Analysis'}</h3>`;
                        html += `<div class="result-content">${this.formatContent(result.result || result.content || '')}</div>`;
                    }
                });
                html += `</div>`;
            } else {
                // Direct result
                html += `<div class="result-item">`;
                html += `<div class="result-header">`;
                html += `<h2 class="result-title">${item.template || 'Analysis'}</h2>`;
                if (options.includeMetadata) {
                    html += `<div class="result-meta">`;
                    if (item.processedAt) {
                        html += `Processed: ${new Date(item.processedAt).toLocaleString()} `;
                    }
                    if (item.provider) {
                        html += `<span class="provider-badge">${item.provider}</span>`;
                    }
                    html += `</div>`;
                }
                html += `</div>`;
                html += `<div class="result-content">${this.formatContent(item.result || item.content || '')}</div>`;
                html += `</div>`;
            }
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Generate JSON export
     */
    generateJSONExport(results, options) {
        const exportData = {
            exportInfo: {
                timestamp: new Date().toISOString(),
                version: '1.0',
                totalResults: results.length,
                includeMetadata: options.includeMetadata,
                includeHistory: options.includeHistory
            },
            results: results
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Generate Markdown export
     */
    generateMarkdownExport(results, options) {
        let content = '# Analysis Results Export\n\n';
        
        if (options.includeMetadata) {
            content += `**Exported:** ${new Date().toLocaleString()}\n`;
            content += `**Total Results:** ${results.length}\n\n`;
        }

        content += '---\n\n';

        results.forEach((item, index) => {
            if (item.results) {
                // History item
                content += `## ${item.templateName}\n\n`;
                if (options.includeMetadata) {
                    content += `**Date:** ${new Date(item.timestamp).toLocaleString()}\n\n`;
                }
                
                item.results.forEach(result => {
                    if (result.success) {
                        content += `### ${result.template || 'Analysis'}\n\n`;
                        content += `${result.result || result.content || ''}\n\n`;
                    }
                });
            } else {
                // Direct result
                content += `## ${item.template || 'Analysis'}\n\n`;
                if (options.includeMetadata) {
                    if (item.processedAt) {
                        content += `**Processed:** ${new Date(item.processedAt).toLocaleString()}\n`;
                    }
                    if (item.provider) {
                        content += `**Provider:** ${item.provider}\n`;
                    }
                    content += '\n';
                }
                content += `${item.result || item.content || ''}\n\n`;
            }
            
            if (index < results.length - 1) {
                content += '---\n\n';
            }
        });

        return content;
    }

    /**
     * Generate PDF export (simplified - would need PDF library for full implementation)
     */
    generatePDFExport(results, options) {
        // For now, return HTML that can be converted to PDF
        return this.generateHTMLExport(results, options);
    }

    /**
     * Get file filters for save dialog
     */
    getFileFilters(format) {
        const filters = {
            txt: [{ name: 'Text Files', extensions: ['txt'] }],
            html: [{ name: 'HTML Files', extensions: ['html'] }],
            json: [{ name: 'JSON Files', extensions: ['json'] }],
            md: [{ name: 'Markdown Files', extensions: ['md'] }],
            pdf: [{ name: 'PDF Files', extensions: ['pdf'] }]
        };

        return filters[format] || [{ name: 'All Files', extensions: ['*'] }];
    }

    /**
     * Clear current results
     */
    clearResults() {
        this.currentResults = [];
        const resultsContainer = document.getElementById('analysisResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        this.updateActionButtons(false);
    }

    /**
     * Update action button states
     */
    updateActionButtons(enabled) {
        const buttons = ['copyResults', 'exportResults', 'clearResults'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = !enabled;
            }
        });
    }

    /**
     * Add results to history
     */
    addToHistory(historyItem) {
        this.resultsHistory.unshift(historyItem);
        
        // Limit history size
        if (this.resultsHistory.length > this.maxHistoryItems) {
            this.resultsHistory = this.resultsHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveResultsHistory();
    }

    /**
     * Load results history from storage
     */
    loadResultsHistory() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.resultsHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading results history:', error);
            this.resultsHistory = [];
        }
    }

    /**
     * Save results history to storage
     */
    saveResultsHistory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.resultsHistory));
        } catch (error) {
            console.error('Error saving results history:', error);
        }
    }

    /**
     * Find result by ID
     */
    findResult(resultId) {
        if (resultId === 'current' && this.currentResults.length > 0) {
            return this.currentResults[0];
        }

        // Search in current results
        for (const result of this.currentResults) {
            if (result.id === resultId) {
                return result;
            }
        }

        // Search in history
        for (const historyItem of this.resultsHistory) {
            if (historyItem.results) {
                for (const result of historyItem.results) {
                    if (result.id === resultId) {
                        return result;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get current recording ID
     */
    getCurrentRecordingId() {
        // This would be implemented to get the current recording ID from the app
        return window.app?.currentRecording?.id || null;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return 'result_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Copy results button
        const copyBtn = document.getElementById('copyResults');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyResults());
        }

        // Export results button
        const exportBtn = document.getElementById('exportResults');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }

        // Clear results button
        const clearBtn = document.getElementById('clearResults');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearResults());
        }
    }

    /**
     * Show notification (uses app's notification system if available)
     */
    showNotification(message, type = 'info') {
        if (window.app && window.app.showNotification) {
            window.app.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Initialize analysis results manager when DOM is loaded
if (typeof window !== 'undefined') {
    window.analysisResults = new AnalysisResultsManager();
}