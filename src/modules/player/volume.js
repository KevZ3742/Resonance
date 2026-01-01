import { getAudioElement } from './audio-element.js';

let previousVolume = 0.7;

/**
 * Initialize volume control
 */
export function initVolumeControl() {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeBtn = document.getElementById('volume-btn');
  const volumeContainer = document.querySelector('.volume-container');
  const sliderContainer = volumeContainer.querySelector('.volume-slider-container');
  const volumePercentage = document.getElementById('volume-percentage');
  const volumeIcon = document.getElementById('volume-icon');

  let hideTimeout;

  const updateVolumeDisplay = (value) => {
    volumePercentage.textContent = `${value}%`;
    volumeSlider.style.setProperty('--volume-fill', `${value}%`);
    
    if (value === 0) {
      volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else if (value < 50) {
      volumeIcon.innerHTML = '<path d="M7 9v6h4l5 5V4l-5 5H7z"/>';
    } else {
      volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    }
  };

  const audioElement = getAudioElement();

  volumeSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    if (audioElement) {
      audioElement.volume = value / 100;
      if (value > 0) {
        previousVolume = value / 100;
      }
    }
    updateVolumeDisplay(value);
  });

  volumeBtn.addEventListener('click', () => {
    if (audioElement.volume === 0) {
      audioElement.volume = previousVolume;
      volumeSlider.value = previousVolume * 100;
      updateVolumeDisplay(previousVolume * 100);
    } else {
      previousVolume = audioElement.volume;
      audioElement.volume = 0;
      volumeSlider.value = 0;
      updateVolumeDisplay(0);
    }
  });

  updateVolumeDisplay(volumeSlider.value);

  volumeContainer.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    sliderContainer.classList.remove('hidden');
  });

  volumeContainer.addEventListener('mouseleave', (e) => {
    const sliderRect = sliderContainer.getBoundingClientRect();
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    if (mouseY < sliderRect.bottom && mouseY > sliderRect.top - 20 &&
        mouseX > sliderRect.left && mouseX < sliderRect.right) {
      return;
    }
    
    hideTimeout = setTimeout(() => {
      sliderContainer.classList.add('hidden');
    }, 100);
  });
  
  sliderContainer.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    sliderContainer.classList.remove('hidden');
  });
  
  sliderContainer.addEventListener('mouseleave', () => {
    hideTimeout = setTimeout(() => {
      sliderContainer.classList.add('hidden');
    }, 100);
  });
}