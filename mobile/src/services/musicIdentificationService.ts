import {apiService} from './api';
import {Platform} from 'react-native';
import {createLogger} from '../utils/logger';

const log = createLogger('MusicIdentification');
import {launchImageLibrary, MediaType} from 'react-native-image-picker';
import RNFS from 'react-native-fs';

export interface IdentifiedTrack {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  year?: number;
  genre?: string;
  artworkUrl?: string;
  provider: 'acoustid' | 'musicbrainz' | 'manual';
  confidence: number; // 0-1
}

/**
 * Music Identification Service - Shazam-like feature
 * Uses audio fingerprinting to identify music
 */
class MusicIdentificationService {
  private readonly ACOUSTID_API_KEY = process.env.ACOUSTID_API_KEY || '';
  private readonly MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';

  /**
   * Identify music from audio file
   * @param audioFilePath - Path to audio file
   * @returns Identified track information
   */
  async identifyFromFile(audioFilePath: string): Promise<IdentifiedTrack | null> {
    try {
      const fingerprint = await this.generateFingerprint(audioFilePath);

      if (fingerprint) {
        try {
          const relay = await apiService.identifyMusicFingerprint(fingerprint);
          const fromRelay = this.parseAcoustIdLookupJson(relay);
          if (fromRelay) {
            return fromRelay;
          }
        } catch (e) {
          log.warn('identify relay failed', {message: String(e)});
        }

        if (this.ACOUSTID_API_KEY) {
          const direct = await this.lookupAcoustID(fingerprint);
          if (direct) {
            return direct;
          }
        }

        const mbResult = await this.lookupMusicBrainz(fingerprint);
        if (mbResult) {
          return mbResult;
        }
      }

      return await this.extractMetadata(audioFilePath);
    } catch (error) {
      log.error('identifyFromFile failed', {message: String(error)});
      return null;
    }
  }

  /** Normalize AcoustID v2 JSON (from `/identify/audio` relay or direct API). */
  private parseAcoustIdLookupJson(data: unknown): IdentifiedTrack | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const d = data as {
      results?: Array<{
        score?: number;
        recordings?: Array<{
          title?: string;
          artists?: Array<{name?: string}>;
          releasegroups?: Array<{
            title?: string;
            'first-release-date'?: string;
          }>;
        }>;
      }>;
    };
    const results = d.results;
    if (!results?.length) {
      return null;
    }
    const bestMatch = results[0];
    if (!bestMatch.recordings?.length) {
      return null;
    }
    const recording = bestMatch.recordings[0];
    return {
      title: recording.title || 'Unknown',
      artist: recording.artists?.[0]?.name || 'Unknown Artist',
      album: recording.releasegroups?.[0]?.title,
      year: (() => {
        const firstRelease = recording.releasegroups?.[0]?.['first-release-date'];
        const y = firstRelease?.split('-')[0];
        return y ? parseInt(y, 10) : undefined;
      })(),
      provider: 'acoustid',
      confidence: bestMatch.score || 0,
    };
  }

  /**
   * Identify music from microphone recording
   * @param recordingPath - Path to recorded audio
   * @param duration - Recording duration in seconds
   */
  async identifyFromRecording(
    recordingPath: string,
    duration: number = 10
  ): Promise<IdentifiedTrack | null> {
    // For now, treat recording same as file
    // In production, you'd want to optimize for shorter samples
    return this.identifyFromFile(recordingPath);
  }

  /**
   * Generate audio fingerprint using Chromaprint
   * Note: This is a simplified version. In production, use chromaprint library
   */
  private async generateFingerprint(audioFilePath: string): Promise<string | null> {
    try {
      const uri =
        audioFilePath.startsWith('file:') ||
        audioFilePath.startsWith('content:') ||
        audioFilePath.startsWith('http:') ||
        audioFilePath.startsWith('https:')
          ? audioFilePath
          : Platform.OS === 'android'
            ? `file://${audioFilePath}`
            : audioFilePath;

      // TODO: Integrate chromaprint-js or call backend API
      // For now, we'll use a backend endpoint
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/mpeg',
        name: 'audio.mp3',
      } as any);

      const response = await apiService.httpPost<{fingerprint?: string}>(
        '/audio/fingerprint',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response.data.fingerprint ?? null;
    } catch (error) {
      log.warn('generateFingerprint failed', {message: String(error)});
      // Fallback: try to extract metadata
      return null;
    }
  }

  /**
   * Lookup track using AcoustID API
   */
  private async lookupAcoustID(fingerprint: string): Promise<IdentifiedTrack | null> {
    if (!this.ACOUSTID_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `https://api.acoustid.org/v2/lookup?client=${this.ACOUSTID_API_KEY}&fingerprint=${fingerprint}&meta=recordings+releasegroups+releases+tracks`
      );

      const data = await response.json();
      return this.parseAcoustIdLookupJson(data);
    } catch (error) {
      log.warn('AcoustID lookup error', {message: String(error)});
    }

    return null;
  }

  /**
   * Lookup track using MusicBrainz
   */
  private async lookupMusicBrainz(fingerprint: string): Promise<IdentifiedTrack | null> {
    try {
      // MusicBrainz lookup requires recording MBID from AcoustID first
      // This is a simplified version
      // In production, you'd chain AcoustID -> MusicBrainz lookup
      
      // For now, return null and use metadata extraction
      return null;
    } catch (error) {
      log.warn('MusicBrainz lookup error', {message: String(error)});
      return null;
    }
  }

  /**
   * Extract metadata from audio file
   */
  private async extractMetadata(audioFilePath: string): Promise<IdentifiedTrack | null> {
    try {
      // Use backend API to extract metadata
      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${audioFilePath}` : audioFilePath,
        type: 'audio/mpeg',
        name: 'audio.mp3',
      } as any);

      const response = await apiService.httpPost<{
        title?: string;
        artist?: string;
        album?: string;
        year?: number;
        genre?: string;
      }>('/audio/metadata', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const metadata = response.data;
      if (metadata.title || metadata.artist) {
        return {
          title: metadata.title || 'Unknown',
          artist: metadata.artist || 'Unknown Artist',
          album: metadata.album,
          year: metadata.year,
          genre: metadata.genre,
          provider: 'manual',
          confidence: 0.5, // Lower confidence for metadata extraction
        };
      }
    } catch (error) {
      log.warn('Metadata extraction error', {message: String(error)});
    }

    return null;
  }

  /**
   * Search for tracks by title/artist (fallback method)
   */
  async searchTrack(query: string): Promise<IdentifiedTrack[]> {
    try {
      // Use backend search or external API
      const response = await apiService.httpGet<{results?: IdentifiedTrack[]}>(
        `/audio/search?q=${encodeURIComponent(query)}`,
      );
      return response.data.results ?? [];
    } catch (error) {
      log.warn('Track search error', {message: String(error)});
      return [];
    }
  }

  /**
   * Get track artwork URL
   */
  async getArtworkUrl(artist: string, album?: string): Promise<string | null> {
    try {
      // Use Last.fm API or similar for artwork
      const searchQuery = album ? `${artist} ${album}` : artist;
      const response = await fetch(
        `http://ws.audioscrobbler.com/2.0/?method=album.search&album=${encodeURIComponent(searchQuery)}&api_key=${process.env.LASTFM_API_KEY || ''}&format=json`
      );
      
      const data = await response.json();
      const image = data.results?.albummatches?.album?.[0]?.image?.[3]?.['#text'];
      return image || null;
    } catch (error) {
      log.warn('Artwork lookup error', {message: String(error)});
      return null;
    }
  }
}

export const musicIdentificationService = new MusicIdentificationService();

