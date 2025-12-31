// src/renderer.js - Main renderer entry point

import './index.css';
import { initTabs, initLibraryTabs } from './modules/tabs.js';
import { initPlayer } from './modules/player.js';
import { initSearch } from './modules/search.js';
import { initDownload } from './modules/download.js';
import { initPlaylists, loadAllSongs, loadPlaylists, refreshAvailableSongs, getCurrentEditingPlaylist } from './modules/playlists/index.js';
import { initPreferences } from './modules/preferences.js';
import { metadataManager } from './modules/metadata.js';
import { queueManager } from './modules/queue.js';

/**
 * Initialize the application
 */
async function initApp() {
  // Initialize metadata manager first
  await metadataManager.loadMetadata();
  
  // Initialize queue manager and make it globally available
  window.queueManager = queueManager;
  
  // Initialize main UI components
  initTabs();
  initPlayer();
  initSearch();
  initPreferences();
  
  // Initialize download with callback for when downloads complete
  initDownload(handleDownloadComplete);
  
  // Initialize playlists
  initPlaylists();
  
  // Initialize library tabs with callbacks
  initLibraryTabs(loadAllSongs, loadPlaylists);
  
  // Setup library tab to load songs on open
  setupLibraryTabListener();
  
  console.log('Resonance Music Player loaded');
}

/**
 * Handle download completion
 */
function handleDownloadComplete(data) {
  // Refresh available songs if we're currently editing a playlist
  const currentPlaylist = getCurrentEditingPlaylist();
  if (currentPlaylist) {
    refreshAvailableSongs();
  }
  
  // Refresh all songs list if we're on the library tab
  const allSongsView = document.getElementById('all-songs-view');
  if (allSongsView && !allSongsView.classList.contains('hidden')) {
    loadAllSongs();
  }
}

/**
 * Setup library tab to load songs when opened
 */
function setupLibraryTabListener() {
  const libraryTabBtn = document.querySelector('[data-tab="library"]');
  if (libraryTabBtn) {
    libraryTabBtn.addEventListener('click', () => {
      // Load all songs by default when opening library tab
      setTimeout(() => loadAllSongs(), 100);
    });
  }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}