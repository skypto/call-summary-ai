// Transcript Manager for Call Summary AI
// Handles transcript editing, formatting, search, and export functionality

class TranscriptManager {
    constructor() {
        this.currentTranscript = null;
        this.editHistory = []; // For undo/redo functionality
        this.currentHistoryIndex = -1;
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.isEditing = false;
    }

    /**
     * Load transcript for editing
     */
    loadTranscript(transcript) {
        this.currentTranscript = {
            text: transcript.text || transcript,
            confidence: transcript.confidence || null,
            speakerDiarization: transcript.speakerDiarization || null,
            processingTime: transcript.processingTime || null,
            provider: transcript.provider || null,
            timestamp: transcript.timestamp || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            editCount: 0
        };

        // Initialize edit history
        this.editHistory = [this.currentTranscript.text];
        this.currentHistoryIndex = 0;

        return this.currentTranscript;
    }

    /**
     * Get current transcript
     */
    getCurrentTranscript() {
        return this.currentTranscript;
    }

    /**
     * Update transcript text and track changes
     */
    updateTranscript(newText, saveToHistory = true) {
        if (!this.currentTranscript) {
            throw new Error('No transcript loaded');
        }

        const oldText = this.currentTranscript.text;
        this.currentTranscript.text = newText;
        this.currentTranscript.lastModified = new Date().toISOString();
        this.currentTranscript.editCount++;

        if (saveToHistory && newText !== oldText) {
            // Remove any history after current index (for redo functionality)
            this.editHistory = this.editHistory.slice(0, this.currentHistoryIndex + 1);
            
            // Add new state to history
            this.editHistory.push(newText);
            this.currentHistoryIndex++;

            // Limit history size
            if (this.editHistory.length > 50) {
                this.editHistory.shift();
                this.currentHistoryIndex--;
            }
        }

        return this.currentTranscript;
    }

    /**
     * Undo last edit
     */
    undo() {
        if (this.currentHistoryIndex > 0) {
            this.currentHistoryIndex--;
            const previousText = this.editHistory[this.currentHistoryIndex];
            this.updateTranscript(previousText, false);
            return true;
        }
        return false;
    }

    /**
     * Redo last undone edit
     */
    redo() {
        if (this.currentHistoryIndex < this.editHistory.length - 1) {
            this.currentHistoryIndex++;
            const nextText = this.editHistory[this.currentHistoryIndex];
            this.updateTranscript(nextText, false);
            return true;
        }
        return false;
    }

    /**
     * Search within transcript
     */
    search(query, options = {}) {
        if (!this.currentTranscript || !query) {
            this.searchResults = [];
            this.currentSearchIndex = -1;
            return this.searchResults;
        }

        const {
            caseSensitive = false,
            wholeWord = false,
            regex = false
        } = options;

        const text = this.currentTranscript.text;
        this.searchResults = [];

        try {
            let searchPattern;
            
            if (regex) {
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(query, flags);
            } else {
                let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (wholeWord) {
                    escapedQuery = `\\b${escapedQuery}\\b`;
                }
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(escapedQuery, flags);
            }

            let match;
            while ((match = searchPattern.exec(text)) !== null) {
                this.searchResults.push({
                    index: match.index,
                    length: match[0].length,
                    text: match[0],
                    context: this.getSearchContext(text, match.index, match[0].length)
                });

                // Prevent infinite loop for zero-length matches
                if (match.index === searchPattern.lastIndex) {
                    searchPattern.lastIndex++;
                }
            }

            this.currentSearchIndex = this.searchResults.length > 0 ? 0 : -1;

        } catch (error) {
            console.error('Search error:', error);
            this.searchResults = [];
            this.currentSearchIndex = -1;
        }

        return this.searchResults;
    }

    /**
     * Get context around search result
     */
    getSearchContext(text, index, length, contextLength = 50) {
        const start = Math.max(0, index - contextLength);
        const end = Math.min(text.length, index + length + contextLength);
        
        const before = text.substring(start, index);
        const match = text.substring(index, index + length);
        const after = text.substring(index + length, end);

        return {
            before: start > 0 ? '...' + before : before,
            match: match,
            after: end < text.length ? after + '...' : after,
            fullContext: text.substring(start, end)
        };
    }

    /**
     * Navigate to next search result
     */
    nextSearchResult() {
        if (this.searchResults.length === 0) return null;
        
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        return this.searchResults[this.currentSearchIndex];
    }

    /**
     * Navigate to previous search result
     */
    previousSearchResult() {
        if (this.searchResults.length === 0) return null;
        
        this.currentSearchIndex = this.currentSearchIndex <= 0 
            ? this.searchResults.length - 1 
            : this.currentSearchIndex - 1;
        return this.searchResults[this.currentSearchIndex];
    }

