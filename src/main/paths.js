import path from 'node:path';
import fs from 'fs';
import os from 'os';

/**
 * Get downloads directory (base Resonance directory)
 */
export function getDownloadsPath() {
  return path.join(os.homedir(), 'Downloads', 'Resonance');
}

/**
 * Get all songs directory
 */
export function getAllSongsPath() {
  return path.join(getDownloadsPath(), 'all songs');
}

/**
 * Get playlists directory
 */
export function getPlaylistsPath() {
  return path.join(getDownloadsPath(), 'playlists');
}

/**
 * Ensure downloads directory exists with proper structure
 */
export function ensureDownloadsDir() {
  const downloadsPath = getDownloadsPath();
  const allSongsPath = getAllSongsPath();
  const playlistsPath = getPlaylistsPath();
  
  // Create base directory
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }
  
  // Create 'all songs' directory
  if (!fs.existsSync(allSongsPath)) {
    fs.mkdirSync(allSongsPath, { recursive: true });
  }
  
  // Create 'playlists' directory
  if (!fs.existsSync(playlistsPath)) {
    fs.mkdirSync(playlistsPath, { recursive: true });
  }
  
  return downloadsPath;
}