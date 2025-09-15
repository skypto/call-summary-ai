/**
 * History Manager - Handles pagination, search, and filtering for call history
 */
class HistoryManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchQuery = '';
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        this.filterBy = 'all';
        this.allItems = [];
        this.filteredItems = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHistory();
        console.log('History Manager initialized');
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('historySearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.currentPage = 1;
                this.filterAndDisplayHistory();
            }, 300));
        }

        // Clear search
        const clearSearchBtn = document.getElementById('clearSearch');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('historySort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = sortOrder;
                this.currentPage = 1;
                this.filterAndDisplayHistory();
            });
        }

        // Filter functionality
        const filterSelect = document.getElementById('historyFilter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterBy = e.target.value;
                this.currentPage = 1;
                this.filterAndDisplayHistory();
            });
        }

        // Items per page
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.filterAndDisplayHistory();
            });
        }

        // Pagination buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pagination-btn')) {
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.filterAndDisplayHistory();
                }
            } else if (e.target.matches('.pagination-prev')) {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.filterAndDisplayHistory();
                }
            } else if (e.target.matches('.pagination-next')) {
                const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.filterAndDisplayHistory();
                }
            }
        });
    }

    loadHistory() {
        try {
            const historyData = localStorage.getItem('callHistory') || '[]';
            this.allItems = JSON.parse(historyData);
            
            // Ensure allItems is an array
            if (!Array.isArray(this.allItems)) {
                console.warn('Invalid history data format, resetting to empty array');
                this.allItems = [];
                localStorage.setItem('callHistory', '[]');
            }
            
            this.filterAndDisplayHistory();
        } catch (error) {
            console.error('Error loading history from localStorage:', error);
            this.allItems = [];
            
            if (window.uiManager) {
                window.uiManager.showError('Error loading call history. The data may be corrupted.');
            }
            
            this.filterAndDisplayHistory();
        }
    }

    filterAndDisplayHistory() {
        try {
            // Apply search filter
            this.filteredItems = this.allItems.filter(item => {
                if (!this.searchQuery) return true;
                
                try {
                    const searchableText = [
                        item.name || item.filename || '',
                        item.date || '',
                        (item.transcription && typeof item.transcription === 'string') ? item.transcription : '',
                        item.duration || '',
                        this.formatFileSize(item.size || 0)
                    ].join(' ').toLowerCase();
                    
                    return searchableText.includes(this.searchQuery);
                } catch (error) {
                    console.warn('Error filtering item:', item, error);
                    return false;
                }
            });

        // Apply category filter
        if (this.filterBy !== 'all') {
            this.filteredItems = this.filteredItems.filter(item => {
                switch (this.filterBy) {
                    case 'transcribed':
                        return item.transcription && typeof item.transcription === 'string' && item.transcription.trim().length > 0;
                    case 'not-transcribed':
                        return !item.transcription || typeof item.transcription !== 'string' || item.transcription.trim().length === 0;
                    case 'analyzed':
                        return item.analysis && typeof item.analysis === 'object' && item.analysis !== null && Object.keys(item.analysis).length > 0;
                    case 'not-analyzed':
                        return !item.analysis || typeof item.analysis !== 'object' || item.analysis === null || Object.keys(item.analysis).length === 0;
                    case 'today':
                        const today = new Date().toDateString();
                        const itemDate = this.getValidDate(item.timestamp || item.date || item.createdAt);
                        return itemDate.getTime() !== 0 && itemDate.toDateString() === today;
                    case 'this-week':
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        const itemDateWeek = this.getValidDate(item.timestamp || item.date || item.createdAt);
                        return itemDateWeek.getTime() !== 0 && itemDateWeek >= weekAgo;
                    case 'this-month':
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        const itemDateMonth = this.getValidDate(item.timestamp || item.date || item.createdAt);
                        return itemDateMonth.getTime() !== 0 && itemDateMonth >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        this.filteredItems.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'name':
                    aValue = (a.name || a.filename || '').toLowerCase();
                    bValue = (b.name || b.filename || '').toLowerCase();
                    break;
                case 'date':
                    // Improved date handling with fallbacks
                    aValue = this.getValidDate(a.timestamp || a.date || a.createdAt);
                    bValue = this.getValidDate(b.timestamp || b.date || b.createdAt);
                    break;
                case 'duration':
                    aValue = this.parseDuration(a.duration || '0:00');
                    bValue = this.parseDuration(b.duration || '0:00');
                    break;
                case 'size':
                    aValue = a.size || 0;
                    bValue = b.size || 0;
                    break;
                default:
                    // Default to date sorting with improved date handling
                    aValue = this.getValidDate(a.timestamp || a.date || a.createdAt);
                    bValue = this.getValidDate(b.timestamp || b.date || b.createdAt);
            }

            // Handle comparison based on sort order
            if (this.sortOrder === 'asc') {
                if (aValue instanceof Date && bValue instanceof Date) {
                    return aValue.getTime() - bValue.getTime();
                }
                return aValue > bValue ? 1 : -1;
            } else {
                if (aValue instanceof Date && bValue instanceof Date) {
                    return bValue.getTime() - aValue.getTime();
                }
                return aValue < bValue ? 1 : -1;
            }
        });

            this.displayHistory();
            this.updatePagination();
            this.updateSearchStats();
        } catch (error) {
            console.error('Error in filterAndDisplayHistory:', error);
            
            // Show error state
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error loading history</p>
                        <small>Please refresh the page or check the console for details</small>
                        <button class="btn btn-outline mt-3" onclick="window.historyManager.refresh()">
                            <i class="fas fa-refresh"></i> Retry
                        </button>
                    </div>
                `;
            }
            
            if (window.uiManager) {
                window.uiManager.showError('Error loading call history. Please try refreshing.');
            }
        }
    }

    displayHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        try {
            if (this.filteredItems.length === 0) {
                if (this.searchQuery || this.filterBy !== 'all') {
                    historyList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <p>No recordings found</p>
                            <small>Try adjusting your search or filter criteria</small>
                            <button class="btn btn-outline mt-3" onclick="window.historyManager.clearFilters()">
                                <i class="fas fa-times"></i> Clear Filters
                            </button>
                        </div>
                    `;
                } else {
                    historyList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-phone-slash"></i>
                            <p>No call recordings yet</p>
                            <small>Start recording to see your call history here</small>
                        </div>
                    `;
                }
                return;
            }

            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageItems = this.filteredItems.slice(startIndex, endIndex);

            // Generate history items HTML with error handling for each item
            const historyItemsHTML = pageItems.map(item => {
                try {
                    return this.generateHistoryItemHTML(item);
                } catch (error) {
                    console.warn('Error generating HTML for history item:', item, error);
                    return `
                        <div class="history-item error-item">
                            <div class="history-item-info">
                                <div class="history-item-title">Error loading recording</div>
                                <div class="history-item-date">Invalid data</div>
                                <div class="history-item-preview">
                                    <small class="text-danger">This recording has corrupted data and cannot be displayed properly.</small>
                                </div>
                            </div>
                            <div class="history-item-actions">
                                <button class="btn btn-outline btn-sm" onclick="window.historyManager.deleteHistoryItem('${item.id || item.filename || 'unknown'}')" 
                                        aria-label="Delete corrupted recording">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }
            }).filter(html => html); // Remove any null/undefined results

            historyList.innerHTML = historyItemsHTML.join('');
        } catch (error) {
            console.error('Error in displayHistory:', error);
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error displaying history</p>
                    <small>Please try refreshing the page</small>
                </div>
            `;
        }
    }

    generateHistoryItemHTML(item) {
        const hasTranscription = item.transcription && typeof item.transcription === 'string' && item.transcription.trim().length > 0;
        const hasAnalysis = item.analysis && typeof item.analysis === 'object' && Object.keys(item.analysis).length > 0;
        const itemId = item.id || item.filename;
        
        return `
            <div class="history-item" data-id="${itemId}">
                <div class="history-item-info">
                    <div class="history-item-header">
                        <div class="history-item-title">${this.escapeHtml(item.name || item.filename)}</div>
                        <div class="history-item-badges">
                            ${hasTranscription ? '<span class="badge badge-success">Transcribed</span>' : '<span class="badge badge-secondary">Not Transcribed</span>'}
                            ${hasAnalysis ? '<span class="badge badge-info">Analyzed</span>' : ''}
                        </div>
                    </div>
                    <div class="history-item-date">
                        <i class="fas fa-calendar" aria-hidden="true"></i>
                        ${this.formatDate(item.timestamp || item.date)}
                    </div>
                    <div class="history-item-preview">
                        <div class="preview-stats">
                            <span class="stat-item">
                                <i class="fas fa-clock" aria-hidden="true"></i>
                                ${item.duration || '0:00'}
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-hdd" aria-hidden="true"></i>
                                ${this.formatFileSize(item.size || 0)}
                            </span>
                            ${hasTranscription ? `
                                <span class="stat-item">
                                    <i class="fas fa-file-alt" aria-hidden="true"></i>
                                    ${this.getWordCount(item.transcription)} words
                                </span>
                            ` : ''}
                        </div>
                        ${hasTranscription ? `
                            <div class="preview-text">
                                ${this.truncateText(item.transcription, 150)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="app.viewHistoryItem('${itemId}')" 
                            aria-label="View details for ${this.escapeHtml(item.name || item.filename)}">
                        <i class="fas fa-eye" aria-hidden="true"></i>
                    </button>
                    <button class="btn btn-primary btn-sm play-btn" onclick="app.playRecording('${itemId}')" 
                            aria-label="Play recording ${this.escapeHtml(item.name || item.filename)}">
                        <i class="fas fa-play" aria-hidden="true"></i>
                    </button>
                    <button class="btn btn-success btn-sm" onclick="app.exportAudioFile('${itemId}')" 
                            aria-label="Export audio file for ${this.escapeHtml(item.name || item.filename)}">
                        <i class="fas fa-download" aria-hidden="true"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="window.historyManager.deleteHistoryItem('${itemId}')" 
                            aria-label="Delete recording ${this.escapeHtml(item.name || item.filename)}">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;
    }

    updatePagination() {
        const paginationContainer = document.getElementById('historyPagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination">
                <button class="btn btn-outline btn-sm pagination-prev" ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left" aria-hidden="true"></i>
                    Previous
                </button>
                <div class="pagination-numbers">
        `;

        // Generate page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="btn btn-outline btn-sm pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="btn ${i === this.currentPage ? 'btn-primary' : 'btn-outline'} btn-sm pagination-btn" 
                        data-page="${i}" ${i === this.currentPage ? 'aria-current="page"' : ''}>
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="btn btn-outline btn-sm pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        paginationHTML += `
                </div>
                <button class="btn btn-outline btn-sm pagination-next" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next
                    <i class="fas fa-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    updateSearchStats() {
        const searchStats = document.getElementById('searchStats');
        if (!searchStats) return;

        const totalItems = this.allItems.length;
        const filteredCount = this.filteredItems.length;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(startIndex + this.itemsPerPage - 1, filteredCount);

        if (filteredCount === 0) {
            searchStats.textContent = `No recordings found`;
        } else if (filteredCount === totalItems) {
            searchStats.textContent = `Showing ${startIndex}-${endIndex} of ${totalItems} recordings`;
        } else {
            searchStats.textContent = `Showing ${startIndex}-${endIndex} of ${filteredCount} recordings (filtered from ${totalItems} total)`;
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('historySearch');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchQuery = '';
        this.currentPage = 1;
        this.filterAndDisplayHistory();
    }

    clearFilters() {
        const searchInput = document.getElementById('historySearch');
        const sortSelect = document.getElementById('historySort');
        const filterSelect = document.getElementById('historyFilter');

        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'date-desc';
        if (filterSelect) filterSelect.value = 'all';

        this.searchQuery = '';
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        this.filterBy = 'all';
        this.currentPage = 1;
        
        this.filterAndDisplayHistory();
    }

    deleteHistoryItem(itemId) {
        if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
            return;
        }

        try {
            const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
            const updatedHistory = history.filter(item => (item.id || item.filename) !== itemId);
            
            localStorage.setItem('callHistory', JSON.stringify(updatedHistory));
            
            // Update local arrays
            this.allItems = updatedHistory;
            
            // Adjust current page if necessary
            const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
            if (this.currentPage > totalPages && totalPages > 0) {
                this.currentPage = totalPages;
            }
            
            this.filterAndDisplayHistory();
            
            if (window.uiManager) {
                window.uiManager.showSuccess('Recording deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting history item:', error);
            if (window.uiManager) {
                window.uiManager.showError('Failed to delete recording');
            }
        }
    }

    // Utility methods
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getValidDate(dateInput) {
        if (!dateInput) {
            return new Date(0); // Return epoch time for invalid dates (will sort to bottom)
        }
        
        try {
            const date = new Date(dateInput);
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                return new Date(0);
            }
            return date;
        } catch (error) {
            return new Date(0);
        }
    }

    formatDate(dateString) {
        try {
            const date = this.getValidDate(dateString);
            
            // Handle invalid dates
            if (date.getTime() === 0) {
                return 'Invalid Date';
            }
            
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else if (diffDays === 2) {
                return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            } else if (diffDays <= 7) {
                return `${diffDays - 1} days ago`;
            } else {
                return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (error) {
            return 'Invalid Date';
        }
    }

    parseDuration(duration) {
        const parts = duration.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
            return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
        return 0;
    }

    getWordCount(text) {
        if (!text || typeof text !== 'string') return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    truncateText(text, maxLength) {
        if (!text || typeof text !== 'string') return '';
        if (text.length <= maxLength) return this.escapeHtml(text);
        return this.escapeHtml(text.substring(0, maxLength)) + '...';
    }

    escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API methods
    refresh() {
        this.loadHistory();
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.filterAndDisplayHistory();
        }
    }

    setItemsPerPage(count) {
        this.itemsPerPage = count;
        this.currentPage = 1;
        this.filterAndDisplayHistory();
    }

    search(query) {
        this.searchQuery = query.toLowerCase();
        this.currentPage = 1;
        this.filterAndDisplayHistory();
    }

    setFilter(filterBy) {
        this.filterBy = filterBy;
        this.currentPage = 1;
        this.filterAndDisplayHistory();
    }

    setSort(sortBy, sortOrder = 'desc') {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
        this.currentPage = 1;
        this.filterAndDisplayHistory();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.historyManager = new HistoryManager();
    });
} else {
    window.historyManager = new HistoryManager();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}