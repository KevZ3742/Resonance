let isPlaying = false;

/**
 * Initialize music player controls
 */
export function initPlayer() {
  initPlayPauseButton();
  initNavigationButtons();
  initVolumeControl();
  initProgressBar();
}

/**
 * Initialize play/pause button
 */
function initPlayPauseButton() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');

  playPauseBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    
    if (isPlaying) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
    }
  });
}

/**
 * Initialize previous/next buttons
 */
function initNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.addEventListener('click', () => {
    console.log('Previous track');
    // TODO: Implement previous track functionality
  });

  nextBtn.addEventListener('click', () => {
    console.log('Next track');
    // TODO: Implement next track functionality
  });
}

/**
 * Initialize volume control
 */
function initVolumeControl() {
  const volumeSlider = document.getElementById('volume-slider');
  const volumeBtn = document.getElementById('volume-btn');
  const volumeContainer = document.querySelector('.volume-container');

  volumeSlider.addEventListener('input', (e) => {
    console.log('Volume:', e.target.value);
    // TODO: Implement actual volume control
  });

  // Show/hide volume slider on hover
  volumeContainer.addEventListener('mouseenter', () => {
    const sliderContainer = volumeContainer.querySelector('.volume-slider-container');
    sliderContainer.classList.remove('hidden');
  });

  volumeContainer.addEventListener('mouseleave', () => {
    const sliderContainer = volumeContainer.querySelector('.volume-slider-container');
    sliderContainer.classList.add('hidden');
  });
}

/**
 * Initialize progress bar
 */
function initProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  const progress = document.getElementById('progress');

  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width * 100;
    progress.style.width = `${percent}%`;
    // TODO: Implement actual seek functionality
  });
}

/**
 * Get current playing state
 * @returns {boolean} Whether music is currently playing
 */
export function getPlayingState() {
  return isPlaying;
}

/**
 * Set playing state
 * @param {boolean} playing - New playing state
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