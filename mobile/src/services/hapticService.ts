import {Platform} from 'react-native';
// Note: Install react-native-haptic-feedback for iOS
// For Android, we'll use a lightweight implementation
import {createLogger} from '../utils/logger';

const log = createLogger('Haptics');

class HapticService {
  private enabled: boolean = true;

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Light impact haptic feedback
   */
  light() {
    if (!this.enabled) return;
    this.trigger('light');
  }

  /**
   * Medium impact haptic feedback
   */
  medium() {
    if (!this.enabled) return;
    this.trigger('medium');
  }

  /**
   * Heavy impact haptic feedback
   */
  heavy() {
    if (!this.enabled) return;
    this.trigger('heavy');
  }

  /**
   * Success haptic feedback
   */
  success() {
    if (!this.enabled) return;
    this.trigger('success');
  }

  /**
   * Warning haptic feedback
   */
  warning() {
    if (!this.enabled) return;
    this.trigger('warning');
  }

  /**
   * Error haptic feedback
   */
  error() {
    if (!this.enabled) return;
    this.trigger('error');
  }

  /**
   * Selection haptic feedback (for UI interactions)
   */
  selection() {
    if (!this.enabled) return;
    this.trigger('selection');
  }

  private trigger(type: string) {
    const iosMajor =
      Platform.OS === 'ios'
        ? Number.parseInt(String(Platform.Version).split('.')[0] ?? '0', 10)
        : 0;

    if (Platform.OS === 'ios') {
      // iOS haptic feedback
      try {
        // Using Vibration API as fallback
        // In production, install: npm install react-native-haptic-feedback
        if (!Number.isNaN(iosMajor) && iosMajor >= 13) {
          // Use native haptics if available
          // This is a placeholder - install react-native-haptic-feedback for full support
        }
      } catch (error) {
        log.warn('iOS haptic fallback unavailable', {message: String(error)});
      }
    } else if (Platform.OS === 'android') {
      // Android vibration
      try {
        const {Vibration} = require('react-native');
        const patterns: Record<string, number | number[]> = {
          light: 10,
          medium: 20,
          heavy: 50,
          success: [10, 50, 10],
          warning: [10, 20, 10, 20, 10],
          error: [50, 50, 50],
          selection: 10,
        };

        const pattern = patterns[type] ?? 10;
        if (Array.isArray(pattern)) {
          Vibration.vibrate(pattern);
        } else {
          Vibration.vibrate(pattern);
        }
      } catch (error) {
        log.warn('Android vibration unavailable', {message: String(error)});
      }
    }
  }
}

export const hapticService = new HapticService();

