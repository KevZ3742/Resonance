import { loadPlaylists } from './playlist-list.js';

/**
 * Initialize create playlist button
 */
export function initCreatePlaylistButton() {
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
export function initPlaylistModal() {
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
  
  console.log('Creating playlist:', playlistName);
  
  if (!playlistName) {
    console.log('No playlist name provided');
    return;
  }
  
  try {
    console.log('Calling electronAPI.createPlaylist...');
    const result = await window.electronAPI.createPlaylist(playlistName);
    console.log('Playlist created:', result);
    
    hidePlaylistModal();
    await loadPlaylists();
    console.log('Playlists reloaded');
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