    /**
     * Replace text in transcript
     */
    replace(searchText, replaceText, options = {}) {
        if (!this.currentTranscript) {
            throw new Error('No transcript loaded');
        }

        const {
            caseSensitive = false,
            wholeWord = false,
            replaceAll = false
        } = options;

        let text = this.currentTranscript.text;
        let replacementCount = 0;

        try {
            let searchPattern;
            let escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            if (wholeWord) {
                escapedSearch = `\\b${escapedSearch}\\b`;
            }
            
            const flags = caseSensitive ? (replaceAll ? 'g' : '') : (replaceAll ? 'gi' : 'i');
            searchPattern = new RegExp(escapedSearch, flags);

            if (replaceAll) {
                const newText = text.replace(searchPattern, (match) => {
                    replacementCount++;
                    return replaceText;
                });
                this.updateTranscript(newText);
            } else {
                const match = searchPattern.exec(text);
                if (match) {
                    const newText = text.substring(0, match.index) + 
                                   replaceText + 
                                   text.substring(match.index + match[0].length);
                    this.updateTranscript(newText);
                    replacementCount = 1;
                }
            }

        } catch (error) {
            console.error('Replace error:', error);
            throw new Error('Replace operation failed: ' + error.message);
        }

        return {
            replacementCount,
            newText: this.currentTranscript.text
        };
    }

    /**
     * Format transcript with speaker diarization
     */
    formatWithSpeakers() {
        if (!this.currentTranscript || !this.currentTranscript.speakerDiarization) {
            return this.currentTranscript?.text || '';
        }

        const segments = this.currentTranscript.speakerDiarization;
        let formattedText = '';

        segments.forEach((segment, index) => {
            if (index > 0) {
                formattedText += '\n\n';
            }
            formattedText += `${segment.speaker}: ${segment.text}`;
        });

        return formattedText;
    }

    /**
     * Format transcript with timestamps
     */
    formatWithTimestamps() {
        if (!this.currentTranscript || !this.currentTranscript.speakerDiarization) {
            return this.currentTranscript?.text || '';
        }

        const segments = this.currentTranscript.speakerDiarization;
        let formattedText = '';

        segments.forEach((segment, index) => {
            if (index > 0) {
                formattedText += '\n\n';
            }
            
            const startTime = this.formatTime(segment.startTime);
            const endTime = this.formatTime(segment.endTime);
            
            formattedText += `[${startTime} - ${endTime}] ${segment.speaker}: ${segment.text}`;
        });

        return formattedText;
    }

