import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import ffmpegStatic from 'ffmpeg-static';
import { getAllSongsPath } from '../paths.js';

const execPromise = promisify(exec);

/**
 * Register metadata-related IPC handlers
 */
export function registerMetadataHandlers() {
  // Handle getting song metadata
  ipcMain.handle('get-metadata', async () => {
    const userDataPath = app.getPath('userData');
    const metadataPath = path.join(userDataPath, 'song-metadata.json');
    
    try {
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return metadata;
      }
    } catch (error) {
      console.error('Failed to read metadata:', error);
    }
    return {};
  });

  // Handle setting song metadata
  ipcMain.handle('set-metadata', async (event, metadata) => {
    const userDataPath = app.getPath('userData');
    const metadataPath = path.join(userDataPath, 'song-metadata.json');
    
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Failed to save metadata:', error);
      throw error;
    }
  });

  // Handle getting MP3 duration
  ipcMain.handle('get-mp3-duration', async (event, filename) => {
    try {
      const allSongsPath = getAllSongsPath();
      const filePath = path.join(allSongsPath, filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }
      
      // Use ffmpeg to get duration
      const command = `"${ffmpegStatic}" -i "${filePath}" 2>&1`;
      
      try {
        const { stdout, stderr } = await execPromise(command);
        const output = stdout + stderr;
        
        // Parse duration from ffmpeg output
        // Format: Duration: HH:MM:SS.ms
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          
          const totalSeconds = Math.floor(hours * 3600 + minutes * 60 + seconds);
          return totalSeconds;
        }
        
        return null;
      } catch (error) {
        // FFmpeg exits with error code when reading file info, but stderr contains the info we need
        const output = error.stdout + error.stderr;
        const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
        
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          
          const totalSeconds = Math.floor(hours * 3600 + minutes * 60 + seconds);
          return totalSeconds;
        }
        
        throw new Error('Could not parse duration');
      }
    } catch (error) {
      console.error('Failed to get MP3 duration:', error);
      return null;
    }
  });
}