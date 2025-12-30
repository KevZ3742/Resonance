import { metadataManager } from '../metadata.js';

/**
 * Calculate total duration of songs
 */
export function calculateTotalDuration(songs) {
  let total = 0;
  for (const song of songs) {
    const metadata = metadataManager.getMetadata(song);
    if (metadata.duration) {
      total += metadata.duration;
    }
  }
  return total;
}

/**
 * Format total duration for display
 */
export function formatTotalDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}