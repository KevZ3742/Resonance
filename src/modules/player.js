import { formatDuration } from '../utils/formatters.js';

let isPlaying = false;
let currentSong = null;
let audioElement = null;
let previousVolume = 0.7;
let wasPlayingBeforeScrub = false;
let loopMode = 'none'; // 'none', 'one', 'all'
let loopOneCount = 0; // Track how many times current song has looped in 'one' mode
let playbackSpeed = 1.0;

// Audio context and nodes for volume normalization
let audioContext = null;
let sourceNode = null;
let analyserNode = null;
let gainNode = null;
let volumeNormalizationEnabled = false;
let songVolumeCache = {}; // Cache analyzed volumes by filename
let previousSongVolume = null; // Track the previous song's volume
let isAnalyzing = false;
let preAnalysisAudio = null; // Audio element for pre-analysis

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
  initVolumeNormalization();
  loadVolumeNormalizationState();
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
      // Loop once: play one more time then continue to next
      if (loopOneCount === 0) {
        loopOneCount = 1;
        audioElement.currentTime = 0;
        audioElement.play();
      } else {
        // Already looped once, reset counter, turn off loop mode, and play next
        loopOneCount = 0;
        loopMode = 'none';
        updateLoopButtonDisplay();
        setPlayingState(false);
        if (window.queueManager) {
          await window.queueManager.playNext();
        }
      }
    } else if (loopMode === 'all') {
      // Infinite loop: keep looping the current song
      audioElement.currentTime = 0;
      audioElement.play();
    } else {
      // No loop: continue to next song in queue
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
  
  // Initialize audio context for volume normalization
  initAudioContext();
}

/**
 * Initialize audio context and nodes
 */
function initAudioContext() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create analyser node for volume analysis
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;
    
    // Create gain node for volume adjustment
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect nodes: analyser -> gain -> destination
    analyserNode.connect(gainNode);
    gainNode.connect(audioContext.destination);
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
  }
}

/**
 * Connect audio element to audio graph
 */
function connectAudioToGraph() {
  if (!audioContext || !audioElement) return;
  
  // Resume audio context if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  
  // Only create source once per audio element
  if (!sourceNode) {
    try {
      sourceNode = audioContext.createMediaElementSource(audioElement);
      sourceNode.connect(analyserNode);
    } catch (error) {
      console.error('Failed to connect audio to graph:', error);
    }
  }
}

/**
 * Analyze audio volume (RMS)
 */
function analyzeAudioVolume() {
  if (!analyserNode) return 0;
  
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Float32Array(bufferLength);
  analyserNode.getFloatTimeDomainData(dataArray);
  
  // Calculate RMS (Root Mean Square)
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / bufferLength);
  
  // Convert to dB
  const db = 20 * Math.log10(rms);
  return db;
}

/**
 * Analyze song volume over time
 */
