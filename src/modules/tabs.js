// src/modules/tabs.js

/**
 * Initialize main tab switching functionality
 */
export function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Remove active class from all buttons and hide all content
      tabButtons.forEach(btn => btn.classList.remove('active', 'border-b-2', 'border-blue-500'));
      tabContents.forEach(content => content.classList.add('hidden'));
      
      // Add active class to clicked button and show corresponding content
      button.classList.add('active', 'border-b-2', 'border-blue-500');
      document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    });
  });

  // Set initial active state
  document.querySelector('.tab-btn.active')?.classList.add('border-b-2', 'border-blue-500');
}

/**
 * Initialize library sub-tab switching functionality
 * @param {Function} onAllSongsTab - Callback when "All Songs" tab is clicked
 * @param {Function} onPlaylistsTab - Callback when "Playlists" tab is clicked
 */
export function initLibraryTabs(onAllSongsTab, onPlaylistsTab) {
  const libraryTabButtons = document.querySelectorAll('.library-tab-btn');
  const libraryTabContents = document.querySelectorAll('.library-tab-content');

  libraryTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-library-tab');
      
      // Remove active class from all buttons and hide all content
      libraryTabButtons.forEach(btn => {
        btn.classList.remove('active', 'bg-blue-500');
        btn.classList.add('bg-neutral-700');
      });
      libraryTabContents.forEach(content => content.classList.add('hidden'));
      
      // Add active class to clicked button and show corresponding content
      button.classList.add('active', 'bg-blue-500');
      button.classList.remove('bg-neutral-700');
      document.getElementById(`${tabName}-view`).classList.remove('hidden');
      
      // Call appropriate callback
      if (tabName === 'all-songs' && onAllSongsTab) {
        onAllSongsTab();
      } else if (tabName === 'playlists' && onPlaylistsTab) {
        onPlaylistsTab();
      }
    });
  });
}