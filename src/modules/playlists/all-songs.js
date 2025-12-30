// All songs view functionality
import { metadataManager, formatDuration } from '../metadata.js';
import { playSong } from '../player.js';
import { showContextMenu } from './context-menu.js';
import { calculateTotalDuration, formatTotalDuration } from './playlist-utils.js';

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
      ${songs.map(song => createSongElement(song)).join('')}
    `;
    
    attachSongEventListeners();
  } catch (error) {
    console.error('Failed to load songs:', error);
  }
}

/**
 * Create song element HTML
 */
function createSongElement(song) {
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
}

/**
 * Attach event listeners to song items
 */
function attachSongEventListeners() {
  document.querySelectorAll('.song-item').forEach(item => {
    const songName = item.getAttribute('data-song');
    
    item.addEventListener('click', async () => {
      const metadata = metadataManager.getMetadata(songName);
      await playSong(songName, metadata);
    });
    
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, songName);
    });
  });
}