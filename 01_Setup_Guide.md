# Call Summary AI - Setup Guide

## 🎯 About Call Summary AI

Call Summary AI is a powerful desktop application that transforms your call recordings into actionable insights using advanced AI technology. Built with Kiro AI assistance, this tool helps professionals, researchers, and teams extract maximum value from their conversations.

### Key Features
- **Real-time Call Recording** with high-quality audio capture and waveform visualization
- **Multi-Provider AI Transcription** supporting OpenAI Whisper, Azure Speech Services, and Azure Batch Transcription
- **Intelligent Summarization** using GPT-4, Gemini, DeepSeek, and Azure OpenAI models
- **Custom Analysis Templates** for different meeting types (meetings, interviews, brainstorming sessions)
- **Interactive Q&A System** - Ask questions about your transcripts and get AI-powered answers
- **Advanced Transcript Editing** with search, replace, undo/redo, and formatting tools
- **Local-First Privacy** - All data stays on your device, encrypted API key storage
- **Cross-Platform Support** - Windows, macOS, and Linux compatible
- **Professional UI** with dark/light themes and accessibility features

### Built with Modern Technology
- **Frontend**: Electron with custom CSS and modern JavaScript
- **Backend**: Node.js with advanced audio processing
- **AI Integration**: REST APIs for multiple AI providers
- **Storage**: Local file system with encrypted sensitive data
- **Audio**: Web Audio API with MediaRecorder for high-quality capture

## 🛠️ Development Setup

### Prerequisites

Before setting up the development environment, ensure you have the following installed:

