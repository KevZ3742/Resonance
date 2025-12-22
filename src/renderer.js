import './index.css';

// Tab switching functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    
    // Remove active class from all buttons and hide all content
    tabButtons.forEach(btn => btn.classList.remove('active', 'border-b-2', 'border-blue-500'));
    tabContents.forEach(content => content.classList.add('hidden'));
    
    // Add active class to clicked button and show corresponding content
    button.classList.add('active', 'border-b-2', 'border-blue-500');
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
  });
});

// Set initial active state
document.querySelector('.tab-btn.active').classList.add('border-b-2', 'border-blue-500');

// Music player controls
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeBtn = document.getElementById('volume-btn');
const volumeContainer = document.querySelector('.volume-container');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

let isPlaying = false;

playPauseBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
});

prevBtn.addEventListener('click', () => {
  console.log('Previous track');
});

nextBtn.addEventListener('click', () => {
  console.log('Next track');
});

volumeSlider.addEventListener('input', (e) => {
  console.log('Volume:', e.target.value);
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width * 100;
  progress.style.width = `${percent}%`;
});

// Search functionality
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', (e) => {
  console.log('Search:', e.target.value);
});

// Download functionality
const downloadUrlInput = document.getElementById('download-url-input');
const downloadBtn = document.getElementById('download-btn');
const downloadStatus = document.getElementById('download-status');
const downloadMessage = document.getElementById('download-message');
const downloadProgressContainer = document.getElementById('download-progress-container');
const downloadProgress = document.getElementById('download-progress');
const downloadList = document.getElementById('download-list');

let downloads = [];

downloadBtn.addEventListener('click', async () => {
  const url = downloadUrlInput.value.trim();
  
  if (!url) {
    showDownloadMessage('Please enter a URL', 'error');
    return;
  }

  // Disable button and show progress
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Downloading...';
  showDownloadMessage('Starting download...', 'info');
  downloadProgressContainer.classList.remove('hidden');
  downloadProgress.style.width = '0%';

  try {
    // Start download
    const result = await window.electronAPI.downloadSong(url);
    
    // Download complete - handled by the event listener
    // but we can also handle it here if needed
  } catch (error) {
    showDownloadMessage(`Error: ${error.message}`, 'error');
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download';
    downloadProgressContainer.classList.add('hidden');
  }
});

// Listen for download progress
window.electronAPI.onDownloadProgress((data) => {
  downloadProgress.style.width = `${data.progress}%`;
  
  if (data.status === 'downloading') {
    showDownloadMessage(`Downloading... ${data.progress.toFixed(1)}%`, 'info');
  } else if (data.status === 'converting') {
    showDownloadMessage('Converting to MP3...', 'info');
  }
});

// Listen for download complete
window.electronAPI.onDownloadComplete((data) => {
  showDownloadMessage(`✓ Download complete: ${data.filename}`, 'success');
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download';
  downloadUrlInput.value = '';
  
  // Add to download history
  addToDownloadHistory(data.filename, data.path);
  
  // Hide progress after a delay
  setTimeout(() => {
    downloadProgressContainer.classList.add('hidden');
    downloadProgress.style.width = '0%';
  }, 2000);
});

// Listen for download errors
window.electronAPI.onDownloadError((data) => {
  showDownloadMessage(`✗ Error: ${data.error}`, 'error');
  downloadBtn.disabled = false;
  downloadBtn.textContent = 'Download';
  downloadProgressContainer.classList.add('hidden');
});

function showDownloadMessage(message, type) {
  downloadMessage.textContent = message;
  downloadStatus.classList.remove('hidden');
  
  // Color based on type
  const statusContainer = downloadStatus.querySelector('div');
  if (type === 'error') {
    statusContainer.classList.add('bg-red-900/30', 'border', 'border-red-500');
    statusContainer.classList.remove('bg-neutral-700', 'bg-green-900/30', 'border-green-500');
  } else if (type === 'success') {
    statusContainer.classList.add('bg-green-900/30', 'border', 'border-green-500');
    statusContainer.classList.remove('bg-neutral-700', 'bg-red-900/30', 'border-red-500');
  } else {
    statusContainer.classList.add('bg-neutral-700');
    statusContainer.classList.remove('bg-red-900/30', 'border-red-500', 'bg-green-900/30', 'border-green-500');
  }
}

function addToDownloadHistory(filename, filepath) {
  downloads.unshift({ filename, filepath, timestamp: new Date() });
  
  // Keep only last 10 downloads
  if (downloads.length > 10) {
    downloads = downloads.slice(0, 10);
  }
  
  // Update UI
  if (downloads.length > 0) {
    downloadList.innerHTML = downloads.map((download, index) => `
      <div class="bg-neutral-700 rounded-lg p-3 flex justify-between items-center">
        <div class="flex-1">
          <p class="text-white font-medium truncate">${download.filename}</p>
          <p class="text-xs text-neutral-400">${formatTimestamp(download.timestamp)}</p>
        </div>
        <button class="text-blue-400 hover:text-blue-300 text-sm" onclick="openFolder('${download.filepath.replace(/\\/g, '\\\\')}')">
          Open Folder
        </button>
      </div>
    `).join('');
  }
}

function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

function openFolder(folderPath) {
  // This would need to be implemented via IPC if we want to open the folder
  console.log('Open folder:', folderPath);
}

console.log('🎵 Resonance Music Player loaded');