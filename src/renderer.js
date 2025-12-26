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

// ===== PLAYLIST MANAGEMENT =====

// Library sub-tab switching
const libraryTabButtons = document.querySelectorAll('.library-tab-btn');
const libraryTabContents = document.querySelectorAll('.library-tab-content');

libraryTabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-library-tab');
    
    // Remove active class from all buttons and hide all content
    libraryTabButtons.forEach(btn => {
      btn.classList.remove('active', 'bg-blue-500');
      btn.classList.add('bg-neutral-700');
    });
    libraryTabContents.forEach(content => content.classList.add('hidden'));
    
    // Add active class to clicked button and show corresponding content
    button.classList.add('active', 'bg-blue-500');
    button.classList.remove('bg-neutral-700');
    document.getElementById(`${tabName}-view`).classList.remove('hidden');
    
    // Load data when switching tabs
    if (tabName === 'all-songs') {
      loadAllSongs();
    } else if (tabName === 'playlists') {
      loadPlaylists();
    }
  });
});

// Load all songs
async function loadAllSongs() {
  try {
    const songs = await window.electronAPI.listAllSongs();
    const allSongsList = document.getElementById('all-songs-list');
    
    if (songs.length === 0) {
      allSongsList.innerHTML = '<p class="text-neutral-400">No songs in library</p>';
      return;
    }
    
    allSongsList.innerHTML = songs.map(song => `
      <div class="bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg cursor-pointer transition flex justify-between items-center">
        <div class="flex-1">
          <div class="font-medium">${song}</div>
        </div>
        <button class="text-blue-400 hover:text-blue-300 text-sm px-3 py-1">
          Play
        </button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load songs:', error);
  }
}

// Load playlists
async function loadPlaylists() {
  try {
    const playlists = await window.electronAPI.listPlaylists();
    const playlistsList = document.getElementById('playlists-list');
    
    if (playlists.length === 0) {
      playlistsList.innerHTML = '<p class="text-neutral-400">No playlists yet</p>';
      return;
    }
    
    playlistsList.innerHTML = playlists.map(playlist => `
      <div class="bg-neutral-700 hover:bg-neutral-600 p-4 rounded-lg cursor-pointer transition flex justify-between items-center playlist-item" data-playlist="${playlist}">
        <div class="flex items-center gap-3">
          <svg class="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
          <div>
            <div class="font-medium text-lg">${playlist}</div>
            <div class="text-neutral-400 text-sm" id="playlist-${playlist}-count">Loading...</div>
          </div>
        </div>
        <button class="text-blue-400 hover:text-blue-300">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    `).join('');
    
    // Load song counts for each playlist
    for (const playlist of playlists) {
      try {
        const songs = await window.electronAPI.listPlaylistSongs(playlist);
        const countElement = document.getElementById(`playlist-${playlist}-count`);
        if (countElement) {
          countElement.textContent = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
        }
      } catch (error) {
        console.error(`Failed to load song count for ${playlist}:`, error);
      }
    }
    
    // Add click handlers for playlist items
    document.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const playlistName = item.getAttribute('data-playlist');
        openPlaylistEditor(playlistName);
      });
    });
  } catch (error) {
    console.error('Failed to load playlists:', error);
  }
}

// Custom Modal Functions
function showPlaylistModal() {
  const modal = document.getElementById('playlist-modal');
  const input = document.getElementById('playlist-name-input');
  modal.classList.remove('hidden');
  input.value = '';
  input.focus();
}

function hidePlaylistModal() {
  const modal = document.getElementById('playlist-modal');
  modal.classList.add('hidden');
}

// Create new playlist
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistModalCreate = document.getElementById('playlist-modal-create');
const playlistModalCancel = document.getElementById('playlist-modal-cancel');
const playlistNameInput = document.getElementById('playlist-name-input');

if (createPlaylistBtn) {
  createPlaylistBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPlaylistModal();
  });
}

// Alternative: Use event delegation
document.addEventListener('click', (e) => {
  if (e.target.id === 'create-playlist-btn' || e.target.closest('#create-playlist-btn')) {
    e.preventDefault();
    e.stopPropagation();
    showPlaylistModal();
  }
});

if (playlistModalCancel) {
  playlistModalCancel.addEventListener('click', () => {
    hidePlaylistModal();
  });
}

if (playlistModalCreate) {
  playlistModalCreate.addEventListener('click', async () => {
    const playlistName = playlistNameInput.value.trim();
    if (!playlistName) return;
    
    try {
      await window.electronAPI.createPlaylist(playlistName);
      hidePlaylistModal();
      await loadPlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist: ' + error.message);
    }
  });
}

// Allow Enter key to create playlist
if (playlistNameInput) {
  playlistNameInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const playlistName = playlistNameInput.value.trim();
      if (!playlistName) return;
      
      try {
        await window.electronAPI.createPlaylist(playlistName);
        hidePlaylistModal();
        await loadPlaylists();
      } catch (error) {
        console.error('Failed to create playlist:', error);
        alert('Failed to create playlist: ' + error.message);
      }
    }
  });
}

// Open playlist editor
let currentEditingPlaylist = null;

async function openPlaylistEditor(playlistName) {
  currentEditingPlaylist = playlistName;
  
  // Hide playlists view, show editor view
  document.getElementById('playlists-view').classList.add('hidden');
  document.getElementById('playlist-edit-view').classList.remove('hidden');
  
  // Set title
  document.getElementById('playlist-edit-title').textContent = playlistName;
  
  // Load available songs and playlist songs
  await loadAvailableSongs();
  await loadPlaylistSongs(playlistName);
}

// Back to playlists button
const backToPlaylistsBtn = document.getElementById('back-to-playlists-btn');
if (backToPlaylistsBtn) {
  backToPlaylistsBtn.addEventListener('click', () => {
    document.getElementById('playlist-edit-view').classList.add('hidden');
    document.getElementById('playlists-view').classList.remove('hidden');
    currentEditingPlaylist = null;
    loadPlaylists();
  });
}

// Load available songs for adding to playlist
async function loadAvailableSongs() {
  try {
    const songs = await window.electronAPI.listAllSongs();
    const availableSongsList = document.getElementById('available-songs-list');
    
    if (songs.length === 0) {
      availableSongsList.innerHTML = '<p class="text-neutral-500 text-sm">No songs available</p>';
      return;
    }
    
    availableSongsList.innerHTML = songs.map(song => `
      <div class="flex justify-between items-center p-2 hover:bg-neutral-700 rounded">
        <span class="text-sm truncate flex-1">${song}</span>
        <button class="add-song-btn text-blue-400 hover:text-blue-300 text-xs px-2 py-1" data-song="${song}">
          + Add
        </button>
      </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.add-song-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const songName = btn.getAttribute('data-song');
        await addSongToPlaylist(currentEditingPlaylist, songName);
      });
    });
  } catch (error) {
    console.error('Failed to load available songs:', error);
  }
}

