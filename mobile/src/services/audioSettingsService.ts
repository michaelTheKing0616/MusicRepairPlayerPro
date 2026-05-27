import AsyncStorage from '@react-native-async-storage/async-storage';
import {AudioSettings, DEFAULT_AUDIO_SETTINGS} from '../types/audioSettings';
import {createLogger} from '../utils/logger';

const log = createLogger('AudioSettings');

const STORAGE_KEY = '@audio_settings';

class AudioSettingsService {
  /**
   * Load audio settings from AsyncStorage
   */
  async loadSettings(): Promise<AudioSettings> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(parsed);
      }
      return DEFAULT_AUDIO_SETTINGS;
    } catch (error) {
      log.error('loadSettings failed', {message: String(error)});
      return DEFAULT_AUDIO_SETTINGS;
    }
  }

  /**
   * Save audio settings to AsyncStorage
   */
  async saveSettings(settings: AudioSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      log.error('saveSettings failed', {message: String(error)});
      throw error;
    }
  }

  /**
   * Update specific audio setting
   */
  async updateSetting<K extends keyof AudioSettings>(
    key: K,
    value: Partial<AudioSettings[K]>,
  ): Promise<AudioSettings> {
    const current = await this.loadSettings();
    const updated = {
      ...current,
      [key]: {
        ...current[key],
        ...value,
      },
    };
    await this.saveSettings(updated);
    return updated;
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Merge loaded settings with defaults to ensure completeness
   */
  private mergeWithDefaults(loaded: Partial<AudioSettings>): AudioSettings {
    return {
      eq: {
        ...DEFAULT_AUDIO_SETTINGS.eq,
        ...loaded.eq,
        bands: loaded.eq?.bands || DEFAULT_AUDIO_SETTINGS.eq.bands,
      },
      bassBoost: {
        ...DEFAULT_AUDIO_SETTINGS.bassBoost,
        ...loaded.bassBoost,
      },
      trebleEnhancer: {
        ...DEFAULT_AUDIO_SETTINGS.trebleEnhancer,
        ...loaded.trebleEnhancer,
      },
      compressor: {
        ...DEFAULT_AUDIO_SETTINGS.compressor,
        ...loaded.compressor,
      },
      normalizer: {
        ...DEFAULT_AUDIO_SETTINGS.normalizer,
        ...loaded.normalizer,
      },
      crossfade: {
        ...DEFAULT_AUDIO_SETTINGS.crossfade,
        ...loaded.crossfade,
      },
      autoEQ: {
        ...DEFAULT_AUDIO_SETTINGS.autoEQ,
        ...loaded.autoEQ,
      },
      playback: {
        ...DEFAULT_AUDIO_SETTINGS.playback,
        ...loaded.playback,
      },
    };
  }
}

export const audioSettingsService = new AudioSettingsService();

