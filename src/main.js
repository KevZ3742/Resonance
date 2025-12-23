import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'fs';
import os from 'os';
import youtubeDl from 'youtube-dl-exec';
import ffmpegStatic from 'ffmpeg-static';

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
  
  try {
    // Send initial progress
    event.sender.send('download-progress', {
      progress: 10,
      status: 'downloading'
    });

    // Output template for the file
    const outputTemplate = path.join(downloadsPath, '%(title)s.%(ext)s');

    event.sender.send('download-progress', {
      progress: 30,
      status: 'downloading'
    });

    // Download and convert to MP3
    // youtube-dl-exec automatically finds the binary installed via npm
    await youtubeDl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      output: outputTemplate,
      ffmpegLocation: ffmpegStatic,
      noPlaylist: true,
    });

    event.sender.send('download-progress', {
      progress: 95,
      status: 'converting'
    });

    // Get the most recently created file
    const files = fs.readdirSync(downloadsPath);
    const latestFile = files
      .filter(name => name.endsWith('.mp3'))
      .map(name => ({
        name,
        time: fs.statSync(path.join(downloadsPath, name)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0];

    const filename = latestFile?.name || 'download.mp3';

    event.sender.send('download-complete', {
      success: true,
      filename: filename,
      path: downloadsPath
    });

    return {
      success: true,
      filename: filename,
      path: downloadsPath
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