// Load songs in current playlist
async function loadPlaylistSongs(playlistName) {
  try {
    const songs = await window.electronAPI.listPlaylistSongs(playlistName);
    const playlistSongsList = document.getElementById('playlist-songs-list');
    
    if (songs.length === 0) {
      playlistSongsList.innerHTML = '<p class="text-neutral-400">No songs in this playlist</p>';
      return;
    }
    
    playlistSongsList.innerHTML = songs.map(song => `
      <div class="bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition flex justify-between items-center">
        <div class="flex-1">
          <div class="font-medium">${song.replace('.ref', '')}</div>
        </div>
        <div class="flex gap-2">
          <button class="text-blue-400 hover:text-blue-300 text-sm px-3 py-1">
            Play
          </button>
          <button class="remove-song-btn text-red-400 hover:text-red-300 text-sm px-3 py-1" data-song="${song}">
            Remove
          </button>
        </div>
      </div>
    `).join('');
    
    // Add remove handlers
    document.querySelectorAll('.remove-song-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const songName = btn.getAttribute('data-song');
        await removeSongFromPlaylist(playlistName, songName);
      });
    });
  } catch (error) {
    console.error('Failed to load playlist songs:', error);
  }
}

// Add song to playlist
async function addSongToPlaylist(playlistName, songFilename) {
  try {
    await window.electronAPI.addToPlaylist(playlistName, songFilename);
    await loadPlaylistSongs(playlistName);
  } catch (error) {
    console.error('Failed to add song to playlist:', error);
    alert('Failed to add song: ' + error.message);
  }
}

// Remove song from playlist
async function removeSongFromPlaylist(playlistName, songFilename) {
  try {
    const playlistsPath = await window.electronAPI.getDownloadsPath();
    // This would need an IPC handler in main.js to actually delete the file/link
    // For now, we'll just refresh the view
    alert('Remove functionality will be implemented soon');
    await loadPlaylistSongs(playlistName);
  } catch (error) {
    console.error('Failed to remove song from playlist:', error);
  }
}

// Load all songs when library tab is opened
const libraryTabBtn = document.querySelector('[data-tab="library"]');
if (libraryTabBtn) {
  libraryTabBtn.addEventListener('click', () => {
    // Load all songs by default when opening library tab
    setTimeout(() => loadAllSongs(), 100);
  });
}

// ===== THEME & PREFERENCES =====

// Load saved theme on startup
async function loadTheme() {
  try {
    const theme = await window.electronAPI.getTheme();
    applyTheme(theme);
  } catch (error) {
    console.error('Failed to load theme:', error);
    applyTheme('dark');
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  updateThemeButtons(theme);
}

function updateThemeButtons(theme) {
  const darkBtn = document.getElementById('theme-dark');
  const lightBtn = document.getElementById('theme-light');
  
  if (darkBtn && lightBtn) {
    if (theme === 'dark') {
      darkBtn.classList.add('bg-blue-500');
      darkBtn.classList.remove('bg-neutral-700');
      lightBtn.classList.remove('bg-blue-500');
      lightBtn.classList.add('bg-neutral-700');
    } else {
      lightBtn.classList.add('bg-blue-500');
      lightBtn.classList.remove('bg-neutral-700');
      darkBtn.classList.remove('bg-blue-500');
      darkBtn.classList.add('bg-neutral-700');
    }
  }
}

// Preferences modal
function showPreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.remove('hidden');
  
  // Load current theme
  loadTheme();
}

function hidePreferencesModal() {
  const modal = document.getElementById('preferences-modal');
  modal.classList.add('hidden');
}

// Listen for preferences menu command
if (window.electronAPI.onOpenPreferences) {
  window.electronAPI.onOpenPreferences(() => {
    showPreferencesModal();
  });
}

// Theme buttons
const themeDarkBtn = document.getElementById('theme-dark');
const themeLightBtn = document.getElementById('theme-light');
const preferencesCloseBtn = document.getElementById('preferences-close');

if (themeDarkBtn) {
  themeDarkBtn.addEventListener('click', async () => {
    try {
      await window.electronAPI.setTheme('dark');
      applyTheme('dark');
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  });
}

if (themeLightBtn) {
  themeLightBtn.addEventListener('click', async () => {
    try {
      await window.electronAPI.setTheme('light');
      applyTheme('light');
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  });
}

if (preferencesCloseBtn) {
  preferencesCloseBtn.addEventListener('click', () => {
    hidePreferencesModal();
  });
}

// Load theme on startup
loadTheme();

console.log('Resonance Music Player loaded');