import {getAll, SortSongFields, SortSongOrder} from 'react-native-get-music-files';
import {Platform, PermissionsAndroid} from 'react-native';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {LocalMusicFile} from '../types';
import {createLogger} from '../utils/logger';

const log = createLogger('LocalMusic');

class LocalMusicService {
  private cachedSongs: LocalMusicFile[] | null = null;
  private lastScanTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Request necessary permissions for accessing music files
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Android 13+ (API 33+)
        if (Platform.Version >= 33) {
          const result = await request(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);
          return result === RESULTS.GRANTED;
        }
        // Android 11-12 (API 30-32)
        else if (Platform.Version >= 30) {
          const readResult = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          return readResult === RESULTS.GRANTED;
        }
        // Android 10 and below
        else {
          const readResult = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          const writeResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          return readResult === RESULTS.GRANTED && writeResult === RESULTS.GRANTED;
        }
      } else if (Platform.OS === 'ios') {
        // iOS uses MediaLibrary permission
        // Note: react-native-get-music-files uses native iOS permissions
        return true;
      }
      return false;
    } catch (error) {
      log.error('requestPermissions failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);
          return result === RESULTS.GRANTED;
        } else if (Platform.Version >= 30) {
          const result = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          return result === RESULTS.GRANTED;
        } else {
          const readResult = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
          const writeResult = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          return readResult === RESULTS.GRANTED && writeResult === RESULTS.GRANTED;
        }
      }
      return true; // iOS handled natively
    } catch (error) {
      log.error('hasPermissions failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Scan device for all music files
   */
  async getAllSongs(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'title' | 'artist' | 'album' | 'duration';
    sortOrder?: 'asc' | 'desc';
  }): Promise<LocalMusicFile[]> {
    try {
      // Check permissions first
      const hasPerms = await this.hasPermissions();
      if (!hasPerms) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Storage permissions are required to scan music files');
        }
      }

      // Return cached data if available and recent
      const now = Date.now();
      if (
        this.cachedSongs &&
        now - this.lastScanTime < this.CACHE_DURATION
      ) {
        return this.applyFilters(this.cachedSongs, options);
      }

      // Scan for music files
      const songs = await getAll({
        limit: 10000, // Get all songs (high limit)
        offset: 0,
        coverQuality: 100,
        minSongDuration: 1000, // 1 second minimum
        sortBy: SortSongFields.TITLE,
        sortOrder: SortSongOrder.ASC,
      });

      // Handle error response (package may return string on error)
      if (typeof songs === 'string') {
        throw new Error(songs);
      }

      // Transform to LocalMusicFile format
      const formattedSongs: LocalMusicFile[] = songs.map((song: any) => ({
        id: song.id || `${song.path || ''}-${song.title || 'unknown'}`,
        title: song.title || 'Unknown Title',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        duration: song.duration || 0,
        path: song.path || song.uri || '',
        fileName: song.filename || song.title || '',
        fileSize: song.size || 0,
        cover: song.cover || undefined,
        genre: song.genre || undefined,
        year: song.year || undefined,
        track: song.track || undefined,
        bitrate: song.bitrate || undefined,
        sampleRate: song.sampleRate || undefined,
      }));

      // Cache the results
      this.cachedSongs = formattedSongs;
      this.lastScanTime = now;

      return this.applyFilters(formattedSongs, options);
    } catch (error: any) {
      log.error('getAllSongs failed', {message: String(error)});
      throw new Error(
        error.message || 'Failed to scan music files. Please check permissions.',
      );
    }
  }

  /**
   * Get songs by artist
   */
  async getSongsByArtist(artist: string): Promise<LocalMusicFile[]> {
    const allSongs = await this.getAllSongs();
    return allSongs.filter(
      song => song.artist.toLowerCase().includes(artist.toLowerCase()),
    );
  }

  /**
   * Get songs by album
   */
  async getSongsByAlbum(album: string): Promise<LocalMusicFile[]> {
    const allSongs = await this.getAllSongs();
    return allSongs.filter(
      song => song.album.toLowerCase().includes(album.toLowerCase()),
    );
  }

  /**
   * Search songs by query
   */
  async searchSongs(query: string): Promise<LocalMusicFile[]> {
    const allSongs = await this.getAllSongs();
    const lowerQuery = query.toLowerCase();
    return allSongs.filter(
      song =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery) ||
        song.album.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get all unique artists
   */
  async getAllArtists(): Promise<string[]> {
    const allSongs = await this.getAllSongs();
    const artists = new Set(allSongs.map(song => song.artist));
    return Array.from(artists).sort();
  }

  /**
   * Get all unique albums
   */
  async getAllAlbums(): Promise<string[]> {
    const allSongs = await this.getAllSongs();
    const albums = new Set(allSongs.map(song => song.album));
    return Array.from(albums).sort();
  }

  /**
   * Get song by ID
   */
  async getSongById(id: string): Promise<LocalMusicFile | null> {
    const allSongs = await this.getAllSongs();
    return allSongs.find(song => song.id === id) || null;
  }

  /**
   * Clear cache and rescan
   */
  async refresh(): Promise<LocalMusicFile[]> {
    this.cachedSongs = null;
    this.lastScanTime = 0;
    return this.getAllSongs();
  }

  /**
   * Apply filters and sorting to songs
   */
  private applyFilters(
    songs: LocalMusicFile[],
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'title' | 'artist' | 'album' | 'duration';
      sortOrder?: 'asc' | 'desc';
    },
  ): LocalMusicFile[] {
    let result = [...songs];

    // Sort
    if (options?.sortBy) {
      const order = options.sortOrder === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * order;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * order;
        }
        return 0;
      });
    }

    // Pagination
    if (options?.offset) {
      result = result.slice(options.offset);
    }
    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }
}

export const localMusicService = new LocalMusicService();

