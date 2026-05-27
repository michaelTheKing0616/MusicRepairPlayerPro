import {DeviceEventEmitter} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import {createLogger} from '../utils/logger';

const log = createLogger('SleepTimer');

const SLEEP_TIMER_EVENT = 'sleepTimerTick';
const SLEEP_TIMER_END = 'sleepTimerEnd';

/**
 * Sleep Timer Service - Auto-stop playback after specified time
 */
class SleepTimerService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private endTime: number = 0;
  private duration: number = 0; // Duration in minutes
  private isActive: boolean = false;

  /**
   * Start sleep timer
   * @param minutes - Duration in minutes (0 = end of current track)
   */
  async start(minutes: number = 15): Promise<void> {
    this.stop(); // Clear any existing timer

    if (minutes === 0) {
      // End after current track
      // This would require tracking track changes
      minutes = 5; // Default to 5 minutes if track end detection not implemented
    }

    this.duration = minutes;
    this.endTime = Date.now() + minutes * 60 * 1000;
    this.isActive = true;

    // Emit tick every second
    this.timerId = setInterval(() => {
      const remaining = this.getRemainingSeconds();
      
      if (remaining <= 0) {
        this.stop();
        this.pausePlayback();
        DeviceEventEmitter.emit(SLEEP_TIMER_END);
      } else {
        DeviceEventEmitter.emit(SLEEP_TIMER_EVENT, remaining);
      }
    }, 1000);
  }

  /**
   * Stop sleep timer
   */
  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isActive = false;
    this.endTime = 0;
    DeviceEventEmitter.emit(SLEEP_TIMER_EVENT, 0);
  }

  /**
   * Get remaining time in seconds
   */
  getRemainingSeconds(): number {
    if (!this.isActive) {
      return 0;
    }
    const remaining = Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
    return remaining;
  }

  /**
   * Get remaining time formatted (MM:SS)
   */
  getRemainingFormatted(): string {
    const seconds = this.getRemainingSeconds();
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Check if timer is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current duration setting
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * Add minutes to existing timer
   */
  addMinutes(minutes: number): void {
    if (this.isActive) {
      this.endTime += minutes * 60 * 1000;
      this.duration += minutes;
    }
  }

  /**
   * Pause playback when timer ends
   */
  private async pausePlayback(): Promise<void> {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      log.warn('pausePlayback failed', {message: String(error)});
    }
  }

  /**
   * Quick preset timers
   */
  static readonly PRESETS = {
    END_OF_TRACK: 0,
    FIFTEEN_MIN: 15,
    THIRTY_MIN: 30,
    SIXTY_MIN: 60,
    NINETY_MIN: 90,
  };
}

export const sleepTimerService = new SleepTimerService();
export const SLEEP_TIMER_PRESETS = SleepTimerService.PRESETS;

