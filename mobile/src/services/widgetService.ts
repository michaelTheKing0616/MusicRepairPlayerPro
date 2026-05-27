/**
 * Widget Service
 * Manages Android home screen widget updates from React Native
 */

import {Platform, NativeModules, NativeEventEmitter} from 'react-native';
import {createLogger} from '../utils/logger';

const log = createLogger('Widget');

// Native module interface
interface WidgetModule {
  updateWidget(trackTitle: string, artist: string, isPlaying: boolean): void;
}

const {MusicWidgetModule} = NativeModules;

class WidgetService {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && MusicWidgetModule) {
      this.eventEmitter = new NativeEventEmitter(MusicWidgetModule);
    }
  }

  /**
   * Update widget with current track information
   */
  updateWidget(trackTitle: string, artist: string, isPlaying: boolean): void {
    if (Platform.OS !== 'android' || !MusicWidgetModule) {
      return;
    }

    try {
      MusicWidgetModule.updateWidget(trackTitle, artist, isPlaying);
    } catch (error) {
      log.warn('updateWidget failed', {message: String(error)});
    }
  }

  /**
   * Listen for widget command events
   */
  onWidgetCommand(callback: (command: string) => void): () => void {
    if (!this.eventEmitter) {
      return () => {};
    }

    const subscription = this.eventEmitter.addListener('WidgetCommand', (data) => {
      callback(data.command);
    });

    return () => subscription.remove();
  }
}

export const widgetService = new WidgetService();

