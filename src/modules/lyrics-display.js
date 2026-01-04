import { getAudioElement } from './player/audio-element.js';

let currentLyrics = [];
let currentLineIndex = -1;
let lyricsUpdateInterval = null;

/**
 * Initialize lyrics display
 */
export function initLyricsDisplay() {
  // Update lyrics on time update
  const audioElement = getAudioElement();
  if (audioElement) {
    audioElement.addEventListener('timeupdate', updateLyricsHighlight);
  }
}

/**
 * Load and display lyrics for current song
 * @param {Array} lyrics - Array of {time, text} objects
 */
export function loadLyrics(lyrics) {
  currentLyrics = lyrics || [];
  currentLineIndex = -1;
  displayLyrics();
}

/**
 * Display lyrics in the UI
 */
function displayLyrics() {
  const lyricsContainer = document.getElementById('lyrics');
  
  if (!currentLyrics || currentLyrics.length === 0) {
    lyricsContainer.innerHTML = '<p class="text-neutral-500 text-sm">No lyrics detected</p>';
    return;
  }
  
  const lyricsHTML = `
    <div class="mb-2 flex items-center gap-3">
      <svg class="w-5 h-5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <h3 class="text-lg font-semibold text-white">Lyrics</h3>
      <div class="flex-1 h-px bg-linear-to-r from-neutral-700 to-transparent"></div>
    </div>
    <div class="space-y-1">
      ${currentLyrics.map((line, index) => {
        const minutes = Math.floor(line.time / 60);
        const seconds = line.time % 60;
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        return `<div class="lyric-line flex gap-3 py-0.5 transition-all duration-300" data-index="${index}" data-time="${line.time}">
          <span class="text-neutral-500 text-xs font-mono w-10 shrink-0 pt-0.5">${timestamp}</span>
          <span class="flex-1">${escapeHtml(line.text)}</span>
        </div>`;
      }).join('')}
    </div>
  `;
  
  lyricsContainer.innerHTML = lyricsHTML;
}

/**
 * Update lyrics highlight based on current playback time
 */
function updateLyricsHighlight() {
  if (!currentLyrics || currentLyrics.length === 0) return;
  
  const audioElement = getAudioElement();
  if (!audioElement) return;
  
  const currentTime = audioElement.currentTime;
  
  // Find the current line index
  let newIndex = -1;
  for (let i = currentLyrics.length - 1; i >= 0; i--) {
    if (currentTime >= currentLyrics[i].time) {
      newIndex = i;
      break;
    }
  }
  
  // Update highlight if line changed
  if (newIndex !== currentLineIndex) {
    currentLineIndex = newIndex;
    highlightLine(newIndex);
  }
}

/**
 * Highlight a specific lyric line
 * @param {number} index - Line index to highlight
 */
function highlightLine(index) {
  const lines = document.querySelectorAll('.lyric-line');
  
  lines.forEach((line, i) => {
    const textSpan = line.querySelector('span:last-child');
    const timestampSpan = line.querySelector('span:first-child');
    
    if (!textSpan) return;
    
    if (i === index) {
      textSpan.classList.add('text-blue-400', 'font-semibold');
      textSpan.classList.remove('text-neutral-300', 'text-neutral-500');
      if (timestampSpan) {
        timestampSpan.classList.add('text-blue-500');
        timestampSpan.classList.remove('text-neutral-500');
      }
      
      // Scroll into view
      line.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    } else if (i < index) {
      // Past lines - dimmed
      textSpan.classList.add('text-neutral-500');
      textSpan.classList.remove('text-neutral-300', 'text-blue-400', 'font-semibold');
      if (timestampSpan) {
        timestampSpan.classList.remove('text-blue-500');
        timestampSpan.classList.add('text-neutral-500');
      }
    } else {
      // Future lines - normal
      textSpan.classList.add('text-neutral-300');
      textSpan.classList.remove('text-neutral-500', 'text-blue-400', 'font-semibold');
      if (timestampSpan) {
        timestampSpan.classList.remove('text-blue-500');
        timestampSpan.classList.add('text-neutral-500');
      }
    }
  });
}

/**
 * Clear lyrics display
 */
export function clearLyrics() {
  currentLyrics = [];
  currentLineIndex = -1;
  const lyricsContainer = document.getElementById('lyrics');
  lyricsContainer.innerHTML = '<p class="text-neutral-500 text-sm">Select a song to view lyrics</p>';
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get current lyrics
 * @returns {Array} Current lyrics array
 */
export function getCurrentLyrics() {
  return currentLyrics;
}