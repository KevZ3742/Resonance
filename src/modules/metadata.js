import { formatDuration } from '../utils/formatters.js';

/**
 * Metadata manager for songs
 */
class MetadataManager {
  constructor() {
    this.metadata = {};
    this.loadMetadata();
  }

  /**
   * Load metadata from storage
   */
  async loadMetadata() {
    try {
      const stored = await window.electronAPI.getMetadata();
      this.metadata = stored || {};
    } catch (error) {
      console.error('Failed to load metadata:', error);
      this.metadata = {};
    }
  }

  /**
   * Get metadata for a song
   * @param {string} filename - Song filename
   * @returns {Object} Metadata object
   */
  getMetadata(filename) {
    return this.metadata[filename] || {
      title: this.extractTitleFromFilename(filename),
      artist: 'Unknown Artist',
      duration: null,
      thumbnail: null,
      lyrics: [] // Array of {time: number, text: string}
    };
  }

  /**
   * Set metadata for a song
   * @param {string} filename - Song filename
   * @param {Object} data - Metadata to set
   */
  async setMetadata(filename, data) {
    this.metadata[filename] = {
      ...this.getMetadata(filename),
      ...data
    };
    await this.saveMetadata();
  }

  /**
   * Save metadata to storage
   */
  async saveMetadata() {
    try {
      await window.electronAPI.setMetadata(this.metadata);
    } catch (error) {
      console.error('Failed to save metadata:', error);
    }
  }

  /**
   * Extract title from filename
   * @param {string} filename - Song filename
   * @returns {string} Extracted title
   */
  extractTitleFromFilename(filename) {
    return filename.replace('.mp3', '').replace(/[-_]/g, ' ');
  }

  /**
   * Import metadata from download
   * @param {string} filename - Song filename
   * @param {Object} searchResult - Search result data
   */
  async importFromSearch(filename, searchResult) {
    await this.setMetadata(filename, {
      title: searchResult.title,
      artist: searchResult.artist || searchResult.uploader || 'Unknown Artist',
      duration: searchResult.duration,
      thumbnail: searchResult.thumbnail
    });
  }

  /**
   * Get duration from MP3 file
   * @param {string} filename - Song filename
   * @returns {Promise<number|null>} Duration in seconds
   */
  async getDurationFromFile(filename) {
    try {
      const duration = await window.electronAPI.getMp3Duration(filename);
      return duration;
    } catch (error) {
      console.error('Failed to get MP3 duration:', error);
      return null;
    }
  }

  /**
   * Update duration for a song from its MP3 file
   * @param {string} filename - Song filename
   */
  async updateDurationFromFile(filename) {
    const duration = await this.getDurationFromFile(filename);
    if (duration !== null) {
      await this.setMetadata(filename, { duration });
    }
  }
}

// Create singleton instance
export const metadataManager = new MetadataManager();

// Export formatDuration for backward compatibility
export { formatDuration };

/**
 * Show metadata editor modal with lyrics support
 * @param {string} filename - Song filename
 * @param {Function} onSave - Callback when metadata is saved
 */
