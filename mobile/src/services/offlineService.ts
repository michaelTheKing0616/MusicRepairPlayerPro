/**
 * Offline Service
 * Manages offline mode, caching, and sync strategies
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import {createLogger} from '../utils/logger';

export interface OfflineTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  localPath: string;
  artworkPath?: string;
  duration: number;
  fileSize: number;
  downloadedAt: Date;
}

export interface OfflinePlaylist {
  id: string;
  name: string;
  tracks: OfflineTrack[];
  createdAt: Date;
}

const OFFLINE_TRACKS_KEY = '@offline_tracks';
const OFFLINE_PLAYLISTS_KEY = '@offline_playlists';
const OFFLINE_SETTINGS_KEY = '@offline_settings';

const log = createLogger('Offline');

class OfflineService {
  private offlineTracks: Map<string, OfflineTrack> = new Map();
  private isOffline: boolean = false;
  private networkListener: any = null;

  /**
   * Initialize offline service
   */
  async initialize(): Promise<void> {
    await this.loadOfflineTracks();
    this.setupNetworkListener();
  }

  /**
   * Check if device is offline
   */
  async isDeviceOffline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return !state.isConnected;
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener(): void {
    this.networkListener = NetInfo.addEventListener(state => {
      this.isOffline = !state.isConnected;
    });
  }

  /**
   * Download track for offline playback
   */
  async downloadTrack(
    trackId: string,
    audioUrl: string,
    metadata: {
      title: string;
      artist: string;
      album?: string;
      artworkUrl?: string;
    },
  ): Promise<OfflineTrack | null> {
    try {
      const downloadDir = `${RNFS.DocumentDirectoryPath}/offline_tracks`;
      await RNFS.mkdir(downloadDir);

      const fileName = `${trackId}.mp3`;
      const localPath = `${downloadDir}/${fileName}`;

      // Download audio file
      const downloadResult = await RNFS.downloadFile({
        fromUrl: audioUrl,
        toFile: localPath,
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error('Download failed');
      }

      // Download artwork if available
      let artworkPath: string | undefined;
      if (metadata.artworkUrl) {
        const artworkFileName = `${trackId}_artwork.jpg`;
        artworkPath = `${downloadDir}/${artworkFileName}`;
        await RNFS.downloadFile({
          fromUrl: metadata.artworkUrl,
          toFile: artworkPath,
        }).promise;
      }

      const fileInfo = await RNFS.stat(localPath);
      const offlineTrack: OfflineTrack = {
        id: trackId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        localPath,
        artworkPath,
        duration: 0, // Will be populated when playing
        fileSize: Number(fileInfo.size),
        downloadedAt: new Date(),
      };

      this.offlineTracks.set(trackId, offlineTrack);
      await this.saveOfflineTracks();

      return offlineTrack;
    } catch (error) {
      log.error('downloadTrack failed', {trackId, message: String(error)});
      return null;
    }
  }

  /**
   * Remove offline track
   */
  async removeOfflineTrack(trackId: string): Promise<boolean> {
    try {
      const track = this.offlineTracks.get(trackId);
      if (!track) {
        return false;
      }

      // Delete files
      if (await RNFS.exists(track.localPath)) {
        await RNFS.unlink(track.localPath);
      }
      if (track.artworkPath && (await RNFS.exists(track.artworkPath))) {
        await RNFS.unlink(track.artworkPath);
      }

      this.offlineTracks.delete(trackId);
      await this.saveOfflineTracks();

      return true;
    } catch (error) {
      log.error('removeOfflineTrack failed', {trackId, message: String(error)});
      return false;
    }
  }

  /**
   * Get offline track
   */
  getOfflineTrack(trackId: string): OfflineTrack | null {
    return this.offlineTracks.get(trackId) || null;
  }

  /**
   * Get all offline tracks
   */
  getAllOfflineTracks(): OfflineTrack[] {
    return Array.from(this.offlineTracks.values());
  }

  /**
   * Check if track is available offline
   */
  isTrackOffline(trackId: string): boolean {
    return this.offlineTracks.has(trackId);
  }

  /**
   * Get total offline storage size
   */
  async getOfflineStorageSize(): Promise<number> {
    let totalSize = 0;
    for (const track of this.offlineTracks.values()) {
      totalSize += track.fileSize;
    }
    return totalSize;
  }

  /**
   * Load offline tracks from storage
   */
  private async loadOfflineTracks(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_TRACKS_KEY);
      if (data) {
        const tracks: OfflineTrack[] = JSON.parse(data);
        tracks.forEach(track => {
          // Verify files still exist
          RNFS.exists(track.localPath).then(exists => {
            if (exists) {
              this.offlineTracks.set(track.id, track);
            }
          });
        });
      }
    } catch (error) {
      log.error('loadOfflineTracks failed', {message: String(error)});
    }
  }

  /**
   * Save offline tracks to storage
   */
  private async saveOfflineTracks(): Promise<void> {
    try {
      const tracks = Array.from(this.offlineTracks.values());
      await AsyncStorage.setItem(OFFLINE_TRACKS_KEY, JSON.stringify(tracks));
    } catch (error) {
      log.error('saveOfflineTracks failed', {message: String(error)});
    }
  }

  /**
   * Clear all offline content
   */
  async clearAllOffline(): Promise<boolean> {
    try {
      const downloadDir = `${RNFS.DocumentDirectoryPath}/offline_tracks`;
      if (await RNFS.exists(downloadDir)) {
        await RNFS.unlink(downloadDir);
      }

      this.offlineTracks.clear();
      await AsyncStorage.removeItem(OFFLINE_TRACKS_KEY);
      await AsyncStorage.removeItem(OFFLINE_PLAYLISTS_KEY);

      return true;
    } catch (error) {
      log.error('clearAllOffline failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.networkListener) {
      this.networkListener();
    }
  }
}

export const offlineService = new OfflineService();

