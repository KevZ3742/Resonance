// src/modules/playlists/playlist-rename.js

import { loadPlaylists } from './playlist-list.js';
import { loadPlaylistSongs, getCurrentEditingPlaylist } from './playlist-editor.js';

/**
 * Show rename playlist modal
 * @param {string} playlistName - Current playlist name
 * @param {boolean} isInEditView - Whether we're in the edit view
 */
export function showRenamePlaylistModal(playlistName, isInEditView = false) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.id = 'rename-playlist-modal';
  
  modal.innerHTML = `
    <div class="bg-neutral-800 rounded-lg p-6 w-96">
      <h3 class="text-xl font-bold mb-4">Rename Playlist</h3>
      <input 
        type="text" 
        id="rename-playlist-input" 
        value="${playlistName}"
        placeholder="Enter new playlist name..."
        class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500 transition"
      >
      <div class="flex gap-2 justify-end">
        <button id="rename-modal-cancel" class="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition">
          Cancel
        </button>
        <button id="rename-modal-confirm" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition">
          Rename
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const input = document.getElementById('rename-playlist-input');
  const cancelBtn = document.getElementById('rename-modal-cancel');
  const confirmBtn = document.getElementById('rename-modal-confirm');
  
  // Focus input and select text
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
  
  // Cancel handler
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Confirm handler
  const handleRename = async () => {
    const newName = input.value.trim();
    
    if (!newName) {
      alert('Please enter a playlist name');
      return;
    }
    
    if (newName === playlistName) {
      modal.remove();
      return;
    }
    
    try {
      await window.electronAPI.renamePlaylist(playlistName, newName);
      modal.remove();
      
      if (isInEditView) {
        // Update the title in edit view
        document.getElementById('playlist-edit-title').textContent = newName;
        
        // Reload playlist songs with new name
        await loadPlaylistSongs(newName);
        
        // Update the current editing playlist name
        const { setCurrentEditingPlaylist } = await import('./playlist-editor.js');
        setCurrentEditingPlaylist(newName);
      } else {
        // Reload playlists list
        await loadPlaylists();
      }
      
      showNotification(`Playlist renamed to "${newName}"`);
    } catch (error) {
      console.error('Failed to rename playlist:', error);
      alert('Failed to rename playlist: ' + error.message);
    }
  };
  
  confirmBtn.addEventListener('click', handleRename);
  
  // Enter key to confirm
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleRename();
    }
  });
  
  // Escape key to cancel
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.remove();
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