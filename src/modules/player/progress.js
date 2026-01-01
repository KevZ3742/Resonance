import { getAudioElement } from './audio-element.js';
import { formatDuration } from '../../utils/formatters.js';

let wasPlayingBeforeScrub = false;

/**
 * Initialize progress bar
 */
export function initProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  const progress = document.getElementById('progress');
  let isDragging = false;

  progressBar.addEventListener('click', (e) => {
    const audioElement = getAudioElement();
    if (!audioElement || !audioElement.duration) return;
    if (!window.queueManager || window.queueManager.getQueue().length === 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioElement.duration;
    
    audioElement.currentTime = newTime;
    progress.style.width = `${percent * 100}%`;
  });
  
  progressBar.addEventListener('mousedown', (e) => {
    const audioElement = getAudioElement();
    if (!audioElement || !audioElement.duration) return;
    if (!window.queueManager || window.queueManager.getQueue().length === 0) return;
    
    isDragging = true;
    progressBar.classList.add('dragging');
    wasPlayingBeforeScrub = !audioElement.paused;
    if (wasPlayingBeforeScrub) {
      audioElement.pause();
    }
    
    updateProgressFromMouse(e, progressBar);
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      updateProgressFromMouse(e, progressBar);
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      progressBar.classList.remove('dragging');
      
      const audioElement = getAudioElement();
      if (wasPlayingBeforeScrub) {
        audioElement.play();
        wasPlayingBeforeScrub = false;
      }
    }
  });
}

/**
 * Update progress from mouse position
 */
function updateProgressFromMouse(e, progressBar) {
  const audioElement = getAudioElement();
  if (!audioElement || !audioElement.duration) return;
  
  const rect = progressBar.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent));
  
  const newTime = percent * audioElement.duration;
  audioElement.currentTime = newTime;
  
  const progress = document.getElementById('progress');
  if (progress) {
    progress.style.width = `${percent * 100}%`;
  }
  
  const currentTimeEl = document.getElementById('current-time');
  if (currentTimeEl) {
    currentTimeEl.textContent = formatDuration(newTime);
  }
}