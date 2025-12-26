import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'fs';
import os from 'os';
import YTDlpWrapModule from 'yt-dlp-wrap';
import ffmpegStatic from 'ffmpeg-static';
import { fileURLToPath } from 'url';

// Handle default export from CommonJS module
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

// Get the directory path for storing yt-dlp binary
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ytDlpPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const youtubeDl = new YTDlpWrap(ytDlpPath);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Get the primary display's work area size
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Maximize the window on startup
  mainWindow.maximize();

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
app.whenReady().then(async () => {
  // Download yt-dlp binary if not present
  try {
    if (!fs.existsSync(ytDlpPath)) {
      console.log('Downloading yt-dlp binary...');
      await YTDlpWrap.downloadFromGithub(ytDlpPath);
      console.log('yt-dlp binary downloaded successfully');
    }
  } catch (error) {
    console.error('Failed to download yt-dlp binary:', error.message);
  }
  
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

// Handle search
ipcMain.handle('search-songs', async (event, query, source) => {
  try {
    console.log(`Searching ${source} for: ${query}`);
    
    let searchResults = [];
    
    if (source === 'youtube') {
      // Use yt-dlp to search YouTube
      const result = await youtubeDl.execPromise([
        `ytsearch10:${query}`,
        '--dump-json',
        '--no-playlist'
      ]);
      
      // Parse the JSON results
      const lines = result.split('\n').filter(line => line.trim());
      searchResults = lines.map(line => {
        try {
          const data = JSON.parse(line);
          return {
            id: data.id,
            title: data.title,
            artist: data.uploader,
            uploader: data.uploader,
            duration: data.duration,
            thumbnail: data.thumbnail,
            url: data.webpage_url,
            source: 'youtube'
          };
        } catch (e) {
          return null;
        }
      }).filter(item => item !== null);
      
    } else if (source === 'soundcloud') {
      // Use yt-dlp to search SoundCloud
      const result = await youtubeDl.execPromise([
        `scsearch10:${query}`,
        '--dump-json',
        '--no-playlist'
      ]);
      
      const lines = result.split('\n').filter(line => line.trim());
      searchResults = lines.map(line => {
        try {
          const data = JSON.parse(line);
          return {
            id: data.id,
            title: data.title,
            artist: data.uploader,
            uploader: data.uploader,
            duration: data.duration,
            thumbnail: data.thumbnail,
            url: data.webpage_url,
            source: 'soundcloud'
          };
        } catch (e) {
          return null;
        }
      }).filter(item => item !== null);
      
    } else if (source === 'temp') {
      // Placeholder for temp source - return mock data for now
      searchResults = [
        {
          id: 'temp1',
          title: `${query} - Result 1`,
          artist: 'Temp Artist',
          duration: 180,
          thumbnail: null,
          url: 'https://example.com',
          source: 'temp'
        },
        {
          id: 'temp2',
          title: `${query} - Result 2`,
          artist: 'Another Artist',
          duration: 240,
          thumbnail: null,
          url: 'https://example.com',
          source: 'temp'
        }
      ];
    }
    
    return searchResults;
    
  } catch (error) {
    console.error('Search error:', error);
    throw new Error(error.message || 'Search failed');
  }
});

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