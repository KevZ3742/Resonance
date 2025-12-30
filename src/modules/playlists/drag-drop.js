// Drag and drop functionality for playlist reordering
import { reorderPlaylistSongs } from './playlist-api.js';
import { loadPlaylistSongs } from './playlist-editor.js';

let draggedElement = null;
let draggedIndex = null;

/**
 * Setup drag and drop for playlist reordering
 */
export function setupDragAndDrop(playlistName) {
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
      await reorderPlaylistSongs(playlistName, songs);
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