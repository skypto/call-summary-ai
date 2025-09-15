// Demo Website JavaScript

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.demo-tab');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remove active class from all nav items and tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked nav item and corresponding tab
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
        });
    });
    
    // Initialize waveform animation
    initWaveform();
});

// Recording functionality
let isRecording = false;
let recordingTimer = null;
let recordingTime = 0;

function toggleRecording() {
    const recordBtn = document.querySelector('.record-btn');
    const recordText = document.querySelector('.record-text');
    const recordIcon = document.querySelector('.record-icon');
    const timerElement = document.querySelector('.recording-timer');
    
    if (!isRecording) {
        // Start recording
        isRecording = true;
        recordBtn.classList.add('recording');
        recordText.textContent = 'Stop Recording';
        recordIcon.textContent = '⏹️';
        
        // Start timer
        recordingTime = 0;
        recordingTimer = setInterval(() => {
            recordingTime++;
            const minutes = Math.floor(recordingTime / 60);
            const seconds = recordingTime % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        // Start waveform animation
        animateWaveform();
        
    } else {
        // Stop recording
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordText.textContent = 'Start Recording';
        recordIcon.textContent = '⏺️';
        
        // Stop timer
        clearInterval(recordingTimer);
        
        // Show completion message
        setTimeout(() => {
            alert('Recording saved! Switch to the Transcription tab to see the results.');
        }, 500);
    }
}

// Waveform visualization
function initWaveform() {
    const canvas = document.getElementById('waveform');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Draw static waveform
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, height/2 - 2, width, 4);
}

function animateWaveform() {
    const canvas = document.getElementById('waveform');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    function draw() {
        if (!isRecording) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw animated waveform
        ctx.fillStyle = '#3b82f6';
        
        for (let i = 0; i < width; i += 4) {
            const amplitude = Math.random() * (height / 2) * (isRecording ? 1 : 0.1);
            const y = height / 2 - amplitude / 2;
            ctx.fillRect(i, y, 2, amplitude);
        }
        
        requestAnimationFrame(draw);
    }
    
    draw();
}

// Demo video functionality
function playDemo() {
    // In a real implementation, this would open a video modal or redirect to YouTube
    alert('Demo video would play here! In the actual submission, this will link to your YouTube demo video.');
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add some interactive elements
document.addEventListener('DOMContentLoaded', function() {
    // Animate progress bar on transcription tab
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            progressBar.style.width = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 50);
    }
    
    // Add hover effects to feature cards
    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
        });
    });
});