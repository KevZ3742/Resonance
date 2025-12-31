import { metadataManager, formatDuration } from './metadata.js';
import { playSong, setPlayingState, clearPlayer } from './player.js';

class QueueManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
  }

  /**
   * Add song to queue
   */
  async addToQueue(songFilename, metadata) {
    console.log('addToQueue called with:', songFilename);
    console.trace('Call stack:');
    
    const wasEmpty = this.queue.length === 0;
    
    this.queue.push({ filename: songFilename, metadata });
    this.updateQueueDisplay();
    
    // If queue was empty, auto-play the first song
    if (wasEmpty) {
      this.currentIndex = 0;
      await playSong(songFilename, metadata);
    }
    
    return this.queue.length - 1;
  }

  /**
   * Play song immediately (clear queue and add as first item)
   */
  async playNow(songFilename, metadata) {
    this.queue = [{ filename: songFilename, metadata }];
    this.currentIndex = 0;
    this.updateQueueDisplay();
    await playSong(songFilename, metadata);
  }

  /**
   * Play next song in queue
   */
  async playNext() {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      const item = this.queue[this.currentIndex];
      await playSong(item.filename, item.metadata);
      this.updateQueueDisplay();
    } else {
      // No next song - stop playback
      setPlayingState(false);
    }
  }

  /**
   * Play previous song in queue
   */
  async playPrevious() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const item = this.queue[this.currentIndex];
      await playSong(item.filename, item.metadata);
      this.updateQueueDisplay();
    }
  }

  /**
   * Remove song from queue
   */
  async removeFromQueue(index) {
    const wasCurrentSong = index === this.currentIndex;
    const wasBeforeCurrent = index < this.currentIndex;
    
    // Remove the song
    this.queue.splice(index, 1);
    
    // Adjust current index
    if (wasBeforeCurrent) {
      this.currentIndex--;
    } else if (wasCurrentSong) {
      // Removed the currently playing song
      if (this.queue.length === 0) {
        // Queue is now empty - stop playback
        this.currentIndex = -1;
        clearPlayer();
      } else if (this.currentIndex >= this.queue.length) {
        // We were at the end, no next song
        this.currentIndex = this.queue.length - 1;
        setPlayingState(false);
      } else {
        // Play the next song (which is now at the same index)
        const item = this.queue[this.currentIndex];
        await playSong(item.filename, item.metadata);
      }
    }
    
    this.updateQueueDisplay();
  }

  /**
   * Clear entire queue
   */
  clearQueue() {
    this.queue = [];
    this.currentIndex = -1;
    clearPlayer();
    this.updateQueueDisplay();
  }

  /**
   * Update queue display in UI
   */
  updateQueueDisplay() {
    const queueList = document.getElementById('queue-list');
    
    if (this.queue.length === 0) {
      queueList.innerHTML = '<p class="text-neutral-400">Queue is empty</p>';
      return;
    }

    queueList.innerHTML = this.queue.map((item, index) => {
      const isPlaying = index === this.currentIndex;
      return `
        <div class="queue-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition ${isPlaying ? 'border-2 border-blue-500' : ''}" data-index="${index}">
          <div class="flex items-center gap-3">
            ${isPlaying ? `
              <svg class="w-5 h-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ` : `
              <span class="text-neutral-500 text-sm w-5 shrink-0">${index + 1}</span>
            `}
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate ${isPlaying ? 'text-blue-400' : ''}">${item.metadata.title}</div>
              <div class="text-sm text-neutral-400 truncate">${item.metadata.artist}</div>
              ${item.metadata.duration ? `<div class="text-xs text-neutral-500">${formatDuration(item.metadata.duration)}</div>` : ''}
            </div>
            <button class="remove-from-queue-btn text-neutral-400 hover:text-red-400 transition p-2" data-index="${index}">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.queue-item').forEach(item => {
      const index = parseInt(item.getAttribute('data-index'));
      
      // Click to play
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.remove-from-queue-btn')) return;
        this.currentIndex = index;
        const queueItem = this.queue[index];
        await playSong(queueItem.filename, queueItem.metadata);
        this.updateQueueDisplay();
      });
    });

    // Attach remove button listeners
    document.querySelectorAll('.remove-from-queue-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const index = parseInt(btn.getAttribute('data-index'));
        await this.removeFromQueue(index);
      });
    });
  }

  /**
   * Get current queue
   */
  getQueue() {
    return this.queue;
  }

  /**
   * Get current index
   */
  getCurrentIndex() {
    return this.currentIndex;
  }
}

// Create singleton instance
export const queueManager = new QueueManager();

// Make it globally available
if (typeof window !== 'undefined') {
  window.queueManager = queueManager;
}