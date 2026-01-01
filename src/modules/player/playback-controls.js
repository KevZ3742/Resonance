import { getAudioElement } from './audio-element.js';

let isPlaying = false;

/**
 * Initialize play/pause button
 */
export function initPlayPauseButton() {
  const playPauseBtn = document.getElementById('play-pause-btn');

  playPauseBtn.addEventListener('click', () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    const audioElement = getAudioElement();
    if (!audioElement || !audioElement.src) {
      if (window.queueManager.getCurrentIndex() === -1 && window.queueManager.getQueue().length > 0) {
        const firstSong = window.queueManager.getQueue()[0];
        window.queueManager.playNow(firstSong.filename, firstSong.metadata);
      }
      return;
    }
    
    if (isPlaying) {
      audioElement.pause();
      setPlayingState(false);
    } else {
      audioElement.play();
      setPlayingState(true);
    }
  });
}

/**
 * Get current playing state
 */
export function getPlayingState() {
  return isPlaying;
}

/**
 * Set playing state
 */
export function setPlayingState(playing) {
  isPlaying = playing;
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
}