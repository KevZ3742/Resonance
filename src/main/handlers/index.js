import { registerSearchHandlers } from './search.js';
import { registerDownloadHandlers } from './download.js';
import { registerPlaylistHandlers } from './playlist.js';
import { registerThemeHandlers } from './theme.js';
import { registerMetadataHandlers } from './metadata.js';
import { registerLyricsHandlers } from './lyrics.js';

/**
 * Register all IPC handlers
 */
export function registerAllHandlers() {
  registerSearchHandlers();
  registerDownloadHandlers();
  registerPlaylistHandlers();
  registerThemeHandlers();
  registerMetadataHandlers();
  registerLyricsHandlers();
  
  console.log('All IPC handlers registered');
}