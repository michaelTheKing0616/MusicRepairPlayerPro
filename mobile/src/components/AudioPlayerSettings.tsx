import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {useTheme, Text, Divider, Switch, Button, SegmentedButtons} from 'react-native-paper';
import {ThemePicker} from './ThemePicker';
import {EQControl} from './EQControl';
import {AudioEnhancementControls} from './AudioEnhancementControls';
import {AudioSettings} from '../types/audioSettings';
import {audioSettingsService} from '../services/audioSettingsService';
import {createLogger} from '../utils/logger';

const log = createLogger('AudioPlayerSettings');

interface AudioPlayerSettingsProps {
  onClose?: () => void;
  currentAudioUrl?: string;
  audioMetadata?: {
    genre?: string;
    bitrate?: number;
    sampleRate?: number;
  };
}

export function AudioPlayerSettings({
  onClose,
  currentAudioUrl,
  audioMetadata,
}: AudioPlayerSettingsProps) {
  const theme = useTheme();
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

  const handleSettingsChange = async <K extends keyof AudioSettings>(
    key: K,
    value: Partial<AudioSettings[K]>
  ) => {
    if (!settings) return;

    const updated = {
      ...settings,
      [key]: {
        ...settings[key],
        ...value,
      },
    };

    setSettings(updated);
    await audioSettingsService.saveSettings(updated);
  };

  if (loading || !settings) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Audio Enhancement Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          Audio Enhancements
        </Text>
        <EQControl
          settings={settings.eq}
          onSettingsChange={value => handleSettingsChange('eq', value)}
        />
        <AudioEnhancementControls
          settings={settings}
          onSettingsChange={handleSettingsChange}
          currentAudioUrl={currentAudioUrl}
          audioMetadata={audioMetadata}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Theme Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          Appearance
        </Text>
        <ThemePicker />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 8,
  },
});
