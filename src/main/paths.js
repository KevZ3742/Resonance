import path from 'node:path';
import fs from 'fs';
import { app } from 'electron';

/**
 * Get the base Resonance data directory (inside app user data)
 */
export function getResonanceDataPath() {
  return path.join(app.getPath('userData'), 'Resonance');
}

/**
 * Get user's Downloads directory (for exported themes)
 * This remains in the user's Downloads folder for easy access
 */
export function getUserDownloadsPath() {
  return app.getPath('downloads');
}

/**
 * Get all songs directory (now in app data)
 */
export function getAllSongsPath() {
  return path.join(getResonanceDataPath(), 'all songs');
}

/**
 * Get playlists directory (now in app data)
 */
export function getPlaylistsPath() {
  return path.join(getResonanceDataPath(), 'playlists');
}

/**
 * Ensure all necessary directories exist with proper structure
 */
export function ensureDownloadsDir() {
  const resonanceDataPath = getResonanceDataPath();
  const allSongsPath = getAllSongsPath();
  const playlistsPath = getPlaylistsPath();
  
  // Create base Resonance data directory
  if (!fs.existsSync(resonanceDataPath)) {
    fs.mkdirSync(resonanceDataPath, { recursive: true });
  }
  
  // Create 'all songs' directory
  if (!fs.existsSync(allSongsPath)) {
    fs.mkdirSync(allSongsPath, { recursive: true });
  }
  
  // Create 'playlists' directory
  if (!fs.existsSync(playlistsPath)) {
    fs.mkdirSync(playlistsPath, { recursive: true });
  }
  
  return resonanceDataPath;
}