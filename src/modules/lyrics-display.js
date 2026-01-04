// src/modules/lyrics-display.js - Synchronized lyrics display
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
    lyricsContainer.innerHTML = '<p class="text-neutral-500">No lyrics available</p>';
    return;
  }
  
  // Create lyrics lines with IDs for highlighting
  const lyricsHTML = currentLyrics.map((line, index) => {
    return `<div class="lyric-line py-1 transition-all duration-300" data-index="${index}" data-time="${line.time}">
      ${escapeHtml(line.text)}
    </div>`;
  }).join('');
  
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
    if (i === index) {
      line.classList.add('text-blue-400', 'font-semibold', 'scale-105');
      line.classList.remove('text-neutral-300');
      
      // Scroll into view
      line.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    } else if (i < index) {
      // Past lines - dimmed
      line.classList.add('text-neutral-500');
      line.classList.remove('text-neutral-300', 'text-blue-400', 'font-semibold', 'scale-105');
    } else {
      // Future lines - normal
      line.classList.add('text-neutral-300');
      line.classList.remove('text-neutral-500', 'text-blue-400', 'font-semibold', 'scale-105');
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
  lyricsContainer.innerHTML = 'Select a song to view lyrics';
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