export function showMetadataEditor(filename, onSave) {
  const metadata = metadataManager.getMetadata(filename);
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.id = 'metadata-editor-modal';
  
  modal.innerHTML = `
    <div class="bg-neutral-800 rounded-2xl w-200 max-w-[90vw] max-h-[90vh] flex flex-col">
      <div class="px-6 pt-6 pb-4 border-b border-neutral-700">
        <h3 class="text-xl font-bold">Edit Song Metadata</h3>
        <p class="text-sm text-neutral-400 mt-1">${filename}</p>
      </div>
      
      <div class="overflow-y-auto flex-1 p-6 space-y-4">
        <div>
          <label class="block text-sm font-semibold mb-2">Title</label>
          <input 
            type="text" 
            id="metadata-title"
            value="${metadata.title}"
            class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold mb-2">Artist</label>
          <input 
            type="text" 
            id="metadata-artist"
            value="${metadata.artist}"
            class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold mb-2">Duration</label>
          <div class="bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-neutral-400">
            ${metadata.duration ? formatDuration(metadata.duration) : 'Calculating...'} (auto-detected)
          </div>
          <p class="text-xs text-neutral-500 mt-1">Duration is automatically detected from the MP3 file</p>
        </div>

        <div>
          <label class="block text-sm font-semibold mb-2">Lyrics (with timestamps)</label>
          <p class="text-xs text-neutral-500 mb-2">Format: [MM:SS] Lyric text (e.g., [00:15] First line of lyrics)</p>
          <textarea 
            id="metadata-lyrics"
            rows="12"
            placeholder="[00:00] First line
[00:05] Second line
[00:10] Third line"
            class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition font-mono text-sm"
          >${formatLyricsForDisplay(metadata.lyrics || [])}</textarea>
          <div class="flex gap-2 mt-2">
            <button id="parse-lyrics-btn" class="text-xs bg-neutral-600 hover:bg-neutral-500 px-3 py-1 rounded transition">
              Parse & Validate
            </button>
            <span id="lyrics-status" class="text-xs text-neutral-500 self-center ml-2"></span>
          </div>
        </div>
      </div>
      
      <div class="flex gap-2 justify-end px-6 pb-6 border-t border-neutral-700 pt-4">
        <button id="metadata-cancel" class="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-2 rounded-lg transition">
          Cancel
        </button>
        <button id="metadata-save" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition">
          Save
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus first input
  setTimeout(() => document.getElementById('metadata-title').focus(), 100);
  
  // Parse lyrics button
  const parseLyricsBtn = modal.querySelector('#parse-lyrics-btn');
  const lyricsTextarea = modal.querySelector('#metadata-lyrics');
  const lyricsStatus = modal.querySelector('#lyrics-status');
  
  if (parseLyricsBtn) {
    parseLyricsBtn.addEventListener('click', () => {
      const text = lyricsTextarea.value;
      const parsed = parseLyrics(text);
      
      if (parsed.errors.length > 0) {
        lyricsStatus.textContent = `⚠️ ${parsed.errors.length} error(s) found`;
        lyricsStatus.className = 'text-xs text-red-400 self-center ml-2';
        alert('Errors found:\n' + parsed.errors.join('\n'));
      } else {
        lyricsStatus.textContent = `✓ ${parsed.lyrics.length} lines parsed successfully`;
        lyricsStatus.className = 'text-xs text-green-400 self-center ml-2';
      }
    });
  }
  
  // Cancel handler
  const cancelBtn = modal.querySelector('#metadata-cancel');
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Save handler
  const saveBtn = modal.querySelector('#metadata-save');
  saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('metadata-title').value.trim();
    const artist = document.getElementById('metadata-artist').value.trim();
    const lyricsText = document.getElementById('metadata-lyrics').value.trim();
    
    // Parse lyrics
    const parsed = parseLyrics(lyricsText);
    if (parsed.errors.length > 0) {
      const proceed = confirm(`Found ${parsed.errors.length} error(s) in lyrics. Save anyway?`);
      if (!proceed) return;
    }
    
    await metadataManager.setMetadata(filename, {
      title: title || metadata.title,
      artist: artist || metadata.artist,
      lyrics: parsed.lyrics
    });
    
    // Update duration from file if not set
    if (!metadata.duration) {
      await metadataManager.updateDurationFromFile(filename);
    }
    
    modal.remove();
    
    if (onSave) {
      onSave();
    }
  });
  
  // Enter key to save (only on title/artist inputs)
  modal.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });
  });
  
  // Update duration in the background
  if (!metadata.duration) {
    metadataManager.getDurationFromFile(filename).then(duration => {
      if (duration !== null && modal.parentElement) {
        const durationDisplay = modal.querySelector('.bg-neutral-700.border.border-neutral-600');
        if (durationDisplay) {
          durationDisplay.textContent = `${formatDuration(duration)} (auto-detected)`;
        }
      }
    });
  }
}

/**
 * Parse lyrics text into structured format
 * @param {string} text - Raw lyrics text
 * @returns {Object} {lyrics: Array, errors: Array}
 */
function parseLyrics(text) {
  const lines = text.split('\n');
  const lyrics = [];
  const errors = [];
  
  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return;
    
    // Match [MM:SS] or [M:SS] format
    const match = line.match(/^\[(\d{1,2}):(\d{2})\]\s*(.+)$/);
    
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const text = match[3].trim();
      
      if (seconds >= 60) {
        errors.push(`Line ${index + 1}: Seconds must be less than 60`);
      } else if (!text) {
        errors.push(`Line ${index + 1}: Empty lyric text`);
      } else {
        const timeInSeconds = minutes * 60 + seconds;
        lyrics.push({ time: timeInSeconds, text });
      }
    } else if (line.startsWith('[')) {
      errors.push(`Line ${index + 1}: Invalid timestamp format. Use [MM:SS]`);
    } else {
      // Line without timestamp - add with time 0
      lyrics.push({ time: 0, text: line });
    }
  });
  
  // Sort by time
  lyrics.sort((a, b) => a.time - b.time);
  
  return { lyrics, errors };
}

/**
 * Format lyrics array for display in textarea
 * @param {Array} lyrics - Array of {time, text} objects
 * @returns {string} Formatted text
 */
function formatLyricsForDisplay(lyrics) {
  if (!lyrics || !Array.isArray(lyrics) || lyrics.length === 0) return '';
  
  return lyrics.map(line => {
    const minutes = Math.floor(line.time / 60);
    const seconds = line.time % 60;
    const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
    return `${timestamp} ${line.text}`;
  }).join('\n');
}