async function analyzeSongVolume(songFilename) {
  if (songVolumeCache[songFilename]) {
    return songVolumeCache[songFilename];
  }
  
  try {
    // Create a temporary audio element for analysis
    const tempAudio = new Audio();
    const arrayBuffer = await window.electronAPI.readSongFile(songFilename);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    tempAudio.src = blobUrl;
    await new Promise((resolve, reject) => {
      tempAudio.addEventListener('loadedmetadata', resolve, { once: true });
      tempAudio.addEventListener('error', reject, { once: true });
    });
    
    if (!tempAudio.duration) {
      URL.revokeObjectURL(blobUrl);
      return 0;
    }
    
    // Create temporary audio context for analysis
    const tempContext = new (window.AudioContext || window.webkitAudioContext)();
    const tempAnalyser = tempContext.createAnalyser();
    tempAnalyser.fftSize = 2048;
    tempAnalyser.smoothingTimeConstant = 0.8;
    
    const tempSource = tempContext.createMediaElementSource(tempAudio);
    const tempGain = tempContext.createGain();
    tempGain.gain.value = 0; // Mute during analysis
    
    tempSource.connect(tempAnalyser);
    tempAnalyser.connect(tempGain);
    tempGain.connect(tempContext.destination);
    
    const samples = [];
    const duration = tempAudio.duration;
    
    // Adaptive sampling based on song length
    // Short songs (<2min): 20 samples
    // Medium songs (2-5min): 30 samples
    // Long songs (>5min): 40 samples
    // This balances accuracy with performance
    let samplePoints;
    if (duration < 120) {
      samplePoints = 20;
    } else if (duration < 300) {
      samplePoints = 30;
    } else {
      samplePoints = 40;
    }
    
    console.log(`Analyzing ${songFilename}: ${duration.toFixed(1)}s, ${samplePoints} samples`);
    
    for (let i = 0; i < samplePoints; i++) {
      const time = (duration / samplePoints) * i;
      tempAudio.currentTime = time;
      
      await new Promise(resolve => {
        tempAudio.addEventListener('seeked', resolve, { once: true });
      });
      
      // Play briefly to get analysis (reduced from 200ms to 150ms for speed)
      tempAudio.play();
      await new Promise(resolve => setTimeout(resolve, 150));
      tempAudio.pause();
      
      const bufferLength = tempAnalyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      tempAnalyser.getFloatTimeDomainData(dataArray);
      
      let sum = 0;
      for (let j = 0; j < bufferLength; j++) {
        sum += dataArray[j] * dataArray[j];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const db = 20 * Math.log10(rms);
      
      if (isFinite(db) && db > -100) {
        samples.push(db);
      }
    }
    
    // Cleanup
    tempAudio.pause();
    URL.revokeObjectURL(blobUrl);
    tempContext.close();
    
    // Calculate average volume
    if (samples.length === 0) return 0;
    
    // Use weighted average - give more weight to middle samples (chorus/main sections)
    // First and last 20% get weight 0.8, middle 60% gets weight 1.2
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const position = i / samples.length;
      let weight = 1.0;
      
      // Reduce weight for intro/outro sections
      if (position < 0.2 || position > 0.8) {
        weight = 0.8;
      } else {
        weight = 1.2;
      }
      
      weightedSum += samples[i] * weight;
      totalWeight += weight;
    }
    
    const avgVolume = weightedSum / totalWeight;
    songVolumeCache[songFilename] = avgVolume;
    
    // Save to localStorage for persistence
    saveSongVolumeCache();
    
    console.log(`Analysis complete: ${avgVolume.toFixed(2)}dB from ${samples.length} samples`);
    
    return avgVolume;
  } catch (error) {
    console.error('Failed to analyze song volume:', error);
    return 0;
  }
}

/**
 * Apply volume normalization relative to previous song
 */
async function applyVolumeNormalization(songFilename) {
  if (!volumeNormalizationEnabled || !gainNode) {
    return;
  }
  
  try {
    const currentSongVolume = await analyzeSongVolume(songFilename);
    
    if (isFinite(currentSongVolume)) {
      let gainAdjustment = 1.0;
      
      if (previousSongVolume !== null && isFinite(previousSongVolume)) {
        // Normalize relative to previous song
        const volumeDiff = previousSongVolume - currentSongVolume;
        gainAdjustment = Math.pow(10, volumeDiff / 20);
        
        // Clamp gain to reasonable range (0.1x to 3x)
        gainAdjustment = Math.max(0.1, Math.min(3.0, gainAdjustment));
        
        console.log(`Volume normalization: prev=${previousSongVolume.toFixed(2)}dB, curr=${currentSongVolume.toFixed(2)}dB, gain=${gainAdjustment.toFixed(2)}x`);
      } else {
        // First song - play at normal volume
        console.log(`First song - no normalization applied`);
      }
      
      // Smooth transition to new gain
      const currentTime = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(gainAdjustment, currentTime + 0.5);
      
      // Store this song's volume for next comparison
      previousSongVolume = currentSongVolume;
    }
  } catch (error) {
    console.error('Failed to apply volume normalization:', error);
  }
}

/**
 * Save song volume cache to localStorage
 */
function saveSongVolumeCache() {
  try {
    localStorage.setItem('songVolumeCache', JSON.stringify(songVolumeCache));
  } catch (error) {
    console.error('Failed to save volume cache:', error);
  }
}

/**
 * Load song volume cache from localStorage
 */
