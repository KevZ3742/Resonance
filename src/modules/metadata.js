// src/modules/metadata.js

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
      thumbnail: null
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
}

// Create singleton instance
export const metadataManager = new MetadataManager();

/**
 * Show metadata editor modal
 * @param {string} filename - Song filename
 * @param {Function} onSave - Callback when metadata is saved
 */
export function showMetadataEditor(filename, onSave) {
  const metadata = metadataManager.getMetadata(filename);
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.id = 'metadata-editor-modal';
  
  modal.innerHTML = `
    <div class="bg-neutral-800 rounded-2xl w-150 max-w-2xl">
      <div class="px-6 pt-6 pb-4 border-b border-neutral-700">
        <h3 class="text-xl font-bold">Edit Song Metadata</h3>
        <p class="text-sm text-neutral-400 mt-1">${filename}</p>
      </div>
      
      <div class="p-6 space-y-4">
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
          <label class="block text-sm font-semibold mb-2">Duration (seconds)</label>
          <input 
            type="number" 
            id="metadata-duration"
            value="${metadata.duration || ''}"
            placeholder="Leave empty if unknown"
            class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
          >
        </div>
        
        <div>
          <label class="block text-sm font-semibold mb-2">Thumbnail URL (optional)</label>
          <input 
            type="text" 
            id="metadata-thumbnail"
            value="${metadata.thumbnail || ''}"
            placeholder="https://..."
            class="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition"
          >
        </div>
      </div>
      
      <div class="flex gap-2 justify-end px-6 pb-6">
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
  
  // Cancel handler
  const cancelBtn = modal.querySelector('#metadata-cancel');
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Save handler
  const saveBtn = modal.querySelector('#metadata-save');
  saveBtn.addEventListener('click', async () => {
    const title = document.getElementById('metadata-title').value.trim();
    const artist = document.getElementById('metadata-artist').value.trim();
    const durationStr = document.getElementById('metadata-duration').value.trim();
    const thumbnail = document.getElementById('metadata-thumbnail').value.trim();
    
    const duration = durationStr ? parseInt(durationStr) : null;
    
    await metadataManager.setMetadata(filename, {
      title: title || metadata.title,
      artist: artist || metadata.artist,
      duration,
      thumbnail: thumbnail || null
    });
    
    modal.remove();
    
    if (onSave) {
      onSave();
    }
  });
  
  // Enter key to save
  modal.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveBtn.click();
      }
    });
  });
}

/**
 * Format duration helper
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}