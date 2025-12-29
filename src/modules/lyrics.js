/**
 * Lyrics manager for synchronized lyrics display
 */

import { getAudioElement } from './player.js';

let currentLyrics = null;
let currentLineIndex = -1;

/**
 * Initialize lyrics display
 */
export function initLyrics() {
  console.log('Lyrics module initialized');
}

/**
 * Parse LRC format lyrics
 * Format: [mm:ss.xx]Lyric line
 * @param {string} lrcContent - LRC formatted lyrics
 * @returns {Array} Parsed lyrics with timestamps
 */
export function parseLRC(lrcContent) {
  if (!lrcContent) return [];
  
  const lines = lrcContent.split('\n');
  const lyrics = [];
  
  // Regular expression to match [mm:ss.xx] or [mm:ss]
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;
  
  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) / 10 : 0;
      const text = match[4].trim();
      
      const time = minutes * 60 + seconds + centiseconds / 100;
      
      if (text) { // Only add lines with text
        lyrics.push({ time, text });
      }
    }
  }
  
  // Sort by time
  lyrics.sort((a, b) => a.time - b.time);
  
  return lyrics;
}

/**
 * Parse plain text lyrics (no timestamps)
 * @param {string} plainText - Plain text lyrics
 * @returns {Array} Lyrics without timestamps
 */
export function parsePlainText(plainText) {
  if (!plainText) return [];
  
  const lines = plainText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  return lines.map(text => ({ time: null, text }));
}

/**
 * Load lyrics for current song
 * @param {Object} metadata - Song metadata
 * @param {string} filename - Song filename for caching
 */
export async function loadLyrics(metadata, filename) {
  const lyricsContainer = document.getElementById('lyrics');
  
  if (!lyricsContainer) return;
  
  // Show searching indicator
  displaySearching();
  
  // Reset state
  currentLyrics = null;
  currentLineIndex = -1;
  
  // Check if metadata has cached lyrics
  if (metadata && metadata.lyrics) {
    console.log('Found cached lyrics in metadata');
    // Try to parse as LRC first
    const lrcLyrics = parseLRC(metadata.lyrics);
    
    if (lrcLyrics.length > 0) {
      console.log(`Loaded ${lrcLyrics.length} synced lyrics lines from cache`);
      currentLyrics = lrcLyrics;
      displaySyncedLyrics(lrcLyrics);
    } else {
      console.log('Cached lyrics are plain text (no timestamps)');
      // Fall back to plain text
      const plainLyrics = parsePlainText(metadata.lyrics);
      currentLyrics = plainLyrics;
      displayPlainLyrics(plainLyrics);
    }
    return;
  }
  
  // Try to fetch lyrics from API
  const title = metadata?.title || '';
  const artist = metadata?.artist || '';
  
  if (title) {
    const fetchedLyrics = await fetchLyricsFromAPI(title, artist);
    
    // Cache the lyrics in metadata if found
    if (fetchedLyrics && filename) {
      console.log('Caching lyrics in metadata');
      const { metadataManager } = await import('./metadata.js');
      await metadataManager.setMetadata(filename, { lyrics: fetchedLyrics });
    }
  } else {
    displayNoLyrics();
  }
}

/**
 * Display synchronized lyrics
 * @param {Array} lyrics - Parsed lyrics with timestamps
 */
function displaySyncedLyrics(lyrics) {
  const lyricsContainer = document.getElementById('lyrics');
  if (!lyricsContainer) return;
  
  lyricsContainer.innerHTML = '';
  
  // Add synced indicator
  const indicator = document.createElement('div');
  indicator.className = 'text-xs text-blue-400 mb-6 flex items-center gap-2 justify-center';
  indicator.innerHTML = `
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
    </svg>
    <span>Synchronized lyrics</span>
  `;
  lyricsContainer.appendChild(indicator);
  
  lyrics.forEach((line, index) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'lyrics-line text-lg transition-all duration-300 text-neutral-400';
    lineEl.textContent = line.text;
    lineEl.dataset.index = index;
    lineEl.dataset.time = line.time;
    
    // Click to seek
    lineEl.style.cursor = 'pointer';
    lineEl.addEventListener('click', () => {
      const audioElement = getAudioElement();
      if (audioElement) {
        audioElement.currentTime = line.time;
      }
    });
    
    lyricsContainer.appendChild(lineEl);
  });
}

/**
 * Display plain text lyrics (no sync)
 * @param {Array} lyrics - Parsed plain text lyrics
 */