function loadSongVolumeCache() {
  try {
    const cached = localStorage.getItem('songVolumeCache');
    if (cached) {
      songVolumeCache = JSON.parse(cached);
    }
  } catch (error) {
    console.error('Failed to load volume cache:', error);
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
    
    // Reset loop one counter when manually changing songs
    loopOneCount = 0;
    
    if (window.queueManager) {
      await window.queueManager.playPrevious();
    }
  });

  nextBtn.addEventListener('click', async () => {
    if (!window.queueManager || window.queueManager.getQueue().length === 0) {
      return;
    }
    
    // Reset loop one counter when manually changing songs
    loopOneCount = 0;
    
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
 * Update loop button display
 */
function updateLoopButtonDisplay() {
  const loopBtn = document.getElementById('loop-btn');
  if (!loopBtn) return;
  
  const icon = loopBtn.querySelector('svg');
  
  if (loopMode === 'none') {
    // No loop - gray icon
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-neutral-400');
    loopBtn.title = 'Loop Mode: Off';
  } else if (loopMode === 'all') {
    // Loop all (infinite) - blue icon
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-blue-400');
    loopBtn.title = 'Loop Mode: Infinite (Current Song)';
  } else if (loopMode === 'one') {
    // Loop one - blue icon with "1" badge
    icon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><circle cx="12" cy="12" r="4" fill="currentColor"/><text x="12" y="12" text-anchor="middle" dominant-baseline="central" fill="var(--background)" font-size="6" font-weight="bold">1</text>';
    loopBtn.classList.remove('text-neutral-400', 'text-blue-400');
    loopBtn.classList.add('text-blue-400');
    loopBtn.title = 'Loop Mode: Once (Play Twice)';
  }
}

/**
 * Initialize loop control
 */
function initLoopControl() {
  const loopBtn = document.getElementById('loop-btn');
  if (!loopBtn) return;
  
  loopBtn.addEventListener('click', () => {
    // Cycle through modes: none -> all -> one -> none
    if (loopMode === 'none') {
      loopMode = 'all';
    } else if (loopMode === 'all') {
      loopMode = 'one';
      loopOneCount = 0; // Reset counter when entering 'one' mode
    } else {
      loopMode = 'none';
      loopOneCount = 0; // Reset counter when exiting loop modes
    }
    updateLoopButtonDisplay();
  });
  
  updateLoopButtonDisplay();
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
 * Initialize volume normalization UI
 */
function initVolumeNormalization() {
  const eqBtn = document.getElementById('eq-btn');
  if (!eqBtn) return;
  
  // Change button title
  eqBtn.title = 'Volume Normalization (Click to toggle)';
  
  // Update button color based on state
  const updateButtonColor = () => {
    if (volumeNormalizationEnabled) {
      eqBtn.classList.remove('text-neutral-400');
      eqBtn.classList.add('text-blue-400');
      eqBtn.title = 'Volume Normalization: ON (Right-click for options)';
    } else {
      eqBtn.classList.remove('text-blue-400');
      eqBtn.classList.add('text-neutral-400');
      eqBtn.title = 'Volume Normalization: OFF (Click to enable)';
    }
  };
  
  // Set initial color
  updateButtonColor();
  
  // Toggle on click
  eqBtn.addEventListener('click', (e) => {
    e.preventDefault();
    volumeNormalizationEnabled = !volumeNormalizationEnabled;
    saveVolumeNormalizationState();
    updateButtonColor();
    
    if (volumeNormalizationEnabled && currentSong) {
      // Reset previous song volume to treat current as baseline
      previousSongVolume = null;
      // Apply normalization to current song
      applyVolumeNormalization(currentSong);
      
      // Show brief notification
      showVolumeNormNotification('Volume normalization enabled');
    } else if (!volumeNormalizationEnabled && gainNode) {
      // Reset gain to 1.0 and clear previous volume
      previousSongVolume = null;
      const currentTime = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, currentTime + 0.5);
      
      showVolumeNormNotification('Volume normalization disabled');
    }
  });
  
  // Right-click for options (advanced features)
  eqBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showVolumeNormContextMenu(e.clientX, e.clientY);
  });
  
  // Load volume cache
  loadSongVolumeCache();
}

/**
 * Show volume normalization context menu
 */
