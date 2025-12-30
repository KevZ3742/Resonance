// Context menu functionality for songs
import { metadataManager, showMetadataEditor } from '../metadata.js';
import { playSong } from '../player.js';
import { removeSongFromPlaylist } from './playlist-api.js';
import { loadPlaylistSongs } from './playlist-editor.js';
import { loadAllSongs } from './all-songs.js';

let contextMenu = null;
let currentEditingPlaylist = null;

/**
 * Initialize context menu for songs
 */
export function initContextMenu() {
  createContextMenu();
  setupContextMenuListeners();
}

/**
 * Set current editing playlist for context menu
 */
export function setCurrentEditingPlaylist(playlistName) {
  currentEditingPlaylist = playlistName;
}

/**
 * Create context menu element
 */
function createContextMenu() {
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
}

/**
 * Setup context menu listeners
 */
function setupContextMenuListeners() {
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

    handleContextMenuAction(action, songName, playlistName);
    hideContextMenu();
  });
}

/**
 * Handle context menu action
 */
async function handleContextMenuAction(action, songName, playlistName) {
  switch (action) {
    case 'play':
      await handlePlaySong(songName);
      break;
    case 'add-to-queue':
      handleAddToQueue(songName);
      break;
    case 'edit':
      handleEditMetadata(songName, playlistName);
      break;
    case 'remove':
      await handleRemoveSong(songName, playlistName);
      break;
  }
}

/**
 * Show context menu at position
 */
export function showContextMenu(x, y, songName, playlistName = null) {
  contextMenu.dataset.song = songName;
  contextMenu.dataset.playlist = playlistName || '';
  
  const removeBtn = contextMenu.querySelector('[data-action="remove"]');
  if (playlistName) {
    removeBtn.classList.remove('hidden');
    if (!removeBtn.previousElementSibling || !removeBtn.previousElementSibling.classList.contains('border-t')) {
      const divider = document.createElement('div');
      divider.className = 'border-t border-neutral-700 my-1 playlist-divider';
      removeBtn.parentNode.insertBefore(divider, removeBtn);
    }
  } else {
    removeBtn.classList.add('hidden');
    const playlistDivider = contextMenu.querySelector('.playlist-divider');
    if (playlistDivider) {
      playlistDivider.remove();
    }
  }

  contextMenu.classList.remove('hidden');
  
  const menuRect = contextMenu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
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
  
  if (window.queueManager) {
    window.queueManager.addToQueue(songName, metadata);
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
function handleEditMetadata(songName, playlistName) {
  const callback = playlistName ? 
    () => loadPlaylistSongs(playlistName) : 
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