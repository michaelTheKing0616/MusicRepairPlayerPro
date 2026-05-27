import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Platform} from 'react-native';
import {
  Card,
  Text,
  Switch,
  SegmentedButtons,
  Button,
  useTheme,
  Divider,
} from 'react-native-paper';
import {EQBandSlider} from './EQBandSlider';
import {AudioSettings, EQ_PRESETS, EQ_BANDS} from '../types/audioSettings';

interface EQControlProps {
  settings: AudioSettings['eq'];
  onSettingsChange: (settings: AudioSettings['eq']) => void;
}

export function EQControl({settings, onSettingsChange}: EQControlProps) {
  const theme = useTheme();
  const [preset, setPreset] = useState<string>('Flat');

  useEffect(() => {
    if (settings.preset) {
      setPreset(settings.preset);
    }
  }, [settings.preset]);

  const handleBandChange = (frequency: number, gain: number) => {
    const updatedBands = settings.bands.map(band =>
      band.frequency === frequency ? {...band, gain} : band,
    );
    onSettingsChange({
      ...settings,
      bands: updatedBands,
      preset: 'Custom',
    });
  };

  const handlePresetChange = (newPreset: string) => {
    setPreset(newPreset);
    const presetBands = EQ_PRESETS[newPreset] || EQ_PRESETS.Flat;
    onSettingsChange({
      ...settings,
      bands: presetBands,
      preset: newPreset,
    });
  };

  const handleReset = () => {
    handlePresetChange('Flat');
  };

  const presetButtons = Object.keys(EQ_PRESETS).map(presetName => ({
    value: presetName,
    label: presetName,
  }));

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium">Equalizer (10-Band)</Text>
          <Switch
            value={settings.enabled}
            onValueChange={enabled =>
              onSettingsChange({...settings, enabled})
            }
          />
        </View>

        {settings.enabled && (
          <>
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginBottom: 10}}>
              {Platform.OS === 'android'
                ? 'Android: realtime EQ is applied via a native Equalizer (best-effort; some devices restrict it).'
                : 'iOS: realtime EQ via native audio graph is not wired yet; settings are saved for future support.'}
            </Text>
            <View style={styles.presetContainer}>
              <Text variant="bodySmall" style={styles.presetLabel}>
                Preset:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.presetScroll}>
                {presetButtons.map(({value, label}) => (
                  <Button
                    key={value}
                    mode={preset === value ? 'contained' : 'outlined'}
                    onPress={() => handlePresetChange(value)}
                    compact
                    style={styles.presetButton}>
                    {label}
                  </Button>
                ))}
              </ScrollView>
            </View>

            <Button
              mode="text"
              onPress={handleReset}
              compact
              style={styles.resetButton}>
              Reset to Flat
            </Button>

            <Divider style={styles.divider} />

            <View style={styles.bandsContainer}>
              {settings.bands.map(band => (
                <EQBandSlider
                  key={band.frequency}
                  band={band}
                  onValueChange={gain => handleBandChange(band.frequency, gain)}
                  disabled={!settings.enabled}
                />
              ))}
            </View>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetLabel: {
    marginRight: 8,
  },
  presetScroll: {
    flex: 1,
  },
  presetButton: {
    marginRight: 8,
  },
  resetButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});

