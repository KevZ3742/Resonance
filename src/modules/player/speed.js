import { getAudioElement } from './audio-element.js';

let playbackSpeed = 1.0;

/**
 * Initialize playback speed control
 */
export function initPlaybackSpeedControl() {
  const speedBtn = document.getElementById('speed-btn');
  const speedPanel = document.getElementById('speed-panel');
  if (!speedBtn || !speedPanel) return;
  
  let isSpeedOpen = false;
  
  // Toggle speed panel
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isSpeedOpen = !isSpeedOpen;
    speedPanel.classList.toggle('hidden', !isSpeedOpen);
  });
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (isSpeedOpen && !speedBtn.contains(e.target) && !speedPanel.contains(e.target)) {
      isSpeedOpen = false;
      speedPanel.classList.add('hidden');
    }
  });
  
  // Handle speed option clicks
  const speedOptions = speedPanel.querySelectorAll('.speed-option');
  speedOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const speed = parseFloat(option.getAttribute('data-speed'));
      playbackSpeed = speed;
      
      // Update audio element
      const audioElement = getAudioElement();
      if (audioElement) {
        audioElement.playbackRate = speed;
      }
      
      // Update button text
      speedBtn.textContent = `${speed}x`;
      
      // Update active state
      speedOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Close panel
      isSpeedOpen = false;
      speedPanel.classList.add('hidden');
    });
  });
}

/**
 * Get current playback speed
 */
export function getPlaybackSpeed() {
  return playbackSpeed;
}