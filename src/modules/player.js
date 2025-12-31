let isPlaying = false;
let currentSong = null;
let audioElement = null;
let previousVolume = 0.7; // Store volume before mute
let wasPlayingBeforeScrub = false; // Track if music was playing before scrubbing

/**
 * Initialize music player controls
 */
export function initPlayer() {
  createAudioElement();
  initPlayPauseButton();
  initNavigationButtons();
  initVolumeControl();
  initProgressBar();
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
      currentTimeEl.textContent = formatTime(audioElement.currentTime);
    }
  });
  
  // Update total time when metadata loads
  audioElement.addEventListener('loadedmetadata', () => {
    const totalTimeEl = document.getElementById('total-time');
    if (totalTimeEl && audioElement.duration) {
      totalTimeEl.textContent = formatTime(audioElement.duration);
    }
  });
  
  // Handle when song ends
  audioElement.addEventListener('ended', async () => {
    setPlayingState(false);
    // Auto-play next song in queue
    if (window.queueManager) {
      await window.queueManager.playNext();
    }
  });
  
  // Set default volume
  audioElement.volume = 0.7;
  previousVolume = 0.7;
}

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Initialize play/pause button
 */
function initPlayPauseButton() {
  const playPauseBtn = document.getElementById('play-pause-btn');

  playPauseBtn.addEventListener('click', () => {
    // Check if queue has songs
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      console.log('Queue is empty - cannot play');
      return;
    }
    
    // Check if there's a current song loaded
    if (!currentSong || !audioElement.src) {
      // Try to play the first song in queue
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
 * Initialize previous/next buttons with queue integration
 */
function initNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.addEventListener('click', async () => {
    // Check if queue has songs
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      console.log('Queue is empty - cannot go to previous');
      return;
    }
    
    // Try to play previous in queue
    if (window.queueManager) {
      await window.queueManager.playPrevious();
    }
  });

  nextBtn.addEventListener('click', async () => {
    // Check if queue has songs
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      console.log('Queue is empty - cannot go to next');
      return;
    }
    
    // Try to play next in queue
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

  // Update volume percentage display and slider fill
  const updateVolumeDisplay = (value) => {
    volumePercentage.textContent = `${value}%`;
    volumeSlider.style.setProperty('--volume-fill', `${value}%`);
    
    // Update icon based on volume level
    if (value === 0) {
      volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
    } else if (value < 50) {
      volumeIcon.innerHTML = '<path d="M7 9v6h4l5 5V4l-5 5H7z"/>';
    } else {
      volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>';
    }
  };

  // Volume slider input handler
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

  // Volume button click handler - toggle mute
  volumeBtn.addEventListener('click', () => {
    if (audioElement.volume === 0) {
      // Unmute - restore previous volume
      audioElement.volume = previousVolume;
      volumeSlider.value = previousVolume * 100;
      updateVolumeDisplay(previousVolume * 100);
    } else {
      // Mute - save current volume and set to 0
      previousVolume = audioElement.volume;
      audioElement.volume = 0;
      volumeSlider.value = 0;
      updateVolumeDisplay(0);
    }
  });

  // Initialize display
  updateVolumeDisplay(volumeSlider.value);

  // Show slider when hovering over the volume container
  volumeContainer.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    sliderContainer.classList.remove('hidden');
  });

  // Hide slider with a small delay when mouse leaves
  volumeContainer.addEventListener('mouseleave', (e) => {
    // Check if mouse is moving to the slider
    const sliderRect = sliderContainer.getBoundingClientRect();
    const mouseY = e.clientY;
    const mouseX = e.clientX;
    
    // If mouse is near the slider area, don't hide immediately
    if (mouseY < sliderRect.bottom && mouseY > sliderRect.top - 20 &&
        mouseX > sliderRect.left && mouseX < sliderRect.right) {
      return;
    }
    
    hideTimeout = setTimeout(() => {
      sliderContainer.classList.add('hidden');
    }, 100);
  });
  
  // Keep slider visible when hovering over it
  sliderContainer.addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
    sliderContainer.classList.remove('hidden');
  });
  
  // Hide slider when leaving the slider itself
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

  // Handle clicking on progress bar
  progressBar.addEventListener('click', (e) => {
    if (!audioElement || !audioElement.duration) return;
    
    // Check if queue has songs
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioElement.duration;
    
    audioElement.currentTime = newTime;
    progress.style.width = `${percent * 100}%`;
  });
  
  // Handle dragging progress bar
  progressBar.addEventListener('mousedown', (e) => {
    if (!audioElement || !audioElement.duration) return;
    
    // Check if queue has songs
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    isDragging = true;
    progressBar.classList.add('dragging');
    
    // Pause if currently playing
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
      
      // Resume playback if it was playing before scrubbing
      if (wasPlayingBeforeScrub) {
        audioElement.play();
        wasPlayingBeforeScrub = false;
      }
    }
  });
}

