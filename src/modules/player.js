let isPlaying = false;
let currentSong = null;
let audioElement = null;

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
  audioElement.addEventListener('ended', () => {
    setPlayingState(false);
    // TODO: Auto-play next song in queue
  });
  
  // Set default volume
  audioElement.volume = 0.7;
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
    if (!currentSong || !audioElement.src) {
      console.log('No song loaded');
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
  const sliderContainer = volumeContainer.querySelector('.volume-slider-container');

  volumeSlider.addEventListener('input', (e) => {
    if (audioElement) {
      audioElement.volume = e.target.value / 100;
    }
  });

  // Show slider when hovering over the entire volume container
  volumeContainer.addEventListener('mouseenter', () => {
    sliderContainer.classList.remove('hidden');
  });

  // Hide slider only when mouse leaves the entire volume container
  volumeContainer.addEventListener('mouseleave', () => {
    sliderContainer.classList.add('hidden');
  });
  
  // Also keep slider visible when hovering over the slider itself
  sliderContainer.addEventListener('mouseenter', () => {
    sliderContainer.classList.remove('hidden');
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
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * audioElement.duration;
    
    audioElement.currentTime = newTime;
    progress.style.width = `${percent * 100}%`;
  });
  
  // Handle dragging progress bar
  progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateProgressFromMouse(e, progressBar);
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      updateProgressFromMouse(e, progressBar);
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
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