import { loadPlaylistSongs, loadAvailableSongs } from './playlist-editor.js';

/**
 * Add song to playlist
 */
export async function addSongToPlaylist(playlistName, songFilename) {
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
export async function removeSongFromPlaylist(playlistName, songFilename) {
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
 * Reorder songs in playlist
 */
export async function reorderPlaylistSongs(playlistName, songs) {
  try {
    await window.electronAPI.reorderPlaylistSongs(playlistName, songs);
  } catch (error) {
    console.error('Failed to reorder songs:', error);
    throw error;
  }
}