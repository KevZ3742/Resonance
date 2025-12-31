import { formatDuration } from '../utils/formatters.js';

let isPlaying = false;
let currentSong = null;
let audioElement = null;
let previousVolume = 0.7;
let wasPlayingBeforeScrub = false;
let loopMode = 'none'; // 'none', 'one', 'all'
let playbackSpeed = 1.0;

// Audio context and nodes for equalizer
let audioContext = null;
let sourceNode = null;
let gainNode = null;
let eqBands = [];

// EQ frequencies (standard 10-band equalizer)
const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/**
 * Initialize music player controls
 */
export function initPlayer() {
  createAudioElement();
  initPlayPauseButton();
  initNavigationButtons();
  initVolumeControl();
  initProgressBar();
  initLoopControl();
  initPlaybackSpeedControl();
  initEqualizer();
}

/**
 * Create and configure the audio element
 */
function createAudioElement() {
  audioElement = new Audio();
  
  // Update progress bar as song plays
  audioElement.addEventListener('timeupdate', () => {
    if (!audioElement.duration) return;
    
    const percent = (audioElement.currentTime / audioElement.duration) * 100;
    const progress = document.getElementById('progress');
    const currentTimeEl = document.getElementById('current-time');
    
    if (progress) {
      progress.style.width = `${percent}%`;
    }
    
    if (currentTimeEl) {
      currentTimeEl.textContent = formatDuration(audioElement.currentTime);
    }
  });
  
  // Update total time when metadata loads
  audioElement.addEventListener('loadedmetadata', () => {
    const totalTimeEl = document.getElementById('total-time');
    if (totalTimeEl && audioElement.duration) {
      totalTimeEl.textContent = formatDuration(audioElement.duration);
    }
  });
  
  // Handle when song ends
  audioElement.addEventListener('ended', async () => {
    if (loopMode === 'one') {
      // Loop current song
      audioElement.currentTime = 0;
      audioElement.play();
    } else if (loopMode === 'all' || loopMode === 'none') {
      // Let queue manager handle it
      setPlayingState(false);
      if (window.queueManager) {
        await window.queueManager.playNext();
      }
    }
  });
  
  // Set default volume and playback rate
  audioElement.volume = 0.7;
  audioElement.playbackRate = 1.0;
  previousVolume = 0.7;
  
  // Initialize audio context for equalizer
  initAudioContext();
}

/**
 * Initialize audio context and equalizer nodes
 */
function initAudioContext() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create gain node for master volume
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    // Create EQ bands (biquad filters)
    let previousNode = gainNode;
    
    for (let i = EQ_FREQUENCIES.length - 1; i >= 0; i--) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = EQ_FREQUENCIES[i];
      filter.Q.value = 1.0;
      filter.gain.value = 0;
      
      filter.connect(previousNode);
      eqBands.unshift(filter);
      previousNode = filter;
    }
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
  }
}

/**
 * Connect audio element to equalizer
 */
function connectAudioToEqualizer() {
  if (!audioContext || !audioElement) return;
  
  // Resume audio context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Only create source once per audio element
  if (!sourceNode) {
    try {
      sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(eqBands[0]);
    } catch (error) {
      console.error('Failed to connect audio to equalizer:', error);
    }
  }
}

/**
 * Initialize play/pause button
 */
function initPlayPauseButton() {
  const playPauseBtn = document.getElementById('play-pause-btn');

  playPauseBtn.addEventListener('click', () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    if (!currentSong || !audioElement.src) {
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
 * Initialize previous/next buttons
 */
function initNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.addEventListener('click', async () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    if (window.queueManager) {
      await window.queueManager.playPrevious();
    }
  });

  nextBtn.addEventListener('click', async () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    if (window.queueManager) {
      await window.queueManager.playNext();
    }
  });
}

/**
 * Initialize volume control
 */
function initVolumeControl() {
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

/**
 * Initialize progress bar
 */
function initProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  const progress = document.getElementById('progress');
  let isDragging = false;

  progressBar.addEventListener('click', (e) => {
    if (!audioElement || !audioElement.duration) return;
    if (!window.queueManager || window.queueManager.getQueue().length === 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioElement.duration;
    
    audioElement.currentTime = newTime;
    progress.style.width = `${percent * 100}%`;
  });
  
  progressBar.addEventListener('mousedown', (e) => {
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
      
      if (wasPlayingBeforeScrub) {
        audioElement.play();
        wasPlayingBeforeScrub = false;
      }
    }
  });
}

/**
 * Initialize loop control
 */
