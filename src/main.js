import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'url';
import started from 'electron-squirrel-startup';

// Import modules
import { createWindow } from './main/window.js';
import { createMenu } from './main/menu.js';
import { ensureDownloadsDir } from './main/paths.js';
import { initYtDlp } from './main/ytdlp.js';
import { registerAllHandlers } from './main/handlers/index.js';

// Get __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

/**
 * Initialize the application
 */
async function initialize() {
  // Create custom menu
  createMenu();
  
  // Ensure downloads directory exists
  ensureDownloadsDir();
  
  // Download yt-dlp binary if not present
  await initYtDlp();
  
  // Register all IPC handlers
  registerAllHandlers();
  
  // Create the main window with the correct preload path
  const preloadPath = path.join(__dirname, 'preload.js');
  createWindow(preloadPath);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(initialize);

// On OS X it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const preloadPath = path.join(__dirname, 'preload.js');
    createWindow(preloadPath);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});