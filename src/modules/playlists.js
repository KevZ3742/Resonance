import { metadataManager, showMetadataEditor, formatDuration } from './metadata.js';
import { playSong } from './player.js';

let currentEditingPlaylist = null;
let availableSongsCache = [];
let draggedElement = null;
let draggedIndex = null;
let contextMenu = null;

/**
 * Initialize playlist management functionality
 */
export function initPlaylists() {
  initCreatePlaylistButton();
  initPlaylistModal();
  initBackButton();
  initContextMenu();
}

/**
 * Initialize context menu for songs
 */
function initContextMenu() {
  // Create context menu element
  contextMenu = document.createElement('div');
  contextMenu.id = 'song-context-menu';
  contextMenu.className = 'hidden fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[180px]';
  contextMenu.innerHTML = `
    <button class="context-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2" data-action="play">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      Play
    </button>
    <button class="context-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2" data-action="add-to-queue">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
      </svg>
      Add to Queue
    </button>
    <div class="border-t border-neutral-700 my-1"></div>
    <button class="context-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2" data-action="edit">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
      Edit Metadata
    </button>
    <button class="context-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2 text-red-400" data-action="remove">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
      Remove from Playlist
    </button>
  `;
  document.body.appendChild(contextMenu);

  // Close context menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Handle context menu actions
  contextMenu.addEventListener('click', (e) => {
    const action = e.target.closest('.context-menu-item')?.getAttribute('data-action');
    if (!action) return;

    const songName = contextMenu.dataset.song;
    const playlistName = contextMenu.dataset.playlist;

    switch (action) {
      case 'play':
        handlePlaySong(songName);
        break;
      case 'add-to-queue':
        handleAddToQueue(songName);
        break;
      case 'edit':
        handleEditMetadata(songName);
        break;
      case 'remove':
        handleRemoveSong(songName, playlistName);
        break;
    }

    hideContextMenu();
  });
}

/**
 * Show context menu at position
 */
function showContextMenu(x, y, songName, playlistName = null) {
  contextMenu.dataset.song = songName;
  contextMenu.dataset.playlist = playlistName || '';
  
  // Show/hide remove button and divider based on context
  const removeBtn = contextMenu.querySelector('[data-action="remove"]');
  if (playlistName) {
    removeBtn.classList.remove('hidden');
    // Add divider before remove button in playlist context
    if (!removeBtn.previousElementSibling || !removeBtn.previousElementSibling.classList.contains('border-t')) {
      const divider = document.createElement('div');
      divider.className = 'border-t border-neutral-700 my-1 playlist-divider';
      removeBtn.parentNode.insertBefore(divider, removeBtn);
    }
  } else {
    removeBtn.classList.add('hidden');
    // Remove the playlist divider if it exists
    const playlistDivider = contextMenu.querySelector('.playlist-divider');
    if (playlistDivider) {
      playlistDivider.remove();
    }
  }

  contextMenu.classList.remove('hidden');
  
  // Position the menu
  const menuRect = contextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Adjust position if menu would go off screen
  let left = x;
  let top = y;
  
  if (x + menuRect.width > viewportWidth) {
    left = x - menuRect.width;
  }
  
  if (y + menuRect.height > viewportHeight) {
    top = y - menuRect.height;
  }
  
  contextMenu.style.left = `${left}px`;
  contextMenu.style.top = `${top}px`;
}

/**
 * Hide context menu
 */
function hideContextMenu() {
  contextMenu.classList.add('hidden');
}

/**
 * Handle add to queue from context menu
 */
function handleAddToQueue(songName) {
  const metadata = metadataManager.getMetadata(songName);
  
  // Import queue manager if available
  if (window.queueManager) {
    window.queueManager.addToQueue(songName, metadata);
    
    // Show feedback
    showNotification(`Added "${metadata.title}" to queue`);
  } else {
    console.error('Queue manager not available');
  }
}

/**
 * Show temporary notification
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 shadow-lg z-50 transition-opacity';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Handle play song from context menu
 */
async function handlePlaySong(songName) {
  const metadata = metadataManager.getMetadata(songName);
  await playSong(songName, metadata);
}

/**
 * Handle edit metadata from context menu
 */
function handleEditMetadata(songName) {
  const callback = currentEditingPlaylist ? 
    () => loadPlaylistSongs(currentEditingPlaylist) : 
    loadAllSongs;
  showMetadataEditor(songName, callback);
}

/**
 * Handle remove song from context menu
 */
async function handleRemoveSong(songName, playlistName) {
  if (!playlistName) return;
  await removeSongFromPlaylist(playlistName, songName);
}

/**
 * Calculate total duration of songs
 */
