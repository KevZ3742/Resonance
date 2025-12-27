import { formatDuration } from '../utils/formatters.js';

let currentSearchSource = 'youtube';
let searchTimeout = null;
let currentSearchId = 0;

/**
 * Initialize search functionality
 */
export function initSearch() {
  initSearchSourceButtons();
  initSearchInput();
}

/**
 * Initialize search source switching buttons
 */
function initSearchSourceButtons() {
  const searchSourceButtons = document.querySelectorAll('.search-source-btn');

  searchSourceButtons.forEach(button => {
    button.addEventListener('click', () => {
      const source = button.getAttribute('data-source');
      
      // Remove active class from all buttons
      searchSourceButtons.forEach(btn => {
        btn.classList.remove('active', 'bg-blue-500', 'hover:bg-blue-600');
        btn.classList.add('bg-neutral-700', 'hover:bg-neutral-600');
      });
      
      // Add active class to clicked button
      button.classList.remove('bg-neutral-700', 'hover:bg-neutral-600');
      button.classList.add('active', 'bg-blue-500', 'hover:bg-blue-600');
      
      // Update current source
      currentSearchSource = source;
      
      // Clear any pending search timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
      }
      
      // Increment search ID to invalidate any pending searches
      currentSearchId++;
      
      // Re-run search with new source if there's a query
      const searchInput = document.getElementById('search-input');
      const query = searchInput.value.trim();
      if (query) {
        const searchResults = document.getElementById('search-results');
        searchResults.innerHTML = '<p class="text-neutral-400">Searching...</p>';
        performSearch(query, source, currentSearchId);
      }
    });
  });
}

/**
 * Initialize search input with debounce
 */
function initSearchInput() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If empty, show default message
    if (!query) {
      searchResults.innerHTML = '<p class="text-neutral-400">Search for songs</p>';
      return;
    }
    
    // Show searching indicator
    searchResults.innerHTML = '<p class="text-neutral-400">Searching...</p>';
    
    // Increment search ID for this new search
    currentSearchId++;
    const thisSearchId = currentSearchId;
    
    // Debounce search by 500ms
    searchTimeout = setTimeout(() => {
      performSearch(query, currentSearchSource, thisSearchId);
    }, 500);
  });
}

/**
 * Perform search using the API
 */
async function performSearch(query, source, searchId) {
  console.log(`Searching ${source} for: ${query} (ID: ${searchId})`);
  
  try {
    const results = await window.electronAPI.searchSongs(query, source);
    
    // Only display results if this search is still the current one
    if (searchId === currentSearchId) {
      displaySearchResults(results, source);
    } else {
      console.log(`Ignoring outdated search results (ID: ${searchId}, current: ${currentSearchId})`);
    }
  } catch (error) {
    console.error('Search error:', error);
    // Only show error if this search is still current
    if (searchId === currentSearchId) {
      const searchResults = document.getElementById('search-results');
      searchResults.innerHTML = '<p class="text-red-400">Error searching. Please try again.</p>';
    }
  }
}

/**
 * Display search results in the UI
 */
function displaySearchResults(results, source) {
  const searchResults = document.getElementById('search-results');
  
  if (!results || results.length === 0) {
    searchResults.innerHTML = '<p class="text-neutral-400">No results found</p>';
    return;
  }
  
  searchResults.innerHTML = results.map((result, index) => `
    <div class="bg-neutral-700 hover:bg-neutral-600 rounded-lg p-3 cursor-pointer transition group" data-result='${JSON.stringify(result)}'>
      <div class="flex items-center gap-3">
        ${result.thumbnail ? `
          <img src="${result.thumbnail}" alt="${result.title}" class="w-16 h-16 object-cover rounded">
        ` : `
          <div class="w-16 h-16 bg-neutral-800 rounded flex items-center justify-center">
            <svg class="w-8 h-8 text-neutral-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        `}
        <div class="flex-1 min-w-0">
          <p class="font-medium text-white truncate group-hover:text-blue-400 transition">${result.title}</p>
          <p class="text-sm text-neutral-400 truncate">${result.artist || result.uploader || 'Unknown Artist'}</p>
          ${result.duration ? `<p class="text-xs text-neutral-500">${formatDuration(result.duration)}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <button class="download-btn p-2 hover:bg-neutral-500 rounded-lg transition" id="download-btn-${index}" data-url="${result.url}">
            <svg class="plus-icon w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <svg class="loading-icon w-5 h-5 hidden animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg class="checkmark-icon w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  // Add event listeners to all download buttons
  results.forEach((result, index) => {
    const btn = document.getElementById(`download-btn-${index}`);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadFromSearch(result.url, btn);
      });
    }
  });
}

/**
 * Download a song from search results
 */
async function downloadFromSearch(url, buttonElement) {
  const plusIcon = buttonElement.querySelector('.plus-icon');
  const loadingIcon = buttonElement.querySelector('.loading-icon');
  const checkmarkIcon = buttonElement.querySelector('.checkmark-icon');
  
  // Disable button and show loading
  buttonElement.disabled = true;
  plusIcon.classList.add('hidden');
  loadingIcon.classList.remove('hidden');
  
  try {
    await window.electronAPI.downloadSong(url);
    
    // Show checkmark on success
    loadingIcon.classList.add('hidden');
    checkmarkIcon.classList.remove('hidden');
    
    // Reset button after 2 seconds
    setTimeout(() => {
      checkmarkIcon.classList.add('hidden');
      plusIcon.classList.remove('hidden');
      buttonElement.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Download failed:', error);
    
    // Reset button on error
    loadingIcon.classList.add('hidden');
    plusIcon.classList.remove('hidden');
    buttonElement.disabled = false;
  }
}