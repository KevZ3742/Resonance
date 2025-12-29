const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  downloadSong: (url) => ipcRenderer.invoke('download-song', url),
  searchSongs: (query, source) => ipcRenderer.invoke('search-songs', query, source),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  getDownloadsPath: () => ipcRenderer.invoke('get-downloads-path'),
  getAllSongsPath: () => ipcRenderer.invoke('get-all-songs-path'),
  getSongPath: (songFilename) => ipcRenderer.invoke('get-song-path', songFilename),
  readSongFile: (songFilename) => ipcRenderer.invoke('read-song-file', songFilename),
  createPlaylist: (playlistName) => ipcRenderer.invoke('create-playlist', playlistName),
  addToPlaylist: (playlistName, songFilename) => ipcRenderer.invoke('add-to-playlist', playlistName, songFilename),
  listPlaylists: () => ipcRenderer.invoke('list-playlists'),
  listPlaylistSongs: (playlistName) => ipcRenderer.invoke('list-playlist-songs', playlistName),
  listAllSongs: () => ipcRenderer.invoke('list-all-songs'),
  removeFromPlaylist: (playlistName, songFilename) => ipcRenderer.invoke('remove-from-playlist', playlistName, songFilename),
  reorderPlaylistSongs: (playlistName, orderedSongs) => ipcRenderer.invoke('reorder-playlist-songs', playlistName, orderedSongs),
  getPlaylistOrder: (playlistName) => ipcRenderer.invoke('get-playlist-order', playlistName),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getCustomThemes: () => ipcRenderer.invoke('get-custom-themes'),
  setCustomThemes: (themes) => ipcRenderer.invoke('set-custom-themes', themes),
  exportTheme: (filename, svg) => ipcRenderer.invoke('export-theme', filename, svg),
  getMetadata: () => ipcRenderer.invoke('get-metadata'),
  setMetadata: (metadata) => ipcRenderer.invoke('set-metadata', metadata),
  getMp3Duration: (filename) => ipcRenderer.invoke('get-mp3-duration', filename),
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