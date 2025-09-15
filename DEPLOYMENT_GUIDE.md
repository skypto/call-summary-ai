# Call Summary AI - Deployment Guide

## 🚀 Option A: Downloadable Releases

### Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account

### Step 1: Prepare Your Repository

1. **Create GitHub Repository**
   ```bash
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Initial commit with Kiro-built Call Summary AI"
   
   # Create GitHub repo and push
   gh repo create call-summary-ai --public
   git remote add origin https://github.com/yourusername/call-summary-ai.git
   git push -u origin main
   ```

2. **Ensure .kiro Directory is Included**
   ```bash
   # Make sure .kiro is NOT in .gitignore
   git add .kiro/
   git commit -m "Add Kiro specs and hooks for hackathon submission"
   git push
   ```

### Step 2: Build Executables Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build for All Platforms**
   ```bash
   # Build for all platforms at once
   npm run build:all
   
   # Or build individually
   npm run build:win    # Windows
   npm run build:mac    # macOS
   npm run build:linux  # Linux
   ```

3. **Test Built Applications**
   - Check the `dist/` folder for generated executables
   - Test on your platform to ensure everything works

### Step 3: Create GitHub Release

1. **Manual Release**
   ```bash
   # Create a new tag
   git tag v1.0.0
   git push origin v1.0.0
   
   # Go to GitHub → Releases → Create new release
   # Upload files from dist/ folder
   ```

2. **Automated Release (Recommended)**
   - The GitHub Actions workflow will automatically build and release when you push a tag
   - Just push a tag and wait for the build to complete:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

### Step 4: Update Download Links

Update the GitHub repository URL in:
- `package.json` (publish section)
- `demo/index.html` (download links)
- Your hackathon submission

---

## 🌐 Option B: Live Demo Website

### Step 1: Deploy to Netlify (Recommended)

1. **Connect GitHub to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login with GitHub
   - Click "New site from Git"
   - Select your repository

2. **Configure Build Settings**
   - Build command: `echo 'No build step required'`
   - Publish directory: `demo`
   - The `netlify.toml` file will handle the rest

3. **Deploy**
   - Netlify will automatically deploy
   - You'll get a URL like `https://amazing-name-123456.netlify.app`
   - Optionally set a custom domain

### Step 2: Deploy to Vercel (Alternative)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd demo
   vercel --prod
   ```

### Step 3: Deploy to GitHub Pages (Alternative)

1. **Create gh-pages branch**
   ```bash
   git checkout -b gh-pages
   git rm -rf .
   cp -r demo/* .
   git add .
   git commit -m "Deploy demo to GitHub Pages"
   git push origin gh-pages
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Select gh-pages branch
   - Your demo will be at `https://yourusername.github.io/call-summary-ai`

---

## 📋 Hackathon Submission Checklist

### Required Links
- [ ] **GitHub Repository**: `https://github.com/yourusername/call-summary-ai`
- [ ] **Demo Video**: Upload to YouTube and get the link
- [ ] **Live Demo**: `https://your-demo.netlify.app`
- [ ] **Download Links**: GitHub releases page

### Repository Requirements
- [ ] Public repository with open source license
- [ ] `.kiro` directory included (not gitignored)
- [ ] Complete source code
- [ ] README with setup instructions
- [ ] Working build configuration

### Demo Website Requirements
- [ ] Interactive demo showing key features
- [ ] Clear explanation of Kiro usage
- [ ] Download links to desktop app
- [ ] Professional design and functionality

---

## 🔧 Troubleshooting

### Build Issues

**Problem**: Electron builder fails
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

**Problem**: Missing icons
```bash
# Create placeholder icons if needed
mkdir -p assets
# Add icon.ico, icon.icns, icon.png to assets/
```

### Deployment Issues

**Problem**: Netlify build fails
- Check that `demo/` folder exists
- Verify `netlify.toml` is in root directory
- Check build logs for specific errors

**Problem**: GitHub Actions fails
- Verify `GITHUB_TOKEN` permissions
- Check that workflow file is in `.github/workflows/`
- Ensure all dependencies are in `package.json`

### Demo Website Issues

**Problem**: Interactive features not working
- Check browser console for JavaScript errors
- Verify all files are properly linked
- Test in different browsers

---

## 🎯 Final Steps for Hackathon

1. **Test Everything**
   - Download and test built applications
   - Verify demo website works on mobile/desktop
   - Check all links and functionality

2. **Update URLs**
   - Replace placeholder URLs with actual links
   - Update README with correct information
   - Test download links

3. **Record Demo Video**
   - Use the script from `KIRO_HACKATHON_CONTENT.md`
   - Show both the desktop app and web demo
   - Upload to YouTube and make public

4. **Submit to Hackathon**
   - Fill out DevPost submission form
   - Include all required links
   - Emphasize Kiro usage throughout

## 🏆 Success Metrics

Your deployment is successful when:
- ✅ Desktop app builds and runs on all platforms
- ✅ Web demo is live and interactive
- ✅ All download links work
- ✅ GitHub repository is public with .kiro directory
- ✅ Demo video is uploaded and public
- ✅ Everything is ready for hackathon submission

Good luck with your submission! 🚀