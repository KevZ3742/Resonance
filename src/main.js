import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import YTDlpWrap from 'yt-dlp-wrap';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Get downloads directory
const getDownloadsPath = () => {
  return path.join(os.homedir(), 'Downloads', 'Resonance');
};

// Ensure downloads directory exists
const ensureDownloadsDir = () => {
  const downloadsPath = getDownloadsPath();
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
  }
  return downloadsPath;
};

// Handle song download
ipcMain.handle('download-song', async (event, url) => {
  const downloadsPath = ensureDownloadsDir();
  
  return new Promise(async (resolve, reject) => {
    // Get ffmpeg path from the bundled binary
    const ffmpegPath = path.dirname(ffmpeg.path);
    
    // Initialize yt-dlp-wrap with bundled binary
    const ytDlpWrap = new YTDlpWrap();
    
    // Get the yt-dlp binary path
    let ytDlpPath;
    try {
      ytDlpPath = await ytDlpWrap.getYtDlpBinaryPath();
    } catch (error) {
      // If binary doesn't exist, download it
      ytDlpPath = await YTDlpWrap.downloadFromGithub();
    }
    
    // yt-dlp command arguments
    const args = [
      '-x',  // Extract audio
      '--audio-format', 'mp3',  // Convert to mp3
      '--audio-quality', '0',  // Best quality
      '--embed-thumbnail',  // Embed thumbnail
      '--add-metadata',  // Add metadata
      '--ffmpeg-location', ffmpegPath,  // Use bundled ffmpeg
      '--output', path.join(downloadsPath, '%(title)s.%(ext)s'),  // Output template
      url
    ];

    // Spawn yt-dlp process
    const ytdlp = spawn(ytDlpPath, args);

    let errorOutput = '';
    let outputData = '';

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      outputData += output;
      
      // Parse download progress
      const progressMatch = output.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        event.sender.send('download-progress', {
          progress: parseFloat(progressMatch[1]),
          status: 'downloading'
        });
      }

      // Check for extraction/conversion phase
      if (output.includes('Extracting audio')) {
        event.sender.send('download-progress', {
          progress: 90,
          status: 'converting'
        });
      }
    });

    ytdlp.stderr.on('data', (data) => {
      const error = data.toString();
      errorOutput += error;
      console.error('yt-dlp error:', error);
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Extract filename from output
        const filenameMatch = outputData.match(/\[ExtractAudio\] Destination: (.+)/);
        let filename = 'Unknown';
        
        if (filenameMatch) {
          filename = path.basename(filenameMatch[1]);
        }

        event.sender.send('download-complete', {
          success: true,
          filename: filename,
          path: downloadsPath
        });
        
        resolve({
          success: true,
          filename: filename,
          path: downloadsPath
        });
      } else {
        const errorMessage = errorOutput || 'Download failed';
        event.sender.send('download-error', {
          error: errorMessage
        });
        reject(new Error(errorMessage));
      }
    });

    ytdlp.on('error', (error) => {
      const errorMessage = `Failed to start yt-dlp: ${error.message}. Make sure yt-dlp is installed.`;
      event.sender.send('download-error', {
        error: errorMessage
      });
      reject(new Error(errorMessage));
    });
  });
});
