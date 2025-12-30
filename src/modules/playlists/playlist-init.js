import { initCreatePlaylistButton, initPlaylistModal } from './playlist-modal.js';
import { initBackButton } from './playlist-editor.js';
import { initContextMenu } from './context-menu.js';

/**
 * Initialize playlist management functionality
 */
export function initPlaylists() {
  initCreatePlaylistButton();
  initPlaylistModal();
  initBackButton();
  initContextMenu();
}