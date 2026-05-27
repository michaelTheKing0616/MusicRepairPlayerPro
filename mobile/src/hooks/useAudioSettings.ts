import {useState, useEffect} from 'react';
import {AudioSettings} from '../types/audioSettings';
import {audioSettingsService} from '../services/audioSettingsService';
import {createLogger} from '../utils/logger';

const log = createLogger('useAudioSettings');

export function useAudioSettings() {
  const [settings, setSettings] = useState<AudioSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await audioSettingsService.loadSettings();
      setSettings(loaded);
    } catch (error) {
      log.error('loadSettings failed', {message: String(error)});
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async <K extends keyof AudioSettings>(
    key: K,
    value: Partial<AudioSettings[K]>,
  ) => {
    if (!settings) return;

    const updated = await audioSettingsService.updateSetting(key, value);
    setSettings(updated);
    return updated;
  };

  const resetSettings = async () => {
    await audioSettingsService.resetSettings();
    await loadSettings();
  };

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
    reloadSettings: loadSettings,
  };
}

