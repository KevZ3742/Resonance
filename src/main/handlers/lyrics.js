import { ipcMain } from 'electron';
import https from 'https';

/**
 * Register lyrics-related IPC handlers
 */
export function registerLyricsHandlers() {
  /**
   * Fetch lyrics from LRCLIB API
   * LRCLIB is a free, open-source lyrics database
   */
  ipcMain.handle('fetch-lyrics', async (event, title, artist) => {
    try {
      console.log(`Fetching lyrics for: ${title} by ${artist}`);
      
      // Search with cleaned title (prioritize synced lyrics)
      const searchResult = await searchWithFuzzyMatch(title, artist);
      if (searchResult) {
        console.log(`Found lyrics`);
        return searchResult.lyrics;
      }
      
      console.log('No lyrics found');
      return null;
    } catch (error) {
      console.error('Error fetching lyrics:', error);
      return null;
    }
  });
  
  console.log('Lyrics handlers registered');
}

/**
 * Fetch lyrics from LRCLIB API
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Promise<{lyrics: string, synced: boolean}|null>} Lyrics object or null
 */
function fetchFromLRCLIB(title, artist) {
  return new Promise((resolve, reject) => {
    // Clean up title and artist for better matching
    const cleanTitle = encodeURIComponent(title.trim());
    const cleanArtist = encodeURIComponent(artist.trim());
    
    const url = `https://lrclib.net/api/get?artist_name=${cleanArtist}&track_name=${cleanTitle}`;
    
    console.log('LRCLIB URL:', url);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            
            // Prefer synced lyrics, fall back to plain lyrics
            if (result.syncedLyrics) {
              console.log('Found synced lyrics from LRCLIB');
              resolve({ lyrics: result.syncedLyrics, synced: true });
            } else if (result.plainLyrics) {
              console.log('Found plain lyrics from LRCLIB');
              resolve({ lyrics: result.plainLyrics, synced: false });
            } else {
              resolve(null);
            }
          } else if (res.statusCode === 404) {
            console.log('Lyrics not found in LRCLIB');
            resolve(null);
          } else {
            console.log(`LRCLIB returned status ${res.statusCode}`);
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing LRCLIB response:', error);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('LRCLIB request error:', error);
      resolve(null);
    });
  });
}

/**
 * Search LRCLIB with song name only, prioritizing synced lyrics
 * @param {string} title - Song title
 * @param {string} artist - Artist name (ignored)
 * @returns {Promise<{lyrics: string, confidence: number}|null>}
 */
function searchWithFuzzyMatch(title, artist) {
  return new Promise((resolve) => {
    // Clean and trim the song title
    const cleanedTitle = cleanSongTitle(title);
    const encodedTitle = encodeURIComponent(cleanedTitle);
    const url = `https://lrclib.net/api/search?q=${encodedTitle}`;
    
    console.log(`LRCLIB search with cleaned title: "${cleanedTitle}"`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const results = JSON.parse(data);
            
            if (results.length === 0) {
              console.log('No results found');
              resolve(null);
              return;
            }
            
            // Prioritize synced lyrics: find first result with synced lyrics
            const syncedResult = results.find(r => r.syncedLyrics);
            
            if (syncedResult) {
              console.log(`Found synced lyrics: "${syncedResult.trackName}" by "${syncedResult.artistName}"`);
              resolve({
                lyrics: syncedResult.syncedLyrics,
                confidence: 100
              });
              return;
            }
            
            // Fall back to first result with any lyrics
            const firstResult = results[0];
            if (firstResult.plainLyrics) {
              console.log(`Found plain lyrics: "${firstResult.trackName}" by "${firstResult.artistName}"`);
              resolve({
                lyrics: firstResult.plainLyrics,
                confidence: 100
              });
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing LRCLIB search response:', error);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('LRCLIB search error:', error);
      resolve(null);
    });
  });
}

/**
 * Clean song title by removing common irrelevant words and patterns
 * @param {string} title - Original song title
 * @returns {string} Cleaned title
 */
function cleanSongTitle(title) {
  let cleaned = title.trim();
  
  // Remove common patterns in parentheses or brackets
  cleaned = cleaned.replace(/\s*[\(\[].*?(official|audio|video|lyric|music|mv|hd|4k|remaster|remix|version|feat\.?|ft\.?).*?[\)\]]/gi, '');
  
  // Remove remaining empty parentheses/brackets
  cleaned = cleaned.replace(/\s*[\(\[][\)\]]/g, '');
  
  // Remove "Official", "Audio", "Video", etc. at the end
  cleaned = cleaned.replace(/\s*[-–—|]\s*(official|audio|video|lyric|music|mv|hd|4k|remaster).*$/gi, '');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  // Check if one string contains the other (high similarity)
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.85;
  }
  
  // Levenshtein distance
  const matrix = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s2.length][s1.length];
  
  return 1 - (distance / maxLength);
}
