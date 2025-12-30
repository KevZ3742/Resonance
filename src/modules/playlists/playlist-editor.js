// Playlist editor functionality
import { metadataManager, formatDuration } from '../metadata.js';
import { playSong } from '../player.js';
import { showContextMenu, setCurrentEditingPlaylist as setContextMenuPlaylist } from './context-menu.js';
import { addSongToPlaylist } from './playlist-api.js';
import { setupDragAndDrop } from './drag-drop.js';
import { calculateTotalDuration, formatTotalDuration } from './playlist-utils.js';

let currentEditingPlaylist = null;
let availableSongsCache = [];

/**
 * Set current editing playlist
 */
export function setCurrentEditingPlaylist(playlistName) {
  currentEditingPlaylist = playlistName;
  setContextMenuPlaylist(playlistName);
}

/**
 * Get currently editing playlist
 */
export function getCurrentEditingPlaylist() {
  return currentEditingPlaylist;
}

/**
 * Initialize back to playlists button
 */
export function initBackButton() {
  const backToPlaylistsBtn = document.getElementById('back-to-playlists-btn');
  
  if (backToPlaylistsBtn) {
    backToPlaylistsBtn.addEventListener('click', async () => {
      document.getElementById('playlist-edit-view').classList.add('hidden');
      document.getElementById('playlists-view').classList.remove('hidden');
      currentEditingPlaylist = null;
      // Dynamically import to avoid circular dependency
      const { loadPlaylists } = await import('./playlist-list.js');
      await loadPlaylists();
    });
  }
}

/**
 * Load songs in current playlist
 */
export async function loadPlaylistSongs(playlistName) {
  try {
    let songs = await window.electronAPI.listPlaylistSongs(playlistName);
    const playlistSongsList = document.getElementById('playlist-songs-list');
    
    if (songs.length === 0) {
      playlistSongsList.innerHTML = '<p class="text-neutral-400">No songs in this playlist</p>';
      return;
    }
    
    const savedOrder = await window.electronAPI.getPlaylistOrder(playlistName);
    if (savedOrder && savedOrder.length > 0) {
      songs = reorderSongs(songs, savedOrder);
    }

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
      ${songs.map((song, index) => createPlaylistSongElement(song, index)).join('')}
    `;
    
    attachPlaylistSongEventListeners(playlistName);
    setupDragAndDrop(playlistName);
  } catch (error) {
    console.error('Failed to load playlist songs:', error);
  }
}

/**
 * Reorder songs based on saved order
 */
function reorderSongs(songs, savedOrder) {
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
  return orderedSongs;
}

/**
 * Create playlist song element HTML
 */
function createPlaylistSongElement(song, index) {
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
}

/**
 * Attach event listeners to playlist song items
 */
function attachPlaylistSongEventListeners(playlistName) {
  document.querySelectorAll('.playlist-song-item').forEach(item => {
    const songName = item.getAttribute('data-song');
    
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.drag-handle')) return;
      
      const metadata = metadataManager.getMetadata(songName);
      await playSong(songName, metadata);
    });
    
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, songName, playlistName);
    });
  });
}

/**
 * Load available songs for adding to playlist
 */
export async function loadAvailableSongs(playlistName) {
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
      const filteredSongs = filterSongs(availableSongs, currentQuery);
      renderAvailableSongs(filteredSongs);
    } else {
      renderAvailableSongs(availableSongs);
    }
  } catch (error) {
    console.error('Failed to load available songs:', error);
  }
}

/**
 * Filter songs by query
 */
function filterSongs(songs, query) {
  return songs.filter(song => {
    const metadata = metadataManager.getMetadata(song);
    return metadata.title.toLowerCase().includes(query) ||
           metadata.artist.toLowerCase().includes(query);
  });
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
  
  availableSongsList.innerHTML = songs.map(song => createAvailableSongElement(song)).join('');
  attachAddSongEventListeners();
}

/**
 * Create available song element HTML
 */
function createAvailableSongElement(song) {
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
}

/**
 * Attach event listeners to add song buttons
 */
function attachAddSongEventListeners() {
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
    
    const filteredSongs = filterSongs(availableSongsCache, query);
    renderAvailableSongs(filteredSongs);
  });
}

/**
 * Refresh available songs
 */
export async function refreshAvailableSongs() {
  if (currentEditingPlaylist) {
    await loadAvailableSongs(currentEditingPlaylist);
  }
}