// src/modules/playlists.js - Updated version with metadata support

import { metadataManager, showMetadataEditor, formatDuration } from './metadata.js';

let currentEditingPlaylist = null;
let availableSongsCache = [];
let draggedElement = null;
let draggedIndex = null;

/**
 * Initialize playlist management functionality
 */
export function initPlaylists() {
  initCreatePlaylistButton();
  initPlaylistModal();
  initBackButton();
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
    
    allSongsList.innerHTML = songs.map(song => {
      const metadata = metadataManager.getMetadata(song);
      return `
        <div class="bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition">
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">${metadata.title}</div>
              <div class="text-sm text-neutral-400 truncate">${metadata.artist}</div>
              ${metadata.duration ? `<div class="text-xs text-neutral-500">${formatDuration(metadata.duration)}</div>` : ''}
            </div>
            <div class="flex gap-2">
              <button class="edit-metadata-btn text-neutral-400 hover:text-white text-sm px-3 py-1" data-song="${song}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="play-song-btn text-blue-400 hover:text-blue-300 text-sm px-3 py-1" data-song="${song}">
                Play
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add edit metadata handlers
    document.querySelectorAll('.edit-metadata-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songName = btn.getAttribute('data-song');
        showMetadataEditor(songName, loadAllSongs);
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

  // Alternative: Use event delegation
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

  // Allow Enter key to create playlist
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
  
  // Hide playlists view, show editor view
  document.getElementById('playlists-view').classList.add('hidden');
  document.getElementById('playlist-edit-view').classList.remove('hidden');
  
  // Set title
  document.getElementById('playlist-edit-title').textContent = playlistName;
  
  // Load available songs and playlist songs
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
    
    // Filter out songs that are already in the playlist
    const playlistSongNames = playlistSongs.map(song => song.replace('.ref', ''));
    const availableSongs = allSongs.filter(song => !playlistSongNames.includes(song));
    
    // Cache the available songs for search filtering
    availableSongsCache = availableSongs;
    
    // Setup search functionality
    setupAvailableSongsSearch();
    
    // Preserve the search query and filter accordingly
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
          <div class="text-xs text-neutral-500 truncate">${metadata.artist}</div>
        </div>
        <button class="add-song-btn text-blue-400 hover:text-blue-300 text-xs px-2 py-1 ml-2" data-song="${song}">
          + Add
        </button>
      </div>
    `;
  }).join('');
  
  // Add click handlers
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
  
  // Remove previous listener if exists
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
    
    // Get saved order and apply it
    const savedOrder = await window.electronAPI.getPlaylistOrder(playlistName);
    if (savedOrder && savedOrder.length > 0) {
      // Sort songs according to saved order
      const orderedSongs = [];
      for (const orderedSong of savedOrder) {
        if (songs.includes(orderedSong)) {
          orderedSongs.push(orderedSong);
        }
      }
      // Add any songs not in the saved order at the end
      for (const song of songs) {
        if (!orderedSongs.includes(song)) {
          orderedSongs.push(song);
        }
      }
      songs = orderedSongs;
    }
    
    playlistSongsList.innerHTML = songs.map((song, index) => {
      const metadata = metadataManager.getMetadata(song);
      return `
        <div class="playlist-song-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition" data-song="${song}" data-index="${index}" draggable="true">
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
            <div class="flex gap-2">
              <button class="edit-metadata-btn text-neutral-400 hover:text-white text-sm px-2 py-1" data-song="${song}">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="play-song-btn text-blue-400 hover:text-blue-300 text-sm px-3 py-1" data-song="${song}">
                Play
              </button>
              <button class="remove-song-btn text-red-400 hover:text-red-300 text-sm px-3 py-1" data-song="${song}">
                Remove
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add edit metadata handlers
    document.querySelectorAll('.edit-metadata-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const songName = btn.getAttribute('data-song');
        showMetadataEditor(songName, () => loadPlaylistSongs(playlistName));
      });
    });
    
    // Add remove handlers
    document.querySelectorAll('.remove-song-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const songName = btn.getAttribute('data-song');
        await removeSongFromPlaylist(playlistName, songName);
      });
    });
    
    // Add drag and drop handlers
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
  if (e.preventDefault) {
    e.preventDefault();
  }
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
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  const targetElement = e.currentTarget;
  const targetIndex = parseInt(targetElement.getAttribute('data-index'));
  
  if (draggedElement !== targetElement) {
    // Get all songs in current order
    const allItems = Array.from(document.querySelectorAll('.playlist-song-item'));
    const songs = allItems.map(item => item.getAttribute('data-song'));
    
    // Reorder the array
    const draggedSong = songs[draggedIndex];
    songs.splice(draggedIndex, 1);
    songs.splice(targetIndex, 0, draggedSong);
    
    // Save the new order
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
  
  // Remove all drag indicators
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
 * Refresh available songs (for when new songs are downloaded)
 */
export async function refreshAvailableSongs() {
  if (currentEditingPlaylist) {
    await loadAvailableSongs(currentEditingPlaylist);
  }
}