import AsyncStorage from '@react-native-async-storage/async-storage';
import {AudioFile} from '../types';
import {createLogger} from '../utils/logger';

const log = createLogger('RecentlyPlayed');

const RECENTLY_PLAYED_KEY = '@music_app:recently_played';
const MAX_RECENT_ITEMS = 50;

export interface PlayHistoryItem {
  audioFile: AudioFile;
  playedAt: number; // Timestamp
  playCount: number;
  lastPosition?: number; // Last playback position in seconds
}

/**
 * Service to manage recently played tracks
 */
class RecentlyPlayedService {
  /**
   * Add a track to recently played
   */
  async addToRecentlyPlayed(audioFile: AudioFile, position?: number): Promise<void> {
    try {
      const history = await this.getRecentlyPlayed();
      
      // Remove if already exists
      const filtered = history.filter(item => item.audioFile.id !== audioFile.id);
      
      // Check if already played before
      const existing = history.find(item => item.audioFile.id === audioFile.id);
      const playCount = existing ? existing.playCount + 1 : 1;

      // Add to beginning
      const newItem: PlayHistoryItem = {
        audioFile,
        playedAt: Date.now(),
        playCount,
        lastPosition: position,
      };

      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
      
      await AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
    } catch (error) {
      log.error('addToRecentlyPlayed failed', {message: String(error)});
    }
  }

  /**
   * Get recently played tracks
   */
  async getRecentlyPlayed(): Promise<PlayHistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('getRecentlyPlayed failed', {message: String(error)});
    }
    return [];
  }

  /**
   * Get most played tracks
   */
  async getMostPlayed(limit: number = 20): Promise<PlayHistoryItem[]> {
    try {
      const history = await this.getRecentlyPlayed();
      return history
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, limit);
    } catch (error) {
      log.error('getMostPlayed failed', {message: String(error)});
      return [];
    }
  }

  /**
   * Clear recently played history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(RECENTLY_PLAYED_KEY);
    } catch (error) {
      log.error('clearHistory failed', {message: String(error)});
    }
  }

  /**
   * Remove a specific track from history
   */
  async removeFromHistory(audioFileId: string): Promise<void> {
    try {
      const history = await this.getRecentlyPlayed();
      const filtered = history.filter(item => item.audioFile.id !== audioFileId);
      await AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(filtered));
    } catch (error) {
      log.error('removeFromHistory failed', {message: String(error)});
    }
  }

  /**
   * Get total play time (in seconds)
   */
  async getTotalPlayTime(): Promise<number> {
    try {
      const history = await this.getRecentlyPlayed();
      return history.reduce((total, item) => {
        return total + (item.audioFile.duration || 0) * item.playCount;
      }, 0);
    } catch (error) {
      log.error('getTotalPlayTime failed', {message: String(error)});
      return 0;
    }
  }

  /**
   * Get play count for a specific track
   */
  async getPlayCount(audioFileId: string): Promise<number> {
    try {
      const history = await this.getRecentlyPlayed();
      const item = history.find(h => h.audioFile.id === audioFileId);
      return item?.playCount || 0;
    } catch (error) {
      log.error('getPlayCount failed', {message: String(error)});
      return 0;
    }
  }
}

export const recentlyPlayedService = new RecentlyPlayedService();

