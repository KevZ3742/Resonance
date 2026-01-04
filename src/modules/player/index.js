// src/modules/player/index.js - Updated with lyrics support
import { createAudioElement, getAudioElement, connectAudioToGraph } from './audio-element.js';
import { initPlayPauseButton, setPlayingState, getPlayingState } from './playback-controls.js';
import { initNavigationButtons } from './navigation.js';
import { initVolumeControl } from './volume.js';
import { initProgressBar } from './progress.js';
import { initLoopControl } from './loop.js';
import { initPlaybackSpeedControl } from './speed.js';
import { initVolumeNormalization, applyVolumeNormalization, preAnalyzeNextSong, resetVolumeNormalization } from './volume-normalization.js';
import { formatDuration } from '../../utils/formatters.js';
import { loadLyrics, clearLyrics } from '../lyrics-display.js';

let currentSong = null;
let loopOneCount = 0;

/**
 * Initialize music player controls
 */
export function initPlayer() {
  createAudioElement(handleSongEnd);
  initPlayPauseButton();
  initNavigationButtons();
  initVolumeControl();
  initProgressBar();
  initLoopControl();
  initPlaybackSpeedControl();
  initVolumeNormalization();
}

/**
 * Handle when song ends
 */
async function handleSongEnd() {
  const { getLoopMode } = await import('./loop.js');
  const loopMode = getLoopMode();
  
  const audioElement = getAudioElement();
  
  if (loopMode === 'one') {
    if (loopOneCount === 0) {
      loopOneCount = 1;
      audioElement.currentTime = 0;
      audioElement.play();
    } else {
      loopOneCount = 0;
      const { setLoopMode, updateLoopButtonDisplay } = await import('./loop.js');
      setLoopMode('none');
      updateLoopButtonDisplay();
      setPlayingState(false);
      if (window.queueManager) {
        await window.queueManager.playNext();
      }
    }
  } else if (loopMode === 'all') {
    audioElement.currentTime = 0;
    audioElement.play();
  } else {
    setPlayingState(false);
    if (window.queueManager) {
      await window.queueManager.playNext();
    }
  }
}

/**
 * Play a song by filename
 */
export async function playSong(songFilename, metadata = {}) {
  try {
    loopOneCount = 0;
    
    const arrayBuffer = await window.electronAPI.readSongFile(songFilename);
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    const audioElement = getAudioElement();
    
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    
    audioElement.src = blobUrl;
    audioElement.load();
    
    connectAudioToGraph();
    
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    
    if (songTitle) {
      songTitle.textContent = metadata.title || 'Unknown Title';
    }
    
    if (songArtist) {
      songArtist.textContent = metadata.artist || 'Unknown Artist';
    }
    
    // Load and display lyrics
    if (metadata.lyrics && metadata.lyrics.length > 0) {
      loadLyrics(metadata.lyrics);
    } else {
      clearLyrics();
    }
    
    currentSong = songFilename;
    
    await applyVolumeNormalization(songFilename);
    
    try {
      await audioElement.play();
      setPlayingState(true);
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
 * Clear the player
 */
export function clearPlayer() {
  const audioElement = getAudioElement();
  
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    if (audioElement.src && audioElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioElement.src);
    }
    audioElement.src = '';
  }
  
  currentSong = null;
  loopOneCount = 0;
  
  resetVolumeNormalization();
  setPlayingState(false);
  clearLyrics();
  
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

export { getPlayingState, setPlayingState } from './playback-controls.js';
export { preAnalyzeNextSong } from './volume-normalization.js';