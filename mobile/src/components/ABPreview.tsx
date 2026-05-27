import React, {useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  useTheme,
  Switch,
  Divider,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer, {State} from 'react-native-track-player';
import {AudioFile} from '../types';
import {createLogger} from '../utils/logger';

const log = createLogger('ABPreview');

interface ABPreviewProps {
  originalAudio: AudioFile;
  repairedAudio: AudioFile | null;
  handsFree: boolean;
  onHandsFreeChange: (enabled: boolean) => void;
}

export function ABPreview({
  originalAudio,
  repairedAudio,
  handsFree,
  onHandsFreeChange,
}: ABPreviewProps) {
  const theme = useTheme();
  const [playingTrack, setPlayingTrack] = useState<'original' | 'repaired' | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Listen to playback state changes
    const interval = setInterval(async () => {
      try {
        const state = await TrackPlayer.getState();
        setIsPlaying(state === State.Playing);
      } catch {
        setIsPlaying(false);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const playOriginal = async () => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: originalAudio.id,
        url: originalAudio.supabaseUrl,
        title: 'Original',
        artist: originalAudio.originalFilename,
      });
      await TrackPlayer.play();
      setPlayingTrack('original');
    } catch (error) {
      log.error('playOriginal failed', {message: String(error)});
    }
  };

  const playRepaired = async () => {
    if (!repairedAudio) return;

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: repairedAudio.id,
        url: repairedAudio.supabaseUrl,
        title: 'Repaired',
        artist: originalAudio.originalFilename,
      });
      await TrackPlayer.play();
      setPlayingTrack('repaired');
    } catch (error) {
      log.error('playRepaired failed', {message: String(error)});
    }
  };

  const togglePlayback = async () => {
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      log.error('togglePlayback failed', {message: String(error)});
    }
  };

  const stopPlayback = async () => {
    try {
      await TrackPlayer.stop();
      setPlayingTrack(null);
    } catch (error) {
      log.error('stopPlayback failed', {message: String(error)});
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge">A/B Preview</Text>
          <View style={styles.handsFreeContainer}>
            <Text variant="bodySmall">Hands-Free</Text>
            <Switch
              value={handsFree}
              onValueChange={onHandsFreeChange}
              style={styles.switch}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.tracksContainer}>
          {/* Original Track */}
          <Card
            style={[
              styles.trackCard,
              playingTrack === 'original' && {
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}>
            <Card.Content>
              <View style={styles.trackHeader}>
                <MaterialCommunityIcons
                  name="file-music"
                  size={32}
                  color={theme.colors.primary}
                />
                <View style={styles.trackInfo}>
                  <Text variant="titleMedium">Original</Text>
                  <Text variant="bodySmall" style={styles.filename}>
                    {originalAudio.originalFilename}
                  </Text>
                </View>
              </View>

              <View style={styles.controls}>
                {playingTrack === 'original' && isPlaying ? (
                  <>
                    <IconButton
                      icon="pause"
                      size={32}
                      onPress={togglePlayback}
                      iconColor={theme.colors.primary}
                    />
                    <IconButton
                      icon="stop"
                      size={24}
                      onPress={stopPlayback}
                    />
                  </>
                ) : (
                  <Button
                    mode="contained"
                    onPress={playOriginal}
                    icon="play"
                    disabled={playingTrack === 'repaired'}>
                    Play Original
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Repaired Track */}
          <Card
            style={[
              styles.trackCard,
              playingTrack === 'repaired' && {
                backgroundColor: theme.colors.primaryContainer,
              },
              !repairedAudio && styles.disabledCard,
            ]}>
            <Card.Content>
              <View style={styles.trackHeader}>
                <MaterialCommunityIcons
                  name={repairedAudio ? 'file-music-check' : 'file-music-outline'}
                  size={32}
                  color={
                    repairedAudio
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <View style={styles.trackInfo}>
                  <Text variant="titleMedium">Repaired</Text>
                  {repairedAudio ? (
                    <Text variant="bodySmall" style={styles.filename}>
                      Enhanced version
                    </Text>
                  ) : (
                    <Text variant="bodySmall" style={styles.filename}>
                      Not available yet
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.controls}>
                {repairedAudio ? (
                  playingTrack === 'repaired' && isPlaying ? (
                    <>
                      <IconButton
                        icon="pause"
                        size={32}
                        onPress={togglePlayback}
                        iconColor={theme.colors.primary}
                      />
                      <IconButton
                        icon="stop"
                        size={24}
                        onPress={stopPlayback}
                      />
                    </>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={playRepaired}
                      icon="play"
                      disabled={playingTrack === 'original'}>
                      Play Repaired
                    </Button>
                  )
                ) : (
                  <Button mode="outlined" disabled icon="clock-outline">
                    Processing...
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        </View>

        {handsFree && (
          <View style={styles.handsFreeInfo}>
            <MaterialCommunityIcons
              name="gesture-tap"
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="bodySmall" style={styles.handsFreeText}>
              Hands-free mode: Automatically switch between tracks
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  handsFreeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switch: {
    margin: 0,
  },
  divider: {
    marginVertical: 16,
  },
  tracksContainer: {
    gap: 16,
  },
  trackCard: {
    marginBottom: 8,
  },
  disabledCard: {
    opacity: 0.6,
  },
  trackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  trackInfo: {
    flex: 1,
  },
  filename: {
    opacity: 0.7,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  handsFreeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(103, 80, 164, 0.1)',
    borderRadius: 8,
    gap: 8,
  },
  handsFreeText: {
    flex: 1,
    opacity: 0.8,
  },
});

