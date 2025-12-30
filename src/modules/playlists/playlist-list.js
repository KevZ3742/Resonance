import { loadPlaylistSongs, loadAvailableSongs, setCurrentEditingPlaylist } from './playlist-editor.js';
import { calculateTotalDuration, formatTotalDuration } from './playlist-utils.js';

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
    
    playlistsList.innerHTML = playlists.map(playlist => createPlaylistElement(playlist)).join('');
    
    // Load info for each playlist
    for (const playlist of playlists) {
      await loadPlaylistInfo(playlist);
    }
    
    attachPlaylistEventListeners();
  } catch (error) {
    console.error('Failed to load playlists:', error);
  }
}

/**
 * Create playlist element HTML
 */
function createPlaylistElement(playlist) {
  return `
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
  `;
}

/**
 * Load playlist info (song count and duration)
 */
async function loadPlaylistInfo(playlist) {
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

/**
 * Attach event listeners to playlist items
 */
function attachPlaylistEventListeners() {
  document.querySelectorAll('.playlist-item').forEach(item => {
    const playlistName = item.getAttribute('data-playlist');
    
    // Click handler
    item.addEventListener('click', (e) => {
      // Don't trigger if clicking on context menu trigger
      if (e.target.closest('.playlist-context-menu-btn')) return;
      openPlaylistEditor(playlistName);
    });
    
    // Context menu handler
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlaylistContextMenu(e.clientX, e.clientY, playlistName);
    });
  });
}

/**
 * Show context menu for playlist
 */
function showPlaylistContextMenu(x, y, playlistName) {
  // Remove existing context menu if any
  const existingMenu = document.getElementById('playlist-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const contextMenu = document.createElement('div');
  contextMenu.id = 'playlist-context-menu';
  contextMenu.className = 'fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[180px]';
  contextMenu.innerHTML = `
    <button class="playlist-context-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2" data-action="open">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
      </svg>
      Open
    </button>
    <button class="playlist-context-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2" data-action="rename">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
      Rename
    </button>
    <div class="border-t border-neutral-700 my-1"></div>
    <button class="playlist-context-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition flex items-center gap-2 text-red-400" data-action="delete">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
      Delete
    </button>
  `;
  
  document.body.appendChild(contextMenu);
  
  // Position the menu
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
  
  // Handle menu actions
  contextMenu.addEventListener('click', async (e) => {
    const action = e.target.closest('.playlist-context-item')?.getAttribute('data-action');
    if (!action) return;
    
    contextMenu.remove();
    
    if (action === 'open') {
      openPlaylistEditor(playlistName);
    } else if (action === 'rename') {
      const { showRenamePlaylistModal } = await import('./playlist-rename.js');
      showRenamePlaylistModal(playlistName, false);
    } else if (action === 'delete') {
      const confirmed = confirm(`Delete playlist "${playlistName}"? This cannot be undone.`);
      if (confirmed) {
        try {
          await window.electronAPI.deletePlaylist(playlistName);
          await loadPlaylists();
        } catch (error) {
          console.error('Failed to delete playlist:', error);
          alert('Failed to delete playlist: ' + error.message);
        }
      }
    }
  });
  
  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!contextMenu.contains(e.target)) {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

/**
 * Open playlist editor
 */
export async function openPlaylistEditor(playlistName) {
  setCurrentEditingPlaylist(playlistName);
  
  document.getElementById('playlists-view').classList.add('hidden');
  document.getElementById('playlist-edit-view').classList.remove('hidden');
  
  document.getElementById('playlist-edit-title').textContent = playlistName;
  
  await loadPlaylistSongs(playlistName);
  await loadAvailableSongs(playlistName);
}