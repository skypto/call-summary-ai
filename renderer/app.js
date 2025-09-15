const { ipcRenderer } = require('electron');

class CallSummaryApp {
    constructor() {
        this.isRecording = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentConfig = this.loadConfig();
        this.audioManager = new AudioManager();
        this.deviceTestInProgress = false;
        this.transcriptManager = new TranscriptManager();
        this.isProcessingAudio = false;
        
        // Initialize template system components
        this.templateProcessor = null;
        this.analysisResults = null;
        
        this.initializeUI();
        this.setupEventListeners();
        this.loadAudioDevices();
        this.initializeTemplateSystem();
        this.initializeQASystem();
        this.setupDeviceChangeHandling();
        
        // Load history on app start
        this.updateHistoryUI();
    }

    initializeUI() {
        // Tab switching
        const navTabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Initialize tabs when accessed
                if (targetTab === 'templates') {
                    this.populateTemplateGrid();
                } else if (targetTab === 'history') {
                    this.updateHistoryUI();
                }
            });
        });

        // Provider selection
        const transcriptionRadios = document.querySelectorAll('input[name="transcriptionProvider"]');
        transcriptionRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.switchTranscriptionProvider(radio.value);
            });
        });

        const summaryRadios = document.querySelectorAll('input[name="summaryProvider"]');
        summaryRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.switchSummaryProvider(radio.value);
            });
        });

        // Load saved configuration
        this.loadConfigToUI();
        
        // Ensure text inputs support typing and pasting
        this.setupTextInputHandlers();
    }

    setupEventListeners() {
        // Recording controls
        document.getElementById('recordButton').addEventListener('click', () => {
            this.toggleRecording();
        });

        document.getElementById('refreshDevices').addEventListener('click', async () => {
            const refreshBtn = document.getElementById('refreshDevices');
            const originalText = refreshBtn.innerHTML;
            
            // Show loading state
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            refreshBtn.disabled = true;
            
            await this.loadAudioDevices();
            
            // Restore button
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        });

        document.getElementById('requestPermission').addEventListener('click', async () => {
            const btn = document.getElementById('requestPermission');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting...';
            btn.disabled = true;
            
            try {
                // Use enhanced permission request
                const result = await this.audioManager.requestPermissions({
                    sampleRate: 44100,
                    channels: 1
                });
                
                if (result.success) {
                    this.showNotification('Permission granted! Refreshing devices...', 'success');
                    await this.loadAudioDevices();
                } else {
                    this.showNotification(result.message, 'error');
                }
                
            } catch (error) {
                console.error('Permission request failed:', error);
                this.showNotification('Permission request failed: ' + error.message, 'error');
            }
            
            btn.innerHTML = originalText;
            btn.disabled = false;
        });

        document.getElementById('testMicrophone').addEventListener('click', () => {
            this.testSelectedMicrophone();
        });

        document.getElementById('validateDevice').addEventListener('click', () => {
            this.validateDeviceCapabilities();
        });

        // Recording preview events
        document.getElementById('discardRecordingBtn').addEventListener('click', () => {
            this.discardRecording();
        });

        document.getElementById('saveRecordingBtn').addEventListener('click', () => {
            this.saveRecordingToHistory();
        });

        // Transcription events
        document.getElementById('startTranscription').addEventListener('click', () => {
            this.startTranscription();
        });

        document.getElementById('retryTranscription').addEventListener('click', () => {
            this.retryTranscription();
        });

        document.getElementById('cancelTranscription').addEventListener('click', () => {
            this.cancelTranscription();
        });

        // Enhanced transcript editing events
        document.getElementById('saveTranscript').addEventListener('click', () => {
            this.saveTranscriptEdits();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelTranscriptEdit();
        });

        document.getElementById('undoTranscript').addEventListener('click', () => {
            this.undoTranscriptEdit();
        });

        document.getElementById('redoTranscript').addEventListener('click', () => {
            this.redoTranscriptEdit();
        });

        document.getElementById('searchTranscript').addEventListener('click', () => {
            this.toggleSearchPanel();
        });

        document.getElementById('replaceTranscript').addEventListener('click', () => {
            this.toggleReplacePanel();
        });

        document.getElementById('formatSpeakers').addEventListener('click', () => {
            this.formatTranscriptWithSpeakers();
        });

        document.getElementById('formatTimestamps').addEventListener('click', () => {
            this.formatTranscriptWithTimestamps();
        });

        document.getElementById('transcriptStats').addEventListener('click', () => {
            this.showTranscriptStatistics();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchInTranscript(e.target.value);
        });

        document.getElementById('searchNext').addEventListener('click', () => {
            this.nextSearchResult();
        });

        document.getElementById('searchPrev').addEventListener('click', () => {
            this.previousSearchResult();
        });

        document.getElementById('closeSearch').addEventListener('click', () => {
            this.closeSearchPanel();
        });

        // Replace functionality
        document.getElementById('replaceNext').addEventListener('click', () => {
            this.replaceNext();
        });

        document.getElementById('replaceAll').addEventListener('click', () => {
            this.replaceAll();
        });

        document.getElementById('closeReplace').addEventListener('click', () => {
            this.closeReplacePanel();
        });

        // Export functionality
        document.getElementById('confirmExport').addEventListener('click', () => {
            this.confirmTranscriptExport();
        });

        document.getElementById('cancelExport').addEventListener('click', () => {
            this.closeExportModal();
        });

        // Statistics modal
        document.getElementById('closeStats').addEventListener('click', () => {
            this.closeStatsModal();
        });

        // Keyboard shortcuts for transcript editing
        document.addEventListener('keydown', (e) => {
            if (this.transcriptManager.isEditing) {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

                if (cmdOrCtrl) {
                    switch (e.key.toLowerCase()) {
                        case 'z':
                            if (e.shiftKey) {
                                e.preventDefault();
                                this.redoTranscriptEdit();
                            } else {
                                e.preventDefault();
                                this.undoTranscriptEdit();
                            }
                            break;
                        case 'y':
                            e.preventDefault();
                            this.redoTranscriptEdit();
                            break;
                        case 'f':
                            e.preventDefault();
                            this.toggleSearchPanel();
                            break;
                        case 'h':
                            e.preventDefault();
                            this.toggleReplacePanel();
                            break;
                        case 's':
                            e.preventDefault();
                            this.saveTranscriptEdits();
                            break;
                    }
                }

                if (e.key === 'Escape') {
                    this.closeSearchPanel();
                    this.closeReplacePanel();
                }
            }
        });

        // Custom model selection handlers
        document.getElementById('openaiSummaryModel').addEventListener('change', (e) => {
            this.toggleCustomModelInput('openai', e.target.value);
        });

        document.getElementById('geminiSummaryModel').addEventListener('change', (e) => {
            this.toggleCustomModelInput('gemini', e.target.value);
        });

        document.getElementById('deepseekSummaryModel').addEventListener('change', (e) => {
            this.toggleCustomModelInput('deepseek', e.target.value);
        });

        document.getElementById('azureSummaryModel').addEventListener('change', (e) => {
            this.toggleCustomModelInput('azure', e.target.value);
        });

        document.getElementById('editTranscript').addEventListener('click', () => {
            this.toggleTranscriptEdit();
        });

        document.getElementById('copyTranscript').addEventListener('click', () => {
            this.copyTranscript();
        });

        document.getElementById('exportTranscript').addEventListener('click', () => {
            this.exportTranscript();
        });

        // Template system events
        document.getElementById('manageTemplates').addEventListener('click', () => {
            this.openTemplateManagement();
        });

        // Template tab events
        const createNewTemplateBtn = document.getElementById('createNewTemplate');
        if (createNewTemplateBtn) {
            createNewTemplateBtn.addEventListener('click', () => {
                this.createNewTemplate();
            });
        }

        const templateActionsDropdown = document.getElementById('templateActionsDropdown');
        if (templateActionsDropdown) {
            templateActionsDropdown.addEventListener('click', () => {
                this.toggleTemplateActionsMenu();
            });
        }

        const importTemplatesBtn = document.getElementById('importTemplates');
        if (importTemplatesBtn) {
            importTemplatesBtn.addEventListener('click', () => {
                this.importTemplatesFromFile();
            });
        }

        const exportAllTemplatesBtn = document.getElementById('exportAllTemplates');
        if (exportAllTemplatesBtn) {
            exportAllTemplatesBtn.addEventListener('click', () => {
                this.exportAllTemplates();
            });
        }

        const manageTemplatesBtn = document.getElementById('manageTemplates');
        if (manageTemplatesBtn) {
            manageTemplatesBtn.addEventListener('click', () => {
                this.openTemplateManagement();
            });
        }

        document.getElementById('copyResults').addEventListener('click', () => {
            if (this.analysisResults) {
                this.analysisResults.copyResults();
            } else {
                this.copyAnalysisResults();
            }
        });

        document.getElementById('exportResults').addEventListener('click', () => {
            if (this.analysisResults) {
                this.analysisResults.exportResults();
            } else {
                this.exportAnalysisResults();
            }
        });

        document.getElementById('clearResults').addEventListener('click', () => {
            if (this.analysisResults) {
                this.analysisResults.clearResults();
            } else {
                this.clearAnalysisResults();
            }
        });

        // Template category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTemplateCategory(tab.dataset.category);
            });
        });

        // Recording detail modal events
        document.getElementById('closeDetailModal').addEventListener('click', () => {
            this.closeRecordingDetail();
        });

        document.getElementById('detailCloseModal').addEventListener('click', () => {
            this.closeRecordingDetail();
        });

        document.getElementById('detailExportAudio').addEventListener('click', () => {
            this.exportCurrentDetailAudio();
        });

        document.getElementById('detailDeleteRecording').addEventListener('click', () => {
            this.deleteCurrentDetailRecording();
        });

        document.getElementById('detailStartTranscription').addEventListener('click', () => {
            this.startDetailTranscription();
        });

        document.getElementById('detailRetryTranscription').addEventListener('click', () => {
            this.retryDetailTranscription();
        });

        document.getElementById('detailEditTranscript').addEventListener('click', () => {
            this.toggleDetailTranscriptEdit();
        });

        document.getElementById('detailCopyTranscript').addEventListener('click', () => {
            this.copyDetailTranscript();
        });

        document.getElementById('detailExportTranscript').addEventListener('click', () => {
            this.exportDetailTranscript();
        });

        document.getElementById('detailPlayPause').addEventListener('click', () => {
            this.toggleDetailAudioPlayback();
        });

        // Detail AI Analysis events
        const detailManageTemplatesBtn = document.getElementById('detailManageTemplates');
        if (detailManageTemplatesBtn) {
            detailManageTemplatesBtn.addEventListener('click', () => {
                this.openTemplateManagement();
            });
        }

        const detailCopyResultsBtn = document.getElementById('detailCopyResults');
        if (detailCopyResultsBtn) {
            detailCopyResultsBtn.addEventListener('click', () => {
                this.copyDetailAnalysisResults();
            });
        }

        const detailExportResultsBtn = document.getElementById('detailExportResults');
        if (detailExportResultsBtn) {
            detailExportResultsBtn.addEventListener('click', () => {
                this.exportDetailAnalysisResults();
            });
        }

        const detailClearResultsBtn = document.getElementById('detailClearResults');
        if (detailClearResultsBtn) {
            detailClearResultsBtn.addEventListener('click', () => {
                this.clearDetailAnalysisResults();
            });
        }

        // Detail Q&A events
        const detailQaInput = document.getElementById('detailQaInput');
        const detailSendButton = document.getElementById('detailSendQuestion');
        const detailClearButton = document.getElementById('detailClearConversation');

        if (detailQaInput && detailSendButton) {
            detailSendButton.addEventListener('click', () => this.sendDetailQuestion());
            
            detailQaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendDetailQuestion();
                }
            });
        }

        if (detailClearButton) {
            detailClearButton.addEventListener('click', () => this.clearDetailConversation());
        }

        const detailExportButton = document.getElementById('detailExportConversation');
        if (detailExportButton) {
            detailExportButton.addEventListener('click', () => this.exportConversation(true));
        }

        // Detail suggested questions
        document.querySelectorAll('#detailSuggestedQuestions .suggested-question').forEach(question => {
            question.addEventListener('click', () => {
                const questionText = question.dataset.question;
                if (detailQaInput) {
                    detailQaInput.value = questionText;
                    this.sendDetailQuestion();
                }
            });
        });

        // Close modal on overlay click
        document.getElementById('recordingDetailModal').addEventListener('click', (e) => {
            if (e.target.id === 'recordingDetailModal') {
                this.closeRecordingDetail();
            }
        });

        document.getElementById('showDebugInfo').addEventListener('click', async () => {
            try {
                let permissionResult = { success: false, error: 'Not checked' };
                try {
                    permissionResult = await ipcRenderer.invoke('check-microphone-permission');
                } catch (e) {
                    permissionResult.error = e.message;
                }
                
                const hasMediaDevices = !!navigator.mediaDevices;
                const hasEnumerate = !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
                const userAgent = navigator.userAgent;
                const platform = navigator.platform;
                
                // Test device enumeration
                let deviceTest = 'Not tested';
                try {
                    const testDevices = await navigator.mediaDevices.enumerateDevices();
                    deviceTest = `Found ${testDevices.length} devices (${testDevices.filter(d => d.kind === 'audioinput').length} audio inputs)`;
                } catch (e) {
                    deviceTest = 'Error: ' + e.message;
                }
                
                const debugInfo = `
Debug Information:
- Platform: ${platform}
- User Agent: ${userAgent}
- Media Devices API: ${hasMediaDevices ? 'Available' : 'Not Available'}
- Enumerate Devices: ${hasEnumerate ? 'Available' : 'Not Available'}
- Device Enumeration Test: ${deviceTest}
- System Permission Status: ${permissionResult.success ? permissionResult.status : 'Error: ' + permissionResult.error}
- Electron Version: ${process.versions.electron || 'Unknown'}
- Chrome Version: ${process.versions.chrome || 'Unknown'}
- Node Version: ${process.versions.node || 'Unknown'}
                `.trim();
                
                console.log(debugInfo);
                
                // Show in a more user-friendly way
                const debugWindow = window.open('', '_blank', 'width=600,height=400');
                debugWindow.document.write(`
                    <html>
                        <head><title>Debug Information</title></head>
                        <body style="font-family: monospace; padding: 20px; background: #1e293b; color: #f1f5f9;">
                            <h2>Debug Information</h2>
                            <pre>${debugInfo}</pre>
                            <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; margin-right: 10px;">Close</button>
                    <button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 20px; padding: 10px 20px; background: #dc2626; color: white; border: none;">Clear Storage & Reload</button>
                        </body>
                    </html>
                `);
            } catch (error) {
                console.error('Debug info error:', error);
                alert('Debug info error: ' + error.message);
            }
        });



        // Configuration controls
        document.getElementById('testTranscription').addEventListener('click', () => {
            this.testTranscriptionAPI();
        });

        document.getElementById('testSummarization').addEventListener('click', () => {
            this.testSummarizationAPI();
        });

        document.getElementById('saveAllConfig').addEventListener('click', () => {
            this.saveAllConfiguration();
        });

        document.getElementById('loadAllConfig').addEventListener('click', () => {
            this.loadAllConfiguration();
        });

        document.getElementById('exportConfig').addEventListener('click', () => {
            this.exportConfiguration();
        });

        document.getElementById('resetConfig').addEventListener('click', () => {
            this.resetConfiguration();
        });

        // History controls
        document.getElementById('exportHistory').addEventListener('click', () => {
            this.exportHistory();
        });

        document.getElementById('exportAllAudio').addEventListener('click', () => {
            this.exportAllAudioFiles();
        });

        document.getElementById('clearHistory').addEventListener('click', () => {
            this.clearHistory();
        });

        // Menu event listeners

        ipcRenderer.on('menu-toggle-recording', () => {
            this.toggleRecording();
        });

        ipcRenderer.on('menu-stop-recording', () => {
            if (this.isRecording) {
                this.stopRecording();
            }
        });



        ipcRenderer.on('menu-test-api', () => {
            this.testSummarizationAPI();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                e.preventDefault();
                this.toggleRecording();
            } else if (e.key === 'F10') {
                e.preventDefault();
                if (this.isRecording) {
                    this.stopRecording();
                }
            }
            
            // Handle paste shortcut for input fields
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
            
            if (cmdOrCtrl && e.key === 'v') {
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.type === 'text' || activeElement.type === 'password')) {
                    console.log('Global paste shortcut detected for:', activeElement.id);
                    // Let Electron handle the paste, but add visual feedback
                    setTimeout(() => {
                        activeElement.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                        setTimeout(() => {
                            activeElement.style.backgroundColor = '';
                        }, 300);
                    }, 0);
                }
            }
        });

        // Close template menus when clicking outside
        document.addEventListener('click', (e) => {
            // Close template overflow menus
            if (!e.target.closest('.template-overflow-menu')) {
                document.querySelectorAll('.template-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }

            // Close template actions dropdown
            if (!e.target.closest('.template-actions-dropdown')) {
                const actionsMenu = document.getElementById('templateActionsMenu');
                if (actionsMenu) {
                    actionsMenu.style.display = 'none';
                }
            }
        });
    }

    async loadAudioDevices() {
        console.log('Starting loadAudioDevices...');
        
        try {
            // Show loading state
            this.setDeviceLoadingState(true);
            
            // Check permission status first
            const permissionStatus = await this.audioManager.checkPermissionStatus();
            console.log('Permission status:', permissionStatus);
            
            // Update permission UI
            this.updatePermissionUI(permissionStatus);
            
            // Get devices using enhanced AudioManager
            const deviceResult = await this.audioManager.getAudioDevices();
            console.log('Device enumeration result:', deviceResult);
            
            // Populate device selects
            this.populateDeviceSelect('inputDevice', deviceResult.input);
            this.populateDeviceSelect('outputDevice', deviceResult.output);
            
            // Show appropriate notification
            if (deviceResult.fallback) {
                this.showNotification('Using fallback devices. Grant microphone permission for full device list.', 'warning');
            } else if (deviceResult.input.length > 0) {
                this.showNotification(`Found ${deviceResult.input.length} microphone(s)`, 'success');
            } else {
                this.showNotification('No audio devices found', 'warning');
            }
            
        } catch (error) {
            console.error('Error loading audio devices:', error);
            this.showNotification('Error loading audio devices: ' + error.message, 'error');
            
            // Show error state and fallback devices
            const fallbackDevices = this.audioManager.getFallbackDevices();
            this.populateDeviceSelect('inputDevice', fallbackDevices.input);
            this.populateDeviceSelect('outputDevice', fallbackDevices.output);
            
        } finally {
            this.setDeviceLoadingState(false);
        }
    }

    setDeviceLoadingState(isLoading) {
        const inputSelect = document.getElementById('inputDevice');
        const outputSelect = document.getElementById('outputDevice');
        const refreshBtn = document.getElementById('refreshDevices');
        
        if (isLoading) {
            inputSelect.innerHTML = '<option>Loading devices...</option>';
            outputSelect.innerHTML = '<option>Loading devices...</option>';
            inputSelect.disabled = true;
            outputSelect.disabled = true;
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        } else {
            inputSelect.disabled = false;
            outputSelect.disabled = false;
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Devices';
        }
    }

    updatePermissionUI(permissionStatus) {
        const permissionSection = document.querySelector('.permission-section');
        const requestBtn = document.getElementById('requestPermission');
        
        if (!permissionSection || !requestBtn) return;
        
        // Remove existing status classes
        permissionSection.classList.remove('permission-granted', 'permission-denied', 'permission-prompt');
        
        switch (permissionStatus.status) {
            case 'granted':
                permissionSection.classList.add('permission-granted');
                requestBtn.style.display = 'none';
                break;
            case 'denied':
                permissionSection.classList.add('permission-denied');
                requestBtn.style.display = 'inline-block';
                requestBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Permission Denied - Click to Retry';
                break;
            case 'prompt':
            default:
                permissionSection.classList.add('permission-prompt');
                requestBtn.style.display = 'inline-block';
                requestBtn.innerHTML = '<i class="fas fa-microphone"></i> Grant Microphone Permission';
                break;
        }
    }

    setupDeviceChangeHandling() {
        // Listen for device changes
        this.audioManager.onDeviceChange(() => {
            console.log('Device change detected, reloading devices...');
            this.loadAudioDevices();
        });
    }

    async testSelectedMicrophone() {
        if (this.deviceTestInProgress) {
            this.showNotification('Device test already in progress', 'warning');
            return;
        }

        const inputDeviceId = document.getElementById('inputDevice').value;
        if (!inputDeviceId) {
            this.showNotification('Please select a microphone to test', 'warning');
            return;
        }

        this.deviceTestInProgress = true;
        const testBtn = document.getElementById('testMicrophone');
        const originalText = testBtn.innerHTML;
        
        try {
            // Update UI to show testing state
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
            testBtn.disabled = true;
            
            this.showNotification('Testing microphone... Please speak into your microphone', 'info');
            
            // Perform device test
            const testResult = await this.audioManager.testAudioDevice(inputDeviceId, {
                duration: 5000, // 5 second test
                sampleRate: 44100,
                channels: 1
            });
            
            // Show test results
            this.displayTestResults(testResult);
            
        } catch (error) {
            console.error('Microphone test error:', error);
            this.showNotification('Microphone test failed: ' + error.message, 'error');
            
        } finally {
            // Restore button state
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
            this.deviceTestInProgress = false;
        }
    }

    displayTestResults(testResult) {
        if (testResult.success) {
            const avgLevel = (testResult.averageLevel * 100).toFixed(1);
            const maxLevel = (testResult.maxLevel * 100).toFixed(1);
            
            if (testResult.hasAudio) {
                this.showNotification(
                    `✓ Microphone test successful! Average level: ${avgLevel}%, Peak: ${maxLevel}%`, 
                    'success'
                );
            } else {
                this.showNotification(
                    `⚠ Microphone connected but no audio detected. Check your microphone settings.`, 
                    'warning'
                );
            }
            
            // Log detailed results for debugging
            console.log('Detailed test results:', testResult);
            
        } else {
            let errorMessage = `✗ Microphone test failed: ${testResult.error}`;
            
            // Provide specific guidance based on error type
            if (testResult.errorType === 'NotAllowedError') {
                errorMessage += '\nPlease grant microphone permission and try again.';
            } else if (testResult.errorType === 'NotFoundError') {
                errorMessage += '\nMicrophone not found. Please check your device connection.';
            } else if (testResult.errorType === 'NotReadableError') {
                errorMessage += '\nMicrophone is in use by another application.';
            }
            
            this.showNotification(errorMessage, 'error');
        }
    }

    async validateDeviceCapabilities() {
        const inputDeviceId = document.getElementById('inputDevice').value;
        if (!inputDeviceId) {
            this.showNotification('Please select a microphone first', 'warning');
            return;
        }

        try {
            this.showNotification('Validating device capabilities...', 'info');
            
            const capabilities = await this.audioManager.validateDeviceCapabilities(inputDeviceId);
            
            console.log('Device capabilities:', capabilities);
            
            if (capabilities.supported) {
                const supportedRates = capabilities.sampleRates.join(', ');
                const supportedChannels = capabilities.channelCounts.join(', ');
                
                this.showNotification(
                    `Device supports sample rates: ${supportedRates} Hz, channels: ${supportedChannels}`, 
                    'success'
                );
            } else {
                this.showNotification(
                    `Device validation failed: ${capabilities.error || 'Unknown error'}`, 
                    'error'
                );
            }
            
        } catch (error) {
            console.error('Device validation error:', error);
            this.showNotification('Device validation failed: ' + error.message, 'error');
        }
    }

    populateDeviceSelect(selectId, devices) {
        const select = document.getElementById(selectId);
        select.innerHTML = '';

        if (devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No devices found';
            option.disabled = true;
            select.appendChild(option);
            return;
        }

        // Add default option
        if (selectId === 'inputDevice') {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select microphone...';
            select.appendChild(defaultOption);
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select speakers...';
            select.appendChild(defaultOption);
        }

        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            
            // Use device label if available, otherwise create a generic name
            if (device.label) {
                option.textContent = device.label;
            } else {
                const deviceType = selectId === 'inputDevice' ? 'Microphone' : 'Speaker';
                option.textContent = `${deviceType} ${index + 1}`;
            }
            
            select.appendChild(option);
        });

        // Auto-select first device if available
        if (devices.length > 0) {
            select.selectedIndex = 1; // Select first actual device (skip default option)
        }
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        // Prevent starting if already recording or processing
        if (this.isRecording || this.isProcessingAudio) {
            console.warn('Cannot start recording: already recording or processing audio');
            return;
        }
        
        try {
            // Ensure complete cleanup before starting new recording
            await this.cleanupRecordingSession();
            this.closeRecordingPreview();
            this.currentRecording = null;
            
            const inputDeviceId = document.getElementById('inputDevice').value;
            
            // Use AudioManager's enhanced stream creation
            const stream = await this.audioManager.createRecordingStream(inputDeviceId, {
                sampleRate: 44100,
                channels: 1
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                try {
                    console.log('MediaRecorder stopped, beginning save process...');
                    this.stopVisualization();
                    await this.saveRecording();
                    console.log('Save process completed successfully');
                } catch (error) {
                    console.error('Critical error in MediaRecorder onstop handler:', error);
                    // Ensure UI is reset even if save fails
                    await this.cleanupRecordingSession();
                    this.showNotification('Recording failed to save: ' + error.message, 'error');
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();

            // Start real-time visualization and level monitoring
            this.startRecordingVisualization();
            this.startAudioLevelMonitoring();

            this.updateRecordingUI();
            this.startTimer();

            this.showNotification('Recording started', 'success');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showNotification('Failed to start recording: ' + error.message, 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            this.isRecording = false;
            this.stopTimer();
            this.stopVisualization();
            this.stopAudioLevelMonitoring();
            this.updateRecordingUI();

            this.showNotification('Recording stopped', 'success');
        }
    }

    updateRecordingUI() {
        const recordButton = document.getElementById('recordButton');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');

        if (this.isRecording) {
            recordButton.innerHTML = '<i class="fas fa-stop"></i><span>Stop Recording</span>';
            recordButton.classList.add('recording');
            recordButton.classList.remove('btn-primary');
            recordButton.classList.add('btn-danger');
            
            statusDot.classList.add('recording');
            statusText.textContent = 'Recording...';
        } else {
            recordButton.innerHTML = '<i class="fas fa-play"></i><span>Start Recording</span>';
            recordButton.classList.remove('recording');
            recordButton.classList.remove('btn-danger');
            recordButton.classList.add('btn-primary');
            
            statusDot.classList.remove('recording');
            statusText.textContent = 'Ready';
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            this.updateTimerDisplay(elapsed);
        }, 100); // Update every 100ms for smoother display
    }

    updateTimerDisplay(elapsed) {
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = Math.floor((elapsed % 1000) / 100);
        
        const timerElement = document.getElementById('recordingTimer');
        if (timerElement) {
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
        }
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.getElementById('recordingTimer').textContent = '00:00.0';
    }

    startRecordingVisualization() {
        // Always ensure fresh audio context initialization
        if (!this.audioManager.audioContext || this.audioManager.audioContext.state === 'closed') {
            this.audioManager.initializeAudioContext();
        }

        // Create visualization canvas if it doesn't exist
        this.createVisualizationCanvas();
        
        // Start waveform visualization
        const canvas = document.getElementById('liveWaveformCanvas');
        if (canvas && this.audioManager.analyser) {
            this.audioManager.startVisualization(canvas, {
                type: 'frequency',
                colorScheme: 'blue',
                backgroundColor: '#f8fafc',
                smoothing: 0.8
            });
        }
    }

    createVisualizationCanvas() {
        // Check if canvas already exists
        if (document.getElementById('liveWaveformCanvas')) return;

        // Find the audio level container
        const audioLevelContainer = document.querySelector('.audio-level');
        if (!audioLevelContainer) return;

        // Create canvas container
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'live-visualization';
        canvasContainer.innerHTML = `
            <label>Live Audio:</label>
            <canvas id="liveWaveformCanvas" width="300" height="60"></canvas>
        `;

        // Insert after audio level meter
        audioLevelContainer.parentNode.insertBefore(canvasContainer, audioLevelContainer.nextSibling);
    }

    startAudioLevelMonitoring() {
        this.audioManager.startLevelMonitoring((levels) => {
            this.updateAudioLevelDisplay(levels);
        }, 50); // Update every 50ms
    }

    updateAudioLevelDisplay(levels) {
        const levelBar = document.getElementById('audioLevelBar');
        if (!levelBar) return;

        // Update level bar width
        const percentage = Math.round(levels.level * 100);
        levelBar.style.width = `${percentage}%`;
        
        // Update color based on level
        if (levels.level < 0.3) {
            levelBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        } else if (levels.level < 0.7) {
            levelBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            levelBar.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        }

        // Add peak indicator
        this.updatePeakIndicator(levels.peak);
        
        // Update level text if element exists
        const levelText = document.getElementById('audioLevelText');
        if (levelText) {
            levelText.textContent = `${percentage}%`;
        }
    }

    updatePeakIndicator(peak) {
        let peakIndicator = document.getElementById('peakIndicator');
        if (!peakIndicator) {
            // Create peak indicator
            const levelMeter = document.querySelector('.level-meter');
            if (levelMeter) {
                peakIndicator = document.createElement('div');
                peakIndicator.id = 'peakIndicator';
                peakIndicator.className = 'peak-indicator';
                levelMeter.appendChild(peakIndicator);
            }
        }

        if (peakIndicator) {
            const peakPosition = peak * 100;
            peakIndicator.style.left = `${peakPosition}%`;
            
            // Flash effect for high peaks
            if (peak > 0.8) {
                peakIndicator.classList.add('peak-warning');
                setTimeout(() => {
                    peakIndicator.classList.remove('peak-warning');
                }, 100);
            }
        }
    }

    stopVisualization() {
        if (this.audioManager) {
            this.audioManager.stopVisualization();
        }
        
        // Clear level display
        const levelBar = document.getElementById('audioLevelBar');
        if (levelBar) {
            levelBar.style.width = '0%';
        }
        
        // Remove live visualization canvas
        const liveCanvas = document.getElementById('liveWaveformCanvas');
        if (liveCanvas && liveCanvas.parentElement) {
            liveCanvas.parentElement.remove();
        }
    }

    stopAudioLevelMonitoring() {
        if (this.audioManager) {
            this.audioManager.stopLevelMonitoring();
        }
    }

    async saveRecording() {
        if (this.audioChunks.length === 0) return;

        try {
            // Validate audio chunks before creating blob
            if (!this.audioChunks || this.audioChunks.length === 0) {
                throw new Error('No audio data recorded');
            }

            // Calculate total size of chunks
            const totalSize = this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0);
            console.log('Audio chunks info:', {
                count: this.audioChunks.length,
                totalSize: totalSize,
                chunks: this.audioChunks.map((chunk, index) => ({ 
                    index, 
                    size: chunk.size, 
                    type: chunk.type,
                    lastModified: chunk.lastModified || 'unknown'
                }))
            });

            if (totalSize === 0) {
                throw new Error('Audio chunks are empty');
            }

            // Create initial audio blob with proper MIME type
            const rawBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `call_recording_${timestamp}.webm`;

            console.log('Created raw audio blob:', {
                size: rawBlob.size,
                type: rawBlob.type,
                chunks: this.audioChunks.length,
                expectedSize: totalSize,
                blobConstructor: rawBlob.constructor.name,
                stream: rawBlob.stream ? 'available' : 'not available'
            });

            // Validate blob
            if (rawBlob.size === 0) {
                throw new Error('Audio blob is empty after creation');
            }

            // Process and optimize audio
            console.log('Starting audio processing...');
            const processedAudio = await this.processRecordingAudio(rawBlob);
            console.log('Audio processing completed successfully');
            
            // Collect comprehensive metadata
            console.log('Starting metadata collection...');
            const metadata = await this.collectRecordingMetadata(processedAudio.blob, timestamp);
            console.log('Metadata collection completed successfully');
            
            // Store recording data for preview
            this.currentRecording = {
                blob: processedAudio.blob,
                filename: filename,
                timestamp: timestamp,
                duration: this.getRecordingDuration(),
                sampleRate: 44100,
                channels: 1,
                size: processedAudio.blob.size,
                originalSize: rawBlob.size,
                quality: processedAudio.quality,
                metadata: metadata,
                deviceInfo: this.getRecordingDeviceInfo()
            };

            // Show enhanced preview modal
            this.showRecordingPreview();
            
            console.log('Recording ready for preview:', {
                filename,
                size: processedAudio.blob.size,
                quality: processedAudio.quality,
                metadata
            });
            
        } catch (error) {
            console.error('Error processing recording:', error);
            this.showNotification('Error processing recording: ' + error.message, 'error');
            
            // Ensure UI state is properly reset on error
            this.isRecording = false;
            this.recordingStartTime = null;
            this.audioChunks = [];
            
            // Reset UI elements
            const recordBtn = document.getElementById('recordBtn');
            const statusDiv = document.getElementById('recordingStatus');
            
            if (recordBtn) {
                recordBtn.textContent = 'Start Recording';
                recordBtn.classList.remove('recording');
            }
            
            if (statusDiv) {
                statusDiv.textContent = 'Ready to record';
                statusDiv.className = 'status ready';
            }
            
            // Stop any ongoing media recorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                try {
                    this.mediaRecorder.stop();
                } catch (stopError) {
                    console.warn('Failed to stop media recorder:', stopError);
                }
            }
        }
    }

    async processRecordingAudio(audioBlob) {
        // Prevent concurrent audio processing
        if (this.isProcessingAudio) {
            throw new Error('Audio processing already in progress');
        }
        
        this.isProcessingAudio = true;
        
        try {
            console.log('Processing audio blob:', {
                size: audioBlob.size,
                type: audioBlob.type
            });
            
            // Ensure audio manager is available
            if (!this.audioManager) {
                throw new Error('Audio manager not initialized');
            }
            
            // Ensure we have a proper WAV blob
            let processedBlob = audioBlob;
            
            // Skip WAV conversion entirely - WebM/Opus is perfect for AI transcription
            // Most transcription services (Whisper, etc.) accept WebM/Opus directly
            console.log('Using original audio format for transcription compatibility:', {
                originalSize: audioBlob.size,
                type: audioBlob.type,
                format: 'WebM/Opus (transcription-ready)'
            });
            
            processedBlob = audioBlob;
            
            const quality = await this.analyzeAudioQuality(processedBlob);
            
            return {
                blob: processedBlob,
                quality: quality,
                compressionRatio: audioBlob.size > 0 ? processedBlob.size / audioBlob.size : 1
            };
            
        } catch (error) {
            console.warn('Audio processing failed, using original:', error);
            return {
                blob: audioBlob,
                quality: { score: 'unknown', issues: ['Processing failed'] },
                compressionRatio: 1
            };
        } finally {
            this.isProcessingAudio = false;
        }
    }



    async analyzeAudioQuality(audioBlob) {
        try {
            const audioInfo = await this.audioManager.getAudioInfo(audioBlob);
            const quality = {
                score: 'good',
                issues: [],
                recommendations: [],
                duration: audioInfo.duration,
                fileSize: audioBlob.size,
                estimatedBitrate: (audioBlob.size * 8) / audioInfo.duration
            };

            // Check duration
            if (audioInfo.duration < 5) {
                quality.issues.push('Very short recording (< 5 seconds)');
                quality.recommendations.push('Consider longer recordings for better transcription accuracy');
            }

            // Check file size
            const sizeMB = audioBlob.size / (1024 * 1024);
            if (sizeMB > 100) {
                quality.issues.push('Large file size (> 100MB)');
                quality.recommendations.push('Consider using lower sample rate for long recordings');
                quality.score = 'warning';
            }

            // Check estimated bitrate
            if (quality.estimatedBitrate < 64000) {
                quality.issues.push('Low audio quality detected');
                quality.recommendations.push('Use higher sample rate for better quality');
                quality.score = 'poor';
            }

            return quality;
            
        } catch (error) {
            return {
                score: 'unknown',
                issues: ['Quality analysis failed'],
                recommendations: [],
                error: error.message
            };
        }
    }

    async optimizeAudioFile(audioBlob, quality) {
        // For now, return original blob
        // In future, could implement compression based on quality analysis
        return audioBlob;
    }

    async collectRecordingMetadata(audioBlob, timestamp) {
        const metadata = {
            recordingDate: new Date().toISOString(),
            recordingTimestamp: timestamp,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            audioSettings: {
                sampleRate: 44100,
                channels: 1
            },
            tags: [],
            participants: [],
            notes: '',
            category: 'general',
            priority: 'normal'
        };

        // Get audio technical details
        try {
            const audioInfo = await this.audioManager.getAudioInfo(audioBlob);
            metadata.technicalInfo = {
                actualDuration: audioInfo.duration,
                fileType: audioInfo.type,
                fileSize: audioBlob.size
            };
        } catch (error) {
            console.warn('Could not get audio technical info:', error);
        }

        return metadata;
    }

    getRecordingDeviceInfo() {
        const inputDevice = document.getElementById('inputDevice');
        const selectedOption = inputDevice.options[inputDevice.selectedIndex];
        
        return {
            deviceId: inputDevice.value,
            deviceLabel: selectedOption ? selectedOption.textContent : 'Unknown',
            permissionStatus: this.audioManager.permissionStatus
        };
    }

    getRecordingDuration() {
        if (!this.recordingStartTime) return '00:00';
        
        const duration = Date.now() - this.recordingStartTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    switchTranscriptionProvider(provider) {
        // Hide all transcription config forms
        document.querySelectorAll('#settings-tab .card:first-child .config-form').forEach(form => {
            form.classList.remove('active');
        });

        // Show selected transcription provider form
        document.getElementById(`${provider}-config`).classList.add('active');
    }

    switchSummaryProvider(provider) {
        // Hide all summary config forms
        document.querySelectorAll('#settings-tab .card:nth-child(2) .config-form').forEach(form => {
            form.classList.remove('active');
        });

        // Show selected summary provider form
        document.getElementById(`${provider}-summary-config`).classList.add('active');
    }

    loadConfig() {
        const saved = localStorage.getItem('callSummaryConfig');
        return saved ? JSON.parse(saved) : {
            transcription: {
                provider: 'azure-batch',
                'azure-batch': {
                    speechKey: '',
                    region: 'eastus',
                    language: 'en-US',
                    enableDiarization: true
                },
                'openai-whisper': {
                    apiKey: '',
                    language: ''
                },
                'azure-whisper': {
                    apiKey: '',
                    endpoint: '',
                    deployment: ''
                }
            },
            summarization: {
                provider: 'openai',
                openai: { apiKey: '', model: 'gpt-4o-mini' },
                'azure-openai': { apiKey: '', endpoint: '', deployment: '', model: '' },
                gemini: { apiKey: '', model: 'gemini-1.5-flash' },
                deepseek: { apiKey: '', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1' }
            }
        };
    }

    saveConfig() {
        localStorage.setItem('callSummaryConfig', JSON.stringify(this.currentConfig));
    }

    setupTextInputHandlers() {
        // Get all text and password input fields in the settings
        const textInputs = document.querySelectorAll('#settings-tab input[type="text"], #settings-tab input[type="password"]');
        
        textInputs.forEach(input => {
            // Ensure inputs are focusable and editable
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
            
            console.log('Setting up input:', input.id, 'type:', input.type);
            
            // Select all text when focused for easy replacement
            input.addEventListener('focus', (e) => {
                setTimeout(() => e.target.select(), 0);
            });
            
            // Visual feedback for paste operations
            input.addEventListener('paste', (e) => {
                console.log('Paste event triggered on input:', input.id);
                
                // Visual feedback
                input.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                setTimeout(() => {
                    input.style.backgroundColor = '';
                }, 300);
                
                // Trigger change events after paste
                setTimeout(() => {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('Input value after paste:', input.value);
                }, 0);
            });
            
            // Auto-save configuration when inputs change (debounced)
            input.addEventListener('input', (e) => {
                if (this.autoSaveTimeout) {
                    clearTimeout(this.autoSaveTimeout);
                }
                this.autoSaveTimeout = setTimeout(() => {
                    this.saveAllConfiguration();
                }, 2000);
            });
        });
        

        
        console.log('Text input handlers setup complete for', textInputs.length, 'inputs');
        console.log('Electron clipboard API should be available via IPC');
        
        // Migrate existing recordings if needed
        this.migrateExistingRecordings();
    }

    migrateExistingRecordings() {
        try {
            const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
            let needsMigration = false;
            
            history.forEach(item => {
                // Check if item has a blob object that got stringified incorrectly
                if (item.blob && typeof item.blob === 'object' && !item.blobData) {
                    // This blob is likely corrupted from JSON.stringify
                    console.warn('Found corrupted blob data for recording:', item.name);
                    delete item.blob; // Remove the corrupted blob
                    needsMigration = true;
                }
            });
            
            if (needsMigration) {
                localStorage.setItem('callHistory', JSON.stringify(history));
                console.log('Migrated existing recordings');
            }
        } catch (error) {
            console.error('Failed to migrate existing recordings:', error);
        }
    }

    showRecordingPreview() {
        if (!this.currentRecording) return;

        const previewSection = document.getElementById('recordingPreviewSection');
        const audio = document.getElementById('previewAudio');
        
        // Create audio URL and set up enhanced player
        try {
            if (!this.currentRecording.blob || this.currentRecording.blob.size === 0) {
                throw new Error('Invalid or empty audio blob');
            }
            
            // Store the old URL for cleanup later
            const oldUrl = audio.src && audio.src.startsWith('blob:') ? audio.src : null;
            
            // Reset audio element first
            audio.removeAttribute('src');
            audio.load();
            
            // Create managed blob URL
            const audioUrl = this.createManagedBlobUrl(this.currentRecording.blob, 'preview-audio');
            
            console.log('Created audio URL:', {
                blobSize: this.currentRecording.blob.size,
                blobType: this.currentRecording.blob.type,
                audioUrl: audioUrl
            });
            
            // Set up audio player event listeners FIRST with blob reference
            this.setupAudioPlayerEvents(audio, audioUrl, this.currentRecording.blob);
            
            // Set the source
            audio.src = audioUrl;
            audio.load();
            
            console.log('Audio source set:', audio.src);
            
            // Clean up old URL after new one is set
            if (oldUrl) {
                console.log('Cleaning up old audio source:', oldUrl);
                URL.revokeObjectURL(oldUrl);
                if (this.activeBlobUrls) {
                    this.activeBlobUrls.delete(oldUrl);
                }
            }
            
        } catch (error) {
            console.error('Error setting up audio:', error);
            this.showNotification('Failed to set up audio playback: ' + error.message, 'error');
            return;
        }
        
        // Populate basic recording info
        document.getElementById('previewDuration').textContent = this.currentRecording.duration;
        document.getElementById('previewFileSize').textContent = this.formatFileSize(this.currentRecording.size);


        // Display quality information if available
        if (this.currentRecording.quality) {
            this.displayQualityInfo(this.currentRecording.quality);
        }
        
        // Display enhanced metadata if available
        if (this.currentRecording.metadata) {
            this.displayRecordingMetadata(this.currentRecording.metadata);
        }
        
        // Set up filename editing with validation
        this.setupFilenameEditing();
        
        // Set up waveform visualization
        this.setupWaveformVisualization(audio);
        
        // Set up cleanup on page unload
        this.setupPageUnloadCleanup();
        
        // Show preview section
        previewSection.style.display = 'block';
        
        // Show transcription section
        document.getElementById('transcriptionSection').style.display = 'block';
        
        // Reset transcription UI state
        this.resetTranscriptionUI();
        
        // Scroll to preview section
        setTimeout(() => {
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('recordingFilename').focus();
            document.getElementById('recordingFilename').select();
        }, 300);
    }

    hideRecordingPreview() {
        const previewSection = document.getElementById('recordingPreviewSection');
        const audio = document.getElementById('previewAudio');
        
        // Clean up audio resources and monitors
        if (audio._srcMonitor) {
            clearInterval(audio._srcMonitor);
            audio._srcMonitor = null;
        }
        
        if (audio.src && audio.src.startsWith('blob:')) {
            // Use managed cleanup to ensure safe revocation
            this.revokeManagedBlobUrl(audio.src);
        }
        audio.removeAttribute('src');
        audio.load();
        
        previewSection.style.display = 'none';
        
        // Hide transcription section
        document.getElementById('transcriptionSection').style.display = 'none';
        
        // Clear current recording
        this.currentRecording = null;
    }

    // Add method to clean up all active blob URLs
    // Enhanced blob URL management
    cleanupBlobUrls() {
        if (this.activeBlobUrls) {
            for (const url of this.activeBlobUrls) {
                console.log('Cleaning up blob URL:', url);
                try {
                    // Check if URL is still in use before revoking
                    const audioElements = document.querySelectorAll('audio');
                    let inUse = false;
                    
                    for (const audio of audioElements) {
                        if (audio.src === url) {
                            console.log('Blob URL still in use by audio element, skipping cleanup:', url);
                            inUse = true;
                            break;
                        }
                    }
                    
                    if (!inUse) {
                        URL.revokeObjectURL(url);
                        console.log('Successfully revoked blob URL:', url);
                    }
                } catch (error) {
                    console.warn('Failed to revoke blob URL:', url, error);
                }
            }
            
            // Only clear URLs that were actually revoked
            const audioElements = document.querySelectorAll('audio');
            const activeUrls = new Set();
            for (const audio of audioElements) {
                if (audio.src && audio.src.startsWith('blob:')) {
                    activeUrls.add(audio.src);
                }
            }
            
            // Keep only URLs that are still active
            for (const url of this.activeBlobUrls) {
                if (!activeUrls.has(url)) {
                    this.activeBlobUrls.delete(url);
                    // Also clean from blob URL map
                    if (this.blobUrlMap) {
                        this.blobUrlMap.delete(url);
                    }
                }
            }
        }
    }

    // Sanitize filename to remove invalid characters
    sanitizeFilename(filename) {
        if (!filename) return 'recording';
        
        // Replace invalid characters with underscores
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars
            .replace(/\s+/g, '_')           // Replace spaces with underscores
            .replace(/_+/g, '_')            // Replace multiple underscores with single
            .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
            .substring(0, 100);             // Limit length to 100 characters
    }

    // Validate blob before creating URL
    validateBlob(blob) {
        if (!blob) {
            throw new Error('Blob is null or undefined');
        }
        
        if (!(blob instanceof Blob)) {
            throw new Error('Object is not a Blob instance');
        }
        
        if (blob.size === 0) {
            throw new Error('Blob is empty (size = 0)');
        }
        
        if (!blob.type) {
            console.warn('Blob has no MIME type specified');
        }
        
        return true;
    }

    // Safe blob URL creation with lifecycle management
    createManagedBlobUrl(blob, identifier = null) {
        try {
            // Validate blob first
            this.validateBlob(blob);
            
            const url = URL.createObjectURL(blob);
            
            if (!this.activeBlobUrls) {
                this.activeBlobUrls = new Set();
            }
            
            // Store URL with metadata for better tracking
            this.activeBlobUrls.add(url);
            
            // Store blob reference with URL for recovery purposes
            if (!this.blobUrlMap) {
                this.blobUrlMap = new Map();
            }
            this.blobUrlMap.set(url, {
                blob: blob,
                identifier: identifier,
                created: Date.now()
            });
            
            console.log('Created managed blob URL:', {
                url: url,
                blobSize: blob.size,
                blobType: blob.type,
                identifier: identifier,
                totalActiveUrls: this.activeBlobUrls.size
            });
            
            return url;
        } catch (error) {
            console.error('Failed to create blob URL:', error);
            throw error;
        }
    }

    // Get blob from URL for recovery purposes
    getBlobFromUrl(url) {
        if (this.blobUrlMap && this.blobUrlMap.has(url)) {
            return this.blobUrlMap.get(url).blob;
        }
        return null;
    }

    // Safe blob URL cleanup for specific URL
    revokeManagedBlobUrl(url) {
        if (!url || !url.startsWith('blob:')) return;
        
        try {
            // Check if URL is still in use
            const audioElements = document.querySelectorAll('audio');
            for (const audio of audioElements) {
                if (audio.src === url) {
                    console.log('Cannot revoke blob URL - still in use by audio element:', url);
                    return false;
                }
            }
            
            URL.revokeObjectURL(url);
            
            if (this.activeBlobUrls) {
                this.activeBlobUrls.delete(url);
            }
            
            console.log('Successfully revoked managed blob URL:', url);
            return true;
        } catch (error) {
            console.warn('Failed to revoke managed blob URL:', url, error);
            return false;
        }
    }

    // Set up cleanup when page unloads to prevent memory leaks
    setupPageUnloadCleanup() {
        if (!this._unloadListenerAdded) {
            window.addEventListener('beforeunload', () => {
                console.log('Page unloading, cleaning up blob URLs...');
                this.cleanupBlobUrls();
            });
            
            window.addEventListener('unload', () => {
                this.cleanupBlobUrls();
            });
            
            this._unloadListenerAdded = true;
        }
    }

    // Protect audio src from corruption by intercepting setter calls
    protectAudioSrc(audio, expectedSrc, audioBlob) {
        const self = this; // Capture context for use in setter
        
        // Store original src property descriptor
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src') || 
                                 Object.getOwnPropertyDescriptor(HTMLAudioElement.prototype, 'src');
        
        if (!originalDescriptor) {
            console.warn('Could not find src property descriptor for protection');
            return;
        }

        // Create protected property
        let _protectedSrc = expectedSrc;
        
        Object.defineProperty(audio, 'src', {
            get: function() {
                return _protectedSrc;
            },
            set: function(newSrc) {
                // Validate the new src value
                if (typeof newSrc === 'string') {
                    // Allow empty string (for cleanup)
                    if (newSrc === '') {
                        _protectedSrc = newSrc;
                        if (originalDescriptor.set) {
                            originalDescriptor.set.call(this, newSrc);
                        }
                        return;
                    }
                    
                    // Allow valid blob URLs
                    if (newSrc.startsWith('blob:')) {
                        _protectedSrc = newSrc;
                        if (originalDescriptor.set) {
                            originalDescriptor.set.call(this, newSrc);
                        }
                        console.log('Audio src updated to valid blob URL:', newSrc);
                        return;
                    }
                    
                    // Block invalid URLs (like HTML file paths)
                    if (newSrc.includes('index.html') || newSrc.includes('.html')) {
                        console.error('BLOCKED: Attempt to set audio src to HTML file:', newSrc);
                        
                        // Try to recover with stored blob
                        if (audioBlob && self.createManagedBlobUrl) {
                            try {
                                const recoveryUrl = self.createManagedBlobUrl(audioBlob, 'protection-recovery');
                                _protectedSrc = recoveryUrl;
                                if (originalDescriptor.set) {
                                    originalDescriptor.set.call(this, recoveryUrl);
                                }
                                console.log('Audio src protected and recovered:', recoveryUrl);
                                return;
                            } catch (error) {
                                console.error('Failed to recover audio src during protection:', error);
                            }
                        }
                        
                        // Don't allow the invalid src to be set
                        console.warn('Keeping previous valid src:', _protectedSrc);
                        return;
                    }
                    
                    // Allow other valid URLs (http, https, data, etc.)
                    _protectedSrc = newSrc;
                    if (originalDescriptor.set) {
                        originalDescriptor.set.call(this, newSrc);
                    }
                } else if (newSrc === null || newSrc === undefined) {
                    // Allow null/undefined for cleanup (treat as empty string)
                    _protectedSrc = '';
                    if (originalDescriptor.set) {
                        originalDescriptor.set.call(this, '');
                    }
                } else {
                    console.warn('Invalid src type provided:', typeof newSrc, newSrc);
                }
            },
            configurable: true,
            enumerable: true
        });
        
        console.log('Audio src protection enabled for:', expectedSrc);
        
        // Also add attribute observer as backup protection
        this.addAttributeProtection(audio, expectedSrc, audioBlob);
    }

    // Additional protection using MutationObserver for src attribute changes
    addAttributeProtection(audio, expectedSrc, audioBlob) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    const currentSrc = audio.getAttribute('src');
                    
                    if (currentSrc && currentSrc.includes('index.html')) {
                        console.error('ATTRIBUTE PROTECTION: Detected HTML file in src attribute:', currentSrc);
                        
                        // Restore valid src
                        if (audioBlob) {
                            try {
                                const recoveryUrl = this.createManagedBlobUrl(audioBlob, 'attribute-recovery');
                                audio.setAttribute('src', recoveryUrl);
                                audio.load();
                                console.log('Attribute protection recovered src:', recoveryUrl);
                            } catch (error) {
                                console.error('Attribute protection recovery failed:', error);
                            }
                        }
                    }
                }
            });
        });
        
        observer.observe(audio, {
            attributes: true,
            attributeFilter: ['src']
        });
        
        // Store observer for cleanup
        audio._srcAttributeObserver = observer;
        
        console.log('Audio src attribute protection enabled');
    }

    setupAudioPlayerEvents(audio, expectedSrc, audioBlob = null) {
        // Store the expected src and blob reference for recovery
        console.log('Setting up audio events for src:', expectedSrc);
        
        // Store references for validation and recovery
        audio._expectedSrc = expectedSrc;
        audio._audioBlob = audioBlob;
        
        // Implement protective src setter to prevent corruption
        this.protectAudioSrc(audio, expectedSrc, audioBlob);
        
        // Clear any existing monitors
        if (audio._srcMonitor) {
            clearInterval(audio._srcMonitor);
        }
        
        // Add protective src monitoring with blob recovery
        const validateAndRecoverAudioSrc = () => {
            if (audio.src !== expectedSrc) {
                if (audio.src.includes('index.html')) {
                    console.error('CRITICAL: Audio src corrupted to HTML file, attempting recovery...', {
                        expected: expectedSrc,
                        actual: audio.src
                    });
                    
                    // Try to recover using the stored blob
                    if (audioBlob) {
                        try {
                            const newUrl = this.createManagedBlobUrl(audioBlob, 'recovery-audio');
                            audio.src = newUrl;
                            audio.load();
                            
                            // Update expected src
                            audio._expectedSrc = newUrl;
                            
                            console.log('Audio source recovered with new managed blob URL:', newUrl);
                            return true;
                        } catch (error) {
                            console.error('Failed to recover audio source:', error);
                        }
                    }
                } else if (!audio.src.startsWith('blob:')) {
                    console.warn('Audio src changed to non-blob URL:', audio.src);
                }
            }
            return false;
        };
        
        // Monitor src changes periodically with reduced frequency to avoid performance issues
        audio._srcMonitor = setInterval(() => {
            try {
                validateAndRecoverAudioSrc();
            } catch (error) {
                console.error('Error in src validation:', error);
            }
        }, 2000); // Check every 2 seconds instead of 1 second
        
        // Clean up monitor when audio is removed or emptied
        const cleanup = () => {
            if (audio._srcMonitor) {
                clearInterval(audio._srcMonitor);
                audio._srcMonitor = null;
                console.log('Cleaned up audio src monitor');
            }
            
            if (audio._srcAttributeObserver) {
                audio._srcAttributeObserver.disconnect();
                audio._srcAttributeObserver = null;
                console.log('Cleaned up audio src attribute observer');
            }
        };
        
        // Add multiple cleanup triggers
        audio.addEventListener('emptied', cleanup);
        audio.addEventListener('abort', cleanup);
        audio.addEventListener('error', cleanup);
        
        // Also cleanup when audio element is removed from DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === audio || (node.contains && node.contains(audio))) {
                        cleanup();
                        observer.disconnect();
                    }
                });
            });
        });
        
        if (audio.parentNode) {
            observer.observe(audio.parentNode, { childList: true, subtree: true });
        }
        
        // Add play/pause controls
        audio.addEventListener('loadedmetadata', () => {
            console.log('Audio loaded successfully:', {
                duration: audio.duration,
                readyState: audio.readyState,
                networkState: audio.networkState,
                src: audio.src
            });
            
            // Validate audio duration
            if (!audio.duration || isNaN(audio.duration) || audio.duration <= 0) {
                console.warn('Invalid audio duration detected:', audio.duration);
                this.showNotification('Warning: Audio file may have invalid duration', 'warning');
            }
        });

        // Add canplay event for additional validation
        audio.addEventListener('canplay', () => {
            console.log('Audio can start playing');
        });

        // Add loadstart event
        audio.addEventListener('loadstart', () => {
            console.log('Audio loading started, src:', audio.src);
            validateAndRecoverAudioSrc();
        });

        audio.addEventListener('error', (e) => {
            console.error('Audio playback error:', e);
            console.error('Audio element state:', {
                src: audio.src,
                readyState: audio.readyState,
                networkState: audio.networkState,
                error: audio.error
            });
            
            // Check if the src is pointing to the HTML file (common issue)
            if (audio.src && (audio.src.includes('index.html') || !audio.src.startsWith('blob:'))) {
                console.error('CRITICAL: Audio src is invalid:', audio.src);
                console.error('Expected blob URL, got:', audio.src);
                
                // Try automatic recovery first
                if (validateAndRecoverAudioSrc()) {
                    console.log('Audio error recovered automatically');
                    return;
                }
                
                // Try manual recovery as fallback
                if (this.currentRecording && this.currentRecording.blob) {
                    console.log('Attempting manual audio source recovery...');
                    try {
                        const audioUrl = this.createManagedBlobUrl(this.currentRecording.blob, 'manual-recovery');
                        audio.src = audioUrl;
                        audio.load();
                        console.log('Audio source recovered manually:', audioUrl);
                        return; // Don't show error message if we recovered
                    } catch (recoveryError) {
                        console.error('Failed to recover audio source:', recoveryError);
                    }
                }
            }
            
            let errorMessage = 'Audio playback error. ';
            if (audio.error) {
                switch (audio.error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        errorMessage += 'Playback was aborted.';
                        break;
                    case MediaError.MEDIA_ERR_NETWORK:
                        errorMessage += 'Network error occurred.';
                        break;
                    case MediaError.MEDIA_ERR_DECODE:
                        errorMessage += 'Audio file is corrupted or unsupported format.';
                        break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errorMessage += 'Audio format not supported.';
                        break;
                    default:
                        errorMessage += 'Unknown error occurred.';
                }
            } else {
                errorMessage += 'File may be corrupted.';
            }
            
            this.showNotification(errorMessage, 'error');
        });

        // Update waveform progress during playback
        audio.addEventListener('timeupdate', () => {
            try {
                if (audio && audio.readyState >= 1) { // HAVE_METADATA or higher
                    this.updateWaveformProgress(audio.currentTime, audio.duration);
                }
            } catch (error) {
                console.error('Error updating waveform progress:', error);
            }
        });
    }

    displayQualityInfo(quality) {
        // Create or update quality info section
        let qualitySection = document.getElementById('qualityInfo');
        if (!qualitySection) {
            qualitySection = document.createElement('div');
            qualitySection.id = 'qualityInfo';
            qualitySection.className = 'quality-info-section';
            
            // Insert after preview details
            const previewDetails = document.querySelector('.preview-details');
            if (previewDetails) {
                previewDetails.appendChild(qualitySection);
            }
        }

        let qualityClass = 'quality-good';
        let qualityIcon = 'fas fa-check-circle';
        
        if (quality.score === 'poor') {
            qualityClass = 'quality-poor';
            qualityIcon = 'fas fa-exclamation-triangle';
        } else if (quality.score === 'warning') {
            qualityClass = 'quality-warning';
            qualityIcon = 'fas fa-exclamation-circle';
        }

        qualitySection.innerHTML = `
            <div class="quality-header">
                <h4><i class="${qualityIcon}"></i> Recording Quality: ${quality.score.toUpperCase()}</h4>
            </div>
            <div class="quality-details ${qualityClass}">
                ${quality.issues && quality.issues.length > 0 ? `
                    <div class="quality-issues">
                        <strong>Issues:</strong>
                        <ul>
                            ${quality.issues.map(issue => `<li>${issue}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${quality.recommendations && quality.recommendations.length > 0 ? `
                    <div class="quality-recommendations">
                        <strong>Recommendations:</strong>
                        <ul>
                            ${quality.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${quality.estimatedBitrate ? `
                    <div class="quality-stats">
                        <span>Estimated Bitrate: ${Math.round(quality.estimatedBitrate / 1000)} kbps</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    displayRecordingMetadata(metadata) {
        // Create or update metadata section
        let metadataSection = document.getElementById('metadataInfo');
        if (!metadataSection) {
            metadataSection = document.createElement('div');
            metadataSection.id = 'metadataInfo';
            metadataSection.className = 'metadata-section';
            
            // Insert after filename section
            const filenameSection = document.querySelector('.filename-section');
            if (filenameSection && filenameSection.parentNode) {
                filenameSection.parentNode.insertBefore(metadataSection, filenameSection.nextSibling);
            }
        }

        metadataSection.innerHTML = `
            <div class="metadata-header">
                <h4><i class="fas fa-info-circle"></i> Recording Details</h4>
                <button class="btn btn-outline btn-small" onclick="this.parentElement.parentElement.classList.toggle('expanded')">
                    <i class="fas fa-chevron-down"></i> Details
                </button>
            </div>
            <div class="metadata-content">
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <label>Recorded:</label>
                        <span>${new Date(metadata.recordingDate).toLocaleString()}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Device:</label>
                        <span>${this.currentRecording.deviceInfo?.deviceLabel || 'Unknown'}</span>
                    </div>
                    <div class="metadata-item">
                        <label>Platform:</label>
                        <span>${metadata.platform}</span>
                    </div>
                    ${metadata.technicalInfo ? `
                        <div class="metadata-item">
                            <label>Actual Duration:</label>
                            <span>${this.formatDuration(metadata.technicalInfo.actualDuration * 1000)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="metadata-tags">
                    <label>Tags:</label>
                    <div class="tag-input-container">
                        <input type="text" id="recordingTags" class="form-control" 
                               placeholder="Add tags (comma separated)..." 
                               value="${metadata.tags ? metadata.tags.join(', ') : ''}">
                    </div>
                </div>
                
                <div class="metadata-notes">
                    <label>Notes:</label>
                    <textarea id="recordingNotes" class="form-control" rows="3" 
                              placeholder="Add notes about this recording...">${metadata.notes || ''}</textarea>
                </div>
                
                <div class="metadata-category">
                    <label>Category:</label>
                    <select id="recordingCategory" class="form-control">
                        <option value="general" ${metadata.category === 'general' ? 'selected' : ''}>General</option>
                        <option value="meeting" ${metadata.category === 'meeting' ? 'selected' : ''}>Meeting</option>
                        <option value="interview" ${metadata.category === 'interview' ? 'selected' : ''}>Interview</option>
                        <option value="call" ${metadata.category === 'call' ? 'selected' : ''}>Phone Call</option>
                        <option value="presentation" ${metadata.category === 'presentation' ? 'selected' : ''}>Presentation</option>
                        <option value="training" ${metadata.category === 'training' ? 'selected' : ''}>Training</option>
                        <option value="other" ${metadata.category === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
            </div>
        `;

        // Set up metadata change listeners
        this.setupMetadataChangeListeners();
    }

    setupFilenameEditing() {
        const filenameInput = document.getElementById('recordingFilename');
        if (!filenameInput) return;
        
        // Create a filename-safe timestamp
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const defaultName = `Call Recording ${year}-${month}-${day} ${hours}-${minutes}-${seconds}`;
        filenameInput.value = defaultName;

        // Add validation and auto-sanitization
        filenameInput.addEventListener('input', (e) => {
            const originalValue = e.target.value;
            const sanitizedValue = originalValue.replace(/[<>:"/\\|?*]/g, '');
            
            // If the value was changed, update the input
            if (originalValue !== sanitizedValue) {
                e.target.value = sanitizedValue;
                // Show a brief notification about character removal
                this.showNotification('Invalid characters were removed from filename', 'info', 2000);
            }
            
            this.validateFilename(e.target.value);
        });

        // Add character counter
        this.addFilenameCharacterCounter(filenameInput);
    }

    validateFilename(filename) {
        const filenameInput = document.getElementById('recordingFilename');
        if (!filenameInput) return true;
        
        let validationMessage = '';
        let isValid = true;

        // Remove existing validation
        const existingValidation = document.querySelector('.filename-validation');
        if (existingValidation) {
            existingValidation.remove();
        }

        // Check length
        if (filename.length === 0) {
            validationMessage = 'Filename cannot be empty';
            isValid = false;
        } else if (filename.length > 100) {
            validationMessage = 'Filename too long (max 100 characters)';
            isValid = false;
        }

        // Check invalid characters
        const invalidChars = /[<>:"/\\|?*]/g;
        if (invalidChars.test(filename)) {
            validationMessage = 'Filename contains invalid characters: < > : " / \\ | ? *';
            isValid = false;
        }

        // Show validation message
        if (!isValid) {
            const validation = document.createElement('div');
            validation.className = 'filename-validation error';
            validation.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${validationMessage}`;
            filenameInput.parentNode.appendChild(validation);
            filenameInput.classList.add('error');
        } else {
            filenameInput.classList.remove('error');
        }

        return isValid;
    }

    addFilenameCharacterCounter(input) {
        // Remove existing counter
        const existingCounter = input.parentNode.querySelector('.character-counter');
        if (existingCounter) {
            existingCounter.remove();
        }
        
        const counter = document.createElement('div');
        counter.className = 'character-counter';
        counter.textContent = `${input.value.length}/100`;
        input.parentNode.appendChild(counter);

        input.addEventListener('input', () => {
            counter.textContent = `${input.value.length}/100`;
            counter.className = input.value.length > 100 ? 'character-counter error' : 'character-counter';
        });
    }

    setupMetadataChangeListeners() {
        // Update metadata when fields change
        ['recordingTags', 'recordingNotes', 'recordingCategory'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateRecordingMetadata();
                });
            }
        });
    }

    updateRecordingMetadata() {
        if (!this.currentRecording || !this.currentRecording.metadata) return;

        const tagsElement = document.getElementById('recordingTags');
        const notesElement = document.getElementById('recordingNotes');
        const categoryElement = document.getElementById('recordingCategory');

        if (tagsElement) {
            const tags = tagsElement.value.split(',').map(tag => tag.trim()).filter(tag => tag);
            this.currentRecording.metadata.tags = tags;
        }
        
        if (notesElement) {
            this.currentRecording.metadata.notes = notesElement.value;
        }
        
        if (categoryElement) {
            this.currentRecording.metadata.category = categoryElement.value;
        }
        
        this.currentRecording.metadata.lastModified = new Date().toISOString();
    }

    updateWaveformProgress(currentTime, duration) {
        const canvas = document.getElementById('waveformCanvas');
        if (!canvas || !duration || duration === 0 || isNaN(duration)) return;
        
        if (!currentTime || isNaN(currentTime)) return;

        const progress = currentTime / duration;
        const progressWidth = canvas.width * progress;
        
        // Add progress indicator (simple overlay)
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
        ctx.fillRect(0, 0, progressWidth, canvas.height);
    }

    async closeRecordingPreview() {
        const previewSection = document.getElementById('recordingPreviewSection');
        const audio = document.getElementById('previewAudio');
        
        // Clean up audio URL properly
        if (audio && audio.src) {
            // Only revoke blob URLs, not other types
            if (audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(audio.src);
            }
            // Clear the src properly
            audio.removeAttribute('src');
            audio.load(); // Reset the audio element
        }
        
        // Clean up dynamic sections
        const qualitySection = document.getElementById('qualityInfo');
        if (qualitySection) {
            qualitySection.remove();
        }
        
        const metadataSection = document.getElementById('metadataInfo');
        if (metadataSection) {
            metadataSection.remove();
        }
        
        // Hide preview section
        previewSection.style.display = 'none';
        
        // Hide transcription section
        document.getElementById('transcriptionSection').style.display = 'none';
        
        // Clear the canvas
        const canvas = document.getElementById('waveformCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Clean up any remaining visualization elements and audio context
        await this.cleanupRecordingSession();
    }

    async cleanupRecordingSession() {
        // Stop any ongoing visualization
        this.stopVisualization();
        this.stopAudioLevelMonitoring();
        
        // Clean up MediaRecorder and streams
        if (this.mediaRecorder) {
            try {
                console.log('Cleaning up MediaRecorder, current state:', this.mediaRecorder.state);
                
                // Remove event listeners to prevent interference
                this.mediaRecorder.ondataavailable = null;
                this.mediaRecorder.onstop = null;
                this.mediaRecorder.onerror = null;
                
                if (this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
                
                if (this.mediaRecorder.stream) {
                    this.mediaRecorder.stream.getTracks().forEach(track => {
                        console.log('Stopping media track:', track.kind, 'state:', track.readyState);
                        track.stop();
                        console.log('Stopped media track:', track.kind, 'new state:', track.readyState);
                    });
                }
            } catch (error) {
                console.warn('Error cleaning up MediaRecorder:', error);
            }
            this.mediaRecorder = null;
        }
        
        // Clean up audio manager state
        if (this.audioManager) {
            await this.audioManager.cleanup();
        }
        
        // Remove any live visualization canvas that might still exist
        const liveCanvas = document.getElementById('liveWaveformCanvas');
        if (liveCanvas && liveCanvas.parentElement) {
            liveCanvas.parentElement.remove();
        }
        
        // Reset recording state
        this.isRecording = false;
        this.recordingStartTime = null;
        this.audioChunks = [];
        this.isProcessingAudio = false;
        
        // Reset UI elements
        const levelBar = document.getElementById('audioLevelBar');
        if (levelBar) {
            levelBar.style.width = '0%';
        }
        
        const levelText = document.getElementById('audioLevelText');
        if (levelText) {
            levelText.textContent = '0%';
        }
        
        // Clear any timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Add delay to ensure all cleanup completes
        console.log('Cleanup completed, waiting for resources to be released...');
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    discardRecording() {
        if (confirm('Are you sure you want to discard this recording? This action cannot be undone.')) {
            this.closeRecordingPreview();
            this.currentRecording = null;
            this.showNotification('Recording discarded', 'info');
            
            // Scroll back to recording controls
            document.querySelector('.recording-controls').scrollIntoView({ behavior: 'smooth' });
        }
    }

    async saveRecordingToHistory() {
        if (!this.currentRecording) return;

        const customFilename = document.getElementById('recordingFilename').value.trim();
        if (!customFilename) {
            this.showNotification('Please enter a recording name', 'warning');
            return;
        }

        // Validate filename
        if (!this.validateFilename(customFilename)) {
            this.showNotification('Please fix the filename errors before saving', 'error');
            return;
        }

        // Update metadata with current form values
        this.updateRecordingMetadata();

        // Create enhanced recording entry for history
        const permanentId = `recording_${Date.now()}`;
        const now = new Date();
        const recordingEntry = {
            id: permanentId,
            name: customFilename,
            filename: this.currentRecording.filename,
            date: now.toLocaleString(),
            timestamp: now.toISOString(), // Add proper ISO timestamp for sorting
            createdAt: now.toISOString(), // Alternative timestamp field
            duration: this.currentRecording.duration,
            size: this.currentRecording.size,
            originalSize: this.currentRecording.originalSize,
            sampleRate: this.currentRecording.sampleRate,
            channels: this.currentRecording.channels,
            blob: this.currentRecording.blob,
            transcription: this.currentRecording.transcription || null,
            interactions: [],
            // Enhanced metadata
            metadata: this.currentRecording.metadata || {},
            quality: this.currentRecording.quality || {},
            deviceInfo: this.currentRecording.deviceInfo || {},
            version: '1.2' // Track data format version
        };

        // Transfer Q&A conversation from temporary ID to permanent ID
        if (this.currentRecordingId && this.currentRecordingId !== permanentId) {
            const tempConversation = this.getRecordingConversation(this.currentRecordingId);
            if (tempConversation.length > 0) {
                this.saveRecordingConversation(permanentId, tempConversation);
                // Clean up temporary conversation
                delete this.qaConversations[this.currentRecordingId];
                this.saveQAConversations();
            }
        }

        // Store the recording (for now in memory, later we'll add proper storage)
        this.lastRecordingBlob = this.currentRecording.blob;
        this.lastRecordingFilename = customFilename;

        // Add to history
        try {
            await this.addToHistory(recordingEntry);
            
            // Close modal and show success
            this.closeRecordingPreview();
            this.showNotification(`Recording "${customFilename}" saved to history`, 'success');
        } catch (error) {
            console.error('Failed to save recording to history:', error);
            this.showNotification(`Failed to save recording: ${error.message}`, 'error');
            return; // Don't close preview or clear recording on failure
        }
        
        // Clear current recording
        this.currentRecording = null;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    setupWaveformVisualization(audioElement) {
        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 400;
        canvas.height = 60;
        
        // Clear canvas
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create a simple waveform visualization
        audioElement.addEventListener('loadeddata', () => {
            this.drawStaticWaveform(ctx, canvas.width, canvas.height);
        });
        
        // Update progress during playback
        audioElement.addEventListener('timeupdate', () => {
            try {
                if (audioElement && audioElement.readyState >= 1) { // HAVE_METADATA or higher
                    this.updateWaveformProgress(ctx, canvas.width, canvas.height, audioElement);
                }
            } catch (error) {
                console.error('Error updating waveform progress:', error);
            }
        });
    }

    drawStaticWaveform(ctx, width, height) {
        // Draw a simple static waveform representation
        ctx.fillStyle = '#475569';
        
        const barWidth = 3;
        const barGap = 1;
        const numBars = Math.floor(width / (barWidth + barGap));
        
        for (let i = 0; i < numBars; i++) {
            const barHeight = Math.random() * height * 0.8 + height * 0.1;
            const x = i * (barWidth + barGap);
            const y = (height - barHeight) / 2;
            
            ctx.fillRect(x, y, barWidth, barHeight);
        }
    }

    updateWaveformProgress(ctx, width, height, audioElement) {
        // Add comprehensive null checks
        if (!audioElement || !audioElement.duration || audioElement.duration === 0 || isNaN(audioElement.duration)) {
            return;
        }
        
        if (!audioElement.currentTime || isNaN(audioElement.currentTime)) {
            return;
        }
        
        const progress = audioElement.currentTime / audioElement.duration;
        const progressWidth = width * progress;
        
        // Redraw the waveform
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
        
        // Draw static waveform
        this.drawStaticWaveform(ctx, width, height);
        
        // Draw progress overlay
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, progressWidth, height);
        ctx.globalCompositeOperation = 'source-atop';
        this.drawStaticWaveform(ctx, progressWidth, height);
        ctx.globalCompositeOperation = 'source-over';
    }

    resetTranscriptionUI() {
        // Hide all transcription states
        document.getElementById('transcriptionProgress').style.display = 'none';
        document.getElementById('transcriptionResult').style.display = 'none';
        document.getElementById('transcriptionError').style.display = 'none';
        document.getElementById('retryTranscription').style.display = 'none';
        
        // Show start button
        document.getElementById('startTranscription').style.display = 'inline-flex';
        
        // Reset progress
        document.getElementById('transcriptionProgressFill').style.width = '0%';
        document.getElementById('transcriptionStatus').textContent = 'Ready to transcribe';
        document.getElementById('transcriptionTime').textContent = '--:--';
        
        // Clear transcript
        document.getElementById('transcriptText').value = '';
        document.getElementById('transcriptText').readOnly = true;
        
        // Reset edit button
        const editBtn = document.getElementById('editTranscript');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    }

    async startTranscription() {
        if (!this.currentRecording) {
            this.showNotification('No recording available for transcription', 'error');
            return;
        }

        // Validate configuration using TranscriptionService
        const transcriptionService = new TranscriptionService();
        const validation = transcriptionService.validateConfig(this.currentConfig);
        
        if (!validation.isValid) {
            this.showNotification('Configuration error: ' + validation.errors.join(', '), 'error');
            return;
        }

        // Generate job ID and start progress tracking
        const jobId = `transcription_${Date.now()}`;
        progressManager.startOperation(jobId, 'transcription', 'Transcribing audio recording');

        // Hide start button, show progress
        document.getElementById('startTranscription').style.display = 'none';
        document.getElementById('transcriptionProgress').style.display = 'block';
        document.getElementById('transcriptionResult').style.display = 'none';
        document.getElementById('transcriptionError').style.display = 'none';

        // Set up progress callback
        const progressCallback = (progress) => {
            this.updateTranscriptionProgress(progress);
        };

        try {
            // Perform transcription using new service
            const result = await transcriptionService.transcribeAudio(
                this.currentRecording.blob, 
                this.currentConfig, 
                progressCallback
            );
            
            // Store transcript in current recording with full metadata
            this.currentRecording.transcription = {
                text: result.text,
                confidence: result.confidence,
                speakerDiarization: result.speakerDiarization,
                processingTime: result.processingTime,
                provider: result.provider,
                timestamp: new Date().toISOString(),
                status: 'completed',
                jobId: result.jobId
            };

            // Show result
            this.showTranscriptionResult(result.text);
            
        } catch (error) {
            console.error('Transcription failed:', error);
            this.showTranscriptionError(error.message);
        }
    }

    validateTranscriptionConfig(provider, config) {
        switch (provider) {
            case 'azure-batch':
                return config.speechKey && config.region;
            case 'openai-whisper':
                return config.apiKey;
            case 'azure-whisper':
                return config.apiKey && config.endpoint && config.deployment;
            default:
                return false;
        }
    }

    updateTranscriptionProgress(progressData) {
        const progressBar = document.getElementById('transcriptionProgressFill');
        const statusText = document.getElementById('transcriptionStatus');
        const timeText = document.getElementById('transcriptionTime');
        
        if (progressBar) {
            progressBar.style.width = `${progressData.progress}%`;
        }
        
        if (statusText) {
            statusText.textContent = progressData.message || progressData.status;
        }
        
        if (timeText && progressData.startTime) {
            const elapsed = Date.now() - progressData.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            timeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Show progress notification if job ID is available
        if (progressData.jobId) {
            progressManager.showProgressNotification(progressData.jobId);
        }
    }

    startTranscriptionProgress() {
        // Legacy method - now handled by updateTranscriptionProgress
        // Keep for backward compatibility but functionality moved to progress manager
        let startTime = Date.now();
        
        const updateTime = () => {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const timeText = document.getElementById('transcriptionTime');
            if (timeText) {
                timeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Continue updating time if transcription is still in progress
            if (document.getElementById('transcriptionProgress').style.display !== 'none') {
                setTimeout(updateTime, 1000);
            }
        };
        
        updateTime();
    }

    async performTranscription(audioBlob, provider, config) {
        const aiService = new AIService();
        
        switch (provider) {
            case 'azure-batch':
                return await this.transcribeWithAzureBatch(audioBlob, config);
            case 'openai-whisper':
                return await aiService.transcribeWithWhisper(audioBlob, config.apiKey, config.language);
            case 'azure-whisper':
                return await aiService.transcribeWithAzureWhisper(audioBlob, config);
            default:
                throw new Error(`Unsupported transcription provider: ${provider}`);
        }
    }

    async transcribeWithAzureBatch(audioBlob, config) {
        // For now, simulate Azure Batch transcription
        // In a real implementation, this would upload to blob storage and use the batch API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate transcription result
                const sampleTranscript = `This is a simulated transcription using Azure Batch Transcription API. 

The recording was processed with the following settings:
- Language: ${config.language}
- Speaker diarization: ${config.enableDiarization ? 'Enabled' : 'Disabled'}
- Region: ${config.region}

In a real implementation, this would contain the actual transcribed text from your audio recording. The Azure Batch Transcription API provides high accuracy speech-to-text conversion with speaker identification and timestamps.

This sample text demonstrates how the transcription would appear in the interface, with proper formatting and structure for easy reading and editing.`;
                
                resolve(sampleTranscript);
            }, 3000 + Math.random() * 2000); // Simulate 3-5 second processing time
        });
    }

    showTranscriptionResult(transcript) {
        // Complete progress bar
        document.getElementById('transcriptionProgressFill').style.width = '100%';
        document.getElementById('transcriptionStatus').textContent = 'Transcription completed';
        
        setTimeout(() => {
            // Hide progress, show result
            document.getElementById('transcriptionProgress').style.display = 'none';
            document.getElementById('transcriptionResult').style.display = 'block';
            
            // Set transcript text
            document.getElementById('transcriptText').value = transcript;
            
            // Show success notification
            this.showNotification('Transcription completed successfully', 'success');
            
            // Show Q&A interface
            this.showQAInterface();
            
            // Show AI Analysis section
            this.showAIAnalysisSection();
            
            // Set current recording ID for Q&A (use timestamp if no ID yet)
            if (this.currentRecording) {
                this.currentRecordingId = this.currentRecording.id || `temp_${Date.now()}`;
            }
            
            // Scroll to transcript
            document.getElementById('transcriptionResult').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 1000);
    }

    showTranscriptionError(errorMessage) {
        // Hide progress
        document.getElementById('transcriptionProgress').style.display = 'none';
        
        // Show error
        document.getElementById('transcriptionError').style.display = 'block';
        document.getElementById('transcriptionErrorMessage').textContent = errorMessage;
        
        // Show retry button
        document.getElementById('retryTranscription').style.display = 'inline-flex';
        
        this.showNotification('Transcription failed', 'error');
    }

    async retryTranscription() {
        if (!this.currentRecording) {
            this.showNotification('No recording available for retry', 'error');
            return;
        }

        // Reset UI state
        this.resetTranscriptionUI();
        
        // Add small delay for UI update
        setTimeout(() => {
            this.startTranscription();
        }, 100);
    }

    async cancelTranscription() {
        // Find active transcription job
        const activeJobs = progressManager.getOperationsByType('transcription');
        
        if (activeJobs.length === 0) {
            this.showNotification('No active transcription to cancel', 'warning');
            return;
        }

        const job = activeJobs[0]; // Get the most recent transcription job
        
        try {
            const result = await progressManager.cancelOperation(job.id);
            
            if (result.success) {
                // Reset UI to initial state
                this.resetTranscriptionUI();
                this.showNotification('Transcription cancelled', 'info');
            } else {
                this.showNotification('Failed to cancel transcription: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error cancelling transcription:', error);
            this.showNotification('Error cancelling transcription: ' + error.message, 'error');
        }
    }

    toggleTranscriptEdit() {
        const textarea = document.getElementById('transcriptText');
        const editBtn = document.getElementById('editTranscript');
        const saveBtn = document.getElementById('saveTranscript');
        const cancelBtn = document.getElementById('cancelEdit');
        const toolbar = document.getElementById('transcriptToolbar');
        
        if (textarea.readOnly) {
            // Enable editing mode
            textarea.readOnly = false;
            textarea.focus();
            
            // Update UI
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';
            cancelBtn.style.display = 'inline-flex';
            toolbar.style.display = 'flex';
            
            // Load transcript into manager
            if (this.currentRecording && this.currentRecording.transcription) {
                this.transcriptManager.loadTranscript(this.currentRecording.transcription);
            }
            
            this.transcriptManager.isEditing = true;
            this.showNotification('Transcript editing enabled. Use Ctrl+Z/Y for undo/redo, Ctrl+F for search', 'info');
            
        } else {
            // This shouldn't happen with new UI, but keep for compatibility
            this.saveTranscriptEdits();
        }
    }

    saveTranscriptEdits() {
        const textarea = document.getElementById('transcriptText');
        const editBtn = document.getElementById('editTranscript');
        const saveBtn = document.getElementById('saveTranscript');
        const cancelBtn = document.getElementById('cancelEdit');
        const toolbar = document.getElementById('transcriptToolbar');
        
        // Update transcript in manager
        this.transcriptManager.updateTranscript(textarea.value);
        
        // Save to current recording
        if (this.currentRecording && this.currentRecording.transcription) {
            const updatedTranscript = this.transcriptManager.getCurrentTranscript();
            Object.assign(this.currentRecording.transcription, updatedTranscript);
            this.currentRecording.transcription.edited = true;
            this.currentRecording.transcription.editTimestamp = new Date().toISOString();
        }
        
        // Update UI
        textarea.readOnly = true;
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        toolbar.style.display = 'none';
        
        // Close any open panels
        this.closeSearchPanel();
        this.closeReplacePanel();
        
        this.transcriptManager.isEditing = false;
        this.showNotification('Transcript changes saved', 'success');
    }

    cancelTranscriptEdit() {
        const textarea = document.getElementById('transcriptText');
        const editBtn = document.getElementById('editTranscript');
        const saveBtn = document.getElementById('saveTranscript');
        const cancelBtn = document.getElementById('cancelEdit');
        const toolbar = document.getElementById('transcriptToolbar');
        
        // Restore original text
        if (this.currentRecording && this.currentRecording.transcription) {
            textarea.value = this.currentRecording.transcription.text;
        }
        
        // Update UI
        textarea.readOnly = true;
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        toolbar.style.display = 'none';
        
        // Close any open panels
        this.closeSearchPanel();
        this.closeReplacePanel();
        
        this.transcriptManager.isEditing = false;
        this.showNotification('Edit cancelled', 'info');
    }

    undoTranscriptEdit() {
        if (this.transcriptManager.undo()) {
            const textarea = document.getElementById('transcriptText');
            textarea.value = this.transcriptManager.getCurrentTranscript().text;
            this.showNotification('Undo successful', 'info');
        } else {
            this.showNotification('Nothing to undo', 'warning');
        }
    }

    redoTranscriptEdit() {
        if (this.transcriptManager.redo()) {
            const textarea = document.getElementById('transcriptText');
            textarea.value = this.transcriptManager.getCurrentTranscript().text;
            this.showNotification('Redo successful', 'info');
        } else {
            this.showNotification('Nothing to redo', 'warning');
        }
    }

    toggleSearchPanel() {
        const searchPanel = document.getElementById('searchPanel');
        const replacePanel = document.getElementById('replacePanel');
        
        // Close replace panel if open
        replacePanel.style.display = 'none';
        
        if (searchPanel.style.display === 'none' || !searchPanel.style.display) {
            searchPanel.style.display = 'block';
            document.getElementById('searchInput').focus();
        } else {
            this.closeSearchPanel();
        }
    }

    closeSearchPanel() {
        const searchPanel = document.getElementById('searchPanel');
        searchPanel.style.display = 'none';
        
        // Clear search highlights
        this.clearSearchHighlights();
    }

    toggleReplacePanel() {
        const searchPanel = document.getElementById('searchPanel');
        const replacePanel = document.getElementById('replacePanel');
        
        // Close search panel if open
        searchPanel.style.display = 'none';
        
        if (replacePanel.style.display === 'none' || !replacePanel.style.display) {
            replacePanel.style.display = 'block';
            document.getElementById('replaceSearchInput').focus();
        } else {
            this.closeReplacePanel();
        }
    }

    closeReplacePanel() {
        const replacePanel = document.getElementById('replacePanel');
        replacePanel.style.display = 'none';
    }

    searchInTranscript(query) {
        if (!query.trim()) {
            this.clearSearchHighlights();
            document.getElementById('searchResultsText').textContent = 'No results';
            return;
        }

        const options = {
            caseSensitive: document.getElementById('caseSensitive').checked,
            wholeWord: document.getElementById('wholeWord').checked,
            regex: document.getElementById('useRegex').checked
        };

        try {
            const results = this.transcriptManager.search(query, options);
            
            if (results.length > 0) {
                document.getElementById('searchResultsText').textContent = 
                    `${results.length} result${results.length > 1 ? 's' : ''} (1 of ${results.length})`;
                this.highlightSearchResults(results);
            } else {
                document.getElementById('searchResultsText').textContent = 'No results';
                this.clearSearchHighlights();
            }
        } catch (error) {
            document.getElementById('searchResultsText').textContent = 'Search error: ' + error.message;
            this.clearSearchHighlights();
        }
    }

    nextSearchResult() {
        const result = this.transcriptManager.nextSearchResult();
        if (result) {
            this.scrollToSearchResult(result);
            const results = this.transcriptManager.searchResults;
            const currentIndex = this.transcriptManager.currentSearchIndex;
            document.getElementById('searchResultsText').textContent = 
                `${results.length} result${results.length > 1 ? 's' : ''} (${currentIndex + 1} of ${results.length})`;
        }
    }

    previousSearchResult() {
        const result = this.transcriptManager.previousSearchResult();
        if (result) {
            this.scrollToSearchResult(result);
            const results = this.transcriptManager.searchResults;
            const currentIndex = this.transcriptManager.currentSearchIndex;
            document.getElementById('searchResultsText').textContent = 
                `${results.length} result${results.length > 1 ? 's' : ''} (${currentIndex + 1} of ${results.length})`;
        }
    }

    scrollToSearchResult(result) {
        const textarea = document.getElementById('transcriptText');
        textarea.focus();
        textarea.setSelectionRange(result.index, result.index + result.length);
        textarea.scrollTop = textarea.scrollHeight * (result.index / textarea.value.length);
    }

    highlightSearchResults(results) {
        // This is a simplified implementation
        // In a full implementation, you might use a rich text editor or overlay highlights
        if (results.length > 0) {
            this.scrollToSearchResult(results[0]);
        }
    }

    clearSearchHighlights() {
        // Clear any search highlights
        // Implementation depends on highlighting method used
    }

    replaceNext() {
        const searchText = document.getElementById('replaceSearchInput').value;
        const replaceText = document.getElementById('replaceInput').value;
        
        if (!searchText) {
            this.showNotification('Enter text to find', 'warning');
            return;
        }

        try {
            const result = this.transcriptManager.replace(searchText, replaceText, {
                caseSensitive: false,
                wholeWord: false,
                replaceAll: false
            });

            if (result.replacementCount > 0) {
                const textarea = document.getElementById('transcriptText');
                textarea.value = result.newText;
                this.showNotification('Replaced 1 occurrence', 'success');
            } else {
                this.showNotification('Text not found', 'warning');
            }
        } catch (error) {
            this.showNotification('Replace error: ' + error.message, 'error');
        }
    }

    replaceAll() {
        const searchText = document.getElementById('replaceSearchInput').value;
        const replaceText = document.getElementById('replaceInput').value;
        
        if (!searchText) {
            this.showNotification('Enter text to find', 'warning');
            return;
        }

        try {
            const result = this.transcriptManager.replace(searchText, replaceText, {
                caseSensitive: false,
                wholeWord: false,
                replaceAll: true
            });

            const textarea = document.getElementById('transcriptText');
            textarea.value = result.newText;
            
            if (result.replacementCount > 0) {
                this.showNotification(`Replaced ${result.replacementCount} occurrence${result.replacementCount > 1 ? 's' : ''}`, 'success');
            } else {
                this.showNotification('Text not found', 'warning');
            }
        } catch (error) {
            this.showNotification('Replace error: ' + error.message, 'error');
        }
    }

    formatTranscriptWithSpeakers() {
        const formattedText = this.transcriptManager.formatWithSpeakers();
        if (formattedText !== this.transcriptManager.getCurrentTranscript().text) {
            const textarea = document.getElementById('transcriptText');
            textarea.value = formattedText;
            this.transcriptManager.updateTranscript(formattedText);
            this.showNotification('Formatted with speaker names', 'success');
        } else {
            this.showNotification('No speaker diarization data available', 'warning');
        }
    }

    formatTranscriptWithTimestamps() {
        const formattedText = this.transcriptManager.formatWithTimestamps();
        if (formattedText !== this.transcriptManager.getCurrentTranscript().text) {
            const textarea = document.getElementById('transcriptText');
            textarea.value = formattedText;
            this.transcriptManager.updateTranscript(formattedText);
            this.showNotification('Formatted with timestamps', 'success');
        } else {
            this.showNotification('No timestamp data available', 'warning');
        }
    }

    showTranscriptStatistics() {
        const stats = this.transcriptManager.getStatistics();
        if (!stats) {
            this.showNotification('No transcript loaded', 'warning');
            return;
        }

        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-item">
                <label>Characters:</label>
                <span>${stats.characters.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <label>Characters (no spaces):</label>
                <span>${stats.charactersNoSpaces.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <label>Words:</label>
                <span>${stats.words.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <label>Sentences:</label>
                <span>${stats.sentences.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <label>Paragraphs:</label>
                <span>${stats.paragraphs.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <label>Average words per sentence:</label>
                <span>${stats.averageWordsPerSentence}</span>
            </div>
            <div class="stat-item">
                <label>Estimated reading time:</label>
                <span>${stats.readingTime} minute${stats.readingTime > 1 ? 's' : ''}</span>
            </div>
            ${stats.speakers ? `
                <div class="stat-item">
                    <label>Speakers:</label>
                    <span>${stats.speakers}</span>
                </div>
                <div class="stat-item">
                    <label>Speaker list:</label>
                    <span>${stats.speakerList.join(', ')}</span>
                </div>
            ` : ''}
        `;

        document.getElementById('statsModal').style.display = 'block';
    }

    closeStatsModal() {
        document.getElementById('statsModal').style.display = 'none';
    }

    async exportTranscript() {
        if (!this.transcriptManager.getCurrentTranscript()) {
            this.showNotification('No transcript to export', 'warning');
            return;
        }

        // Show export modal
        document.getElementById('exportModal').style.display = 'block';
        
        // Set default filename
        const timestamp = new Date().toISOString().split('T')[0];
        document.getElementById('exportFilename').value = `transcript_${timestamp}`;
    }

    closeExportModal() {
        document.getElementById('exportModal').style.display = 'none';
    }

    toggleCustomModelInput(provider, selectedValue) {
        const customGroups = {
            'openai': 'openaiCustomModelGroup',
            'gemini': 'geminiCustomModelGroup', 
            'deepseek': 'deepseekCustomModelGroup',
            'azure': 'azureCustomModelGroup'
        };

        const groupId = customGroups[provider];
        const customGroup = document.getElementById(groupId);
        
        if (customGroup) {
            if (selectedValue === 'custom') {
                customGroup.style.display = 'block';
                // Add a subtle animation class
                customGroup.classList.add('custom-model-active');
                
                // Focus on the custom input field
                const customInput = customGroup.querySelector('input');
                if (customInput) {
                    setTimeout(() => {
                        customInput.focus();
                        customInput.select(); // Select any existing text
                    }, 150);
                }
            } else {
                customGroup.style.display = 'none';
                customGroup.classList.remove('custom-model-active');
            }
        }
    }

    async confirmTranscriptExport() {
        const format = document.getElementById('exportFormat').value;
        const includeSpeakers = document.getElementById('includeSpeakers').checked;
        const includeTimestamps = document.getElementById('includeTimestamps').checked;
        const includeMetadata = document.getElementById('includeMetadata').checked;
        const filename = document.getElementById('exportFilename').value.trim();

        if (!filename) {
            this.showNotification('Please enter a filename', 'warning');
            return;
        }

        try {
            const exportData = await this.transcriptManager.exportTranscript(format, {
                includeSpeakers,
                includeTimestamps,
                includeMetadata,
                filename
            });

            // Create download
            const blob = new Blob([exportData.content], { type: exportData.mimeType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = exportData.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.closeExportModal();
            this.showNotification(`Transcript exported as ${exportData.filename}`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Export failed: ' + error.message, 'error');
        }
    }

    async copyTranscript() {
        const transcript = document.getElementById('transcriptText').value;
        if (!transcript) {
            this.showNotification('No transcript to copy', 'warning');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('clipboard-write-text', transcript);
            if (result.success) {
                this.showNotification('Transcript copied to clipboard', 'success');
            } else {
                this.showNotification('Failed to copy transcript', 'error');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy transcript', 'error');
        }
    }

    async exportTranscript() {
        const transcript = document.getElementById('transcriptText').value;
        if (!transcript) {
            this.showNotification('No transcript to export', 'warning');
            return;
        }

        try {
            const recordingName = document.getElementById('recordingFilename').value || 'transcript';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${recordingName}_transcript_${timestamp}.txt`;

            const result = await ipcRenderer.invoke('save-file-dialog', {
                defaultPath: filename,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                const saveResult = await ipcRenderer.invoke('save-file', result.filePath, transcript);
                if (saveResult.success) {
                    this.showNotification('Transcript exported successfully', 'success');
                } else {
                    this.showNotification('Failed to export transcript: ' + saveResult.error, 'error');
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Failed to export transcript', 'error');
        }
    }

    showRecordingDetail(recording) {
        this.currentDetailRecording = recording;
        this.currentRecordingId = recording.id || recording.timestamp; // Use ID or timestamp as unique identifier
        
        console.log('showRecordingDetail: Opening recording', {
            recordingName: recording.name,
            recordingId: this.currentRecordingId,
            hasTranscription: !!recording.transcription
        });
        
        const modal = document.getElementById('recordingDetailModal');
        
        // Populate recording info
        document.getElementById('detailRecordingName').textContent = recording.name || recording.filename;
        document.getElementById('detailDate').textContent = recording.date;
        // Format duration properly - handle both string and number formats
        let formattedDuration = recording.duration;
        if (typeof recording.duration === 'number' && !isNaN(recording.duration)) {
            formattedDuration = this.formatDuration(recording.duration * 1000); // Convert seconds to milliseconds
        } else if (typeof recording.duration === 'string' && recording.duration.includes(':')) {
            formattedDuration = recording.duration; // Already formatted
        } else {
            formattedDuration = '0:00'; // Fallback for invalid durations
        }
        document.getElementById('detailDuration').textContent = formattedDuration;
        document.getElementById('detailFileSize').textContent = this.formatFileSize(recording.size || 0);
        document.getElementById('detailQuality').textContent = 
            `${recording.sampleRate ? recording.sampleRate / 1000 + ' kHz' : 'Unknown'}, ${recording.channels === 1 ? 'Mono' : recording.channels === 2 ? 'Stereo' : 'Unknown'}`;
        
        // Set up audio player
        this.setupDetailAudioPlayer(recording);
        
        // Clear any existing Q&A conversation display
        const conversation = document.getElementById('detailQaConversation');
        if (conversation) {
            conversation.innerHTML = '';
        }
        
        // Set up transcription section
        this.setupDetailTranscription(recording);
        
        // Show modal
        modal.classList.add('active');
    }

    setupDetailAudioPlayer(recording) {
        const audio = document.getElementById('detailAudio');
        const playPauseBtn = document.getElementById('detailPlayPause');
        const currentTimeSpan = document.getElementById('detailCurrentTime');
        const totalTimeSpan = document.getElementById('detailTotalTime');
        
        // Get blob from stored data
        let blob = recording.blob;
        if (!blob && recording.blobData) {
            blob = this.base64ToBlob(recording.blobData);
        }
        
        if (blob) {
            const audioUrl = this.createManagedBlobUrl(blob, 'detail-audio');
            audio.src = audioUrl;
            
            // Update time displays
            audio.addEventListener('loadedmetadata', () => {
                // Handle invalid duration values
                const duration = isNaN(audio.duration) || !isFinite(audio.duration) ? 0 : audio.duration;
                totalTimeSpan.textContent = this.formatTime(duration);
            });
            
            audio.addEventListener('timeupdate', () => {
                try {
                    if (audio && audio.readyState >= 1 && !isNaN(audio.currentTime)) {
                        currentTimeSpan.textContent = this.formatTime(audio.currentTime);
                    }
                } catch (error) {
                    console.error('Error updating time display:', error);
                }
            });
            
            // Update play/pause button
            audio.addEventListener('play', () => {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            });
            
            audio.addEventListener('pause', () => {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            });
            
            audio.addEventListener('ended', () => {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            });
        } else {
            // No audio available
            audio.style.display = 'none';
            playPauseBtn.disabled = true;
            playPauseBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Audio Not Available';
        }
    }

    setupDetailTranscription(recording) {
        const statusBadge = document.getElementById('detailStatusBadge');
        const noTranscription = document.getElementById('detailNoTranscription');
        const transcriptionResult = document.getElementById('detailTranscriptionResult');
        const transcriptionProgress = document.getElementById('detailTranscriptionProgress');
        const transcriptionError = document.getElementById('detailTranscriptionError');
        
        // Hide all states first
        noTranscription.style.display = 'none';
        transcriptionResult.style.display = 'none';
        transcriptionProgress.style.display = 'none';
        transcriptionError.style.display = 'none';
        
        if (recording.transcription && recording.transcription.status === 'completed') {
            // Show completed transcription
            statusBadge.textContent = 'Completed';
            statusBadge.className = 'status-badge completed';
            transcriptionResult.style.display = 'block';
            document.getElementById('detailTranscriptText').value = recording.transcription.text;
            
            // Show AI Analysis section
            this.showDetailAIAnalysisSection();
        } else if (recording.transcription && recording.transcription.status === 'failed') {
            // Show failed state
            statusBadge.textContent = 'Failed';
            statusBadge.className = 'status-badge failed';
            transcriptionError.style.display = 'block';
            document.getElementById('detailErrorMessage').textContent = recording.transcription.error || 'Transcription failed';
        } else {
            // Show no transcription state
            statusBadge.textContent = 'Not Available';
            statusBadge.className = 'status-badge not-available';
            noTranscription.style.display = 'block';
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    toggleDetailAudioPlayback() {
        const audio = document.getElementById('detailAudio');
        
        if (audio.paused) {
            audio.play().catch(error => {
                console.error('Playback failed:', error);
                this.showNotification('Failed to play audio', 'error');
            });
        } else {
            audio.pause();
        }
    }

    closeRecordingDetail() {
        const modal = document.getElementById('recordingDetailModal');
        const audio = document.getElementById('detailAudio');
        
        // Stop audio and clean up
        if (audio.src) {
            audio.pause();
            if (audio.src.startsWith('blob:')) {
                URL.revokeObjectURL(audio.src);
            }
            audio.removeAttribute('src');
        }
        
        // Hide modal
        modal.classList.remove('active');
        
        // Clear current recording reference
        this.currentDetailRecording = null;
    }

    deleteCurrentDetailRecording() {
        if (!this.currentDetailRecording) return;
        
        if (confirm(`Are you sure you want to delete "${this.currentDetailRecording.name || this.currentDetailRecording.filename}"? This action cannot be undone.`)) {
            this.deleteHistoryItem(this.currentDetailRecording.id || this.currentDetailRecording.filename);
            this.closeRecordingDetail();
        }
    }

    async startDetailTranscription() {
        if (!this.currentDetailRecording || (!this.currentDetailRecording.blob && !this.currentDetailRecording.blobData)) {
            this.showNotification('No audio available for transcription', 'error');
            return;
        }

        // Get blob from stored data
        let blob = this.currentDetailRecording.blob;
        if (!blob && this.currentDetailRecording.blobData) {
            blob = this.base64ToBlob(this.currentDetailRecording.blobData);
        }

        if (!blob) {
            this.showNotification('Failed to load audio data for transcription', 'error');
            return;
        }

        // Check transcription configuration
        const transcriptionProvider = this.currentConfig.transcription.provider;
        const providerConfig = this.currentConfig.transcription[transcriptionProvider];
        
        if (!this.validateTranscriptionConfig(transcriptionProvider, providerConfig)) {
            this.showNotification('Please configure transcription settings in AI Settings', 'warning');
            return;
        }

        // Update UI to show progress
        document.getElementById('detailNoTranscription').style.display = 'none';
        document.getElementById('detailTranscriptionError').style.display = 'none';
        document.getElementById('detailTranscriptionProgress').style.display = 'block';
        
        const statusBadge = document.getElementById('detailStatusBadge');
        statusBadge.textContent = 'Processing';
        statusBadge.className = 'status-badge processing';

        // Start progress animation
        this.startDetailTranscriptionProgress();

        try {
            // Perform transcription
            const transcriptResult = await this.performTranscription(
                blob, 
                transcriptionProvider, 
                providerConfig
            );
            
            // Extract text from result (handle both string and object responses)
            const transcript = typeof transcriptResult === 'string' ? transcriptResult : transcriptResult.text;
            
            // Update recording with transcription
            this.currentDetailRecording.transcription = {
                text: transcript,
                provider: transcriptionProvider,
                timestamp: new Date().toISOString(),
                status: 'completed'
            };

            // Update in storage
            this.updateRecordingInHistory(this.currentDetailRecording);

            // Show result
            this.showDetailTranscriptionResult(transcript);
            
        } catch (error) {
            console.error('Detail transcription failed:', error);
            this.showDetailTranscriptionError(error.message);
        }
    }

    startDetailTranscriptionProgress() {
        let progress = 0;
        let startTime = Date.now();
        
        const updateProgress = () => {
            if (progress < 90) {
                progress += Math.random() * 10;
                progress = Math.min(progress, 90);
                
                document.getElementById('detailProgressFill').style.width = progress + '%';
                
                const elapsed = Date.now() - startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('detailProgressTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Update status messages
                if (progress < 30) {
                    document.getElementById('detailProgressStatus').textContent = 'Uploading audio...';
                } else if (progress < 60) {
                    document.getElementById('detailProgressStatus').textContent = 'Processing audio...';
                } else {
                    document.getElementById('detailProgressStatus').textContent = 'Generating transcript...';
                }
                
                setTimeout(updateProgress, 500 + Math.random() * 1000);
            }
        };
        
        updateProgress();
    }

    showDetailTranscriptionResult(transcript) {
        // Complete progress bar
        document.getElementById('detailProgressFill').style.width = '100%';
        document.getElementById('detailProgressStatus').textContent = 'Transcription completed';
        
        setTimeout(() => {
            // Hide progress, show result
            document.getElementById('detailTranscriptionProgress').style.display = 'none';
            document.getElementById('detailTranscriptionResult').style.display = 'block';
            
            // Update status badge
            const statusBadge = document.getElementById('detailStatusBadge');
            statusBadge.textContent = 'Completed';
            statusBadge.className = 'status-badge completed';
            
            // Set transcript text
            document.getElementById('detailTranscriptText').value = transcript;
            
            // Show success notification
            this.showNotification('Transcription completed successfully', 'success');
            
            // Show AI Analysis section
            this.showDetailAIAnalysisSection();
        }, 1000);
    }

    showDetailTranscriptionError(errorMessage) {
        // Hide progress
        document.getElementById('detailTranscriptionProgress').style.display = 'none';
        
        // Show error
        document.getElementById('detailTranscriptionError').style.display = 'block';
        document.getElementById('detailErrorMessage').textContent = errorMessage;
        
        // Update status badge
        const statusBadge = document.getElementById('detailStatusBadge');
        statusBadge.textContent = 'Failed';
        statusBadge.className = 'status-badge failed';
        
        // Update recording status
        if (this.currentDetailRecording) {
            this.currentDetailRecording.transcription = {
                status: 'failed',
                error: errorMessage,
                timestamp: new Date().toISOString()
            };
            this.updateRecordingInHistory(this.currentDetailRecording);
        }
        
        this.showNotification('Transcription failed', 'error');
    }

    retryDetailTranscription() {
        // Reset transcription state
        if (this.currentDetailRecording && this.currentDetailRecording.transcription) {
            delete this.currentDetailRecording.transcription;
            this.updateRecordingInHistory(this.currentDetailRecording);
        }
        
        // Reset UI and start again
        this.setupDetailTranscription(this.currentDetailRecording);
        setTimeout(() => this.startDetailTranscription(), 100);
    }

    toggleDetailTranscriptEdit() {
        const textarea = document.getElementById('detailTranscriptText');
        const editBtn = document.getElementById('detailEditTranscript');
        
        if (textarea.readOnly) {
            // Enable editing
            textarea.readOnly = false;
            textarea.focus();
            editBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            this.showNotification('Transcript editing enabled', 'info');
        } else {
            // Save changes
            textarea.readOnly = true;
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
            
            // Update stored transcript
            if (this.currentDetailRecording && this.currentDetailRecording.transcription) {
                this.currentDetailRecording.transcription.text = textarea.value;
                this.currentDetailRecording.transcription.edited = true;
                this.currentDetailRecording.transcription.editTimestamp = new Date().toISOString();
                this.updateRecordingInHistory(this.currentDetailRecording);
            }
            
            this.showNotification('Transcript changes saved', 'success');
        }
    }

    async copyDetailTranscript() {
        const transcript = document.getElementById('detailTranscriptText').value;
        if (!transcript) {
            this.showNotification('No transcript to copy', 'warning');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('clipboard-write-text', transcript);
            if (result.success) {
                this.showNotification('Transcript copied to clipboard', 'success');
            } else {
                this.showNotification('Failed to copy transcript', 'error');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy transcript', 'error');
        }
    }

    async exportDetailTranscript() {
        const transcript = document.getElementById('detailTranscriptText').value;
        if (!transcript) {
            this.showNotification('No transcript to export', 'warning');
            return;
        }

        try {
            const recordingName = this.currentDetailRecording.name || 'transcript';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${recordingName}_transcript_${timestamp}.txt`;

            const result = await ipcRenderer.invoke('save-file-dialog', {
                defaultPath: filename,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                const saveResult = await ipcRenderer.invoke('save-file', result.filePath, transcript);
                if (saveResult.success) {
                    this.showNotification('Transcript exported successfully', 'success');
                } else {
                    this.showNotification('Failed to export transcript: ' + saveResult.error, 'error');
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Failed to export transcript', 'error');
        }
    }

    async updateRecordingInHistory(updatedRecording) {
        let history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        const index = history.findIndex(h => h.id === updatedRecording.id || h.filename === updatedRecording.filename);
        
        if (index !== -1) {
            // Convert blob to base64 if needed
            if (updatedRecording.blob && !updatedRecording.blobData) {
                try {
                    updatedRecording.blobData = await this.blobToBase64(updatedRecording.blob);
                    delete updatedRecording.blob;
                } catch (error) {
                    console.error('Failed to convert blob to base64:', error);
                }
            }
            
            history[index] = updatedRecording;
            localStorage.setItem('callHistory', JSON.stringify(history));
            this.updateHistoryUI();
        }
    }

    viewHistoryItem(itemId) {
        const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        const item = history.find(h => h.id === itemId || h.filename === itemId);
        
        if (!item) {
            this.showNotification('Recording not found', 'error');
            return;
        }

        // Stop any currently playing audio before opening detail view
        this.stopCurrentAudio();

        this.showRecordingDetail(item);
    }

    playRecording(itemId) {
        const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        const item = history.find(h => h.id === itemId || h.filename === itemId);
        
        if (!item || (!item.blob && !item.blobData)) {
            this.showNotification('Recording audio not available', 'error');
            return;
        }

        // Find the play button for this recording
        const playButton = document.querySelector(`button[onclick="app.playRecording('${itemId}')"]`);
        
        // If this recording is currently playing, pause it
        if (this.currentPlayingAudio && this.currentPlayingItemId === itemId) {
            if (!this.currentPlayingAudio.paused) {
                this.currentPlayingAudio.pause();
                this.updatePlayButton(playButton, false);
                return;
            } else {
                // Resume playing
                this.currentPlayingAudio.play().then(() => {
                    this.updatePlayButton(playButton, true);
                }).catch(error => {
                    console.error('Resume failed:', error);
                    this.showNotification('Failed to resume playback', 'error');
                });
                return;
            }
        }

        // Stop any currently playing audio
        this.stopCurrentAudio();

        // Get blob from stored data
        let blob = item.blob;
        if (!blob && item.blobData) {
            blob = this.base64ToBlob(item.blobData);
        }

        if (!blob) {
            this.showNotification('Failed to load audio data', 'error');
            return;
        }

        // Create temporary audio element for playback
        const audio = new Audio();
        const audioUrl = this.createManagedBlobUrl(blob, 'playback-audio');
        audio.src = audioUrl;
        this.currentPlayingAudio = audio;
        this.currentPlayingItemId = itemId;
        this.currentAudioUrl = audioUrl;
        
        audio.play().then(() => {
            this.updatePlayButton(playButton, true);
            this.showNotification(`Playing "${item.name || item.filename}"`, 'info');
        }).catch(error => {
            console.error('Playback failed:', error);
            this.showNotification('Failed to play recording', 'error');
            this.cleanupCurrentAudio();
        });

        // Handle audio events
        audio.addEventListener('ended', () => {
            this.updatePlayButton(playButton, false);
            this.cleanupCurrentAudio();
        });

        audio.addEventListener('pause', () => {
            this.updatePlayButton(playButton, false);
        });

        audio.addEventListener('play', () => {
            this.updatePlayButton(playButton, true);
        });
    }

    updatePlayButton(button, isPlaying) {
        if (!button) return;
        
        if (isPlaying) {
            button.innerHTML = '<i class="fas fa-pause"></i>';
            button.classList.add('playing');
        } else {
            button.innerHTML = '<i class="fas fa-play"></i>';
            button.classList.remove('playing');
        }
    }

    stopCurrentAudio() {
        if (this.currentPlayingAudio) {
            this.currentPlayingAudio.pause();
            this.cleanupCurrentAudio();
        }
    }

    cleanupCurrentAudio() {
        if (this.currentAudioUrl) {
            URL.revokeObjectURL(this.currentAudioUrl);
            this.currentAudioUrl = null;
        }
        
        // Reset all play buttons
        const playButtons = document.querySelectorAll('.history-item-actions .btn-primary');
        playButtons.forEach(button => {
            button.innerHTML = '<i class="fas fa-play"></i>';
            button.classList.remove('playing');
        });
        
        this.currentPlayingAudio = null;
        this.currentPlayingItemId = null;
    }

    showAIAnalysisSection() {
        const transcriptionResult = document.getElementById('transcriptionResult');
        const aiAnalysisSection = document.getElementById('aiAnalysisSection');
        
        if (transcriptionResult.style.display === 'block') {
            aiAnalysisSection.style.display = 'block';
            this.populateTemplateGrid(); // Default to summary category
            
            // Also show Q&A interface (it's already called in transcription completion)
            // this.showQAInterface(); // This is already called in the transcription completion flow
        }
    }

    switchTemplateCategory(category) {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Load templates for this category
        this.loadTemplateGrid(category);
    }

    loadTemplateGrid(category) {
        const grid = document.getElementById('templateGrid');
        const templates = this.templates.filter(t => t.category === category);
        
        if (templates.length === 0) {
            grid.innerHTML = `
                <div class="empty-templates">
                    <i class="fas fa-plus-circle"></i>
                    <p>No templates in this category</p>
                    <button class="btn btn-primary" onclick="app.openTemplateManagement()">
                        Create Template
                    </button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = templates.map(template => `
            <div class="template-card" onclick="app.applyTemplate('${template.id}')">
                <div class="template-card-header">
                    <i class="template-card-icon ${this.getTemplateIcon(template.category)}"></i>
                    <span class="template-card-title">${template.name}</span>
                </div>
                <div class="template-card-description">${template.description}</div>
                <div class="template-card-actions">
                    <button class="template-action-btn" onclick="event.stopPropagation(); app.editTemplate('${template.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="template-action-btn" onclick="event.stopPropagation(); app.deleteTemplate('${template.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getTemplateIcon(category) {
        const icons = {
            summary: 'fas fa-file-alt',
            contacts: 'fas fa-address-book',
            actions: 'fas fa-tasks',
            analysis: 'fas fa-chart-line',
            custom: 'fas fa-user-edit'
        };
        return icons[category] || 'fas fa-file';
    }

    async applyTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            this.showNotification('Template not found', 'error');
            return;
        }

        const transcript = document.getElementById('transcriptText').value;
        if (!transcript) {
            this.showNotification('No transcript available. Please transcribe the recording first.', 'warning');
            return;
        }

        // Show progress
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('analysisProgress').style.display = 'block';
        
        // Mark template as processing
        const templateCard = document.querySelector(`[onclick="app.applyTemplate('${templateId}')"]`);
        if (templateCard) {
            templateCard.classList.add('processing');
        }

        this.startAnalysisProgress();

        try {
            // Prepare the prompt with variables
            const prompt = this.processTemplateVariables(template.prompt, {
                transcript: transcript,
                date: new Date().toLocaleDateString(),
                duration: this.currentRecording?.duration || 'Unknown',
                filename: this.currentRecording?.filename || 'Unknown'
            });

            // Get AI response
            const aiService = new AIService();
            const result = await aiService.generateSummary(prompt, this.currentConfig);

            // Show results
            this.showAnalysisResults(template.name, result);

        } catch (error) {
            console.error('Template analysis failed:', error);
            this.showNotification('Analysis failed: ' + error.message, 'error');
            document.getElementById('analysisProgress').style.display = 'none';
        } finally {
            // Remove processing state
            if (templateCard) {
                templateCard.classList.remove('processing');
            }
        }
    }

    processTemplateVariables(prompt, variables) {
        let processedPrompt = prompt;
        
        Object.keys(variables).forEach(key => {
            const placeholder = `{${key}}`;
            processedPrompt = processedPrompt.replace(new RegExp(placeholder, 'g'), variables[key]);
        });
        
        return processedPrompt;
    }

    startAnalysisProgress() {
        let progress = 0;
        let startTime = Date.now();
        
        const updateProgress = () => {
            if (progress < 90) {
                progress += Math.random() * 15;
                progress = Math.min(progress, 90);
                
                document.getElementById('analysisProgressFill').style.width = progress + '%';
                
                const elapsed = Date.now() - startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                document.getElementById('analysisTime').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Update status messages
                if (progress < 30) {
                    document.getElementById('analysisStatus').textContent = 'Analyzing transcript...';
                } else if (progress < 60) {
                    document.getElementById('analysisStatus').textContent = 'Processing with AI...';
                } else {
                    document.getElementById('analysisStatus').textContent = 'Generating results...';
                }
                
                setTimeout(updateProgress, 300 + Math.random() * 700);
            }
        };
        
        updateProgress();
    }

    showAnalysisResults(templateName, result) {
        // Complete progress bar
        document.getElementById('analysisProgressFill').style.width = '100%';
        document.getElementById('analysisStatus').textContent = 'Analysis completed';
        
        setTimeout(() => {
            // Hide progress, show results
            document.getElementById('analysisProgress').style.display = 'none';
            document.getElementById('analysisResults').style.display = 'block';
            
            // Set results
            document.getElementById('resultsTitle').textContent = templateName + ' Results';
            document.getElementById('resultsText').textContent = result;
            
            // Scroll to results
            document.getElementById('analysisResults').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            this.showNotification('Analysis completed successfully', 'success');
        }, 1000);
    }

    async copyAnalysisResults() {
        const results = document.getElementById('resultsText').textContent;
        if (!results) {
            this.showNotification('No results to copy', 'warning');
            return;
        }

        try {
            const result = await ipcRenderer.invoke('clipboard-write-text', results);
            if (result.success) {
                this.showNotification('Results copied to clipboard', 'success');
            } else {
                this.showNotification('Failed to copy results', 'error');
            }
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('Failed to copy results', 'error');
        }
    }

    async exportAnalysisResults() {
        const results = document.getElementById('resultsText').textContent;
        const title = document.getElementById('resultsTitle').textContent;
        
        if (!results) {
            this.showNotification('No results to export', 'warning');
            return;
        }

        try {
            const recordingName = document.getElementById('recordingFilename').value || 'analysis';
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${recordingName}_${title.replace(/\s+/g, '_')}_${timestamp}.txt`;

            const content = `${title}\n${'='.repeat(title.length)}\n\n${results}`;

            const result = await ipcRenderer.invoke('save-file-dialog', {
                defaultPath: filename,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                const saveResult = await ipcRenderer.invoke('save-file', result.filePath, content);
                if (saveResult.success) {
                    this.showNotification('Analysis results exported successfully', 'success');
                } else {
                    this.showNotification('Failed to export results: ' + saveResult.error, 'error');
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Failed to export results', 'error');
        }
    }

    clearAnalysisResults() {
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('resultsText').textContent = '';
    }

    openTemplateManagement() {
        const modal = document.getElementById('templateManagementModal');
        this.loadTemplateManagementList();
        modal.classList.add('active');
    }

    closeTemplateManagement() {
        const modal = document.getElementById('templateManagementModal');
        modal.classList.remove('active');
        
        // Refresh template grid in case templates were modified
        const activeCategory = document.querySelector('.category-tab.active').dataset.category;
        this.loadTemplateGrid(activeCategory);
    }

    switchManagementTab(tab) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Show/hide tab content
        document.querySelectorAll('#templateManagementModal .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}TemplatesTab`).classList.add('active');
        
        if (tab === 'browse') {
            this.loadTemplateManagementList();
        }
    }

    loadTemplateManagementList() {
        const list = document.getElementById('templateManagementList');
        
        if (this.templates.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-plus-circle"></i>
                    <p>No templates created yet</p>
                    <small>Create your first template to get started</small>
                </div>
            `;
            return;
        }
        
        // Group templates by category
        const categories = ['summary', 'contacts', 'actions', 'analysis', 'custom'];
        let html = '';
        
        categories.forEach(category => {
            const categoryTemplates = this.templates.filter(t => t.category === category);
            if (categoryTemplates.length > 0) {
                html += `
                    <div class="template-category-section">
                        <h5><i class="${this.getTemplateIcon(category)}"></i> ${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                        ${categoryTemplates.map(template => `
                            <div class="template-list-item">
                                <div class="template-list-info">
                                    <h5>${template.name}</h5>
                                    <p>${template.description}</p>
                                </div>
                                <div class="template-list-actions">
                                    <button class="btn btn-secondary btn-sm" onclick="app.editTemplate('${template.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="app.deleteTemplate('${template.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        });
        
        list.innerHTML = html;
    }

    saveTemplate() {
        const name = document.getElementById('templateName').value.trim();
        const category = document.getElementById('templateCategory').value;
        const description = document.getElementById('templateDescription').value.trim();
        const prompt = document.getElementById('templatePrompt').value.trim();
        
        if (!name || !prompt) {
            this.showNotification('Template name and prompt are required', 'warning');
            return;
        }
        
        const template = {
            id: `custom_${Date.now()}`,
            name: name,
            category: category,
            description: description || 'Custom template',
            prompt: prompt,
            custom: true,
            created: new Date().toISOString()
        };
        
        this.templates.push(template);
        localStorage.setItem('promptTemplates', JSON.stringify(this.templates));
        
        // Clear form
        document.getElementById('templateForm').reset();
        
        // Refresh list
        this.loadTemplateManagementList();
        
        this.showNotification('Template saved successfully', 'success');
    }

    editTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            this.showNotification('Template not found', 'error');
            return;
        }
        
        // Switch to create tab and populate form
        this.switchManagementTab('create');
        
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateCategory').value = template.category;
        document.getElementById('templateDescription').value = template.description;
        document.getElementById('templatePrompt').value = template.prompt;
        
        // Update form to edit mode
        const form = document.getElementById('templateForm');
        form.dataset.editingId = templateId;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Template';
    }

    deleteTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            this.showNotification('Template not found', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            return;
        }
        
        // Remove template
        this.templates = this.templates.filter(t => t.id !== templateId);
        localStorage.setItem('promptTemplates', JSON.stringify(this.templates));
        
        // Refresh list
        this.loadTemplateManagementList();
        
        this.showNotification('Template deleted successfully', 'success');
    }

    previewTemplate() {
        const prompt = document.getElementById('templatePrompt').value.trim();
        if (!prompt) {
            this.showNotification('Enter a prompt to preview', 'warning');
            return;
        }
        
        const sampleVariables = {
            transcript: 'This is a sample transcript for preview purposes...',
            date: new Date().toLocaleDateString(),
            duration: '05:30',
            filename: 'sample_recording.wav'
        };
        
        const processedPrompt = this.processTemplateVariables(prompt, sampleVariables);
        
        alert(`Template Preview:\n\n${processedPrompt}`);
    }

    deleteHistoryItem(itemId) {
        // Use the new history manager if available
        if (window.historyManager) {
            window.historyManager.deleteHistoryItem(itemId);
            return;
        }

        // Fallback to old implementation
        if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
            return;
        }

        let history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        const itemIndex = history.findIndex(h => h.id === itemId || h.filename === itemId);
        
        if (itemIndex === -1) {
            this.showNotification('Recording not found', 'error');
            return;
        }

        const item = history[itemIndex];
        
        // Clean up blob URL if it exists
        if (item.blob) {
            // Note: We can't revoke the blob URL here as it might be in use
            // In a real app, we'd handle this with proper file management
        }

        // Remove from history
        history.splice(itemIndex, 1);
        localStorage.setItem('callHistory', JSON.stringify(history));
        
        // Update UI
        this.updateHistoryUI();
        this.showNotification(`Recording "${item.name || item.filename}" deleted`, 'success');
    }

    async testMicrophone() {
        const inputDeviceId = document.getElementById('inputDevice').value;
        const testBtn = document.getElementById('testMicrophone');
        
        if (!inputDeviceId) {
            this.showNotification('Please select a microphone first', 'warning');
            return;
        }

        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        testBtn.disabled = true;

        try {
            const constraints = {
                audio: {
                    deviceId: { exact: inputDeviceId },
                    sampleRate: 44100,
                    channelCount: 1
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create audio context for level monitoring
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            
            analyser.fftSize = 256;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            let maxLevel = 0;
            let testDuration = 3000; // 3 seconds
            let startTime = Date.now();
            
            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const level = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                maxLevel = Math.max(maxLevel, level);
                
                if (Date.now() - startTime < testDuration) {
                    requestAnimationFrame(checkLevel);
                } else {
                    // Test complete
                    stream.getTracks().forEach(track => track.stop());
                    audioContext.close();
                    
                    testBtn.innerHTML = originalText;
                    testBtn.disabled = false;
                    
                    if (maxLevel > 10) {
                        this.showNotification(`Microphone working! Max level: ${Math.round(maxLevel)}`, 'success');
                    } else {
                        this.showNotification('Microphone seems quiet. Check your settings.', 'warning');
                    }
                }
            };
            
            checkLevel();
            this.showNotification('Testing microphone for 3 seconds...', 'info');
            
        } catch (error) {
            console.error('Microphone test failed:', error);
            this.showNotification('Microphone test failed: ' + error.message, 'error');
            
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    }





    loadConfigToUI() {
        try {
            // Ensure config is properly initialized
            if (!this.currentConfig) {
                console.warn('Config not initialized, loading defaults');
                this.currentConfig = this.loadConfig();
            }
            
            if (!this.currentConfig.transcription) {
                console.warn('Transcription config missing, adding defaults');
                this.currentConfig.transcription = {
                    provider: 'azure-batch',
                    'azure-batch': {
                        speechKey: '',
                        region: 'eastus',
                        language: 'en-US',
                        enableDiarization: true
                    },
                    'openai-whisper': {
                        apiKey: '',
                        language: ''
                    },
                    'azure-whisper': {
                        apiKey: '',
                        endpoint: '',
                        deployment: ''
                    }
                };
            }
            
            if (!this.currentConfig.summarization) {
                console.warn('Summarization config missing, adding defaults');
                this.currentConfig.summarization = {
                    provider: 'openai',
                    openai: { apiKey: '', model: 'gpt-4o-mini' },
                    'azure-openai': { apiKey: '', endpoint: '', deployment: '', model: '' },
                    gemini: { apiKey: '', model: 'gemini-1.5-flash' },
                    deepseek: { apiKey: '', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/v1' }
                };
            }

            // Set transcription provider
            const transcriptionProvider = this.currentConfig.transcription.provider;
            const transcriptionRadio = document.querySelector(`input[name="transcriptionProvider"][value="${transcriptionProvider}"]`);
            if (transcriptionRadio) {
                transcriptionRadio.checked = true;
                this.switchTranscriptionProvider(transcriptionProvider);
            }

        // Load transcription configs
        const azureBatch = this.currentConfig.transcription['azure-batch'];
        document.getElementById('azureSpeechKey').value = azureBatch.speechKey || '';
        document.getElementById('azureSpeechRegion').value = azureBatch.region || 'eastus';
        document.getElementById('azureSpeechLanguage').value = azureBatch.language || 'en-US';
        document.getElementById('enableDiarization').checked = azureBatch.enableDiarization !== false;

        const openaiWhisper = this.currentConfig.transcription['openai-whisper'];
        document.getElementById('openaiWhisperKey').value = openaiWhisper.apiKey || '';
        document.getElementById('whisperLanguage').value = openaiWhisper.language || '';

        const azureWhisper = this.currentConfig.transcription['azure-whisper'];
        document.getElementById('azureWhisperKey').value = azureWhisper.apiKey || '';
        document.getElementById('azureWhisperEndpoint').value = azureWhisper.endpoint || '';
        document.getElementById('azureWhisperDeployment').value = azureWhisper.deployment || '';

        // Set summarization provider
        const summaryProvider = this.currentConfig.summarization.provider;
        document.querySelector(`input[name="summaryProvider"][value="${summaryProvider}"]`).checked = true;
        this.switchSummaryProvider(summaryProvider);

        // Load summarization configs
        const openai = this.currentConfig.summarization.openai;
        document.getElementById('openaiSummaryKey').value = openai.apiKey || '';
        
        // Handle OpenAI model selection (including custom models)
        const openaiModel = openai.model || 'gpt-4o-mini';
        const openaiModelSelect = document.getElementById('openaiSummaryModel');
        const openaiCustomInput = document.getElementById('openaiCustomModel');
        
        // Check if the model is in the predefined list
        const openaiPredefinedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
        if (openaiPredefinedModels.includes(openaiModel)) {
            openaiModelSelect.value = openaiModel;
            this.toggleCustomModelInput('openai', openaiModel);
        } else {
            openaiModelSelect.value = 'custom';
            openaiCustomInput.value = openaiModel;
            this.toggleCustomModelInput('openai', 'custom');
        }

        const azureOpenai = this.currentConfig.summarization['azure-openai'];
        document.getElementById('azureSummaryKey').value = azureOpenai.apiKey || '';
        document.getElementById('azureSummaryEndpoint').value = azureOpenai.endpoint || '';
        document.getElementById('azureSummaryDeployment').value = azureOpenai.deployment || '';
        
        // Handle Azure OpenAI model selection (optional and custom models)
        const azureModel = azureOpenai.model || '';
        const azureModelSelect = document.getElementById('azureSummaryModel');
        const azureCustomInput = document.getElementById('azureCustomModel');
        
        // Check if the model is in the predefined list
        const azurePredefinedModels = ['gpt-4o', 'gpt-35-turbo', 'gpt-4'];
        if (!azureModel) {
            // No model specified - use auto
            azureModelSelect.value = '';
            this.toggleCustomModelInput('azure', '');
        } else if (azurePredefinedModels.includes(azureModel)) {
            azureModelSelect.value = azureModel;
            this.toggleCustomModelInput('azure', azureModel);
        } else {
            azureModelSelect.value = 'custom';
            azureCustomInput.value = azureModel;
            this.toggleCustomModelInput('azure', 'custom');
        }

        const gemini = this.currentConfig.summarization.gemini;
        document.getElementById('geminiSummaryKey').value = gemini.apiKey || '';
        
        // Handle Gemini model selection (including custom models)
        const geminiModel = gemini.model || 'gemini-1.5-flash';
        const geminiModelSelect = document.getElementById('geminiSummaryModel');
        const geminiCustomInput = document.getElementById('geminiCustomModel');
        
        // Check if the model is in the predefined list
        const geminiPredefinedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        if (geminiPredefinedModels.includes(geminiModel)) {
            geminiModelSelect.value = geminiModel;
            this.toggleCustomModelInput('gemini', geminiModel);
        } else {
            geminiModelSelect.value = 'custom';
            geminiCustomInput.value = geminiModel;
            this.toggleCustomModelInput('gemini', 'custom');
        }

            const deepseek = this.currentConfig.summarization.deepseek;
            document.getElementById('deepseekSummaryKey').value = deepseek.apiKey || '';
            document.getElementById('deepseekEndpoint').value = deepseek.endpoint || 'https://api.deepseek.com/v1';
            
            // Handle DeepSeek model selection (including custom models)
            const deepseekModel = deepseek.model || 'deepseek-chat';
            const deepseekModelSelect = document.getElementById('deepseekSummaryModel');
            const deepseekCustomInput = document.getElementById('deepseekCustomModel');
            
            // Check if the model is in the predefined list
            const deepseekPredefinedModels = ['deepseek-chat', 'deepseek-coder'];
            if (deepseekPredefinedModels.includes(deepseekModel)) {
                deepseekModelSelect.value = deepseekModel;
                this.toggleCustomModelInput('deepseek', deepseekModel);
            } else {
                deepseekModelSelect.value = 'custom';
                deepseekCustomInput.value = deepseekModel;
                this.toggleCustomModelInput('deepseek', 'custom');
            }
            
            console.log('Configuration loaded to UI successfully');
        } catch (error) {
            console.error('Error loading configuration to UI:', error);
            // Clear localStorage if it's corrupted
            localStorage.removeItem('callSummaryConfig');
            // Reload with defaults
            this.currentConfig = this.loadConfig();
            console.log('Cleared corrupted config, using defaults');
        }
    }

    saveAllConfiguration() {
        // Save transcription config
        const transcriptionProvider = document.querySelector('input[name="transcriptionProvider"]:checked').value;
        this.currentConfig.transcription.provider = transcriptionProvider;

        this.currentConfig.transcription['azure-batch'] = {
            speechKey: document.getElementById('azureSpeechKey').value,
            region: document.getElementById('azureSpeechRegion').value,
            language: document.getElementById('azureSpeechLanguage').value,
            enableDiarization: document.getElementById('enableDiarization').checked
        };

        this.currentConfig.transcription['openai-whisper'] = {
            apiKey: document.getElementById('openaiWhisperKey').value,
            language: document.getElementById('whisperLanguage').value
        };

        this.currentConfig.transcription['azure-whisper'] = {
            apiKey: document.getElementById('azureWhisperKey').value,
            endpoint: document.getElementById('azureWhisperEndpoint').value,
            deployment: document.getElementById('azureWhisperDeployment').value
        };

        // Save summarization config
        const summaryProvider = document.querySelector('input[name="summaryProvider"]:checked').value;
        this.currentConfig.summarization.provider = summaryProvider;

        // Handle OpenAI model (including custom models)
        const openaiModelSelect = document.getElementById('openaiSummaryModel').value;
        let openaiModel = openaiModelSelect;
        
        if (openaiModelSelect === 'custom') {
            const customModel = document.getElementById('openaiCustomModel').value.trim();
            if (!customModel) {
                this.showNotification('Please enter a custom OpenAI model name or select a predefined model', 'warning');
                return;
            }
            openaiModel = customModel;
        }
            
        this.currentConfig.summarization.openai = {
            apiKey: document.getElementById('openaiSummaryKey').value,
            model: openaiModel
        };

        // Handle Azure OpenAI model (optional and custom models)
        const azureModelSelect = document.getElementById('azureSummaryModel').value;
        let azureModel = azureModelSelect;
        
        if (azureModelSelect === 'custom') {
            const customModel = document.getElementById('azureCustomModel').value.trim();
            if (!customModel) {
                this.showNotification('Please enter a custom Azure OpenAI model name or select a predefined model', 'warning');
                return;
            }
            azureModel = customModel;
        }
        
        this.currentConfig.summarization['azure-openai'] = {
            apiKey: document.getElementById('azureSummaryKey').value,
            endpoint: document.getElementById('azureSummaryEndpoint').value,
            deployment: document.getElementById('azureSummaryDeployment').value,
            model: azureModel // This can be empty string for auto mode
        };

        // Handle Gemini model (including custom models)
        const geminiModelSelect = document.getElementById('geminiSummaryModel').value;
        let geminiModel = geminiModelSelect;
        
        if (geminiModelSelect === 'custom') {
            const customModel = document.getElementById('geminiCustomModel').value.trim();
            if (!customModel) {
                this.showNotification('Please enter a custom Gemini model name or select a predefined model', 'warning');
                return;
            }
            geminiModel = customModel;
        }
            
        this.currentConfig.summarization.gemini = {
            apiKey: document.getElementById('geminiSummaryKey').value,
            model: geminiModel
        };

        // Handle DeepSeek model (including custom models)
        const deepseekModelSelect = document.getElementById('deepseekSummaryModel').value;
        let deepseekModel = deepseekModelSelect;
        
        if (deepseekModelSelect === 'custom') {
            const customModel = document.getElementById('deepseekCustomModel').value.trim();
            if (!customModel) {
                this.showNotification('Please enter a custom DeepSeek model name or select a predefined model', 'warning');
                return;
            }
            deepseekModel = customModel;
        }
            
        this.currentConfig.summarization.deepseek = {
            apiKey: document.getElementById('deepseekSummaryKey').value,
            model: deepseekModel,
            endpoint: document.getElementById('deepseekEndpoint').value
        };

        this.saveConfig();
        this.showNotification('All configurations saved successfully', 'success');
    }

    async loadAllConfiguration() {
        try {
            const result = await ipcRenderer.invoke('open-file-dialog', {
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const fileResult = await ipcRenderer.invoke('read-file', result.filePaths[0]);
                if (fileResult.success) {
                    this.currentConfig = JSON.parse(fileResult.content);
                    this.loadConfigToUI();
                    this.saveConfig();
                    this.showNotification('Configuration loaded successfully', 'success');
                } else {
                    this.showNotification('Failed to load configuration: ' + fileResult.error, 'error');
                }
            }
        } catch (error) {
            this.showNotification('Failed to load configuration: ' + error.message, 'error');
        }
    }

    async exportConfiguration() {
        try {
            const timestamp = new Date().toISOString().split('T')[0];
            const result = await ipcRenderer.invoke('save-file-dialog', {
                defaultPath: `call-summary-config-${timestamp}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                const configJson = JSON.stringify(this.currentConfig, null, 2);
                const saveResult = await ipcRenderer.invoke('save-file', result.filePath, configJson);
                if (saveResult.success) {
                    this.showNotification('Configuration exported successfully', 'success');
                } else {
                    this.showNotification('Failed to export configuration: ' + saveResult.error, 'error');
                }
            }
        } catch (error) {
            this.showNotification('Failed to export configuration: ' + error.message, 'error');
        }
    }

    resetConfiguration() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            this.currentConfig = this.loadConfig();
            this.loadConfigToUI();
            this.saveConfig();
            this.showNotification('Configuration reset to defaults', 'success');
        }
    }

    async testTranscriptionAPI() {
        const provider = this.currentConfig.transcription.provider;
        const config = this.currentConfig.transcription[provider];

        this.showLoading('Testing transcription API...');

        try {
            // Create a simple test for transcription API
            let testResult;
            switch (provider) {
                case 'azure-batch':
                    testResult = await this.testAzureBatchTranscription(config);
                    break;
                case 'openai-whisper':
                    testResult = await this.testOpenAIWhisper(config);
                    break;
                case 'azure-whisper':
                    testResult = await this.testAzureWhisper(config);
                    break;
                default:
                    throw new Error(`Unsupported transcription provider: ${provider}`);
            }

            this.hideLoading();
            if (testResult.success) {
                this.showNotification('Transcription API connection successful!', 'success');
            } else {
                this.showNotification('Transcription API test failed: ' + testResult.message, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Transcription API test failed: ' + error.message, 'error');
        }
    }

    async testSummarizationAPI() {
        const provider = this.currentConfig.summarization.provider;
        const config = this.currentConfig.summarization[provider];

        this.showLoading('Testing summarization API...');

        try {
            const aiService = new AIService();
            const testResult = await aiService.testConnection(this.currentConfig);
            
            this.hideLoading();
            
            if (testResult.success) {
                this.showNotification('Summarization API connection successful!', 'success');
            } else {
                this.showNotification('Summarization API test failed: ' + testResult.message, 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showNotification('Summarization API test failed: ' + error.message, 'error');
        }
    }

    async testAzureBatchTranscription(config) {
        if (!config.speechKey || !config.region) {
            return { success: false, message: 'Speech Service key and region are required' };
        }

        // Test by making a simple request to the Speech Service
        const url = `https://${config.region}.api.cognitive.microsoft.com/speechtotext/v3.1/transcriptions`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.speechKey
                }
            });

            if (response.ok || response.status === 200) {
                return { success: true, message: 'Azure Speech Service connection successful' };
            } else {
                return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async testOpenAIWhisper(config) {
        if (!config.apiKey) {
            return { success: false, message: 'OpenAI API key is required' };
        }

        // Test by making a simple request to OpenAI API
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });

            if (response.ok) {
                return { success: true, message: 'OpenAI API connection successful' };
            } else {
                const error = await response.json();
                return { success: false, message: error.error?.message || response.statusText };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async testAzureWhisper(config) {
        if (!config.apiKey || !config.endpoint) {
            return { success: false, message: 'Azure OpenAI API key and endpoint are required' };
        }

        // Test by making a simple request to Azure OpenAI
        try {
            // Normalize endpoint URL to avoid double slashes
            const normalizedEndpoint = config.endpoint.replace(/\/+$/, '');
            const response = await fetch(`${normalizedEndpoint}/openai/models?api-version=2024-02-15-preview`, {
                headers: {
                    'api-key': config.apiKey
                }
            });

            if (response.ok) {
                return { success: true, message: 'Azure OpenAI connection successful' };
            } else {
                const error = await response.json();
                return { success: false, message: error.error?.message || response.statusText };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }



    async addToHistory(item) {
        try {
            let history = JSON.parse(localStorage.getItem('callHistory') || '[]');
            
            // Convert blob to base64 for storage
            if (item.blob) {
                try {
                    item.blobData = await this.blobToBase64(item.blob);
                    delete item.blob; // Remove the blob object before storing
                } catch (error) {
                    console.error('Failed to convert blob to base64:', error);
                    throw new Error('Failed to process audio data for storage');
                }
            }
            
            history.unshift(item);
            
            // Keep only last 50 items
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            try {
                localStorage.setItem('callHistory', JSON.stringify(history));
            } catch (storageError) {
                console.error('Failed to save to localStorage:', storageError);
                if (storageError.name === 'QuotaExceededError') {
                    throw new Error('Storage quota exceeded. Please clear some history items.');
                } else {
                    throw new Error('Failed to save recording to history');
                }
            }
            
            this.updateHistoryUI();
        } catch (error) {
            console.error('Error adding to history:', error);
            throw error; // Re-throw to be handled by caller
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64Data) {
        try {
            const [header, data] = base64Data.split(',');
            const mimeType = header.match(/:(.*?);/)[1];
            const byteCharacters = atob(data);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: mimeType });
        } catch (error) {
            console.error('Failed to convert base64 to blob:', error);
            return null;
        }
    }

    updateHistoryUI() {
        // Use the new history manager if available
        if (window.historyManager) {
            window.historyManager.refresh();
        } else {
            // Fallback to old implementation
            const historyList = document.getElementById('historyList');
            const history = JSON.parse(localStorage.getItem('callHistory') || '[]');

            if (history.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-phone-slash"></i>
                        <p>No call recordings yet</p>
                        <small>Start recording to see your call history here</small>
                    </div>
                `;
                return;
            }

            historyList.innerHTML = history.map(item => `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-title">${item.name || item.filename}</div>
                        <div class="history-item-date">${item.date}</div>
                        <div class="history-item-preview">
                            Duration: ${item.duration} | Size: ${this.formatFileSize(item.size || 0)} | ${item.transcription ? 'Transcribed' : 'Not transcribed'}
                        </div>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="app.viewHistoryItem('${item.id || item.filename}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="app.playRecording('${item.id || item.filename}')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-success btn-sm" onclick="app.exportAudioFile('${item.id || item.filename}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-outline btn-sm" onclick="app.deleteHistoryItem('${item.id || item.filename}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    async exportAudioFile(itemId) {
        try {
            const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
            const item = history.find(h => h.id === itemId || h.filename === itemId);
            
            if (!item) {
                this.showNotification('Recording not found', 'error');
                return;
            }

            // Get the audio blob
            let blob = item.blob;
            if (!blob && item.blobData) {
                blob = this.base64ToBlob(item.blobData);
            }

            if (!blob) {
                this.showNotification('Audio data not available for this recording', 'error');
                return;
            }

            // Ensure we have a proper WAV blob
            let audioBlob = blob;
            if (blob.type !== 'audio/wav') {
                console.log('Converting audio to WAV format for export...');
                try {
                    audioBlob = await this.audioManager.convertBlobToWav(blob);
                } catch (conversionError) {
                    console.warn('WAV conversion failed, using original format:', conversionError);
                    audioBlob = blob;
                }
            }

            // Prepare filename
            const recordingName = this.sanitizeFilename(item.name || item.filename || 'recording');
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${recordingName}_${timestamp}.wav`;

            // Show save dialog
            const result = await ipcRenderer.invoke('save-file-dialog', {
                title: 'Export Audio Recording',
                defaultPath: filename,
                filters: [
                    { name: 'WAV Audio Files', extensions: ['wav'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                // Convert blob to buffer for saving
                const arrayBuffer = await audioBlob.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                const saveResult = await ipcRenderer.invoke('save-file-binary', result.filePath, buffer);
                
                if (saveResult.success) {
                    this.showNotification(`Audio exported successfully to ${result.filePath}`, 'success');
                } else {
                    this.showNotification(`Failed to export audio: ${saveResult.error}`, 'error');
                }
            }

        } catch (error) {
            console.error('Error exporting audio file:', error);
            this.showNotification('Failed to export audio file', 'error');
        }
    }

    async exportCurrentDetailAudio() {
        if (!this.currentDetailRecording) {
            this.showNotification('No recording selected', 'error');
            return;
        }

        // Use the existing exportAudioFile method with the current detail recording ID
        await this.exportAudioFile(this.currentDetailRecording.id || this.currentDetailRecording.filename);
    }

    async exportAllAudioFiles() {
        try {
            const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
            
            if (history.length === 0) {
                this.showNotification('No recordings to export', 'warning');
                return;
            }

            // Filter recordings that have audio data
            const recordingsWithAudio = history.filter(item => item.blob || item.blobData);
            
            if (recordingsWithAudio.length === 0) {
                this.showNotification('No audio data available in recordings', 'warning');
                return;
            }

            // Show folder selection dialog
            const result = await ipcRenderer.invoke('open-folder-dialog', {
                title: 'Select folder to export audio files',
                properties: ['openDirectory']
            });

            if (result.canceled) {
                return;
            }

            const exportFolder = result.filePaths[0];
            let successCount = 0;
            let errorCount = 0;

            // Show progress notification
            this.showNotification(`Exporting ${recordingsWithAudio.length} audio files...`, 'info');

            for (const item of recordingsWithAudio) {
                try {
                    // Get the audio blob
                    let blob = item.blob;
                    if (!blob && item.blobData) {
                        blob = this.base64ToBlob(item.blobData);
                    }

                    if (!blob) {
                        console.warn(`No audio data for recording: ${item.name || item.filename}`);
                        errorCount++;
                        continue;
                    }

                    // Ensure we have a proper WAV blob
                    let audioBlob = blob;
                    if (blob.type !== 'audio/wav') {
                        try {
                            audioBlob = await this.audioManager.convertBlobToWav(blob);
                        } catch (conversionError) {
                            console.warn('WAV conversion failed, using original format:', conversionError);
                            audioBlob = blob;
                        }
                    }

                    // Create filename
                    const recordingName = this.sanitizeFilename(item.name || item.filename || 'recording');
                    const timestamp = item.date ? item.date.replace(/[^0-9]/g, '') : new Date().toISOString().split('T')[0];
                    const filename = `${recordingName}_${timestamp}.wav`;
                    const filePath = `${exportFolder}/${filename}`;

                    // Convert blob to buffer and save
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    const saveResult = await ipcRenderer.invoke('save-file-binary', filePath, buffer);
                    
                    if (saveResult.success) {
                        successCount++;
                    } else {
                        console.error(`Failed to save ${filename}:`, saveResult.error);
                        errorCount++;
                    }

                } catch (error) {
                    console.error(`Error exporting recording ${item.name || item.filename}:`, error);
                    errorCount++;
                }
            }

            // Show completion notification
            if (successCount > 0) {
                this.showNotification(
                    `Successfully exported ${successCount} audio file(s) to ${exportFolder}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`, 
                    errorCount > 0 ? 'warning' : 'success'
                );
            } else {
                this.showNotification('Failed to export any audio files', 'error');
            }

        } catch (error) {
            console.error('Error in bulk audio export:', error);
            this.showNotification('Failed to export audio files', 'error');
        }
    }

    exportHistory() {
        const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        if (history.length === 0) {
            this.showNotification('No history to export', 'warning');
            return;
        }

        // Create CSV content
        const csvContent = [
            'Date,Filename,Duration,Has Summary',
            ...history.map(item => 
                `"${item.date}","${item.filename}","${item.duration}","${item.summary ? 'Yes' : 'No'}"`
            )
        ].join('\n');

        // Save CSV file
        this.saveTextFile(csvContent, 'call_history.csv');
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all call history?')) {
            localStorage.removeItem('callHistory');
            this.updateHistoryUI();
            this.showNotification('History cleared', 'success');
        }
    }

    async saveTextFile(content, defaultName) {
        try {
            const result = await ipcRenderer.invoke('save-file-dialog', {
                defaultPath: defaultName,
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] },
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                const saveResult = await ipcRenderer.invoke('save-file', result.filePath, content);
                if (saveResult.success) {
                    this.showNotification('File saved successfully', 'success');
                } else {
                    this.showNotification('Failed to save file: ' + saveResult.error, 'error');
                }
            }
        } catch (error) {
            this.showNotification('Failed to save file: ' + error.message, 'error');
        }
    }

    showLoading(text = 'Loading...') {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showNotification(message, type = 'info', duration = 5000) {
        // Use modern UI Manager if available
        if (window.uiManager && window.uiManager.showToast) {
            window.uiManager.showToast(message, type, duration);
            return;
        }
        
        // Fallback to legacy notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Template Management System
    initializeTemplateSystem() {
        console.log('Initializing template system...');
        console.log('window.templateManager available:', !!window.templateManager);
        
        // Initialize the new template manager
        if (window.templateManager) {
            this.templateManager = window.templateManager;
            this.templates = this.templateManager.getAllTemplates();
            console.log('Template manager initialized successfully');
        } else {
            // Fallback to old system if template manager not loaded
            console.log('Using fallback template system');
            this.templates = this.loadTemplates();
        }
        
        // Initialize template processor
        if (window.templateProcessor) {
            this.templateProcessor = window.templateProcessor;
        }
        
        // Initialize analysis results manager
        if (window.analysisResults) {
            this.analysisResults = window.analysisResults;
        }
        
        this.populateTemplateGrid();
        this.setupTemplateEventListeners();
    }

    loadTemplates() {
        const saved = localStorage.getItem('promptTemplates');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default templates
        return {
            summary: [
                {
                    id: 'meeting-summary',
                    name: 'Meeting Summary',
                    description: 'Comprehensive meeting summary with key points',
                    prompt: 'Please analyze this meeting transcript and provide a comprehensive summary including:\n\n1. **Main Topics Discussed**\n2. **Key Decisions Made**\n3. **Action Items** (who, what, when)\n4. **Important Dates/Deadlines**\n5. **Next Steps**\n\nTranscript:\n{transcript}'
                },
                {
                    id: 'executive-summary',
                    name: 'Executive Summary',
                    description: 'High-level executive summary for leadership',
                    prompt: 'Create an executive summary of this meeting for senior leadership. Focus on:\n\n- **Strategic decisions and their business impact**\n- **Resource requirements and budget implications**\n- **Timeline and milestones**\n- **Risks and mitigation strategies**\n- **Recommendations for leadership action**\n\nKeep it concise and business-focused.\n\nTranscript:\n{transcript}'
                }
            ],
            contacts: [
                {
                    id: 'participant-list',
                    name: 'Participant List',
                    description: 'Extract participant names and roles',
                    prompt: 'Extract all participants from this meeting transcript. For each person, provide:\n\n- **Name**\n- **Role/Title** (if mentioned)\n- **Company/Organization** (if mentioned)\n- **Key contributions to the discussion**\n\nFormat as a structured list.\n\nTranscript:\n{transcript}'
                },
                {
                    id: 'contact-info',
                    name: 'Contact Information',
                    description: 'Extract contact details mentioned',
                    prompt: 'Extract any contact information mentioned in this transcript:\n\n- **Email addresses**\n- **Phone numbers**\n- **Company names and addresses**\n- **Website URLs**\n- **Social media handles**\n\nOrganize by person if possible.\n\nTranscript:\n{transcript}'
                }
            ],
            actions: [
                {
                    id: 'action-items',
                    name: 'Action Items',
                    description: 'Extract all action items and assignments',
                    prompt: 'Extract all action items from this meeting transcript. For each action item, provide:\n\n- **Task Description**\n- **Assigned To** (person responsible)\n- **Due Date** (if mentioned)\n- **Priority Level** (if indicated)\n- **Dependencies** (if any)\n\nFormat as a checklist that can be easily tracked.\n\nTranscript:\n{transcript}'
                },
                {
                    id: 'follow-up-tasks',
                    name: 'Follow-up Tasks',
                    description: 'Identify follow-up tasks and next steps',
                    prompt: 'Identify all follow-up tasks and next steps from this meeting:\n\n1. **Immediate Actions** (within 24-48 hours)\n2. **Short-term Tasks** (within 1-2 weeks)\n3. **Long-term Objectives** (beyond 2 weeks)\n4. **Recurring Tasks** (ongoing responsibilities)\n\nInclude who should handle each task and any mentioned deadlines.\n\nTranscript:\n{transcript}'
                }
            ],
            analysis: [
                {
                    id: 'sentiment-analysis',
                    name: 'Sentiment Analysis',
                    description: 'Analyze the tone and sentiment of the meeting',
                    prompt: 'Analyze the sentiment and tone of this meeting transcript:\n\n- **Overall Meeting Tone** (positive, neutral, negative, mixed)\n- **Individual Participant Sentiment**\n- **Tension Points** (if any conflicts or disagreements)\n- **Engagement Level** (high, medium, low participation)\n- **Decision-making Dynamics**\n- **Recommendations** for improving future meetings\n\nTranscript:\n{transcript}'
                },
                {
                    id: 'topic-analysis',
                    name: 'Topic Analysis',
                    description: 'Break down topics and time allocation',
                    prompt: 'Analyze the topics discussed in this meeting:\n\n- **Main Topics** (list in order of discussion)\n- **Time Allocation** (estimate time spent on each topic)\n- **Topic Priorities** (which topics received most attention)\n- **Unresolved Topics** (items that need follow-up)\n- **Off-topic Discussions** (tangents or side conversations)\n\nProvide insights on meeting efficiency and focus.\n\nTranscript:\n{transcript}'
                }
            ],
            custom: []
        };
    }

    saveTemplates() {
        localStorage.setItem('promptTemplates', JSON.stringify(this.templates));
    }

    populateTemplateGrid() {
        const activeCategory = document.querySelector('.category-tab.active')?.dataset.category || 'summary';
        const templateGrid = document.getElementById('templateGrid');
        const templateGridPreview = document.getElementById('templateGridPreview');
        
        // Populate both grids if they exist
        [templateGrid, templateGridPreview].forEach(grid => {
            if (!grid) return;
            
            console.log('Populating grid:', grid.id);
            grid.innerHTML = '';
            
            // Different actions for preview vs main grid
            const isPreview = grid.id === 'templateGridPreview';
            const categoryTemplates = this.templates[activeCategory] || [];
            console.log('Grid type:', isPreview ? 'preview' : 'main', 'Templates count:', categoryTemplates.length);
            
            categoryTemplates.forEach(template => {
                const templateCard = document.createElement('div');
                templateCard.className = 'template-card';
                templateCard.dataset.templateId = template.id;
                
                // Create unique IDs for each grid to avoid conflicts
                const gridPrefix = isPreview ? 'preview' : 'main';
                const uniqueMenuId = `templateMenu_${gridPrefix}_${template.id}`;
                
                const actionsHtml = `
                    <div class="template-card-actions">
                        <button class="template-edit-btn" data-category="${activeCategory}" data-template-id="${template.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <div class="template-overflow-menu">
                            <button class="template-overflow-btn" data-template-id="${template.id}" data-menu-id="${uniqueMenuId}">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="template-menu" id="${uniqueMenuId}" style="display: none;">
                                <button class="template-menu-item template-delete-btn" data-category="${activeCategory}" data-template-id="${template.id}">
                                    <i class="fas fa-trash"></i> Delete Template
                                </button>
                                <button class="template-menu-item template-export-btn" data-category="${activeCategory}" data-template-id="${template.id}">
                                    <i class="fas fa-download"></i> Export Template
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                templateCard.innerHTML = `
                    <div class="template-card-header">
                        <div class="template-card-main">
                            <div class="template-card-icon">
                                <i class="fas fa-${this.getTemplateIcon(activeCategory)}"></i>
                            </div>
                            <div class="template-card-title">${template.name}</div>
                        </div>
                        ${actionsHtml}
                    </div>
                    <div class="template-card-description">${template.description}</div>
                `;
                
                // Add event listeners for action buttons
                const editBtn = templateCard.querySelector('.template-edit-btn');
                if (editBtn) {
                    const self = this; // Capture the correct context
                    editBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const category = this.dataset.category;
                        const templateId = this.dataset.templateId;
                        console.log('Edit button clicked:', category, templateId);
                        try {
                            // Call template manager directly for reliability
                            if (self.templateManager) {
                                self.templateManager.editTemplate(category, templateId);
                            } else if (window.templateManager) {
                                window.templateManager.editTemplate(category, templateId);
                            } else {
                                self.editTemplate(category, templateId);
                            }
                        } catch (error) {
                            console.error('Error calling editTemplate:', error);
                        }
                    });
                }

                const overflowBtn = templateCard.querySelector('.template-overflow-btn');
                if (overflowBtn) {
                    const self = this; // Capture the correct context
                    overflowBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const menuId = this.dataset.menuId;
                        console.log('Overflow button clicked, menu ID:', menuId);
                        self.toggleTemplateMenuById(menuId);
                    });
                }

                const deleteBtn = templateCard.querySelector('.template-delete-btn');
                if (deleteBtn) {
                    const self = this; // Capture the correct context
                    deleteBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const category = this.dataset.category;
                        const templateId = this.dataset.templateId;
                        console.log('Delete button clicked:', category, templateId);
                        self.deleteTemplate(category, templateId);
                    });
                }

                const exportBtn = templateCard.querySelector('.template-export-btn');
                if (exportBtn) {
                    const self = this; // Capture the correct context
                    exportBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const category = this.dataset.category;
                        const templateId = this.dataset.templateId;
                        console.log('Export button clicked:', category, templateId);
                        self.exportSingleTemplate(category, templateId);
                    });
                }

                // Same click behavior for both preview and main grid
                templateCard.addEventListener('click', (e) => {
                    if (!e.target.closest('.template-card-actions')) {
                        // Check if we have a transcript available
                        const transcriptText = document.getElementById('transcriptText')?.value;
                        if (!transcriptText && !isPreview) {
                            this.showNotification('Create a recording and transcript first to use templates', 'warning');
                            return;
                        }
                        
                        if (isPreview) {
                            // For preview grid, switch to recording tab and show info
                            document.querySelector('[data-tab="recording"]').click();
                            this.showNotification('Switch to Recording tab and create a transcript to use templates', 'info');
                        } else {
                            this.applyTemplate(activeCategory, template.id);
                        }
                    }
                });
                
                grid.appendChild(templateCard);
            });
            
            if (categoryTemplates.length === 0) {
                const emptyMessage = isPreview ? 
                    'No templates in this category' : 
                    'No templates in this category';
                const buttonHtml = isPreview ? 
                    `<button class="btn btn-primary" onclick="app.openTemplateManagement();">
                        <i class="fas fa-plus"></i> Create Template
                    </button>` :
                    `<button class="btn btn-primary" onclick="app.switchManagementTab('create'); app.openTemplateManagement();">
                        <i class="fas fa-plus"></i> Create Template
                    </button>`;
                    
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-file-alt"></i>
                        <p>${emptyMessage}</p>
                        ${buttonHtml}
                    </div>
                `;
            }
        });
    }

    getTemplateIcon(category) {
        const icons = {
            summary: 'file-alt',
            contacts: 'address-book',
            actions: 'tasks',
            analysis: 'chart-line',
            custom: 'user-edit'
        };
        return icons[category] || 'file-alt';
    }

    /**
     * Toggle template overflow menu by unique ID
     */
    toggleTemplateMenuById(menuId) {
        console.log('toggleTemplateMenuById called with:', menuId);
        
        // Close all other menus first
        document.querySelectorAll('.template-menu').forEach(menu => {
            if (menu.id !== menuId) {
                menu.style.display = 'none';
            }
        });

        // Toggle the clicked menu
        const menu = document.getElementById(menuId);
        console.log('Menu element found:', !!menu);
        
        if (menu) {
            const isVisible = menu.style.display === 'block';
            menu.style.display = isVisible ? 'none' : 'block';
            console.log('Menu toggled to:', menu.style.display);
        }
    }

    /**
     * Toggle template overflow menu (legacy method for backward compatibility)
     */
    toggleTemplateMenu(templateId) {
        console.log('toggleTemplateMenu called with:', templateId);
        this.toggleTemplateMenuById(`templateMenu_main_${templateId}`);
    }

    /**
     * Export single template
     */
    async exportSingleTemplate(category, templateId) {
        if (this.templateManager) {
            const template = this.templateManager.getTemplate(category, templateId);
            if (template) {
                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    templates: {
                        [category]: [template]
                    }
                };

                try {
                    const filename = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`;
                    const saveResult = await ipcRenderer.invoke('save-file-dialog', {
                        title: 'Export Template',
                        defaultPath: filename,
                        filters: [
                            { name: 'JSON Files', extensions: ['json'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });

                    if (!saveResult.canceled) {
                        const writeResult = await ipcRenderer.invoke('save-file', saveResult.filePath, JSON.stringify(exportData, null, 2));
                        if (writeResult.success) {
                            this.showNotification('Template exported successfully!', 'success');
                        } else {
                            this.showNotification('Export failed: ' + writeResult.error, 'error');
                        }
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    this.showNotification('Export failed: ' + error.message, 'error');
                }
            }
        }
        
        // Close the menu
        this.toggleTemplateMenu(templateId);
    }

    /**
     * Create new template
     */
    createNewTemplate() {
        if (this.templateManager) {
            this.templateManager.openForNewTemplate();
        } else {
            this.openTemplateManagement();
        }
    }

    /**
     * Toggle template actions dropdown menu
     */
    toggleTemplateActionsMenu() {
        const menu = document.getElementById('templateActionsMenu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Import templates from file
     */
    async importTemplatesFromFile() {
        try {
            const openResult = await ipcRenderer.invoke('open-file-dialog', {
                title: 'Import Templates',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (!openResult.canceled && openResult.filePaths.length > 0) {
                const readResult = await ipcRenderer.invoke('read-file', openResult.filePaths[0]);
                if (readResult.success) {
                    if (this.templateManager) {
                        const result = this.templateManager.importTemplates(readResult.content, { merge: true, overwrite: false });
                        if (result.success) {
                            let message = `Imported ${result.imported} templates`;
                            if (result.skipped > 0) {
                                message += `, skipped ${result.skipped} duplicates`;
                            }
                            if (result.errors.length > 0) {
                                message += `. ${result.errors.length} errors occurred.`;
                            }
                            this.showNotification(message, result.errors.length > 0 ? 'warning' : 'success');
                            this.populateTemplateGrid();
                        } else {
                            this.showNotification('Import failed: ' + result.error, 'error');
                        }
                    }
                } else {
                    this.showNotification('Failed to read file: ' + readResult.error, 'error');
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Import failed: ' + error.message, 'error');
        }

        // Close the dropdown menu
        this.toggleTemplateActionsMenu();
    }

    /**
     * Export all templates
     */
    async exportAllTemplates() {
        if (this.templateManager) {
            const result = this.templateManager.exportTemplates();
            if (result.success) {
                try {
                    const saveResult = await ipcRenderer.invoke('save-file-dialog', {
                        title: 'Export All Templates',
                        defaultPath: result.filename,
                        filters: [
                            { name: 'JSON Files', extensions: ['json'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });

                    if (!saveResult.canceled) {
                        const writeResult = await ipcRenderer.invoke('save-file', saveResult.filePath, result.data);
                        if (writeResult.success) {
                            this.showNotification('All templates exported successfully!', 'success');
                        } else {
                            this.showNotification('Export failed: ' + writeResult.error, 'error');
                        }
                    }
                } catch (error) {
                    console.error('Export error:', error);
                    this.showNotification('Export failed: ' + error.message, 'error');
                }
            } else {
                this.showNotification('Export failed: ' + result.error, 'error');
            }
        }

        // Close the dropdown menu
        this.toggleTemplateActionsMenu();
    }

    /**
     * Edit template from main interface
     */
    editTemplate(category, templateId) {
        console.log('editTemplate called with:', category, templateId);
        
        if (this.templateManager) {
            this.templateManager.editTemplate(category, templateId);
        } else {
            // Fallback for old system
            console.log('Using fallback - opening template management');
            this.openTemplateManagement();
        }
    }

    /**
     * Delete template with confirmation
     */
    deleteTemplate(category, templateId) {
        if (this.templateManager) {
            const template = this.templateManager.getTemplate(category, templateId);
            if (template && confirm(`Delete template "${template.name}"?`)) {
                const result = this.templateManager.deleteTemplate(category, templateId);
                if (result.success) {
                    this.showNotification('Template deleted successfully!', 'success');
                    this.populateTemplateGrid();
                } else {
                    this.showNotification('Delete failed: ' + result.error, 'error');
                }
            }
        }
    }

    switchTemplateCategory(category) {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Repopulate grid
        this.populateTemplateGrid();
    }

    async applyTemplate(category, templateId) {
        // Use new template manager if available
        const template = this.templateManager ? 
            this.templateManager.getTemplate(category, templateId) :
            this.templates[category]?.find(t => t.id === templateId);
        if (!template) return;
        
        const transcriptText = document.getElementById('transcriptText')?.value;
        if (!transcriptText) {
            this.showNotification('No transcript available to analyze', 'warning');
            return;
        }
        
        // Show analysis section and progress
        const analysisSection = document.getElementById('aiAnalysisSection');
        const analysisProgress = document.getElementById('analysisProgress');
        const analysisResults = document.getElementById('analysisResults');
        
        analysisSection.style.display = 'block';
        analysisProgress.style.display = 'block';
        analysisResults.style.display = 'none';
        
        // Update progress
        const progressFill = document.getElementById('analysisProgressFill');
        const analysisStatus = document.getElementById('analysisStatus');
        const analysisTime = document.getElementById('analysisTime');
        
        progressFill.style.width = '10%';
        analysisStatus.textContent = 'Preparing analysis...';
        
        const startTime = Date.now();
        const updateTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            analysisTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        try {
            // Prepare variables for template processing
            const variables = {
                transcript: transcriptText,
                date: new Date().toLocaleDateString(),
                duration: this.currentRecording?.duration || 'Unknown',
                filename: this.currentRecording?.filename || 'Unknown'
            };
            
            progressFill.style.width = '30%';
            analysisStatus.textContent = 'Processing template...';
            
            let result;
            
            // Use new template processor if available
            if (this.templateProcessor) {
                const config = this.currentConfig;
                const processResult = await this.templateProcessor.processTemplate(template, variables, config);
                
                if (processResult.success) {
                    result = {
                        success: true,
                        result: processResult.result,
                        template: template.name,
                        provider: processResult.provider,
                        processedAt: processResult.processedAt
                    };
                } else {
                    throw new Error(processResult.error);
                }
            } else {
                // Fallback to old method
                const prompt = this.substituteTemplateVariables(template.prompt, variables);
                const aiResult = await this.callAIService(prompt);
                result = {
                    success: true,
                    result: aiResult,
                    template: template.name,
                    provider: this.currentConfig.summarization?.provider || 'unknown',
                    processedAt: new Date().toISOString()
                };
            }
            
            progressFill.style.width = '100%';
            analysisStatus.textContent = 'Analysis complete!';
            
            // Show results using new results manager
            setTimeout(() => {
                clearInterval(updateTimer);
                analysisProgress.style.display = 'none';
                
                if (this.analysisResults) {
                    this.analysisResults.displayResults(result, template.name);
                } else {
                    // Fallback to old display method
                    analysisResults.style.display = 'block';
                    document.getElementById('resultsTitle').textContent = template.name;
                    document.getElementById('resultsText').textContent = result.result;
                }
            }, 500);
            
        } catch (error) {
            clearInterval(updateTimer);
            analysisProgress.style.display = 'none';
            this.showNotification('Analysis failed: ' + error.message, 'error');
        }
    }

    substituteTemplateVariables(prompt, variables) {
        let result = prompt;
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, variables[key]);
        });
        return result;
    }

    openTemplateManagement() {
        const modal = document.getElementById('templateManagementModal');
        if (modal) {
            modal.classList.add('active');
            // Use new template manager if available
            if (this.templateManager) {
                this.templateManager.populateTemplateList();
            } else {
                this.populateTemplateList();
            }
        }
    }

    closeTemplateManagement() {
        const modal = document.getElementById('templateManagementModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    populateTemplateList() {
        const templateList = document.getElementById('templateManagementList');
        if (!templateList) return;
        
        templateList.innerHTML = '';
        
        Object.keys(this.templates).forEach(category => {
            if (this.templates[category].length > 0) {
                const categoryHeader = document.createElement('h4');
                categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categoryHeader.style.marginTop = '1.5rem';
                categoryHeader.style.marginBottom = '1rem';
                categoryHeader.style.color = 'var(--text-primary)';
                templateList.appendChild(categoryHeader);
                
                this.templates[category].forEach(template => {
                    const templateItem = document.createElement('div');
                    templateItem.className = 'template-list-item';
                    
                    templateItem.innerHTML = `
                        <div class="template-list-info">
                            <h5>${template.name}</h5>
                            <p>${template.description}</p>
                        </div>
                        <div class="template-list-actions">
                            <button class="btn btn-secondary" onclick="app.editTemplate('${category}', '${template.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline" onclick="app.deleteTemplate('${category}', '${template.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `;
                    
                    templateList.appendChild(templateItem);
                });
            }
        });
    }

    setupTemplateEventListeners() {
        // Template management modal events
        const closeBtn = document.getElementById('closeTemplateModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeTemplateManagement());
        }

        // Template form
        const templateForm = document.getElementById('templateForm');
        if (templateForm) {
            templateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveTemplate();
            });
        }

        // Preview template
        const previewBtn = document.getElementById('previewTemplate');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewTemplate());
        }

        // Management tabs
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchManagementTab(tab.dataset.tab);
            });
        });

        // Import/Export functionality
        const exportBtn = document.getElementById('exportTemplates');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportTemplates());
        }

        const importInput = document.getElementById('importTemplates');
        if (importInput) {
            importInput.addEventListener('change', (e) => this.importTemplates(e));
        }

        const resetBtn = document.getElementById('resetTemplates');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTemplates());
        }

        // Close modal on overlay click
        const modal = document.getElementById('templateManagementModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'templateManagementModal') {
                    this.closeTemplateManagement();
                }
            });
        }
    }

    switchManagementTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active');
        }
        
        // Update tab content - map to correct IDs
        const tabIdMap = {
            'browse': 'browseTemplatesTab',
            'create': 'createTemplateTab',
            'import': 'importTemplatesTab'
        };
        
        document.querySelectorAll('#templateManagementModal .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTabId = tabIdMap[tabName];
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        if (tabName === 'browse') {
            this.populateTemplateList();
        }
    }

    saveTemplate() {
        const name = document.getElementById('templateName').value;
        const category = document.getElementById('templateCategory').value;
        const description = document.getElementById('templateDescription').value;
        const prompt = document.getElementById('templatePrompt').value;
        
        if (!name || !prompt) {
            this.showNotification('Please fill in all required fields', 'warning');
            return;
        }
        
        const template = {
            id: Date.now().toString(),
            name,
            description,
            prompt
        };
        
        if (!this.templates[category]) {
            this.templates[category] = [];
        }
        
        this.templates[category].push(template);
        this.saveTemplates();
        this.populateTemplateGrid();
        this.populateTemplateList();
        
        // Clear form
        document.getElementById('templateForm').reset();
        
        this.showNotification('Template saved successfully', 'success');
    }

    editTemplate(category, templateId) {
        const template = this.templates[category]?.find(t => t.id === templateId);
        if (!template) return;
        
        // Switch to create tab and populate form
        this.switchManagementTab('create');
        
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateCategory').value = category;
        document.getElementById('templateDescription').value = template.description;
        document.getElementById('templatePrompt').value = template.prompt;
        
        // Store the template ID for updating
        document.getElementById('templateForm').dataset.editingId = templateId;
        document.getElementById('templateForm').dataset.editingCategory = category;
    }

    deleteTemplate(category, templateId) {
        if (!confirm('Are you sure you want to delete this template?')) return;
        
        this.templates[category] = this.templates[category].filter(t => t.id !== templateId);
        this.saveTemplates();
        this.populateTemplateGrid();
        this.populateTemplateList();
        
        this.showNotification('Template deleted', 'success');
    }

    previewTemplate() {
        const prompt = document.getElementById('templatePrompt').value;
        if (!prompt) {
            this.showNotification('Please enter a prompt template first', 'warning');
            return;
        }
        
        const preview = this.substituteTemplateVariables(prompt, {
            transcript: '[Sample transcript content would appear here...]',
            date: new Date().toLocaleDateString(),
            duration: '05:30',
            filename: 'sample_recording.wav'
        });
        
        alert('Template Preview:\n\n' + preview);
    }

    exportTemplates() {
        const dataStr = JSON.stringify(this.templates, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'prompt_templates.json';
        link.click();
        
        this.showNotification('Templates exported successfully', 'success');
    }

    importTemplates(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTemplates = JSON.parse(e.target.result);
                
                // Merge with existing templates
                Object.keys(importedTemplates).forEach(category => {
                    if (!this.templates[category]) {
                        this.templates[category] = [];
                    }
                    this.templates[category] = [...this.templates[category], ...importedTemplates[category]];
                });
                
                this.saveTemplates();
                this.populateTemplateGrid();
                this.populateTemplateList();
                
                this.showNotification('Templates imported successfully', 'success');
            } catch (error) {
                this.showNotification('Error importing templates: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    resetTemplates() {
        if (!confirm('This will delete all custom templates and restore defaults. Continue?')) return;
        
        this.templates = this.loadTemplates();
        this.saveTemplates();
        this.populateTemplateGrid();
        this.populateTemplateList();
        
        this.showNotification('Templates reset to defaults', 'success');
    }

    copyAnalysisResults() {
        const resultsText = document.getElementById('resultsText').textContent;
        navigator.clipboard.writeText(resultsText).then(() => {
            this.showNotification('Results copied to clipboard', 'success');
        });
    }

    exportAnalysisResults() {
        const resultsText = document.getElementById('resultsText').textContent;
        const title = document.getElementById('resultsTitle').textContent;
        
        const dataStr = `${title}\n${'='.repeat(title.length)}\n\n${resultsText}`;
        const dataBlob = new Blob([dataStr], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_analysis.txt`;
        link.click();
    }

    clearAnalysisResults() {
        document.getElementById('analysisResults').style.display = 'none';
        document.getElementById('resultsText').textContent = '';
    }

    // Q&A System
    initializeQASystem() {
        this.qaConversation = []; // For main recording flow
        this.qaConversations = this.loadQAConversations(); // Per-recording conversations
        this.currentRecordingId = null; // Track current recording for Q&A
        this.setupQAEventListeners();
        
        // Clean up old conversations
        this.cleanupOldConversations();
    }

    setupQAEventListeners() {
        // Q&A input and send button
        const qaInput = document.getElementById('qaInput');
        const sendButton = document.getElementById('sendQuestion');
        const clearButton = document.getElementById('clearConversation');

        if (qaInput && sendButton) {
            sendButton.addEventListener('click', () => this.sendQuestion());
            
            qaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendQuestion();
                }
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearConversation());
        }

        const exportButton = document.getElementById('exportConversation');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportConversation(false));
        }

        // Suggested questions
        document.querySelectorAll('.suggested-question').forEach(question => {
            question.addEventListener('click', () => {
                const questionText = question.dataset.question;
                if (qaInput) {
                    qaInput.value = questionText;
                    this.sendQuestion();
                }
            });
        });
    }

    async sendQuestion() {
        const qaInput = document.getElementById('qaInput');
        const question = qaInput.value.trim();
        
        if (!question) return;
        
        const transcriptText = document.getElementById('transcriptText')?.value;
        if (!transcriptText) {
            this.showNotification('No transcript available for Q&A', 'warning');
            return;
        }

        // Clear input
        qaInput.value = '';

        // Add user message
        this.addQAMessage('user', question);

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Prepare context-aware prompt
            const contextPrompt = `Based on this meeting transcript, please answer the following question:

Question: ${question}

Transcript:
${transcriptText}

Please provide a helpful and accurate answer based only on the information in the transcript. If the information isn't available in the transcript, please say so.`;

            // Get AI response
            const response = await this.callAIService(contextPrompt);
            
            // Remove typing indicator and add response
            this.hideTypingIndicator();
            this.addQAMessage('assistant', response);

            // Store in conversation history
            this.qaConversation.push(
                { role: 'user', content: question, timestamp: new Date() },
                { role: 'assistant', content: response, timestamp: new Date() }
            );

            // Also save to recording-specific conversation if we have a recording ID
            if (this.currentRecordingId) {
                const currentConversation = this.getRecordingConversation(this.currentRecordingId);
                currentConversation.push(
                    { role: 'user', content: question, timestamp: new Date() },
                    { role: 'assistant', content: response, timestamp: new Date() }
                );
                this.saveRecordingConversation(this.currentRecordingId, currentConversation);
            }

        } catch (error) {
            this.hideTypingIndicator();
            this.addQAMessage('assistant', 'Sorry, I encountered an error while processing your question. Please try again.');
            this.showNotification('Q&A error: ' + error.message, 'error');
        }
    }

    addQAMessage(role, content) {
        const conversation = document.getElementById('qaConversation');
        if (!conversation) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `qa-message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="qa-message-content">${content}</div>
            <div class="qa-message-time">${timestamp}</div>
        `;

        conversation.appendChild(messageDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }

    showTypingIndicator() {
        const conversation = document.getElementById('qaConversation');
        if (!conversation) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'qa-typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <span>AI is thinking</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        conversation.appendChild(typingDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    clearConversation() {
        if (!confirm('Clear the entire conversation?')) return;
        
        const conversation = document.getElementById('qaConversation');
        if (conversation) {
            conversation.innerHTML = '';
        }
        
        this.qaConversation = [];
        this.showNotification('Conversation cleared', 'success');
    }

    showQAInterface() {
        const qaInterface = document.getElementById('qaInterface');
        if (qaInterface) {
            qaInterface.style.display = 'block';
            this.updateSuggestedQuestions();
        }
    }

    hideQAInterface() {
        const qaInterface = document.getElementById('qaInterface');
        if (qaInterface) {
            qaInterface.style.display = 'none';
        }
    }

    // AI Service Integration
    async callAIService(prompt) {
        try {
            // Validate AI configuration first
            if (!this.currentConfig.summarization || !this.currentConfig.summarization.provider) {
                throw new Error('AI provider not configured. Please configure AI settings first.');
            }

            const aiService = new AIService();
            const provider = this.currentConfig.summarization.provider;
            const providerConfig = this.currentConfig.summarization[provider];
            
            // Validate provider configuration
            if (!providerConfig) {
                throw new Error(`Configuration for ${provider} not found. Please configure AI settings.`);
            }
            
            // Call the appropriate AI provider directly with our custom prompt
            switch (provider) {
                case 'openai':
                    return await aiService.callOpenAI(prompt, providerConfig);
                case 'azure-openai':
                    return await aiService.callAzureOpenAI(prompt, providerConfig);
                case 'gemini':
                    return await aiService.callGemini(prompt, providerConfig);
                case 'deepseek':
                    return await aiService.callDeepSeek(prompt, providerConfig);
                default:
                    throw new Error(`Unsupported AI provider: ${provider}`);
            }
        } catch (error) {
            console.error('AI Service error:', error);
            throw new Error(`${error.message}`);
        }
    }

    // Detail Modal AI Analysis Functions
    showDetailAIAnalysisSection() {
        const detailTranscriptionResult = document.getElementById('detailTranscriptionResult');
        const detailAiAnalysisSection = document.getElementById('detailAiAnalysisSection');
        
        if (detailTranscriptionResult && detailTranscriptionResult.style.display === 'block') {
            detailAiAnalysisSection.style.display = 'block';
            this.populateDetailTemplateGrid();
            
            // Also show Q&A interface
            this.showDetailQAInterface();
        }
    }

    populateDetailTemplateGrid() {
        const activeCategory = document.querySelector('#detailAiAnalysisSection .category-tab.active')?.dataset.category || 'summary';
        const templateGrid = document.getElementById('detailTemplateGrid');
        
        if (!templateGrid) return;
        
        templateGrid.innerHTML = '';
        
        const categoryTemplates = this.templates[activeCategory] || [];
        
        categoryTemplates.forEach(template => {
            const templateCard = document.createElement('div');
            templateCard.className = 'template-card';
            templateCard.dataset.templateId = template.id;
            
            templateCard.innerHTML = `
                <div class="template-card-header">
                    <div class="template-card-icon">
                        <i class="fas fa-${this.getTemplateIcon(activeCategory)}"></i>
                    </div>
                    <div class="template-card-title">${template.name}</div>
                </div>
                <div class="template-card-description">${template.description}</div>
            `;
            
            templateCard.addEventListener('click', () => {
                this.applyDetailTemplate(activeCategory, template.id);
            });
            
            templateGrid.appendChild(templateCard);
        });
        
        if (categoryTemplates.length === 0) {
            templateGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>No templates in this category</p>
                    <button class="btn btn-primary" onclick="app.openTemplateManagement();">
                        <i class="fas fa-plus"></i> Create Template
                    </button>
                </div>
            `;
        }

        // Setup category tab listeners for detail modal
        document.querySelectorAll('#detailAiAnalysisSection .category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchDetailTemplateCategory(tab.dataset.category);
            });
        });
    }

    switchDetailTemplateCategory(category) {
        // Update active tab in detail modal
        document.querySelectorAll('#detailAiAnalysisSection .category-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`#detailAiAnalysisSection [data-category="${category}"]`).classList.add('active');
        
        // Repopulate grid
        this.populateDetailTemplateGrid();
    }

    async applyDetailTemplate(category, templateId) {
        const template = this.templates[category]?.find(t => t.id === templateId);
        if (!template) return;
        
        const transcriptText = document.getElementById('detailTranscriptText')?.value;
        if (!transcriptText) {
            this.showNotification('No transcript available to analyze', 'warning');
            return;
        }
        
        // Show analysis progress
        const analysisProgress = document.getElementById('detailAnalysisProgress');
        const analysisResults = document.getElementById('detailAnalysisResults');
        
        analysisProgress.style.display = 'block';
        analysisResults.style.display = 'none';
        
        // Update progress
        const progressFill = document.getElementById('detailAnalysisProgressFill');
        const analysisStatus = document.getElementById('detailAnalysisStatus');
        const analysisTime = document.getElementById('detailAnalysisTime');
        
        progressFill.style.width = '10%';
        analysisStatus.textContent = 'Preparing analysis...';
        
        const startTime = Date.now();
        const updateTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            analysisTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        try {
            // Prepare the prompt with variables
            const prompt = this.substituteTemplateVariables(template.prompt, {
                transcript: transcriptText,
                date: new Date().toLocaleDateString(),
                duration: this.currentDetailRecording?.duration || 'Unknown',
                filename: this.currentDetailRecording?.filename || 'Unknown'
            });
            
            progressFill.style.width = '30%';
            analysisStatus.textContent = 'Sending to AI...';
            
            // Use the existing AI service
            const result = await this.callAIService(prompt);
            
            progressFill.style.width = '100%';
            analysisStatus.textContent = 'Analysis complete!';
            
            // Show results
            setTimeout(() => {
                clearInterval(updateTimer);
                analysisProgress.style.display = 'none';
                analysisResults.style.display = 'block';
                
                document.getElementById('detailResultsTitle').textContent = template.name;
                document.getElementById('detailResultsText').textContent = result;
            }, 500);
            
        } catch (error) {
            clearInterval(updateTimer);
            analysisProgress.style.display = 'none';
            this.showNotification('Analysis failed: ' + error.message, 'error');
        }
    }

    copyDetailAnalysisResults() {
        const resultsText = document.getElementById('detailResultsText').textContent;
        navigator.clipboard.writeText(resultsText).then(() => {
            this.showNotification('Results copied to clipboard', 'success');
        });
    }

    exportDetailAnalysisResults() {
        const resultsText = document.getElementById('detailResultsText').textContent;
        const title = document.getElementById('detailResultsTitle').textContent;
        
        const dataStr = `${title}\n${'='.repeat(title.length)}\n\n${resultsText}`;
        const dataBlob = new Blob([dataStr], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_analysis.txt`;
        link.click();
    }

    clearDetailAnalysisResults() {
        document.getElementById('detailAnalysisResults').style.display = 'none';
        document.getElementById('detailResultsText').textContent = '';
    }

    // Detail Modal Q&A Functions
    showDetailQAInterface() {
        const detailTranscriptionResult = document.getElementById('detailTranscriptionResult');
        const detailQaInterface = document.getElementById('detailQaInterface');
        
        if (detailTranscriptionResult && detailTranscriptionResult.style.display === 'block') {
            detailQaInterface.style.display = 'block';
            this.updateDetailSuggestedQuestions();
            
            // ALWAYS start with a completely clean conversation
            const conversation = document.getElementById('detailQaConversation');
            if (conversation) {
                conversation.innerHTML = '';
                console.log('Cleared conversation display for recording:', this.currentRecordingId);
            }
            
            // Only load conversation if we have a valid recording ID
            if (this.currentRecordingId) {
                this.loadDetailConversation();
            } else {
                console.warn('No currentRecordingId set, conversation will be empty');
            }
        }
    }

    async sendDetailQuestion() {
        const qaInput = document.getElementById('detailQaInput');
        const question = qaInput.value.trim();
        
        if (!question) return;
        
        const transcriptText = document.getElementById('detailTranscriptText')?.value;
        if (!transcriptText) {
            this.showNotification('No transcript available for Q&A', 'warning');
            return;
        }

        // Clear input
        qaInput.value = '';

        // Add user message
        this.addDetailQAMessage('user', question);

        // Show typing indicator
        this.showDetailTypingIndicator();

        try {
            // Prepare context-aware prompt
            const contextPrompt = `Based on this meeting transcript, please answer the following question:

Question: ${question}

Transcript:
${transcriptText}

Please provide a helpful and accurate answer based only on the information in the transcript. If the information isn't available in the transcript, please say so.`;

            // Get AI response
            const response = await this.callAIService(contextPrompt);
            
            // Remove typing indicator and add response
            this.hideDetailTypingIndicator();
            this.addDetailQAMessage('assistant', response);

            // Store in conversation history for current recording
            if (this.currentRecordingId) {
                const currentConversation = this.getRecordingConversation(this.currentRecordingId);
                currentConversation.push(
                    { role: 'user', content: question, timestamp: new Date() },
                    { role: 'assistant', content: response, timestamp: new Date() }
                );
                this.saveRecordingConversation(this.currentRecordingId, currentConversation);
            }

        } catch (error) {
            this.hideDetailTypingIndicator();
            this.addDetailQAMessage('assistant', 'Sorry, I encountered an error while processing your question. Please try again.');
            this.showNotification('Q&A error: ' + error.message, 'error');
        }
    }

    addDetailQAMessage(role, content, shouldSave = true) {
        const conversation = document.getElementById('detailQaConversation');
        if (!conversation) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `qa-message ${role}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="qa-message-content">${content}</div>
            <div class="qa-message-time">${timestamp}</div>
        `;

        conversation.appendChild(messageDiv);
        conversation.scrollTop = conversation.scrollHeight;

        // Save to conversation history if requested (for new messages)
        if (shouldSave && this.currentRecordingId) {
            const currentConversation = this.getRecordingConversation(this.currentRecordingId);
            currentConversation.push({ role, content, timestamp: new Date() });
            this.saveRecordingConversation(this.currentRecordingId, currentConversation);
        }
    }

    showDetailTypingIndicator() {
        const conversation = document.getElementById('detailQaConversation');
        if (!conversation) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'qa-typing-indicator';
        typingDiv.id = 'detailTypingIndicator';
        
        typingDiv.innerHTML = `
            <span>AI is thinking</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        conversation.appendChild(typingDiv);
        conversation.scrollTop = conversation.scrollHeight;
    }

    hideDetailTypingIndicator() {
        const typingIndicator = document.getElementById('detailTypingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    loadDetailConversation() {
        const conversation = document.getElementById('detailQaConversation');
        if (!conversation) {
            console.log('loadDetailConversation: No conversation element found');
            return;
        }
        
        if (!this.currentRecordingId) {
            console.log('loadDetailConversation: No recording ID, leaving conversation empty');
            conversation.innerHTML = '';
            return;
        }

        // Ensure conversation is completely clear
        conversation.innerHTML = '';

        // Load conversation for current recording
        const recordingConversation = this.getRecordingConversation(this.currentRecordingId);
        
        console.log('loadDetailConversation: Loading conversation', {
            recordingId: this.currentRecordingId,
            conversationLength: recordingConversation.length,
            firstMessage: recordingConversation[0]
        });
        
        // Only display messages if we actually have them for this recording
        if (recordingConversation && recordingConversation.length > 0) {
            recordingConversation.forEach((message, index) => {
                console.log(`Loading message ${index}:`, message);
                this.addDetailQAMessage(message.role, message.content, false); // false = don't save again
            });
        } else {
            console.log('No conversation found for this recording - starting fresh');
        }

        // Scroll to bottom
        conversation.scrollTop = conversation.scrollHeight;
    }

    clearDetailConversation() {
        if (!confirm('Clear the entire conversation for this recording?')) return;
        
        const conversation = document.getElementById('detailQaConversation');
        if (conversation) {
            conversation.innerHTML = '';
        }
        
        // Clear conversation for current recording
        if (this.currentRecordingId) {
            this.saveRecordingConversation(this.currentRecordingId, []);
        }
        
        this.showNotification('Conversation cleared', 'success');
    }

    // Q&A Conversation Management
    loadQAConversations() {
        try {
            const saved = localStorage.getItem('qaConversations');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading Q&A conversations:', error);
            return {};
        }
    }

    saveQAConversations() {
        try {
            localStorage.setItem('qaConversations', JSON.stringify(this.qaConversations));
        } catch (error) {
            console.error('Error saving Q&A conversations:', error);
        }
    }

    getRecordingConversation(recordingId) {
        if (!recordingId) return [];
        const conversation = this.qaConversations[recordingId] || [];
        
        console.log('getRecordingConversation:', {
            recordingId,
            conversationLength: conversation.length,
            allConversationKeys: Object.keys(this.qaConversations),
            conversation: conversation
        });
        
        return conversation;
    }

    saveRecordingConversation(recordingId, conversation) {
        if (!recordingId) return;
        this.qaConversations[recordingId] = conversation;
        this.saveQAConversations();
    }

    cleanupOldConversations() {
        // Get current recording IDs from history
        const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
        const validIds = new Set(history.map(recording => recording.id));
        
        // Remove conversations for recordings that no longer exist
        const conversationIds = Object.keys(this.qaConversations);
        let cleaned = false;
        
        conversationIds.forEach(id => {
            if (!validIds.has(id) && !id.startsWith('temp_')) {
                delete this.qaConversations[id];
                cleaned = true;
            }
        });
        
        if (cleaned) {
            this.saveQAConversations();
        }
    }

    // Enhanced Q&A Features
    updateSuggestedQuestions() {
        const transcriptText = document.getElementById('transcriptText')?.value;
        if (!transcriptText) return;

        const suggestedQuestions = this.generateSmartQuestions(transcriptText);
        this.populateSuggestedQuestions('suggestedQuestions', suggestedQuestions);
    }

    updateDetailSuggestedQuestions() {
        const transcriptText = document.getElementById('detailTranscriptText')?.value;
        if (!transcriptText) return;

        const suggestedQuestions = this.generateSmartQuestions(transcriptText);
        this.populateSuggestedQuestions('detailSuggestedQuestions', suggestedQuestions);
    }

    generateSmartQuestions(transcript) {
        const baseQuestions = [
            { icon: 'lightbulb', text: 'What were the main topics discussed?' },
            { icon: 'users', text: 'Who were the participants?' },
            { icon: 'tasks', text: 'What action items were mentioned?' },
            { icon: 'gavel', text: 'Summarize the key decisions made' }
        ];

        // Add smart questions based on transcript content
        const smartQuestions = [];
        const lowerTranscript = transcript.toLowerCase();

        // Check for common business terms and add relevant questions
        if (lowerTranscript.includes('budget') || lowerTranscript.includes('cost') || lowerTranscript.includes('price')) {
            smartQuestions.push({ icon: 'dollar-sign', text: 'What budget or cost information was discussed?' });
        }

        if (lowerTranscript.includes('deadline') || lowerTranscript.includes('timeline') || lowerTranscript.includes('schedule')) {
            smartQuestions.push({ icon: 'clock', text: 'What are the key deadlines and timelines?' });
        }

        if (lowerTranscript.includes('risk') || lowerTranscript.includes('issue') || lowerTranscript.includes('problem')) {
            smartQuestions.push({ icon: 'exclamation-triangle', text: 'What risks or issues were identified?' });
        }

        if (lowerTranscript.includes('next step') || lowerTranscript.includes('follow up') || lowerTranscript.includes('action')) {
            smartQuestions.push({ icon: 'arrow-right', text: 'What are the immediate next steps?' });
        }

        if (lowerTranscript.includes('decision') || lowerTranscript.includes('approve') || lowerTranscript.includes('agree')) {
            smartQuestions.push({ icon: 'check-circle', text: 'What decisions were approved or agreed upon?' });
        }

        // Combine base questions with smart questions (limit to 6 total)
        return [...baseQuestions, ...smartQuestions].slice(0, 6);
    }

    populateSuggestedQuestions(containerId, questions) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'suggested-question';
            questionDiv.dataset.question = question.text;
            questionDiv.innerHTML = `
                <i class="fas fa-${question.icon}"></i> ${question.text}
            `;
            
            questionDiv.addEventListener('click', () => {
                const inputId = containerId === 'suggestedQuestions' ? 'qaInput' : 'detailQaInput';
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = question.text;
                    if (containerId === 'suggestedQuestions') {
                        this.sendQuestion();
                    } else {
                        this.sendDetailQuestion();
                    }
                }
            });
            
            container.appendChild(questionDiv);
        });
    }

    // Conversation Export Feature
    exportConversation(isDetail = false) {
        let conversation;
        if (isDetail) {
            if (!this.currentRecordingId) {
                this.showNotification('No recording selected', 'warning');
                return;
            }
            conversation = this.getRecordingConversation(this.currentRecordingId);
        } else {
            conversation = this.qaConversation;
        }
        
        if (!conversation || conversation.length === 0) {
            this.showNotification('No conversation to export', 'warning');
            return;
        }

        let exportText = `Q&A Conversation Export\n`;
        exportText += `Generated: ${new Date().toLocaleString()}\n`;
        exportText += `${'='.repeat(50)}\n\n`;

        conversation.forEach((message, index) => {
            const role = message.role === 'user' ? 'You' : 'AI Assistant';
            const time = message.timestamp.toLocaleTimeString();
            exportText += `[${time}] ${role}:\n${message.content}\n\n`;
        });

        const dataBlob = new Blob([exportText], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `qa_conversation_${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();

        this.showNotification('Conversation exported successfully', 'success');
    }
}

// Global error handlers to prevent app crashes
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    if (window.app && window.app.showNotification) {
        window.app.showNotification('An unexpected error occurred. Please try again.', 'error');
    }
    // Prevent the error from crashing the app
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app && window.app.showNotification) {
        window.app.showNotification('An operation failed. Please try again.', 'error');
    }
    // Prevent the rejection from crashing the app
    event.preventDefault();
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Call Summary App...');
        window.app = new CallSummaryApp();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Clear potentially corrupted data and try again
        localStorage.clear();
        alert('App initialization failed. Clearing storage and reloading...');
        window.location.reload();
    }
});

// Add notification styles
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    animation: slideIn 0.3s ease;
}

.notification-success { background: #059669; }
.notification-error { background: #dc2626; }
.notification-warning { background: #d97706; }
.notification-info { background: #2563eb; }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