function initLoopControl() {
  const loopBtn = document.getElementById('loop-btn');
  if (!loopBtn) return;
  
  const updateLoopIcon = () => {
    const icon = loopBtn.querySelector('svg');
    
    if (loopMode === 'none') {
      // No loop - gray icon
      icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
      loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
      loopBtn.classList.add('text-neutral-400');
      loopBtn.title = 'Loop Mode: Off';
    } else if (loopMode === 'all') {
      // Loop all - blue icon
      icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
      loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
      loopBtn.classList.add('text-blue-400');
      loopBtn.title = 'Loop Mode: All';
    } else if (loopMode === 'one') {
      // Loop one - blue icon with "1" badge
      icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><circle cx="12" cy="12" r="4" fill="currentColor"/><text x="12" y="12" text-anchor="middle" dominant-baseline="central" fill="var(--background)" font-size="6" font-weight="bold">1</text>';
      loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
      loopBtn.classList.add('text-blue-400');
      loopBtn.title = 'Loop Mode: One';
    }
  };
  
  loopBtn.addEventListener('click', () => {
    if (loopMode === 'none') {
      loopMode = 'all';
    } else if (loopMode === 'all') {
      loopMode = 'one';
    } else {
      loopMode = 'none';
    }
    updateLoopIcon();
  });
  
  updateLoopIcon();
}

/**
 * Initialize playback speed control
 */
function initPlaybackSpeedControl() {
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
 * Initialize equalizer UI
 */
function initEqualizer() {
  const eqBtn = document.getElementById('eq-btn');
  const eqPanel = document.getElementById('eq-panel');
  if (!eqBtn || !eqPanel) return;
  
  let isEqOpen = false;
  
  eqBtn.addEventListener('click', () => {
    isEqOpen = !isEqOpen;
    eqPanel.classList.toggle('hidden', !isEqOpen);
  });
  
  // Close EQ panel when clicking outside
  document.addEventListener('click', (e) => {
    if (isEqOpen && !eqBtn.contains(e.target) && !eqPanel.contains(e.target)) {
      isEqOpen = false;
      eqPanel.classList.add('hidden');
    }
  });
  
  // Create EQ sliders
  const eqSliders = document.getElementById('eq-sliders');
  if (eqSliders) {
    EQ_FREQUENCIES.forEach((freq, index) => {
      const slider = document.createElement('div');
      slider.className = 'flex flex-col items-center gap-2';
      slider.innerHTML = `
        <input 
          type="range" 
          min="-12" 
          max="12" 
          value="0" 
          step="1"
          class="eq-slider"
          data-band="${index}"
          orient="vertical"
        >
        <span class="text-xs text-neutral-400">${freq < 1000 ? freq : (freq/1000).toFixed(1) + 'k'}</span>
      `;
      eqSliders.appendChild(slider);
      
      const input = slider.querySelector('input');
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (eqBands[index]) {
          eqBands[index].gain.value = value;
        }
      });
    });
  }
  
  // Reset EQ button
  const resetEqBtn = document.getElementById('reset-eq-btn');
  if (resetEqBtn) {
    resetEqBtn.addEventListener('click', () => {
      document.querySelectorAll('.eq-slider').forEach((slider, index) => {
        slider.value = 0;
        if (eqBands[index]) {
          eqBands[index].gain.value = 0;
        }
      });
    });
  }
}

/**
 * Update progress from mouse position
 */
function updateProgressFromMouse(e, progressBar) {
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

/**
 * Play a song by filename
 */
export async function playSong(songFilename, metadata = {}) {
  try {
    const arrayBuffer = await window.electronAPI.readSongFile(songFilename);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    
    audioElement.src = blobUrl;
    audioElement.load();
    
    // Connect to equalizer on first play
    connectAudioToEqualizer();
    
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    
    if (songTitle) {
      songTitle.textContent = metadata.title || 'Unknown Title';
    }
    
    if (songArtist) {
      songArtist.textContent = metadata.artist || 'Unknown Artist';
    }
    
    currentSong = songFilename;
    
    try {
      await audioElement.play();
      setPlayingState(true);
    } catch (playError) {
      console.error('Error during playback:', playError);
      setPlayingState(false);
    }
  } catch (error) {
    console.error('Failed to play song:', error);
    alert(`Failed to play song: ${error.message}`);
  }
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

/**
 * Clear the player
 */
export function clearPlayer() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    audioElement.src = '';
  }
  
  currentSong = null;
  setPlayingState(false);
  
  const songTitle = document.getElementById('song-title');
  const songArtist = document.getElementById('song-artist');
  const progress = document.getElementById('progress');
  const currentTimeEl = document.getElementById('current-time');
  const totalTimeEl = document.getElementById('total-time');
  
  if (songTitle) songTitle.textContent = 'No Song Playing';
  if (songArtist) songArtist.textContent = 'Unknown Artist';
  if (progress) progress.style.width = '0%';
  if (currentTimeEl) currentTimeEl.textContent = '0:00';
  if (totalTimeEl) totalTimeEl.textContent = '0:00';
}