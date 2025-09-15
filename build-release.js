#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Call Summary AI for all platforms...\n');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Build for all platforms
try {
  console.log('📦 Building for Windows...');
  execSync('npm run build:win', { stdio: 'inherit' });
  
  console.log('📦 Building for macOS...');
  execSync('npm run build:mac', { stdio: 'inherit' });
  
  console.log('📦 Building for Linux...');
  execSync('npm run build:linux', { stdio: 'inherit' });
  
  console.log('\n✅ Build completed successfully!');
  console.log('📁 Check the dist/ folder for your executables');
  
  // List built files
  const distFiles = fs.readdirSync('dist');
  console.log('\n📋 Built files:');
  distFiles.forEach(file => {
    const filePath = path.join('dist', file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   ${file} (${size} MB)`);
  });
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}