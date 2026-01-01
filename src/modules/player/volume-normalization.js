import { getAudioContext, getAnalyserNode, getGainNode } from './audio-element.js';

let volumeNormalizationEnabled = false;
let songVolumeCache = {};
let previousSongVolume = null;

/**
 * Analyze audio volume (RMS)
 */
function analyzeAudioVolume() {
  const analyserNode = getAnalyserNode();
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
    
    const tempContext = new (window.AudioContext || window.webkitAudioContext)();
    const tempAnalyser = tempContext.createAnalyser();
    tempAnalyser.fftSize = 2048;
    tempAnalyser.smoothingTimeConstant = 0.8;
    
    const tempSource = tempContext.createMediaElementSource(tempAudio);
    const tempGain = tempContext.createGain();
    tempGain.gain.value = 0;
    
    tempSource.connect(tempAnalyser);
    tempAnalyser.connect(tempGain);
    tempGain.connect(tempContext.destination);
    
    const samples = [];
    const duration = tempAudio.duration;
    
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
    
    tempAudio.pause();
    URL.revokeObjectURL(blobUrl);
    tempContext.close();
    
    if (samples.length === 0) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < samples.length; i++) {
      const position = i / samples.length;
      let weight = 1.0;
      
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
export async function applyVolumeNormalization(songFilename) {
  const gainNode = getGainNode();
  const audioContext = getAudioContext();
  
  if (!volumeNormalizationEnabled || !gainNode) {
    return;
  }
  
  try {
    const currentSongVolume = await analyzeSongVolume(songFilename);
    
    if (isFinite(currentSongVolume)) {
      let gainAdjustment = 1.0;
      
      if (previousSongVolume !== null && isFinite(previousSongVolume)) {
        const volumeDiff = previousSongVolume - currentSongVolume;
        gainAdjustment = Math.pow(10, volumeDiff / 20);
        gainAdjustment = Math.max(0.1, Math.min(3.0, gainAdjustment));
        
        console.log(`Volume normalization: prev=${previousSongVolume.toFixed(2)}dB, curr=${currentSongVolume.toFixed(2)}dB, gain=${gainAdjustment.toFixed(2)}x`);
      } else {
        console.log(`First song - no normalization applied`);
      }
      
      const currentTime = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(gainAdjustment, currentTime + 0.5);
      
      previousSongVolume = currentSongVolume;
    }
  } catch (error) {
    console.error('Failed to apply volume normalization:', error);
  }
}

/**
 * Pre-analyze the next song in queue
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
      analyzeSongVolume(nextSong.filename).catch(err => {
        console.error('Pre-analysis failed:', err);
      });
    }
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
 * Initialize volume normalization UI
 */
export function initVolumeNormalization() {
  const eqBtn = document.getElementById('eq-btn');
  if (!eqBtn) return;
  
  eqBtn.title = 'Volume Normalization (Click to toggle)';
  
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
  
  updateButtonColor();
  
  eqBtn.addEventListener('click', (e) => {
    e.preventDefault();
    volumeNormalizationEnabled = !volumeNormalizationEnabled;
    saveVolumeNormalizationState();
    updateButtonColor();
    
    const gainNode = getGainNode();
    const audioContext = getAudioContext();
    
    if (volumeNormalizationEnabled) {
      previousSongVolume = null;
      showVolumeNormNotification('Volume normalization enabled');
    } else if (!volumeNormalizationEnabled && gainNode) {
      previousSongVolume = null;
      const currentTime = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(currentTime);
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, currentTime + 0.5);
      
      showVolumeNormNotification('Volume normalization disabled');
    }
  });
  
  eqBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showVolumeNormContextMenu(e.clientX, e.clientY);
  });
  
  loadSongVolumeCache();
  loadVolumeNormalizationState();
}

/**
 * Show volume normalization context menu
 */
function showVolumeNormContextMenu(x, y) {
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
 * Reset volume normalization
 */
export function resetVolumeNormalization() {
  previousSongVolume = null;
}