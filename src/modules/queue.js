import { metadataManager, formatDuration } from './metadata.js';
import { playSong, setPlayingState, clearPlayer } from './player.js';

class QueueManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.playlistInstanceCounter = 0; // Track unique playlist instances
    this.collapsedPlaylists = new Set(); // Track which playlists are collapsed
  }

  /**
   * Add song to queue
   */
  async addToQueue(songFilename, metadata) {
    console.log('addToQueue called with:', songFilename);
    console.trace('Call stack:');
    
    const wasEmpty = this.queue.length === 0;
    
    this.queue.push({ 
      filename: songFilename, 
      metadata,
      playlistName: null, // Individual songs don't belong to a playlist group
      playlistInstanceId: null
    });
    this.updateQueueDisplay();
    
    // If queue was empty, auto-play the first song
    if (wasEmpty) {
      this.currentIndex = 0;
      await playSong(songFilename, metadata);
    }
    
    return this.queue.length - 1;
  }

  /**
   * Add entire playlist to queue with grouping
   * @param {string} playlistName - Name of the playlist
   * @param {Array} songs - Array of song filenames
   * @param {boolean} playNow - If true, clear queue and play immediately
   */
  async addPlaylistToQueue(playlistName, songs, playNow = false) {
    const wasEmpty = this.queue.length === 0;
    
    if (playNow) {
      this.queue = [];
      this.currentIndex = -1;
    }
    
    // Generate unique instance ID for this playlist addition
    const instanceId = ++this.playlistInstanceCounter;
    
    // Automatically collapse the playlist by default
    const playlistKey = `${playlistName}-${instanceId}`;
    this.collapsedPlaylists.add(playlistKey);
    
    // Add all songs with playlist grouping and unique instance ID
    for (const song of songs) {
      const metadata = metadataManager.getMetadata(song);
      this.queue.push({
        filename: song,
        metadata,
        playlistName: playlistName, // Mark as part of this playlist
        playlistInstanceId: instanceId // Unique ID for this instance
      });
    }
    
    this.updateQueueDisplay();
    
    // If playing now or queue was empty, start playing
    if (playNow || wasEmpty) {
      this.currentIndex = playNow ? 0 : (this.queue.length - songs.length);
      const item = this.queue[this.currentIndex];
      await playSong(item.filename, item.metadata);
    }
  }

  /**
   * Play song immediately (clear queue and add as first item)
   */
  async playNow(songFilename, metadata) {
    this.queue = [{ 
      filename: songFilename, 
      metadata,
      playlistName: null,
      playlistInstanceId: null
    }];
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
   * Toggle playlist group collapse state
   */
  togglePlaylistCollapse(playlistKey) {
    if (this.collapsedPlaylists.has(playlistKey)) {
      this.collapsedPlaylists.delete(playlistKey);
    } else {
      this.collapsedPlaylists.add(playlistKey);
    }
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

    // Calculate total duration
    let totalDuration = 0;
    this.queue.forEach(item => {
      if (item.metadata.duration) {
        totalDuration += item.metadata.duration;
      }
    });

    const formatTotalDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    let html = `
      <div class="mb-4 pb-3 border-b border-neutral-700">
        <div class="flex items-center justify-between">
          <span class="text-lg font-semibold">${this.queue.length} song${this.queue.length !== 1 ? 's' : ''}</span>
          ${totalDuration > 0 ? `<span class="text-neutral-400 text-sm">${formatTotalDuration(totalDuration)}</span>` : ''}
        </div>
      </div>
    `;
    
    let currentPlaylistInstance = null;
    
    this.queue.forEach((item, index) => {
      const isPlaying = index === this.currentIndex;
      
      // Check if we need to show a playlist header
      // Use both playlistName AND playlistInstanceId to distinguish duplicate playlists
      const playlistKey = item.playlistName ? `${item.playlistName}-${item.playlistInstanceId}` : null;
      
      if (playlistKey && playlistKey !== currentPlaylistInstance) {
        // Close previous playlist group if exists
        if (currentPlaylistInstance !== null) {
          html += '</div></div>'; // Close songs container and playlist group
        }
        
        currentPlaylistInstance = playlistKey;
        const isCollapsed = this.collapsedPlaylists.has(playlistKey);
        
        // Count how many times this playlist appears in the queue
        const totalSongsInThisPlaylist = this.queue.filter(q => 
          q.playlistName === item.playlistName && 
          q.playlistInstanceId === item.playlistInstanceId
        ).length;
        
        // Determine if we need to show instance number
        const instancesOfPlaylist = new Set(
          this.queue
            .filter(q => q.playlistName === item.playlistName)
            .map(q => q.playlistInstanceId)
        ).size;
        
        const playlistInstanceNumber = Array.from(
          new Set(
            this.queue
              .slice(0, index)
              .filter(q => q.playlistName === item.playlistName)
              .map(q => q.playlistInstanceId)
          )
        ).length + 1;
        
        const displayName = instancesOfPlaylist > 1 
          ? `${item.playlistName} (${playlistInstanceNumber})` 
          : item.playlistName;
        
        // Add playlist header with collapse button
        html += `
          <div class="playlist-group mb-3">
            <button class="playlist-header w-full flex items-center gap-2 mb-2 px-2 py-1 hover:bg-neutral-700/50 rounded-lg transition group" data-playlist-key="${playlistKey}">
              <svg class="w-4 h-4 text-neutral-400 group-hover:text-blue-400 transition transform ${isCollapsed ? '' : 'rotate-90'}" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
              <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
              </svg>
              <span class="text-sm text-blue-400 font-medium">${displayName}</span>
              <span class="text-xs text-neutral-500">(${totalSongsInThisPlaylist} song${totalSongsInThisPlaylist !== 1 ? 's' : ''})</span>
              <div class="flex-1 border-b border-neutral-700"></div>
            </button>
            <div class="playlist-songs space-y-2 ${isCollapsed ? 'hidden' : ''}">
        `;
      } else if (!playlistKey && currentPlaylistInstance !== null) {
        // Close playlist group when we hit individual songs
        html += '</div></div>';
        currentPlaylistInstance = null;
      }
      
      // Add song item
      const isInPlaylist = item.playlistName !== null;
      const isCollapsed = playlistKey && this.collapsedPlaylists.has(playlistKey);
      
      // Only render song if not collapsed or if it's an individual song
      if (!isCollapsed || !isInPlaylist) {
        html += `
          <div class="queue-item bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg transition ${isPlaying ? 'border-2 border-blue-500' : ''} ${isInPlaylist ? 'ml-6' : ''}" data-index="${index}">
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
      }
    });
    
    // Close last playlist group if exists
    if (currentPlaylistInstance !== null) {
      html += '</div></div>';
    }
    
    queueList.innerHTML = html;

    // Attach playlist header collapse listeners
    document.querySelectorAll('.playlist-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const playlistKey = header.getAttribute('data-playlist-key');
        this.togglePlaylistCollapse(playlistKey);
      });
    });

    // Attach event listeners to queue items
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