function showVolumeNormContextMenu(x, y) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('volume-norm-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  const menu = document.createElement('div');
  menu.id = 'volume-norm-context-menu';
  menu.className = 'fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[200px]';
  
  const cacheCount = Object.keys(songVolumeCache).length;
  
  menu.innerHTML = `
    <div class="px-4 py-2 text-xs text-neutral-500 border-b border-neutral-700">
      Volume Normalization Options
    </div>
    <button class="volume-norm-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition text-sm" data-action="toggle">
      ${volumeNormalizationEnabled ? '✓ Enabled' : '○ Disabled'}
    </button>
    <div class="border-t border-neutral-700 my-1"></div>
    <button class="volume-norm-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition text-sm" data-action="clear-cache">
      Clear cache (${cacheCount} song${cacheCount !== 1 ? 's' : ''})
    </button>
    <button class="volume-norm-menu-item w-full text-left px-4 py-2 hover:bg-neutral-700 transition text-sm" data-action="info">
      How it works
    </button>
  `;
  
  document.body.appendChild(menu);
  
  // Position the menu
  const menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x;
  let top = y;
  
  if (x + menuRect.width > viewportWidth) {
    left = x - menuRect.width;
  }
  
  if (y + menuRect.height > viewportHeight) {
    top = y - menuRect.height;
  }
  
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  
  // Handle menu actions
  menu.addEventListener('click', (e) => {
    const action = e.target.closest('.volume-norm-menu-item')?.getAttribute('data-action');
    if (!action) return;
    
    menu.remove();
    
    if (action === 'toggle') {
      document.getElementById('eq-btn').click();
    } else if (action === 'clear-cache') {
      const confirmed = confirm(`Clear volume cache for ${cacheCount} song${cacheCount !== 1 ? 's' : ''}?\n\nSongs will be re-analyzed on next playback.`);
      if (confirmed) {
        songVolumeCache = {};
        saveSongVolumeCache();
        showVolumeNormNotification('Volume cache cleared');
      }
    } else if (action === 'info') {
      showVolumeNormInfo();
    }
  });
  
  // Close menu when clicking outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 0);
}

/**
 * Show volume normalization info dialog
 */
function showVolumeNormInfo() {
  const message = `Volume Normalization

How it works:
• First song plays at normal volume
• Each song after adjusts to match the previous song's volume
• Songs are analyzed in background before playing
• Analysis is cached (only done once per song)

This prevents loud songs from blasting you after quiet ones, and vice versa.

Current status: ${volumeNormalizationEnabled ? 'ENABLED' : 'DISABLED'}
Cached songs: ${Object.keys(songVolumeCache).length}`;
  
  alert(message);
}

/**
 * Show brief notification for volume normalization
 */
function showVolumeNormNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 shadow-lg z-50 transition-opacity text-sm';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 1500);
}

/**
 * Save volume normalization state
 */
function saveVolumeNormalizationState() {
  try {
    localStorage.setItem('volumeNormalizationEnabled', JSON.stringify(volumeNormalizationEnabled));
  } catch (error) {
    console.error('Failed to save volume normalization state:', error);
  }
}

/**
 * Load volume normalization state
 */
function loadVolumeNormalizationState() {
  try {
    const saved = localStorage.getItem('volumeNormalizationEnabled');
    if (saved !== null) {
      volumeNormalizationEnabled = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load volume normalization state:', error);
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
 * Pre-analyze the next song in queue (called before transition)
 */
export async function preAnalyzeNextSong() {
  if (!volumeNormalizationEnabled || !window.queueManager) {
    return;
  }
  
  const queue = window.queueManager.getQueue();
  const currentIndex = window.queueManager.getCurrentIndex();
  
  if (currentIndex >= 0 && currentIndex < queue.length - 1) {
    const nextSong = queue[currentIndex + 1];
    if (nextSong && !songVolumeCache[nextSong.filename]) {
      console.log(`Pre-analyzing next song: ${nextSong.filename}`);
      // Analyze in background without blocking
      analyzeSongVolume(nextSong.filename).catch(err => {
        console.error('Pre-analysis failed:', err);
      });
    }
  }
}

/**
 * Play a song by filename
 */
export async function playSong(songFilename, metadata = {}) {
  try {
    // Reset loop one counter when playing a new song
    loopOneCount = 0;
    
    const arrayBuffer = await window.electronAPI.readSongFile(songFilename);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    
    audioElement.src = blobUrl;
    audioElement.load();
    
    // Connect to audio graph on first play
    connectAudioToGraph();
    
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    
    if (songTitle) {
      songTitle.textContent = metadata.title || 'Unknown Title';
    }
    
    if (songArtist) {
      songArtist.textContent = metadata.artist || 'Unknown Artist';
    }
    
    currentSong = songFilename;
    
    // Apply volume normalization BEFORE playback starts
    if (volumeNormalizationEnabled) {
      await applyVolumeNormalization(songFilename);
    }
    
    try {
      await audioElement.play();
      setPlayingState(true);
      
      // Pre-analyze next song in background
      preAnalyzeNextSong();
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
  loopOneCount = 0; // Reset loop counter when clearing
  previousSongVolume = null; // Reset volume normalization baseline
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