import { formatDuration } from '../../utils/formatters.js';

let audioElement = null;
let audioContext = null;
let sourceNode = null;
let analyserNode = null;
let gainNode = null;

/**
 * Create and configure the audio element
 */
export function createAudioElement(onEndedCallback) {
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
  audioElement.addEventListener('ended', onEndedCallback);
  
  // Set default volume and playback rate
  audioElement.volume = 0.7;
  audioElement.playbackRate = 1.0;
  
  // Initialize audio context
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
export function connectAudioToGraph() {
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
 * Get the audio element
 */
export function getAudioElement() {
  return audioElement;
}

/**
 * Get the audio context
 */
export function getAudioContext() {
  return audioContext;
}

/**
 * Get the analyser node
 */
export function getAnalyserNode() {
  return analyserNode;
}

/**
 * Get the gain node
 */
export function getGainNode() {
  return gainNode;
}