function calculateTotalDuration(songs) {
  let total = 0;
  for (const song of songs) {
    const metadata = metadataManager.getMetadata(song);
    if (metadata.duration) {
      total += metadata.duration;
    }
  }
  return total;
}

/**
 * Format total duration for display
 */
function formatTotalDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Load all songs from library
 */
export async function loadAllSongs() {
  try {
    const songs = await window.electronAPI.listAllSongs();
    const allSongsList = document.getElementById('all-songs-list');
    
    if (songs.length === 0) {
      allSongsList.innerHTML = '<p class="text-neutral-400">No songs in library</p>';
      return;
    }

    // Calculate total duration
    const totalDuration = calculateTotalDuration(songs);
    
    allSongsList.innerHTML = `
      <div class="mb-4 pb-4 border-b border-neutral-700">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-lg font-semibold">${songs.length} song${songs.length !== 1 ? 's' : ''}</span>
            ${totalDuration > 0 ? `<span class="text-neutral-400 text-sm ml-2">· ${formatTotalDuration(totalDuration)}</span>` : ''}
          </div>
        </div>
      </div>
      ${songs.map(song => {
        const metadata = metadataManager.getMetadata(song);
        return `
          <div class="song-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition cursor-pointer" data-song="${song}">
            <div class="flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">${metadata.title}</div>
                <div class="text-sm text-neutral-400 truncate">${metadata.artist}</div>
                ${metadata.duration ? `<div class="text-xs text-neutral-500">${formatDuration(metadata.duration)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    `;
    
    // Add context menu handlers
    document.querySelectorAll('.song-item').forEach(item => {
      const songName = item.getAttribute('data-song');
      
      // Left click to play
      item.addEventListener('click', async () => {
        const metadata = metadataManager.getMetadata(songName);
        await playSong(songName, metadata);
      });
      
      // Right click for context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, songName);
      });
    });
  } catch (error) {
    console.error('Failed to load songs:', error);
  }
}

/**
 * Load all playlists
 */
