/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "3:45")
 */
export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  if (isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format total duration for display (includes hours if needed)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1:23:45" or "23:45")
 */
export function formatTotalDuration(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format timestamp to human-readable relative time
 * @param {Date} date - Date object to format
 * @returns {string} Formatted timestamp (e.g., "Just now", "5 min ago", "2 hours ago")
 */
export function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Show temporary notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default: 2000)
 */
export function showNotification(message, duration = 2000) {
  const notification = document.createElement('div');
  notification.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 shadow-lg z-50 transition-opacity';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Calculate total duration of songs from metadata
 * @param {Array<string>} songs - Array of song filenames
 * @param {Object} metadataManager - Metadata manager instance
 * @returns {number} Total duration in seconds
 */
export function calculateTotalDuration(songs, metadataManager) {
  let total = 0;
  for (const song of songs) {
    const metadata = metadataManager.getMetadata(song);
    if (metadata.duration) {
      total += metadata.duration;
    }
  }
  return total;
}