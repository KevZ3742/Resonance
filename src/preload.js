// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  downloadSong: (url) => ipcRenderer.invoke('download-song', url),
  searchSongs: (query, source) => ipcRenderer.invoke('search-songs', query, source),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  getAllSongsPath: () => ipcRenderer.invoke('get-all-songs-path'),
  createPlaylist: (playlistName) => ipcRenderer.invoke('create-playlist', playlistName),
  addToPlaylist: (playlistName, songFilename) => ipcRenderer.invoke('add-to-playlist', playlistName, songFilename),
  listPlaylists: () => ipcRenderer.invoke('list-playlists'),
  listPlaylistSongs: (playlistName) => ipcRenderer.invoke('list-playlist-songs', playlistName),
  listAllSongs: () => ipcRenderer.invoke('list-all-songs'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  onOpenPreferences: (callback) => {
    ipcRenderer.on('open-preferences', () => callback());
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  },
  onDownloadError: (callback) => {
    ipcRenderer.on('download-error', (event, data) => callback(data));
  }
});