export async function loadPlaylists() {
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
            <div class="text-neutral-400 text-sm" id="playlist-${playlist}-info">Loading...</div>
          </div>
        </div>
        <button class="text-blue-400 hover:text-blue-300">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    `).join('');
    
    // Load info for each playlist
    for (const playlist of playlists) {
      try {
        const songs = await window.electronAPI.listPlaylistSongs(playlist);
        const duration = calculateTotalDuration(songs);
        const infoElement = document.getElementById(`playlist-${playlist}-info`);
        if (infoElement) {
          let info = `${songs.length} song${songs.length !== 1 ? 's' : ''}`;
          if (duration > 0) {
            info += ` · ${formatTotalDuration(duration)}`;
          }
          infoElement.textContent = info;
        }
      } catch (error) {
        console.error(`Failed to load info for ${playlist}:`, error);
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

/**
 * Initialize create playlist button
 */
function initCreatePlaylistButton() {
  const createPlaylistBtn = document.getElementById('create-playlist-btn');
  
  if (createPlaylistBtn) {
    createPlaylistBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPlaylistModal();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'create-playlist-btn' || e.target.closest('#create-playlist-btn')) {
      e.preventDefault();
      e.stopPropagation();
      showPlaylistModal();
    }
  });
}

/**
 * Initialize playlist modal
 */
function initPlaylistModal() {
  const playlistModalCreate = document.getElementById('playlist-modal-create');
  const playlistModalCancel = document.getElementById('playlist-modal-cancel');
  const playlistNameInput = document.getElementById('playlist-name-input');

  if (playlistModalCancel) {
    playlistModalCancel.addEventListener('click', () => {
      hidePlaylistModal();
    });
  }

  if (playlistModalCreate) {
    playlistModalCreate.addEventListener('click', async () => {
      await createPlaylist();
    });
  }

  if (playlistNameInput) {
    playlistNameInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await createPlaylist();
      }
    });
  }
}

/**
 * Create a new playlist
 */
async function createPlaylist() {
  const playlistNameInput = document.getElementById('playlist-name-input');
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

/**
 * Show playlist modal
 */
function showPlaylistModal() {
  const modal = document.getElementById('playlist-modal');
  const input = document.getElementById('playlist-name-input');
  modal.classList.remove('hidden');
  input.value = '';
  input.focus();
}

/**
 * Hide playlist modal
 */
function hidePlaylistModal() {
  const modal = document.getElementById('playlist-modal');
  modal.classList.add('hidden');
}

/**
 * Initialize back to playlists button
 */
function initBackButton() {
  const backToPlaylistsBtn = document.getElementById('back-to-playlists-btn');
  
  if (backToPlaylistsBtn) {
    backToPlaylistsBtn.addEventListener('click', () => {
      document.getElementById('playlist-edit-view').classList.add('hidden');
      document.getElementById('playlists-view').classList.remove('hidden');
      currentEditingPlaylist = null;
      loadPlaylists();
    });
  }
}

/**
 * Open playlist editor
 */
async function openPlaylistEditor(playlistName) {
  currentEditingPlaylist = playlistName;
  
  document.getElementById('playlists-view').classList.add('hidden');
  document.getElementById('playlist-edit-view').classList.remove('hidden');
  
  document.getElementById('playlist-edit-title').textContent = playlistName;
  
  await loadPlaylistSongs(playlistName);
  await loadAvailableSongs(playlistName);
}

/**
 * Load available songs for adding to playlist
 */
async function loadAvailableSongs(playlistName) {
  try {
    const allSongs = await window.electronAPI.listAllSongs();
    const playlistSongs = await window.electronAPI.listPlaylistSongs(playlistName);
    const searchInput = document.getElementById('available-songs-search');
    
    const playlistSongNames = playlistSongs.map(song => song.replace('.ref', ''));
    const availableSongs = allSongs.filter(song => !playlistSongNames.includes(song));
    
    availableSongsCache = availableSongs;
    
    setupAvailableSongsSearch();
    
    const currentQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (currentQuery) {
      const filteredSongs = availableSongs.filter(song => {
        const metadata = metadataManager.getMetadata(song);
        return metadata.title.toLowerCase().includes(currentQuery) ||
               metadata.artist.toLowerCase().includes(currentQuery);
      });
      renderAvailableSongs(filteredSongs);
    } else {
      renderAvailableSongs(availableSongs);
    }
  } catch (error) {
    console.error('Failed to load available songs:', error);
  }
}

/**
 * Render available songs list
 */
function renderAvailableSongs(songs) {
  const availableSongsList = document.getElementById('available-songs-list');
  
  if (songs.length === 0) {
    const searchInput = document.getElementById('available-songs-search');
    const hasSearchQuery = searchInput && searchInput.value.trim();
    
    if (hasSearchQuery) {
      availableSongsList.innerHTML = '<p class="text-neutral-500 text-sm">No songs match your search</p>';
    } else if (availableSongsCache.length === 0) {
      availableSongsList.innerHTML = '<p class="text-neutral-500 text-sm">No songs available (all songs are in this playlist)</p>';
    } else {
      availableSongsList.innerHTML = '<p class="text-neutral-500 text-sm">No songs available</p>';
    }
    return;
  }
  
  availableSongsList.innerHTML = songs.map(song => {
    const metadata = metadataManager.getMetadata(song);
    return `
      <div class="flex justify-between items-center p-2 hover:bg-neutral-700 rounded">
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate font-medium">${metadata.title}</div>
          <div class="text-xs text-neutral-400 truncate">
            ${metadata.artist}${metadata.duration ? ` · ${formatDuration(metadata.duration)}` : ''}
          </div>
        </div>
        <button class="add-song-btn text-blue-400 hover:text-blue-300 text-xs px-2 py-1 ml-2 shrink-0" data-song="${song}">
          + Add
        </button>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.add-song-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const songName = btn.getAttribute('data-song');
      await addSongToPlaylist(currentEditingPlaylist, songName);
    });
  });
}

/**
 * Setup available songs search
 */
function setupAvailableSongsSearch() {
  const searchInput = document.getElementById('available-songs-search');
  if (!searchInput) return;
  
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  newSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      renderAvailableSongs(availableSongsCache);
      return;
    }
    
    const filteredSongs = availableSongsCache.filter(song => {
      const metadata = metadataManager.getMetadata(song);
      return metadata.title.toLowerCase().includes(query) ||
             metadata.artist.toLowerCase().includes(query);
    });
    
    renderAvailableSongs(filteredSongs);
  });
}

/**
 * Load songs in current playlist
 */
