import { app, BrowserWindow, ipcMain, screen, shell, Menu } from 'electron';
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
  
  return mainWindow;
};

// Create custom menu
const createMenu = () => {
  const template = [
    {
      label: 'My Profile',
      submenu: [
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: (menuItem, browserWindow) => {
            if (browserWindow) {
              browserWindow.webContents.send('open-preferences');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Create custom menu
  createMenu();
  
  // Ensure downloads directory exists
  ensureDownloadsDir();
  
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

// Get downloads directory (base Resonance directory)
const getDownloadsPath = () => {
  return path.join(os.homedir(), 'Downloads', 'Resonance');
};

// Get all songs directory
const getAllSongsPath = () => {
  return path.join(getDownloadsPath(), 'all songs');
};

// Get playlists directory
const getPlaylistsPath = () => {
  return path.join(getDownloadsPath(), 'playlists');
};

// Ensure downloads directory exists with proper structure
const ensureDownloadsDir = () => {
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

// Handle creating a new playlist
ipcMain.handle('create-playlist', async (event, playlistName) => {
  try {
    ensureDownloadsDir();
    const playlistPath = path.join(getPlaylistsPath(), playlistName);
    
    if (fs.existsSync(playlistPath)) {
      throw new Error('Playlist already exists');
    }
    
    fs.mkdirSync(playlistPath, { recursive: true });
    return { success: true, path: playlistPath };
  } catch (error) {
    console.error('Failed to create playlist:', error);
    throw error;
  }
});

// Handle adding song to playlist (creates symlink/shortcut)
ipcMain.handle('add-to-playlist', async (event, playlistName, songFilename) => {
  try {
    const songPath = path.join(getAllSongsPath(), songFilename);
    const playlistPath = path.join(getPlaylistsPath(), playlistName);
    
    if (!fs.existsSync(songPath)) {
      throw new Error('Song file does not exist');
    }
    
    if (!fs.existsSync(playlistPath)) {
      throw new Error('Playlist does not exist');
    }
    
    const linkPath = path.join(playlistPath, songFilename);
    
    // Create symlink (or copy on Windows if symlink fails)
    try {
      if (process.platform === 'win32') {
        // On Windows, create a shortcut file
        fs.linkSync(songPath, linkPath);
      } else {
        // On Unix-like systems, create a symbolic link
        fs.symlinkSync(songPath, linkPath);
      }
    } catch (linkError) {
      // Fallback: create a text file with the path reference
      const referenceContent = `# Playlist Reference\nOriginal: ${songPath}`;
      fs.writeFileSync(linkPath + '.ref', referenceContent);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to add song to playlist:', error);
    throw error;
  }
});

// Handle listing all playlists
ipcMain.handle('list-playlists', async () => {
  try {
    ensureDownloadsDir();
    const playlistsPath = getPlaylistsPath();
    const playlists = fs.readdirSync(playlistsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    return playlists;
  } catch (error) {
    console.error('Failed to list playlists:', error);
    return [];
  }
});

// Handle listing songs in a playlist
ipcMain.handle('list-playlist-songs', async (event, playlistName) => {
  try {
    const playlistPath = path.join(getPlaylistsPath(), playlistName);
    if (!fs.existsSync(playlistPath)) {
      throw new Error('Playlist does not exist');
    }
    
    const songs = fs.readdirSync(playlistPath)
      .filter(file => file.endsWith('.mp3') || file.endsWith('.ref'));
    return songs;
  } catch (error) {
    console.error('Failed to list playlist songs:', error);
    throw error;
  }
});

// Handle listing all songs
ipcMain.handle('list-all-songs', async () => {
  try {
    ensureDownloadsDir();
    const allSongsPath = getAllSongsPath();
    const songs = fs.readdirSync(allSongsPath)
      .filter(file => file.endsWith('.mp3'));
    return songs;
  } catch (error) {
    console.error('Failed to list all songs:', error);
    return [];
  }
});

// Handle getting theme preference
ipcMain.handle('get-theme', async () => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return settings.theme || 'dark';
    }
  } catch (error) {
    console.error('Failed to read theme:', error);
  }
  return 'dark';
});

// Handle setting theme preference
ipcMain.handle('set-theme', async (event, theme) => {
  const userDataPath = app.getPath('userData');
  const settingsPath = path.join(userDataPath, 'settings.json');
  
  try {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    settings.theme = theme;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Failed to save theme:', error);
    throw error;
  }
});