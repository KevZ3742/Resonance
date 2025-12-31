import { metadataManager, formatDuration } from '../metadata.js';
import { queueManager } from '../queue.js';
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
    <div class="song-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition group" data-song="${song}">
      <div class="flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${metadata.title}</div>
          <div class="text-sm text-neutral-400 truncate">${metadata.artist}</div>
          ${metadata.duration ? `<div class="text-xs text-neutral-500">${formatDuration(metadata.duration)}</div>` : ''}
        </div>
        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="play-song-btn p-2 hover:bg-neutral-500 rounded-lg transition" data-song="${song}" title="Play Now">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <button class="add-to-queue-btn p-2 hover:bg-neutral-500 rounded-lg transition" data-song="${song}" title="Add to Queue">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to song items
 */
function attachSongEventListeners() {
  const allSongsList = document.getElementById('all-songs-list');
  
  // Remove all old listeners by cloning and replacing
  const newList = allSongsList.cloneNode(true);
  allSongsList.parentNode.replaceChild(newList, allSongsList);
  
  // Use event delegation on the new list
  newList.addEventListener('click', async (e) => {
    const playBtn = e.target.closest('.play-song-btn');
    const queueBtn = e.target.closest('.add-to-queue-btn');
    
    if (playBtn) {
      e.stopPropagation();
      const songName = playBtn.getAttribute('data-song');
      const metadata = metadataManager.getMetadata(songName);
      await queueManager.playNow(songName, metadata);
      return;
    }
    
    if (queueBtn) {
      e.stopPropagation();
      const songName = queueBtn.getAttribute('data-song');
      const metadata = metadataManager.getMetadata(songName);
      await queueManager.addToQueue(songName, metadata);
      showNotification(`Added "${metadata.title}" to queue`);
      return;
    }
  });

  // Context menu using event delegation
  newList.addEventListener('contextmenu', (e) => {
    const item = e.target.closest('.song-item');
    if (item) {
      e.preventDefault();
      const songName = item.getAttribute('data-song');
      showContextMenu(e.clientX, e.clientY, songName);
    }
  });
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