async function loadPlaylistSongs(playlistName) {
  try {
    let songs = await window.electronAPI.listPlaylistSongs(playlistName);
    const playlistSongsList = document.getElementById('playlist-songs-list');
    
    if (songs.length === 0) {
      playlistSongsList.innerHTML = '<p class="text-neutral-400">No songs in this playlist</p>';
      return;
    }
    
    const savedOrder = await window.electronAPI.getPlaylistOrder(playlistName);
    if (savedOrder && savedOrder.length > 0) {
      const orderedSongs = [];
      for (const orderedSong of savedOrder) {
        if (songs.includes(orderedSong)) {
          orderedSongs.push(orderedSong);
        }
      }
      for (const song of songs) {
        if (!orderedSongs.includes(song)) {
          orderedSongs.push(song);
        }
      }
      songs = orderedSongs;
    }

    // Calculate total duration
    const totalDuration = calculateTotalDuration(songs);
    
    playlistSongsList.innerHTML = `
      <div class="mb-4 pb-4 border-b border-neutral-700">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-lg font-semibold">${songs.length} song${songs.length !== 1 ? 's' : ''}</span>
            ${totalDuration > 0 ? `<span class="text-neutral-400 text-sm ml-2">· ${formatTotalDuration(totalDuration)}</span>` : ''}
          </div>
        </div>
      </div>
      ${songs.map((song, index) => {
        const metadata = metadataManager.getMetadata(song);
        return `
          <div class="playlist-song-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition cursor-pointer" data-song="${song}" data-index="${index}" draggable="true">
            <div class="flex items-center gap-3">
              <div class="drag-handle cursor-move text-neutral-500 hover:text-neutral-300">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">${metadata.title}</div>
                <div class="text-sm text-neutral-400 truncate">${metadata.artist}</div>
                ${metadata.duration ? `<div class="text-xs text-neutral-500">${formatDuration(metadata.duration)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    `;
    
    // Add event handlers for playlist songs
    document.querySelectorAll('.playlist-song-item').forEach(item => {
      const songName = item.getAttribute('data-song');
      
      // Left click to play
      item.addEventListener('click', async (e) => {
        // Don't trigger if clicking on drag handle
        if (e.target.closest('.drag-handle')) return;
        
        const metadata = metadataManager.getMetadata(songName);
        await playSong(songName, metadata);
      });
      
      // Right click for context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, songName, playlistName);
      });
    });
    
    setupDragAndDrop(playlistName);
  } catch (error) {
    console.error('Failed to load playlist songs:', error);
  }
}

/**
 * Add song to playlist
 */
async function addSongToPlaylist(playlistName, songFilename) {
  try {
    await window.electronAPI.addToPlaylist(playlistName, songFilename);
    await loadPlaylistSongs(playlistName);
    await loadAvailableSongs(playlistName);
  } catch (error) {
    console.error('Failed to add song to playlist:', error);
    alert('Failed to add song: ' + error.message);
  }
}

/**
 * Remove song from playlist
 */
async function removeSongFromPlaylist(playlistName, songFilename) {
  try {
    await window.electronAPI.removeFromPlaylist(playlistName, songFilename);
    await loadPlaylistSongs(playlistName);
    await loadAvailableSongs(playlistName);
  } catch (error) {
    console.error('Failed to remove song from playlist:', error);
    alert('Failed to remove song: ' + error.message);
  }
}

/**
 * Setup drag and drop for playlist reordering
 */
function setupDragAndDrop(playlistName) {
  const playlistItems = document.querySelectorAll('.playlist-song-item');
  
  playlistItems.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', (e) => handleDrop(e, playlistName));
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('dragend', handleDragEnd);
  });
}

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  draggedIndex = parseInt(draggedElement.getAttribute('data-index'));
  e.currentTarget.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (e.currentTarget.classList.contains('playlist-song-item')) {
    e.currentTarget.classList.add('border-2', 'border-blue-500');
  }
}

function handleDragLeave(e) {
  if (e.currentTarget.classList.contains('playlist-song-item')) {
    e.currentTarget.classList.remove('border-2', 'border-blue-500');
  }
}

async function handleDrop(e, playlistName) {
  e.preventDefault();
  e.stopPropagation();
  
  const targetElement = e.currentTarget;
  const targetIndex = parseInt(targetElement.getAttribute('data-index'));
  
  if (draggedElement !== targetElement) {
    const allItems = Array.from(document.querySelectorAll('.playlist-song-item'));
    const songs = allItems.map(item => item.getAttribute('data-song'));
    
    const draggedSong = songs[draggedIndex];
    songs.splice(draggedIndex, 1);
    songs.splice(targetIndex, 0, draggedSong);
    
    try {
      await window.electronAPI.reorderPlaylistSongs(playlistName, songs);
      await loadPlaylistSongs(playlistName);
    } catch (error) {
      console.error('Failed to reorder songs:', error);
      alert('Failed to reorder songs: ' + error.message);
    }
  }
  
  targetElement.classList.remove('border-2', 'border-blue-500');
  return false;
}

function handleDragEnd(e) {
  e.currentTarget.style.opacity = '1';
  
  document.querySelectorAll('.playlist-song-item').forEach(item => {
    item.classList.remove('border-2', 'border-blue-500');
  });
}

/**
 * Get currently editing playlist
 */
export function getCurrentEditingPlaylist() {
  return currentEditingPlaylist;
}

/**
 * Refresh available songs
 */
export async function refreshAvailableSongs() {
  if (currentEditingPlaylist) {
    await loadAvailableSongs(currentEditingPlaylist);
  }
}