#### Required Software
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - Download from [git-scm.com](https://git-scm.com/)

#### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`
- Python 3 (usually pre-installed)

**Windows:**
- Windows Build Tools: `npm install -g windows-build-tools` (run as Administrator)
- Python 3.x from [python.org](https://python.org)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install build-essential python3 python3-pip
```

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/skypto/call-summary-ai.git
cd call-summary-ai
```

#### 2. Install Dependencies
```bash
# Install all required packages
npm install

# Verify installation
npm list --depth=0
```

#### 3. Verify Electron Installation
```bash
# Check Electron version
npx electron --version

# Should output something like: v28.0.0
```

### Project Structure
```
call-summary-ai/
├── main.js                 # Electron main process
├── package.json           # Dependencies and scripts
├── renderer/              # Frontend application
│   ├── index.html        # Main UI
│   ├── app.js           # Core application logic
│   ├── styles.css       # UI styling
│   ├── ai.js           # AI provider integrations
│   ├── audio.js        # Audio recording and processing
│   └── [other modules] # Specialized functionality
├── assets/               # Icons and resources
├── .kiro/               # Kiro AI development specs and hooks
├── demo/                # Web demo version
└── dist/                # Built applications (after build)
```

## 🚀 Running the Application

### Development Mode

#### Start the Application
```bash
# Run in development mode with DevTools
npm run dev

# Or run normally
npm start
```

#### Development Features
- **Hot Reload**: Changes to renderer files reload automatically
- **DevTools**: Press F12 or Ctrl+Shift+I (Cmd+Option+I on Mac)
- **Debug Logging**: Console logs show detailed information
- **Error Handling**: Detailed error messages in development

### First Launch Setup

#### 1. Grant Permissions
- **Microphone Access**: Required for recording functionality
- **File System Access**: For saving recordings and transcripts
- The app will prompt for these permissions on first launch

#### 2. Configure Audio Devices
- Go to the **Recording** tab
- Click "Refresh Devices" to load available microphones
- Select your preferred input device
- Test microphone to ensure proper audio levels

#### 3. Set Up AI Providers (Optional for Testing)
Navigate to **Settings** tab and configure at least one provider:

**For Transcription:**
- **OpenAI Whisper**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Azure Speech**: Requires Azure subscription and Speech Service resource
- **Azure Batch**: For enterprise-grade transcription with speaker diarization

**For Summarization:**
- **OpenAI GPT**: Same API key as Whisper
- **Google Gemini**: Get key from [makersuite.google.com](https://makersuite.google.com/app/apikey)
- **DeepSeek**: Sign up at [platform.deepseek.com](https://platform.deepseek.com)
- **Azure OpenAI**: Requires Azure OpenAI service deployment

## 🧪 Testing the Application

### Basic Functionality Tests

#### 1. Audio Recording Test
```bash
# Start the app
npm run dev
```

1. Go to **Recording** tab
2. Click **Test Microphone** - you should see audio levels
3. Click **Record** button (or press F9)
4. Speak for 10-15 seconds
5. Click **Stop** (or press F10)
6. Verify the recording appears in the preview section

#### 2. Transcription Test (Requires API Key)
1. After recording, click **Start Transcription**
2. Select a configured transcription provider
3. Wait for processing (progress bar should show)
4. Verify transcript appears and is editable

#### 3. AI Analysis Test (Requires API Key)
1. With a transcript ready, go to **AI Analysis** tab
2. Select "Meeting Summary" template
3. Click **Generate Analysis**
4. Verify AI-generated summary appears

#### 4. Q&A System Test (Requires API Key)
1. Go to **Q&A** tab
2. Type a question like "What was discussed?"
3. Click **Send** or press Enter
4. Verify AI response appears

### Advanced Testing

#### Template System
```bash
# Test custom templates
1. Go to Templates tab
2. Click "Create New Template"
3. Add custom prompt and test with transcript
```

#### History Management
```bash
# Test data persistence
1. Record multiple sessions
2. Restart application
3. Verify all recordings appear in History tab
```

#### Export Functionality
```bash
# Test various export formats
1. Export transcript as TXT, DOCX, PDF
2. Export audio as WAV
3. Export analysis results as JSON, PDF
```

### Automated Testing

#### Run Test Suite (if available)
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

#### Manual Test Checklist
- [ ] Application starts without errors
- [ ] Microphone permission granted
- [ ] Audio devices load correctly
- [ ] Recording functionality works
- [ ] Playback works for recorded audio
- [ ] Transcription processes successfully
- [ ] AI analysis generates results
- [ ] Q&A system responds to questions
- [ ] Templates can be created and used
- [ ] History persists between sessions
- [ ] Export functions work correctly
- [ ] Settings save and load properly

## 🔧 Troubleshooting

### Common Development Issues

#### Node.js/npm Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Electron Issues
```bash
# Rebuild native modules
npm run rebuild

# Or manually rebuild
npx electron-rebuild
```

#### Permission Issues (macOS/Linux)
```bash
# Fix file permissions
chmod +x node_modules/.bin/*

# Run with proper permissions
sudo npm install
```

#### Audio Issues
- **No Microphone Detected**: Check system permissions and device connections
- **Poor Audio Quality**: Test with different sample rates in audio settings
- **Recording Fails**: Verify microphone isn't being used by another application

#### API Integration Issues
- **Transcription Fails**: Verify API keys and check network connectivity
- **Rate Limiting**: Implement delays between requests or upgrade API plan
- **Invalid Responses**: Check API endpoint URLs and authentication

### Debug Mode

#### Enable Verbose Logging
```bash
# Run with debug flags
DEBUG=* npm run dev

# Or set environment variable
export DEBUG=call-summary:*
npm start
```

#### Access Debug Information
- Press F12 to open DevTools
- Check Console tab for detailed logs
- Use Network tab to monitor API calls
- Use Application tab to inspect localStorage

## 📦 Building for Production

### Build Commands
```bash
# Build for current platform
npm run build

# Build for all platforms
npm run build:all

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Build Output
Built applications will be in the `dist/` folder:
- **Windows**: `.exe` installer and portable executable
- **macOS**: `.dmg` installer and `.zip` archive
- **Linux**: `.AppImage` and `.deb` package

## 🤝 Development Workflow

### Making Changes
1. Make your changes in the `renderer/` or root files
2. Test in development mode: `npm run dev`
3. Commit changes: `git add . && git commit -m "Description"`
4. Push to repository: `git push origin main`

### Adding New Features
1. Check existing Kiro specs in `.kiro/specs/`
2. Create new components in `renderer/` folder
3. Update `renderer/app.js` to integrate new functionality
4. Test thoroughly before committing

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test
4. Submit a pull request with detailed description

## 📚 Additional Resources

- **Electron Documentation**: [electronjs.org/docs](https://electronjs.org/docs)
- **Node.js Documentation**: [nodejs.org/docs](https://nodejs.org/docs)
- **OpenAI API Docs**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Azure AI Services**: [docs.microsoft.com/azure/cognitive-services](https://docs.microsoft.com/azure/cognitive-services)

## 🎉 Built with Kiro

This application showcases the power of AI-assisted development using Kiro. The entire codebase, from architecture design to implementation, was created through collaborative AI development, demonstrating modern development practices and clean code principles.

---

**Happy Coding!** 🚀

For issues or questions, please check the GitHub repository issues section or create a new issue with detailed information about your setup and the problem you're experiencing.