function displayPlainLyrics(lyrics) {
  const lyricsContainer = document.getElementById('lyrics');
  if (!lyricsContainer) return;
  
  lyricsContainer.innerHTML = '';
  
  // Add plain text indicator
  const indicator = document.createElement('div');
  indicator.className = 'text-xs text-neutral-500 mb-6 flex items-center gap-2 justify-center';
  indicator.innerHTML = `
    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>
    <span>Lyrics (not synchronized)</span>
  `;
  lyricsContainer.appendChild(indicator);
  
  const textContent = lyrics.map(line => line.text).join('\n\n');
  const textEl = document.createElement('div');
  textEl.className = 'text-neutral-300 text-lg leading-relaxed whitespace-pre-line px-4';
  textEl.textContent = textContent;
  
  lyricsContainer.appendChild(textEl);
}

/**
 * Display message when no lyrics available
 */
function displayNoLyrics() {
  const lyricsContainer = document.getElementById('lyrics');
  if (!lyricsContainer) return;
  
  lyricsContainer.innerHTML = '<div class="text-neutral-400">No lyrics available for this song</div>';
}

/**
 * Display searching indicator
 */
function displaySearching() {
  const lyricsContainer = document.getElementById('lyrics');
  if (!lyricsContainer) return;
  
  lyricsContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      <div class="text-neutral-400 text-sm">Searching for lyrics...</div>
    </div>
  `;
}

/**
 * Update lyrics highlight based on current time
 * @param {number} currentTime - Current playback time in seconds
 */
export function updateLyrics(currentTime) {
  if (!currentLyrics || currentLyrics.length === 0) {
    return;
  }
  
  // Check if lyrics are synced (have timestamps)
  if (currentLyrics[0].time === null) {
    return;
  }
  
  // Find the current line based on time
  let newLineIndex = -1;
  
  for (let i = 0; i < currentLyrics.length; i++) {
    if (currentLyrics[i].time <= currentTime) {
      newLineIndex = i;
    } else {
      break;
    }
  }
  
  // Only update if line changed
  if (newLineIndex !== currentLineIndex) {
    currentLineIndex = newLineIndex;
    console.log(`Lyrics sync: Line ${newLineIndex} at ${currentTime.toFixed(2)}s`);
    highlightCurrentLine(currentLineIndex);
  }
}

/**
 * Highlight the current lyrics line
 * @param {number} lineIndex - Index of line to highlight
 */
function highlightCurrentLine(lineIndex) {
  const lyricsContainer = document.getElementById('lyrics');
  if (!lyricsContainer) return;
  
  const lines = lyricsContainer.querySelectorAll('.lyrics-line');
  
  lines.forEach((line, index) => {
    if (index === lineIndex) {
      // Highlight current line
      line.classList.remove('text-neutral-400', 'text-neutral-500');
      line.classList.add('text-white', 'font-bold', 'scale-110', 'text-xl');
    } else if (index < lineIndex) {
      // Past lines
      line.classList.remove('text-white', 'font-bold', 'scale-110', 'text-xl', 'text-neutral-400');
      line.classList.add('text-neutral-500');
    } else {
      // Future lines
      line.classList.remove('text-white', 'font-bold', 'scale-110', 'text-xl', 'text-neutral-500');
      line.classList.add('text-neutral-400');
    }
  });
  
  // Auto-scroll to current line
  if (lineIndex >= 0 && lines[lineIndex]) {
    lines[lineIndex].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

/**
 * Fetch lyrics from LRCLIB API
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Promise<string|null>} Raw lyrics string
 */
async function fetchLyricsFromAPI(title, artist) {
  try {
    console.log(`Fetching lyrics for "${title}" by "${artist}"`);
    const lyrics = await window.electronAPI.fetchLyrics(title, artist);
    
    if (lyrics) {
      console.log('Lyrics fetched from API, length:', lyrics.length);
      // Try to parse as LRC
      const lrcLyrics = parseLRC(lyrics);
      
      if (lrcLyrics.length > 0) {
        console.log(`Parsed ${lrcLyrics.length} synced lyrics lines from API`);
        currentLyrics = lrcLyrics;
        displaySyncedLyrics(lrcLyrics);
      } else {
        console.log('API lyrics are plain text (no timestamps)');
        // Fall back to plain text
        const plainLyrics = parsePlainText(lyrics);
        currentLyrics = plainLyrics;
        displayPlainLyrics(plainLyrics);
      }
      return lyrics; // Return raw lyrics for caching
    } else {
      console.log('No lyrics found from API');
      displayNoLyrics();
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    displayNoLyrics();
    return null;
  }
}

/**
 * Clear lyrics display
 */
export function clearLyrics() {
  currentLyrics = null;
  currentLineIndex = -1;
  
  const lyricsContainer = document.getElementById('lyrics');
  if (lyricsContainer) {
    lyricsContainer.innerHTML = '<div class="text-neutral-400">Select a song to view lyrics</div>';
  }
}
