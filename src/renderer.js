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
const searchResults = document.getElementById('search-results');
const searchSourceButtons = document.querySelectorAll('.search-source-btn');

let currentSearchSource = 'youtube';
let searchTimeout = null;
let currentSearchId = 0; // Track the current search to ignore outdated results

// Handle search source switching
searchSourceButtons.forEach(button => {
  button.addEventListener('click', () => {
    const source = button.getAttribute('data-source');
    
    // Remove active class from all buttons
    searchSourceButtons.forEach(btn => {
      btn.classList.remove('active', 'bg-blue-500', 'hover:bg-blue-600');
      btn.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
    });
    
    // Add active class to clicked button
    button.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
    button.classList.add('active', 'bg-blue-500', 'hover:bg-blue-600');
    
    // Update current source
    currentSearchSource = source;
    
    // Clear any pending search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }
    
    // Increment search ID to invalidate any pending searches
    currentSearchId++;
    
    // Re-run search with new source if there's a query
    const query = searchInput.value.trim();
    if (query) {
      // Show searching immediately when switching providers
      searchResults.innerHTML = '<p class="text-neutral-400">Searching...</p>';
      performSearch(query, source, currentSearchId);
    }
  });
});

// Handle search input with debounce
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // If empty, show default message
  if (!query) {
    searchResults.innerHTML = '<p class="text-neutral-400">Search for songs</p>';
    return;
  }
  
  // Show searching indicator
  searchResults.innerHTML = '<p class="text-neutral-400">Searching...</p>';
  
  // Increment search ID for this new search
  currentSearchId++;
  const thisSearchId = currentSearchId;
  
  // Debounce search by 500ms
  searchTimeout = setTimeout(() => {
    performSearch(query, currentSearchSource, thisSearchId);
  }, 500);
});

async function performSearch(query, source, searchId) {
  console.log(`Searching ${source} for: ${query} (ID: ${searchId})`);
  
  try {
    // Call the search API based on source
    const results = await window.electronAPI.searchSongs(query, source);
    
    // Only display results if this search is still the current one
    if (searchId === currentSearchId) {
      displaySearchResults(results, source);
    } else {
      console.log(`Ignoring outdated search results (ID: ${searchId}, current: ${currentSearchId})`);
    }
  } catch (error) {
    console.error('Search error:', error);
    // Only show error if this search is still current
    if (searchId === currentSearchId) {
      searchResults.innerHTML = '<p class="text-red-400">Error searching. Please try again.</p>';
    }
  }
}

function displaySearchResults(results, source) {
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<p class="text-neutral-400">No results found</p>';
    return;
  }
  
  searchResults.innerHTML = results.map((result, index) => `
    <div class="bg-neutral-700 hover:bg-neutral-600 rounded-lg p-3 cursor-pointer transition group" data-result='${JSON.stringify(result)}'>
      <div class="flex items-center gap-3">
        ${result.thumbnail ? `
          <img src="${result.thumbnail}" alt="${result.title}" class="w-16 h-16 object-cover rounded">
        ` : `
          <div class="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center">
            <svg class="w-8 h-8 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        `}
        <div class="flex-1 min-w-0">
          <p class="font-medium text-white truncate group-hover:text-blue-400 transition">${result.title}</p>
          <p class="text-sm text-neutral-400 truncate">${result.artist || result.uploader || 'Unknown Artist'}</p>
          ${result.duration ? `<p class="text-xs text-neutral-500">${formatDuration(result.duration)}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <button class="download-btn p-2 hover:bg-neutral-500 rounded-lg transition" id="download-btn-${index}" data-url="${result.url}">
            <svg class="plus-icon w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <svg class="loading-icon w-5 h-5 hidden animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg class="checkmark-icon w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to all download buttons
  results.forEach((result, index) => {
    const btn = document.getElementById(`download-btn-${index}`);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFromSearch(result.url, btn);
      });
    }
  });
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function downloadFromSearch(url, buttonElement) {
  const plusIcon = buttonElement.querySelector('.plus-icon');
  const loadingIcon = buttonElement.querySelector('.loading-icon');
  const checkmarkIcon = buttonElement.querySelector('.checkmark-icon');
  
  // Disable button and show loading
  buttonElement.disabled = true;
  plusIcon.classList.add('hidden');
  loadingIcon.classList.remove('hidden');
  
  try {
    await window.electronAPI.downloadSong(url);
    
    // Show checkmark on success
    loadingIcon.classList.add('hidden');
    checkmarkIcon.classList.remove('hidden');
    
    // Reset button after 2 seconds
    setTimeout(() => {
      checkmarkIcon.classList.add('hidden');
      plusIcon.classList.remove('hidden');
      buttonElement.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Download failed:', error);
    
    // Reset button on error
    loadingIcon.classList.add('hidden');
    plusIcon.classList.remove('hidden');
    buttonElement.disabled = false;
  }
}

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
  let errorMsg = data.error;
  
  // Provide friendly error messages for common issues
  if (errorMsg.includes('DRM')) {
    errorMsg = 'This service uses DRM protection and cannot be downloaded. Try YouTube or SoundCloud instead.';
  } else if (errorMsg.includes('Unsupported URL')) {
    errorMsg = 'This URL is not supported. Please use YouTube, SoundCloud, or other supported platforms.';
  }
  
  showDownloadMessage(`✗ ${errorMsg}`, 'error');
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
      <div class="bg-neutral-700 rounded-lg p-3">
        <p class="text-white font-medium truncate">${download.filename}</p>
        <p class="text-xs text-neutral-400">${formatTimestamp(download.timestamp)}</p>
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

async function openFolder(folderPath) {
  try {
    await window.electronAPI.openFolder(folderPath);
  } catch (error) {
    console.error('Failed to open folder:', error);
  }
}

// Open Song Directory button
const openSongDirectoryBtn = document.getElementById('open-song-directory-btn');
if (openSongDirectoryBtn) {
  openSongDirectoryBtn.addEventListener('click', async () => {
    try {
      const downloadsPath = await window.electronAPI.getDownloadsPath();
      await openFolder(downloadsPath);
    } catch (error) {
      console.error('Failed to open song directory:', error);
    }
  });
}

console.log('Resonance Music Player loaded');