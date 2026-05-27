import AsyncStorage from '@react-native-async-storage/async-storage';
import {AudioFile} from '../types';
import {createLogger} from '../utils/logger';

const log = createLogger('QueueHistory');

const QUEUE_HISTORY_KEY = '@music_app:queue_history';
const MAX_HISTORY_ITEMS = 100;

interface QueueHistoryItem {
  audioFile: AudioFile;
  playedAt: number; // Timestamp
  duration: number; // How long it played (in seconds)
  completed: boolean; // Whether track was played fully
}

/**
 * Service to manage queue playback history
 */
class QueueHistoryService {
  /**
   * Add a track to queue history
   */
  async addToHistory(
    audioFile: AudioFile,
    duration: number,
    completed: boolean = false
  ): Promise<void> {
    try {
      const history = await this.getHistory();
      
      const newItem: QueueHistoryItem = {
        audioFile,
        playedAt: Date.now(),
        duration,
        completed,
      };

      // Add to beginning and limit size
      const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
      
      await AsyncStorage.setItem(QUEUE_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      log.error('addToHistory failed', {message: String(error)});
    }
  }

  /**
   * Get queue history
   */
  async getHistory(): Promise<QueueHistoryItem[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_HISTORY_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      log.error('getHistory failed', {message: String(error)});
    }
    return [];
  }

  /**
   * Get history for a specific session (e.g., today)
   */
  async getSessionHistory(sessionStartTime: number): Promise<QueueHistoryItem[]> {
    try {
      const history = await this.getHistory();
      return history.filter(item => item.playedAt >= sessionStartTime);
    } catch (error) {
      log.error('getSessionHistory failed', {message: String(error)});
      return [];
    }
  }

  /**
   * Get today's history
   */
  async getTodayHistory(): Promise<QueueHistoryItem[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return this.getSessionHistory(todayStart.getTime());
  }

  /**
   * Clear queue history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_HISTORY_KEY);
    } catch (error) {
      log.error('clearHistory failed', {message: String(error)});
    }
  }

  /**
   * Remove a specific item from history
   */
  async removeFromHistory(audioFileId: string, playedAt: number): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(
        item => !(item.audioFile.id === audioFileId && item.playedAt === playedAt)
      );
      await AsyncStorage.setItem(QUEUE_HISTORY_KEY, JSON.stringify(filtered));
    } catch (error) {
      log.error('removeFromHistory failed', {message: String(error)});
    }
  }

  /**
   * Get total listening time (in seconds)
   */
  async getTotalListeningTime(startTime?: number): Promise<number> {
    try {
      let history = await this.getHistory();
      if (startTime) {
        history = history.filter(item => item.playedAt >= startTime);
      }
      return history.reduce((total, item) => total + item.duration, 0);
    } catch (error) {
      log.error('getTotalListeningTime failed', {message: String(error)});
      return 0;
    }
  }

  /**
   * Get completion rate (percentage of tracks played fully)
   */
  async getCompletionRate(): Promise<number> {
    try {
      const history = await this.getHistory();
      if (history.length === 0) {
        return 0;
      }
      const completed = history.filter(item => item.completed).length;
      return (completed / history.length) * 100;
    } catch (error) {
      log.error('getCompletionRate failed', {message: String(error)});
      return 0;
    }
  }
}

export const queueHistoryService = new QueueHistoryService();