    /**
     * Format time in MM:SS format
     */
    formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Export transcript to various formats
     */
    async exportTranscript(format, options = {}) {
        if (!this.currentTranscript) {
            throw new Error('No transcript to export');
        }

        const {
            includeSpeakers = true,
            includeTimestamps = false,
            includeMetadata = true,
            filename = null
        } = options;

        let content;
        let mimeType;
        let extension;

        switch (format.toLowerCase()) {
            case 'txt':
                content = this.exportToText(includeSpeakers, includeTimestamps, includeMetadata);
                mimeType = 'text/plain';
                extension = 'txt';
                break;

            case 'docx':
                content = await this.exportToDocx(includeSpeakers, includeTimestamps, includeMetadata);
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                extension = 'docx';
                break;

            case 'pdf':
                content = await this.exportToPdf(includeSpeakers, includeTimestamps, includeMetadata);
                mimeType = 'application/pdf';
                extension = 'pdf';
                break;

            case 'json':
                content = this.exportToJson(includeMetadata);
                mimeType = 'application/json';
                extension = 'json';
                break;

            case 'srt':
                content = this.exportToSrt();
                mimeType = 'text/plain';
                extension = 'srt';
                break;

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        // Generate filename if not provided
        const exportFilename = filename || this.generateFilename(extension);

        return {
            content,
            mimeType,
            filename: exportFilename,
            size: content.length || content.byteLength || 0
        };
    }

    /**
     * Export to plain text
     */
    exportToText(includeSpeakers, includeTimestamps, includeMetadata) {
        let content = '';

        // Add metadata header
        if (includeMetadata) {
            content += '='.repeat(50) + '\n';
            content += 'CALL TRANSCRIPT\n';
            content += '='.repeat(50) + '\n';
            content += `Generated: ${new Date().toLocaleString()}\n`;
            if (this.currentTranscript.timestamp) {
                content += `Original: ${new Date(this.currentTranscript.timestamp).toLocaleString()}\n`;
            }
            if (this.currentTranscript.provider) {
                content += `Provider: ${this.currentTranscript.provider}\n`;
            }
            if (this.currentTranscript.confidence) {
                content += `Confidence: ${(this.currentTranscript.confidence * 100).toFixed(1)}%\n`;
            }
            if (this.currentTranscript.processingTime) {
                content += `Processing Time: ${(this.currentTranscript.processingTime / 1000).toFixed(1)}s\n`;
            }
            content += '='.repeat(50) + '\n\n';
        }

        // Add transcript content
        if (includeSpeakers && this.currentTranscript.speakerDiarization) {
            if (includeTimestamps) {
                content += this.formatWithTimestamps();
            } else {
                content += this.formatWithSpeakers();
            }
        } else {
            content += this.currentTranscript.text;
        }

        return content;
    }

    /**
     * Export to JSON format
     */
    exportToJson(includeMetadata) {
        const exportData = {
            text: this.currentTranscript.text,
            exportedAt: new Date().toISOString()
        };

        if (includeMetadata) {
            Object.assign(exportData, {
                confidence: this.currentTranscript.confidence,
                speakerDiarization: this.currentTranscript.speakerDiarization,
                processingTime: this.currentTranscript.processingTime,
                provider: this.currentTranscript.provider,
                timestamp: this.currentTranscript.timestamp,
                lastModified: this.currentTranscript.lastModified,
                editCount: this.currentTranscript.editCount
            });
        }

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Export to SRT subtitle format
     */
    exportToSrt() {
        if (!this.currentTranscript.speakerDiarization) {
            throw new Error('Speaker diarization data required for SRT export');
        }

        let srtContent = '';
        const segments = this.currentTranscript.speakerDiarization;

        segments.forEach((segment, index) => {
            const startTime = this.formatSrtTime(segment.startTime);
            const endTime = this.formatSrtTime(segment.endTime);
            
            srtContent += `${index + 1}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${segment.speaker}: ${segment.text}\n\n`;
        });

        return srtContent.trim();
    }

    /**
     * Format time for SRT (HH:MM:SS,mmm)
     */
    formatSrtTime(timeInSeconds) {
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    }

    /**
     * Export to DOCX (simplified - would need a proper library for full implementation)
     */
    async exportToDocx(includeSpeakers, includeTimestamps, includeMetadata) {
        // This is a simplified implementation
        // In a real application, you would use a library like docx or mammoth
        const textContent = this.exportToText(includeSpeakers, includeTimestamps, includeMetadata);
        
        // For now, return as text with a note
        const docxNote = "Note: This is a text representation. For proper DOCX export, a document library would be needed.\n\n";
        return docxNote + textContent;
    }

    /**
     * Export to PDF (simplified - would need a proper library for full implementation)
     */
    async exportToPdf(includeSpeakers, includeTimestamps, includeMetadata) {
        // This is a simplified implementation
        // In a real application, you would use a library like jsPDF or PDFKit
        const textContent = this.exportToText(includeSpeakers, includeTimestamps, includeMetadata);
        
        // For now, return as text with a note
        const pdfNote = "Note: This is a text representation. For proper PDF export, a PDF library would be needed.\n\n";
        return pdfNote + textContent;
    }

    /**
     * Generate filename for export
     */
    generateFilename(extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        return `transcript_${timestamp}.${extension}`;
    }

    /**
     * Get transcript statistics
     */
    getStatistics() {
        if (!this.currentTranscript) {
            return null;
        }

        const text = this.currentTranscript.text;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
        const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);

        const stats = {
            characters: text.length,
            charactersNoSpaces: text.replace(/\s/g, '').length,
            words: words.length,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            averageWordsPerSentence: sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0,
            readingTime: Math.ceil(words.length / 200) // Assuming 200 words per minute
        };

        if (this.currentTranscript.speakerDiarization) {
            const speakers = [...new Set(this.currentTranscript.speakerDiarization.map(s => s.speaker))];
            stats.speakers = speakers.length;
            stats.speakerList = speakers;
        }

        return stats;
    }

    /**
     * Validate transcript data
     */
    validateTranscript(transcript) {
        const errors = [];

        if (!transcript) {
            errors.push('Transcript is required');
            return { isValid: false, errors };
        }

        if (typeof transcript === 'string') {
            if (transcript.trim().length === 0) {
                errors.push('Transcript text cannot be empty');
            }
        } else if (typeof transcript === 'object') {
            if (!transcript.text || transcript.text.trim().length === 0) {
                errors.push('Transcript text cannot be empty');
            }
            
            if (transcript.confidence !== null && transcript.confidence !== undefined) {
                if (typeof transcript.confidence !== 'number' || transcript.confidence < 0 || transcript.confidence > 1) {
                    errors.push('Confidence must be a number between 0 and 1');
                }
            }
        } else {
            errors.push('Transcript must be a string or object');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export for use in other modules
window.TranscriptManager = TranscriptManager;