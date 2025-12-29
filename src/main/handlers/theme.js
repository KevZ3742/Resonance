import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { getUserDownloadsPath } from '../paths.js';

/**
 * Register theme-related IPC handlers
 */
export function registerThemeHandlers() {
  // Handle getting theme preference
  ipcMain.handle('get-theme', async () => {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    try {
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        return settings.theme || null;
      }
    } catch (error) {
      console.error('Failed to read theme:', error);
    }
    return null;
  });

  // Handle setting theme preference
  ipcMain.handle('set-theme', async (event, themeData) => {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    try {
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
      settings.theme = themeData;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Failed to save theme:', error);
      throw error;
    }
  });

  // Handle getting custom themes
  ipcMain.handle('get-custom-themes', async () => {
    const userDataPath = app.getPath('userData');
    const themesPath = path.join(userDataPath, 'custom-themes.json');
    
    try {
      if (fs.existsSync(themesPath)) {
        const themes = JSON.parse(fs.readFileSync(themesPath, 'utf8'));
        return themes;
      }
    } catch (error) {
      console.error('Failed to read custom themes:', error);
    }
    return {};
  });

  // Handle setting custom themes
  ipcMain.handle('set-custom-themes', async (event, themes) => {
    const userDataPath = app.getPath('userData');
    const themesPath = path.join(userDataPath, 'custom-themes.json');
    
    try {
      fs.writeFileSync(themesPath, JSON.stringify(themes, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Failed to save custom themes:', error);
      throw error;
    }
  });

  // Handle exporting theme (exports directly to user's Downloads folder)
  ipcMain.handle('export-theme', async (event, filename, svgContent) => {
    try {
      const downloadsPath = getUserDownloadsPath();
      const filePath = path.join(downloadsPath, filename);
      
      fs.writeFileSync(filePath, svgContent, 'utf8');
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Failed to export theme:', error);
      throw error;
    }
  });
}