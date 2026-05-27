import React, {useState} from 'react';
import {View, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {
  Card,
  Text,
  Switch,
  useTheme,
  Divider,
  SegmentedButtons,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import {AudioSettings} from '../types/audioSettings';
import {aiAudioOptimizerService} from '../services/aiAudioOptimizer';
import {hapticService} from '../services/hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('AudioEnhancements');

interface AudioEnhancementControlsProps {
  settings: AudioSettings;
  onSettingsChange: <K extends keyof AudioSettings>(
    key: K,
    value: Partial<AudioSettings[K]>,
  ) => void;
  currentAudioUrl?: string; // For AI optimization
  audioMetadata?: {
    genre?: string;
    bitrate?: number;
    sampleRate?: number;
  };
}

export function AudioEnhancementControls({
  settings,
  onSettingsChange,
  currentAudioUrl,
  audioMetadata,
}: AudioEnhancementControlsProps) {
  const theme = useTheme();
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleAIOptimize = async () => {
    if (!currentAudioUrl) {
      Alert.alert('No Audio', 'Please play an audio track first to optimize settings.');
      return;
    }

    setIsOptimizing(true);
    hapticService.medium();

    try {
      let optimized;
      
      // Try full analysis first
      if (currentAudioUrl) {
        try {
          optimized = await aiAudioOptimizerService.analyzeAndOptimize(currentAudioUrl);
        } catch (error) {
          log.warn('full analysis failed; using quick optimize', {message: String(error)});
          // Fallback to quick optimize based on metadata
          optimized = await aiAudioOptimizerService.quickOptimize(audioMetadata || {});
        }
      } else {
        // Use metadata-based optimization
        optimized = await aiAudioOptimizerService.quickOptimize(audioMetadata || {});
      }

      // Apply optimized settings
      const updatedSettings = aiAudioOptimizerService.applyOptimizedSettings(
        settings,
        optimized,
      );

      // Update all settings
      Object.entries(updatedSettings).forEach(([key, value]) => {
        if (key !== 'eq') {
          onSettingsChange(key as keyof AudioSettings, value as any);
        }
      });

      // Update EQ bands
      if (updatedSettings.eq?.bands) {
        onSettingsChange('eq', {
          bands: updatedSettings.eq.bands,
        });
      }

      // Update other settings
      if (updatedSettings.bassBoost !== undefined) {
        onSettingsChange('bassBoost', {
          enabled: updatedSettings.bassBoost.level > 0,
          level: updatedSettings.bassBoost.level,
        });
      }

      if (updatedSettings.trebleEnhancer !== undefined) {
        onSettingsChange('trebleEnhancer', {
          enabled: updatedSettings.trebleEnhancer.level > 0,
          level: updatedSettings.trebleEnhancer.level,
        });
      }

      if (updatedSettings.compressor) {
        onSettingsChange('compressor', {
          ...updatedSettings.compressor,
        });
      }

      if (updatedSettings.normalizer) {
        onSettingsChange('normalizer', {
          enabled: true,
          targetLevel: updatedSettings.normalizer.targetLevel,
        });
      }

      if (updatedSettings.crossfade !== undefined) {
        onSettingsChange('crossfade', {
          enabled: updatedSettings.crossfade.enabled,
          duration: settings.crossfade.duration,
        });
      }

      hapticService.success();
      Alert.alert(
        'Settings Optimized',
        optimized.reasoning || 'Audio settings have been optimized based on AI analysis.',
        [{text: 'OK'}],
      );
    } catch (error) {
      log.error('handleAIOptimize failed', {message: String(error)});
      hapticService.error();
      Alert.alert(
        'Optimization Failed',
        'Could not optimize settings. Please try again later.',
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <>
      {/* Bass Boost */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Bass Boost</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Enhance low frequencies
              </Text>
            </View>
            <Switch
              value={settings.bassBoost.enabled}
              onValueChange={enabled =>
                onSettingsChange('bassBoost', {enabled})
              }
            />
          </View>
          {settings.bassBoost.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sliderContainer}>
                <Slider
                  value={settings.bassBoost.level}
                  onValueChange={(level: number) =>
                    onSettingsChange('bassBoost', {level})
                  }
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                />
                <Text variant="bodySmall" style={styles.value}>
                  {settings.bassBoost.level}%
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Treble Enhancer */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Treble Enhancer</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Enhance high frequencies
              </Text>
            </View>
            <Switch
              value={settings.trebleEnhancer.enabled}
              onValueChange={enabled =>
                onSettingsChange('trebleEnhancer', {enabled})
              }
            />
          </View>
          {settings.trebleEnhancer.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sliderContainer}>
                <Slider
                  value={settings.trebleEnhancer.level}
                  onValueChange={(level: number) =>
                    onSettingsChange('trebleEnhancer', {level})
                  }
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                />
                <Text variant="bodySmall" style={styles.value}>
                  {settings.trebleEnhancer.level}%
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Compressor */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Compressor</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Dynamic range compression
              </Text>
            </View>
            <Switch
              value={settings.compressor.enabled}
              onValueChange={enabled =>
                onSettingsChange('compressor', {enabled})
              }
            />
          </View>
          {settings.compressor.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.controlsGrid}>
                <View style={styles.controlItem}>
                  <Text variant="bodySmall">Threshold</Text>
                  <Slider
                    value={settings.compressor.threshold}
                    onValueChange={(threshold: number) =>
                      onSettingsChange('compressor', {threshold})
                    }
                    minimumValue={-60}
                    maximumValue={0}
                    step={1}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.surfaceVariant}
                  />
                  <Text variant="bodySmall" style={styles.value}>
                    {settings.compressor.threshold} dB
                  </Text>
                </View>
                <View style={styles.controlItem}>
                  <Text variant="bodySmall">Ratio</Text>
                  <Slider
                    value={settings.compressor.ratio}
                    onValueChange={(ratio: number) =>
                      onSettingsChange('compressor', {ratio})
                    }
                    minimumValue={1}
                    maximumValue={20}
                    step={0.5}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.surfaceVariant}
                  />
                  <Text variant="bodySmall" style={styles.value}>
                    1:{settings.compressor.ratio}
                  </Text>
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Normalizer */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Normalizer</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Automatic volume leveling
              </Text>
            </View>
            <Switch
              value={settings.normalizer.enabled}
              onValueChange={enabled =>
                onSettingsChange('normalizer', {enabled})
              }
            />
          </View>
          {settings.normalizer.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sliderContainer}>
                <Text variant="bodySmall">Target Level</Text>
                <Slider
                  value={settings.normalizer.targetLevel}
                  onValueChange={(targetLevel: number) =>
                    onSettingsChange('normalizer', {targetLevel})
                  }
                  minimumValue={-24}
                  maximumValue={0}
                  step={1}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                />
                <Text variant="bodySmall" style={styles.value}>
                  {settings.normalizer.targetLevel} dB
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Crossfade */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Crossfade</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Smooth transitions between tracks
              </Text>
            </View>
            <Switch
              value={settings.crossfade.enabled}
              onValueChange={enabled =>
                onSettingsChange('crossfade', {enabled})
              }
            />
          </View>
          {settings.crossfade.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sliderContainer}>
                <Slider
                  value={settings.crossfade.duration}
                  onValueChange={(duration: number) =>
                    onSettingsChange('crossfade', {duration})
                  }
                  minimumValue={0}
                  maximumValue={10}
                  step={0.5}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surfaceVariant}
                />
                <Text variant="bodySmall" style={styles.value}>
                  {settings.crossfade.duration.toFixed(1)}s
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Auto-EQ Mode */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.labelContainer}>
              <Text variant="titleSmall">Auto-EQ Mode</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Intelligent audio enhancement
              </Text>
            </View>
            <Switch
              value={settings.autoEQ.enabled}
              onValueChange={enabled =>
                onSettingsChange('autoEQ', {enabled})
              }
            />
          </View>
          {settings.autoEQ.enabled && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.autoEQContainer}>
                <Text variant="bodySmall" style={styles.label}>
                  Mode:
                </Text>
                <SegmentedButtons
                  value={settings.autoEQ.mode}
                  onValueChange={mode =>
                    onSettingsChange('autoEQ', {mode: mode as any})
                  }
                  buttons={[
                    {value: 'studio', label: 'Studio'},
                    {value: 'concert', label: 'Concert'},
                    {value: 'warm', label: 'Warm'},
                    {value: 'bright', label: 'Bright'},
                    {value: 'flat', label: 'Flat'},
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>
              
              {/* AI Audio Optimizer Button */}
              <Divider style={styles.divider} />
              <Button
                mode="contained"
                onPress={handleAIOptimize}
                disabled={isOptimizing || !currentAudioUrl}
                loading={isOptimizing}
                icon="robot"
                style={styles.optimizeButton}
                contentStyle={styles.optimizeButtonContent}>
                {isOptimizing ? 'Analyzing...' : 'AI Optimize Settings'}
              </Button>
              {audioMetadata?.genre && (
                <Text variant="bodySmall" style={styles.genreHint}>
                  Genre: {audioMetadata.genre}
                </Text>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    </>
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
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  sliderContainer: {
    marginTop: 8,
  },
  value: {
    marginTop: 4,
    textAlign: 'right',
  },
  controlsGrid: {
    gap: 16,
  },
  controlItem: {
    marginTop: 8,
  },
  autoEQContainer: {
    marginTop: 8,
  },
  label: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  optimizeButton: {
    marginTop: 16,
  },
  optimizeButtonContent: {
    paddingVertical: 8,
  },
  genreHint: {
    marginTop: 8,
    opacity: 0.7,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

