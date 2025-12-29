import { ipcMain } from 'electron';
import { youtubeDl } from '../ytdlp.js';

/**
 * Register search-related IPC handlers
 */
export function registerSearchHandlers() {
  ipcMain.handle('search-songs', async (event, query, source, limit = 10) => {
    try {
      console.log(`Searching ${source} for: ${query} (limit: ${limit})`);
      
      let searchResults = [];
      
      if (source === 'youtube') {
        // Use yt-dlp to search YouTube
        const result = await youtubeDl.execPromise([
          `ytsearch${limit}:${query}`,
          '--dump-json',
          '--flat-playlist',
          '--no-playlist'
        ]);
        
        // Parse the JSON results
        const lines = result.split('\n').filter(line => line.trim());
        searchResults = lines.map(line => {
          try {
            const data = JSON.parse(line);
            return {
              id: data.id,
              title: data.title,
              artist: data.uploader,
              uploader: data.uploader,
              duration: data.duration,
              thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
              url: data.webpage_url || `https://www.youtube.com/watch?v=${data.id}`,
              source: 'youtube'
            };
          } catch (e) {
            return null;
          }
        }).filter(item => item !== null);
        
      } else if (source === 'soundcloud') {
        // Use yt-dlp to search SoundCloud
        const result = await youtubeDl.execPromise([
          `scsearch${limit}:${query}`,
          '--dump-json',
          '--flat-playlist',
          '--no-playlist'
        ]);
        
        const lines = result.split('\n').filter(line => line.trim());
        searchResults = lines.map(line => {
          try {
            const data = JSON.parse(line);
            let thumbnail = data.thumbnail || data.thumbnails?.[0]?.url;
            // Upgrade SoundCloud thumbnails to highest quality
            if (thumbnail && thumbnail.includes('sndcdn.com')) {
              thumbnail = thumbnail
                .replace(/-small\.jpg.*$/, '-t500x500.jpg')
                .replace(/-large\.jpg.*$/, '-t500x500.jpg')
                .replace(/-t\d+x\d+\.jpg.*$/, '-t500x500.jpg')
                .replace(/-\w+\.jpg.*$/, '-t500x500.jpg');
            }
            return {
              id: data.id,
              title: data.title,
              artist: data.uploader,
              uploader: data.uploader,
              duration: data.duration,
              thumbnail: thumbnail,
              url: data.webpage_url || data.url,
              source: 'soundcloud'
            };
          } catch (e) {
            return null;
          }
        }).filter(item => item !== null);
        
      } else if (source === 'temp') {
        // Placeholder for temp source - return mock data
        searchResults = [
          {
            id: 'temp1',
            title: `${query} - Result 1`,
            artist: 'Temp Artist',
            duration: 180,
            thumbnail: null,
            url: 'https://example.com',
            source: 'temp'
          },
          {
            id: 'temp2',
            title: `${query} - Result 2`,
            artist: 'Another Artist',
            duration: 240,
            thumbnail: null,
            url: 'https://example.com',
            source: 'temp'
          }
        ];
      }
      
      return searchResults;
      
    } catch (error) {
      console.error('Search error:', error);
      throw new Error(error.message || 'Search failed');
    }
  });
}