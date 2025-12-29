import { ipcMain } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { ensureDownloadsDir, getAllSongsPath, getPlaylistsPath } from '../paths.js';

/**
 * Register playlist-related IPC handlers
 */
export function registerPlaylistHandlers() {
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

  // Handle removing song from playlist
  ipcMain.handle('remove-from-playlist', async (event, playlistName, songFilename) => {
    try {
      const playlistPath = path.join(getPlaylistsPath(), playlistName);
      const songPath = path.join(playlistPath, songFilename);
      
      if (!fs.existsSync(playlistPath)) {
        throw new Error('Playlist does not exist');
      }
      
      // Delete the file or reference
      if (fs.existsSync(songPath)) {
        fs.unlinkSync(songPath);
      }
      
      // Also check for .ref files
      const refPath = songPath + '.ref';
      if (fs.existsSync(refPath)) {
        fs.unlinkSync(refPath);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to remove song from playlist:', error);
      throw error;
    }
  });

  // Handle reordering songs in playlist
  ipcMain.handle('reorder-playlist-songs', async (event, playlistName, orderedSongs) => {
    try {
      const playlistPath = path.join(getPlaylistsPath(), playlistName);
      const metadataPath = path.join(playlistPath, '.playlist-order.json');
      
      if (!fs.existsSync(playlistPath)) {
        throw new Error('Playlist does not exist');
      }
      
      // Save the order to a metadata file
      const metadata = {
        order: orderedSongs,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Failed to reorder playlist songs:', error);
      throw error;
    }
  });

  // Handle getting playlist order
  ipcMain.handle('get-playlist-order', async (event, playlistName) => {
    try {
      const playlistPath = path.join(getPlaylistsPath(), playlistName);
      const metadataPath = path.join(playlistPath, '.playlist-order.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return metadata.order || [];
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get playlist order:', error);
      return [];
    }
  });
}