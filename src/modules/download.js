import { formatTimestamp } from '../utils/formatters.js';
import { metadataManager } from './metadata.js';

let downloads = [];
let pendingDownloadMetadata = null;

/**
 * Initialize download functionality
 * @param {Function} onDownloadComplete - Callback when download completes
 */
export function initDownload(onDownloadComplete) {
  initDownloadButton(onDownloadComplete);
  initOpenDirectoryButton();
  initDownloadEventListeners(onDownloadComplete);
}

/**
 * Set metadata for the next download
 * @param {Object} metadata - Metadata from search result
 */
export function setPendingDownloadMetadata(metadata) {
  pendingDownloadMetadata = metadata;
}

/**
 * Initialize download button
 */
function initDownloadButton(onDownloadComplete) {
  const downloadUrlInput = document.getElementById('download-url-input');
  const downloadBtn = document.getElementById('download-btn');

  downloadBtn.addEventListener('click', async () => {
    const url = downloadUrlInput.value.trim();
    
    if (!url) {
      showDownloadMessage('Please enter a URL', 'error');
      return;
    }

    // Clear pending metadata for manual URL downloads
    pendingDownloadMetadata = null;

    // Disable button and show progress
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Downloading...';
    showDownloadMessage('Starting download...', 'info');
    
    const downloadProgressContainer = document.getElementById('download-progress-container');
    const downloadProgress = document.getElementById('download-progress');
    downloadProgressContainer.classList.remove('hidden');
    downloadProgress.style.width = '0%';

    try {
      await window.electronAPI.downloadSong(url);
      // Download complete - handled by event listener
    } catch (error) {
      showDownloadMessage(`Error: ${error.message}`, 'error');
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download';
      downloadProgressContainer.classList.add('hidden');
    }
  });
}

/**
 * Initialize open song directory button
 */
function initOpenDirectoryButton() {
  const openSongDirectoryBtn = document.getElementById('open-song-directory-btn');
  
  if (openSongDirectoryBtn) {
    openSongDirectoryBtn.addEventListener('click', async () => {
      try {
        const downloadsPath = await window.electronAPI.getDownloadsPath();
        await window.electronAPI.openFolder(downloadsPath);
      } catch (error) {
        console.error('Failed to open song directory:', error);
      }
    });
  }
}

/**
 * Initialize download event listeners
 */
function initDownloadEventListeners(onDownloadComplete) {
  const downloadBtn = document.getElementById('download-btn');
  const downloadUrlInput = document.getElementById('download-url-input');
  const downloadProgressContainer = document.getElementById('download-progress-container');
  const downloadProgress = document.getElementById('download-progress');

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
  window.electronAPI.onDownloadComplete(async (data) => {
    showDownloadMessage(`✓ Download complete: ${data.filename}`, 'success');
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download';
    downloadUrlInput.value = '';
    
    // Save metadata if available from search
    if (pendingDownloadMetadata) {
      await metadataManager.importFromSearch(data.filename, pendingDownloadMetadata);
      pendingDownloadMetadata = null;
    }
    
    // Always update duration from the actual MP3 file
    await metadataManager.updateDurationFromFile(data.filename);
    
    // Add to download history
    addToDownloadHistory(data.filename, data.path);
    
    // Call the callback if provided
    if (onDownloadComplete) {
      onDownloadComplete(data);
    }
    
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
    
    // Clear pending metadata on error
    pendingDownloadMetadata = null;
  });
}

/**
 * Show download message with appropriate styling
 */
function showDownloadMessage(message, type) {
  const downloadMessage = document.getElementById('download-message');
  const downloadStatus = document.getElementById('download-status');
  
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

/**
 * Add download to history list
 */
function addToDownloadHistory(filename, filepath) {
  downloads.unshift({ filename, filepath, timestamp: new Date() });
  
  // Keep only last 10 downloads
  if (downloads.length > 10) {
    downloads = downloads.slice(0, 10);
  }
  
  // Update UI
  const downloadList = document.getElementById('download-list');
  if (downloads.length > 0) {
    downloadList.innerHTML = downloads.map((download) => `
      <div class="bg-neutral-700 rounded-lg p-3">
        <p class="text-white font-medium truncate">${download.filename}</p>
        <p class="text-xs text-neutral-400">${formatTimestamp(download.timestamp)}</p>
      </div>
    `).join('');
  }
}