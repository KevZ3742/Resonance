import { ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import { youtubeDl } from '../ytdlp.js';
import { ensureDownloadsDir, getAllSongsPath, getDownloadsPath } from '../paths.js';

/**
 * Register download-related IPC handlers
 */
export function registerDownloadHandlers() {
  // Handle song download
  ipcMain.handle('download-song', async (event, url) => {
    ensureDownloadsDir();
    const allSongsPath = getAllSongsPath();
    
    try {
      // Send initial progress
      event.sender.send('download-progress', {
        progress: 10,
        status: 'downloading'
      });

      // Output template for the file (save to 'all songs' directory)
      const outputTemplate = path.join(allSongsPath, '%(title)s.%(ext)s');

      event.sender.send('download-progress', {
        progress: 30,
        status: 'downloading'
      });

      // Download and convert to MP3
      await youtubeDl.execPromise([
        url,
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0',
        '-o', outputTemplate,
        '--ffmpeg-location', ffmpegStatic,
        '--no-playlist'
      ]);

      event.sender.send('download-progress', {
        progress: 95,
        status: 'converting'
      });

      // Get the most recently created file from 'all songs' directory
      const files = fs.readdirSync(allSongsPath);
      const latestFile = files
        .filter(name => name.endsWith('.mp3'))
        .map(name => ({
          name,
          time: fs.statSync(path.join(allSongsPath, name)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time)[0];

      const filename = latestFile?.name || 'download.mp3';

      event.sender.send('download-complete', {
        success: true,
        filename: filename,
        path: allSongsPath
      });

      return {
        success: true,
        filename: filename,
        path: allSongsPath
      };

    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      event.sender.send('download-error', {
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  });

  // Handle opening folder
  ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
      await shell.openPath(folderPath);
      return { success: true };
    } catch (error) {
      console.error('Failed to open folder:', error);
      throw new Error('Failed to open folder');
    }
  });

  // Handle getting downloads path
  ipcMain.handle('get-downloads-path', async () => {
    return getDownloadsPath();
  });

  // Handle getting all songs path
  ipcMain.handle('get-all-songs-path', async () => {
    return getAllSongsPath();
  });
}