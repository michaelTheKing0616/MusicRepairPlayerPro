import axios from 'axios';
import {createLogger} from '../utils/logger';

const log = createLogger('Lyrics');

export interface LyricsLine {
  time: number; // Time in seconds
  text: string;
}

export interface Lyrics {
  lines: LyricsLine[];
  synced: boolean; // Whether lyrics are time-synced
  source?: string;
}

/**
 * Lyrics service - fetches lyrics from various APIs
 * Supports: Musixmatch (free tier), Lyrics.ovh, and custom backend
 */
class LyricsService {
  private cache: Map<string, Lyrics> = new Map();

  /**
   * Fetch lyrics for a track
   * @param artist - Artist name
   * @param title - Track title
   * @returns Lyrics with synchronized timing if available
   */
  async getLyrics(artist: string, title: string): Promise<Lyrics | null> {
    const cacheKey = `${artist}:${title}`.toLowerCase();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Try multiple sources
    let lyrics: Lyrics | null = null;

    // Try backend API first (if you implement lyrics endpoint)
    try {
      lyrics = await this.fetchFromBackend(artist, title);
      if (lyrics) {
        this.cache.set(cacheKey, lyrics);
        return lyrics;
      }
    } catch (error) {
      log.debug('backend lyrics API not available', {message: String(error)});
    }

    // Try Lyrics.ovh (free, no API key needed)
    try {
      lyrics = await this.fetchFromLyricsOvh(artist, title);
      if (lyrics) {
        this.cache.set(cacheKey, lyrics);
        return lyrics;
      }
    } catch (error) {
      log.debug('lyrics.ovh failed', {message: String(error)});
    }

    // Try Musixmatch (if you have API key)
    try {
      lyrics = await this.fetchFromMusixmatch(artist, title);
      if (lyrics) {
        this.cache.set(cacheKey, lyrics);
        return lyrics;
      }
    } catch (error) {
      log.debug('musixmatch unavailable', {message: String(error)});
    }

    return null;
  }

  /**
   * Fetch from your backend API (if implemented)
   */
  private async fetchFromBackend(artist: string, title: string): Promise<Lyrics | null> {
    // TODO: Implement backend endpoint for lyrics
    // const response = await axios.get(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
    return null;
  }

  /**
   * Fetch from Lyrics.ovh (free, no API key)
   * Note: Returns unsynced lyrics
   */
  private async fetchFromLyricsOvh(artist: string, title: string): Promise<Lyrics | null> {
    try {
      const response = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        {timeout: 5000}
      );

      if (response.data && response.data.lyrics) {
        // Parse lyrics into lines
        const lines = response.data.lyrics
          .split('\n')
          .filter((line: string) => line.trim())
          .map((text: string, index: number) => ({
            time: index * 3, // Approximate timing (3 seconds per line)
            text: text.trim(),
          }));

        return {
          lines,
          synced: false,
          source: 'lyrics.ovh',
        };
      }
    } catch (error) {
      // API might not have the lyrics
    }

    return null;
  }

  /**
   * Fetch from Musixmatch (requires API key)
   * Returns synced lyrics if available
   */
  private async fetchFromMusixmatch(artist: string, title: string): Promise<Lyrics | null> {
    // TODO: Add Musixmatch API key to .env
    const apiKey = process.env.MUSIXMATCH_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      // First, get track ID
      const searchResponse = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
        params: {
          apikey: apiKey,
          q_track: title,
          q_artist: artist,
          s_track_rating: 'desc',
          page_size: 1,
        },
        timeout: 5000,
      });

      const trackId = searchResponse.data?.message?.body?.track_list?.[0]?.track?.track_id;
      if (!trackId) {
        return null;
      }

      // Get lyrics (with sync)
      const lyricsResponse = await axios.get('https://api.musixmatch.com/ws/1.1/track.lyrics.get', {
        params: {
          apikey: apiKey,
          track_id: trackId,
          format: 'json',
        },
        timeout: 5000,
      });

      const lyricsBody = lyricsResponse.data?.message?.body?.lyrics;
      if (!lyricsBody) {
        return null;
      }

      // Parse synced lyrics
      if (lyricsBody.has_subtitles === 1 && lyricsBody.subtitle_body) {
        return this.parseMusixmatchSynced(lyricsBody.subtitle_body);
      }

      // Fallback to unsynced lyrics
      if (lyricsBody.lyrics_body) {
        const lines = lyricsBody.lyrics_body
          .split('\n')
          .filter((line: string) => line.trim() && !line.includes('*******'))
          .map((text: string, index: number) => ({
            time: index * 3,
            text: text.trim(),
          }));

        return {
          lines,
          synced: false,
          source: 'musixmatch',
        };
      }
    } catch (error) {
      log.debug('musixmatch error', {message: String(error)});
    }

    return null;
  }

  /**
   * Parse Musixmatch synced subtitle format
   */
  private parseMusixmatchSynced(subtitleBody: string): Lyrics {
    const lines: LyricsLine[] = [];
    const regex = /\[(\d{2}):(\d{2})\.(\d{2})\](.+)/g;
    let match;

    while ((match = regex.exec(subtitleBody)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = parseInt(match[3], 10);
      const text = match[4].trim();

      if (text) {
        lines.push({
          time: minutes * 60 + seconds + centiseconds / 100,
          text,
        });
      }
    }

    return {
      lines,
      synced: true,
      source: 'musixmatch',
    };
  }

  /**
   * Get current lyrics line based on playback time
   */
  getCurrentLine(lyrics: Lyrics, currentTime: number): LyricsLine | null {
    if (!lyrics || lyrics.lines.length === 0) {
      return null;
    }

    // Find the line that should be displayed now
    for (let i = lyrics.lines.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.lines[i].time) {
        return lyrics.lines[i];
      }
    }

    return lyrics.lines[0] || null;
  }

  /**
   * Clear lyrics cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const lyricsService = new LyricsService();

