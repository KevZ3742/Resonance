import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

/**
 * Create the main application window
 * @param {string} preloadPath - Path to the preload script (passed from main.js)
 */
export function createWindow(preloadPath) {
  // Get the primary display's work area size
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      preload: preloadPath,
    },
  });

  // Maximize the window on startup
  mainWindow.maximize();

  // Load the index.html of the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(path.dirname(preloadPath), `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools
  mainWindow.webContents.openDevTools();
  
  return mainWindow;
}