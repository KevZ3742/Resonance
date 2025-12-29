import path from 'node:path';
import fs from 'fs';
import YTDlpWrapModule from 'yt-dlp-wrap';
import { fileURLToPath } from 'url';

// Handle default export from CommonJS module
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

// Get the directory path for storing yt-dlp binary
// Go up to the .vite/build directory (same level as preload.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The binary should be in the same directory as the compiled main.js
const ytDlpPath = path.join(__dirname, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Create YTDlpWrap instance
export const youtubeDl = new YTDlpWrap(ytDlpPath);

/**
 * Initialize yt-dlp by downloading binary if not present
 */
export async function initYtDlp() {
  try {
    if (!fs.existsSync(ytDlpPath)) {
      console.log('Downloading yt-dlp binary...');
      await YTDlpWrap.downloadFromGithub(ytDlpPath);
      console.log('yt-dlp binary downloaded successfully');
    }
  } catch (error) {
    console.error('Failed to download yt-dlp binary:', error.message);
  }
}