/**
 * Update progress bar from mouse position
 * @param {MouseEvent} e - Mouse event
 * @param {HTMLElement} progressBar - Progress bar element
 */
function updateProgressFromMouse(e, progressBar) {
  if (!audioElement || !audioElement.duration) return;
  
  const rect = progressBar.getBoundingClientRect();
  let percent = (e.clientX - rect.left) / rect.width;
  percent = Math.max(0, Math.min(1, percent)); // Clamp between 0 and 1
  
  const newTime = percent * audioElement.duration;
  audioElement.currentTime = newTime;
  
  const progress = document.getElementById('progress');
  if (progress) {
    progress.style.width = `${percent * 100}%`;
  }
  
  // Update current time display
  const currentTimeEl = document.getElementById('current-time');
  if (currentTimeEl) {
    currentTimeEl.textContent = formatTime(newTime);
  }
}

/**
 * Play a song by filename
 * @param {string} songFilename - Name of the song file
 * @param {Object} metadata - Song metadata (title, artist, etc.)
 */
export async function playSong(songFilename, metadata = {}) {
  try {
    console.log('Attempting to play song:', songFilename);
    
    // Read the audio file as a buffer
    const arrayBuffer = await window.electronAPI.readSongFile(songFilename);
    console.log('Got audio buffer, size:', arrayBuffer.byteLength);
    
    // Create a blob from the buffer
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('Created blob URL for playback');
    
    // Revoke previous blob URL if exists to free memory
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    
    // Load and play the song
    audioElement.src = blobUrl;
    audioElement.load();
    
    // Update UI with song info
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    
    if (songTitle) {
      songTitle.textContent = metadata.title || 'Unknown Title';
    }
    
    if (songArtist) {
      songArtist.textContent = metadata.artist || 'Unknown Artist';
    }
    
    // Store current song
    currentSong = songFilename;
    
    // Auto-play the song
    try {
      await audioElement.play();
      setPlayingState(true);
      console.log('Successfully playing:', songFilename);
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

/**
 * Clear the player (stop playback and reset UI)
 */
export function clearPlayer() {
  // Stop and clear audio
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    audioElement.src = '';
  }
  
  // Reset state
  currentSong = null;
  setPlayingState(false);
  
  // Reset UI
  const songTitle = document.getElementById('song-title');
  const songArtist = document.getElementById('song-artist');
  const progress = document.getElementById('progress');
  const currentTimeEl = document.getElementById('current-time');
  const totalTimeEl = document.getElementById('total-time');
  
  if (songTitle) {
    songTitle.textContent = 'No Song Playing';
  }
  
  if (songArtist) {
    songArtist.textContent = 'Unknown Artist';
  }
  
  if (progress) {
    progress.style.width = '0%';
  }
  
  if (currentTimeEl) {
    currentTimeEl.textContent = '0:00';
  }
  
  if (totalTimeEl) {
    totalTimeEl.textContent = '0:00';
  }
}