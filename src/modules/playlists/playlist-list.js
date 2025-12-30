// Playlist list view functionality
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
    item.addEventListener('click', () => {
      const playlistName = item.getAttribute('data-playlist');
      openPlaylistEditor(playlistName);
    });
  });
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