import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, ActivityIndicator, Alert} from 'react-native';
import {
  Card,
  Text,
  IconButton,
  ProgressBar,
  Chip,
  Button,
  Dialog,
  Portal,
  TextInput,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
  Event,
} from 'react-native-track-player';
import {apiService} from '../services/api';
import {createLogger} from '../utils/logger';
import {usePlayerContext} from '../context/PlayerContext';
import {AudioFile, AudioRepairRequest} from '../types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {WaveformPreview} from '../components/WaveformPreview';
import {GestureSeek} from '../components/GestureSeek';
import {hapticService} from '../services/hapticService';
import {exportService} from '../services/exportService';
import {AudioPlayerSettings} from '../components/AudioPlayerSettings';
import {LyricsDisplay} from '../components/LyricsDisplay';
import {SleepTimer} from '../components/SleepTimer';
import {recentlyPlayedService} from '../services/recentlyPlayedService';
import {socialShareService} from '../services/socialShareService';
import {queueHistoryService} from '../services/queueHistoryService';
import {resumePositionService} from '../services/resumePositionService';
import {offlineManagerService} from '../services/offlineManagerService';
import type {PlayableRef} from '../types';
import {playlistService, type MixedPlaylist} from '../services/playlistService';
import {useAuth} from '../context/AuthContext';

type AudioPlayerRouteProp = RouteProp<RootStackParamList, 'AudioPlayer'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

const log = createLogger('AudioPlayer');

export function AudioPlayerScreen() {
  const theme = useTheme();
  const route = useRoute<AudioPlayerRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuth();
  const {audioId, localPath, streamUrl, streamTitle, streamKind, podcastEpisodeId, startAtSec} =
    route.params;
  const {setCurrentAudioId} = usePlayerContext();
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'settings' | 'lyrics'>('player');
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [playableRef, setPlayableRef] = useState<PlayableRef | null>(null);

  const [momentDialogVisible, setMomentDialogVisible] = useState(false);
  const [momentNote, setMomentNote] = useState('');
  const [momentsForThisTrack, setMomentsForThisTrack] = useState<
    {id: string; positionMs: number; note?: string | null}[]
  >([]);
  const [momentsLoading, setMomentsLoading] = useState(false);
  const [hotspots, setHotspots] = useState<
    {bucketSec: number; score: number; eventCount: number}[]
  >([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);

  const [jumpDialogVisible, setJumpDialogVisible] = useState(false);
  const [jumpText, setJumpText] = useState('');

  const [clipStartSec, setClipStartSec] = useState<number | null>(null);
  const [clipEndSec, setClipEndSec] = useState<number | null>(null);
  const [clipTitle, setClipTitle] = useState('');
  const [clipFormat, setClipFormat] = useState<'m4a' | 'mp3' | 'wav'>('m4a');
  const [isClipSubmitting, setIsClipSubmitting] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<
    {state: 'none' | 'queued' | 'downloading' | 'available' | 'failed' | 'evicted'; progressPct?: number; localPath?: string; errorMessage?: string}
  >({state: 'none'});

  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [playlists, setPlaylists] = useState<MixedPlaylist[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistBusyId, setPlaylistBusyId] = useState<string | null>(null);

  useEffect(() => {
    initializePlayer();
    if (streamUrl) {
      if (streamKind === 'podcast_episode') {
        setPlayableRef({
          kind: 'podcast_episode',
          episodeId: podcastEpisodeId ?? audioId,
          enclosureUrl: streamUrl,
          title: streamTitle ?? 'Podcast',
        });
      } else {
        setPlayableRef({
          kind: 'radio_station',
          stationId: audioId,
          streamUrl,
          name: streamTitle ?? 'Stream',
        });
      }
      const synthetic: AudioFile = {
        id: audioId,
        userId: '',
        filename: streamTitle || 'Stream',
        originalFilename: streamTitle || 'Stream',
        fileSize: 0,
        mimeType: 'audio/mpeg',
        supabaseUrl: '',
        supabasePath: '',
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAudioFile(synthetic);
      setCurrentAudioId(audioId);
      setLoading(false);
    } else {
      setPlayableRef({kind: 'library_audio', audioFileId: audioId});
      loadAudioFile();
    }

    return () => {
      TrackPlayer.reset();
    };
  }, []);

  useEffect(() => {
    if (audioFile && isInitialized) {
      setupTrack();
    }
  }, [audioFile, isInitialized]);

  // Moments list for current track (centerpiece: "music navigable like video").
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!audioFile || streamUrl) return;
      try {
        setMomentsLoading(true);
        const rows = await apiService.listMomentsForAudio(audioFile.id);
        if (cancelled) return;
        const mapped = (rows ?? []).map((m: any) => ({
          id: String(m.id),
          positionMs: Number(m.positionMs ?? m.position_ms ?? 0),
          note: m.note != null ? String(m.note) : null,
        }));
        setMomentsForThisTrack(mapped);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setMomentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioFile?.id, streamUrl]);

  // Personal hotspots (a lightweight, privacy-safe "social layer" primitive).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!audioFile || streamUrl) return;
      if (!user?.consent_analytics) return;
      try {
        setHotspotsLoading(true);
        const items = await apiService.getPersonalHotspots(audioFile.id, 6);
        if (cancelled) return;
        setHotspots(items.filter(x => Number.isFinite(x.bucketSec) && x.bucketSec >= 0));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setHotspotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioFile?.id, streamUrl, user?.consent_analytics]);

  // Suggest moments from hotspots: best-effort, local-only UI.
  const suggestedMomentSec = hotspots.slice(0, 3).map(h => h.bucketSec);

  // Offline status (polling; simple, safe, and reliable).
  useEffect(() => {
    let cancelled = false;
    const playable =
      playableRef?.kind === 'library_audio' || playableRef?.kind === 'podcast_episode'
        ? playableRef
        : !streamUrl
          ? ({kind: 'library_audio', audioFileId: audioId} as const)
          : null;
    if (!playable) return;
    const tick = async () => {
      try {
        const a = offlineManagerService.get(playable);
        if (cancelled) return;
        if (!a) {
          setOfflineStatus({state: 'none'});
        } else {
          setOfflineStatus({
            state: a.state,
            progressPct: a.progressPct,
            localPath: a.localPath,
            errorMessage: a.errorMessage,
          });
        }
      } catch {
        // ignore
      }
    };
    tick();
    const iv = setInterval(tick, 1200);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [audioId, streamUrl, playableRef]);

  // Optional initial seek (deep links / shared moments/clips).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isInitialized || !audioFile) return;
      if (startAtSec == null || !Number.isFinite(startAtSec) || startAtSec < 0) return;
      try {
        // Delay a tick to allow TrackPlayer.add() to settle.
        await new Promise(r => setTimeout(r, 250));
        if (cancelled) return;
        await TrackPlayer.seekTo(startAtSec);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioFile, isInitialized, startAtSec]);

  // Resume position (best-effort): apply once after we have a track and ref.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!playableRef || !isInitialized || !audioFile) return;
      // Only resume streams for now; local/library already have history elsewhere.
      if (playableRef.kind !== 'radio_station' && playableRef.kind !== 'podcast_episode') return;
      const saved = await resumePositionService.get(playableRef);
      if (cancelled) return;
      if (saved?.positionSec != null && Number.isFinite(saved.positionSec) && saved.positionSec > 2) {
        try {
          await TrackPlayer.seekTo(saved.positionSec);
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playableRef, isInitialized, audioFile]);

  useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackTrackChanged], event => {
    if (event.type === Event.PlaybackState) {
      setIsPlaying(event.state === State.Playing);
      if (user?.consent_analytics && playableRef?.kind === 'library_audio') {
        apiService
          .createListeningEvent({
            audioFileId: playableRef.audioFileId,
            eventType: event.state === State.Playing ? 'play' : 'pause',
            positionSec: progress.position,
            durationSec: progress.duration,
            client: 'rn',
          })
          .catch(() => {});
      }
    }
    if (event.type === Event.PlaybackTrackChanged && audioFile) {
      // Track when playback starts/completes
      if (event.nextTrack === null && audioFile) {
        // Track completed
        recentlyPlayedService.addToRecentlyPlayed(audioFile, progress.position);
        queueHistoryService.addToHistory(audioFile, progress.position, true);
        if (user?.consent_analytics && playableRef?.kind === 'library_audio') {
          apiService
            .createListeningEvent({
              audioFileId: playableRef.audioFileId,
              eventType: 'complete',
              positionSec: progress.position,
              durationSec: progress.duration,
              client: 'rn',
            })
            .catch(() => {});
        }
      }
    }
  });

  // Track playback progress for recently played
  useEffect(() => {
    if (audioFile && isPlaying) {
      // Add to recently played when starting playback
      const interval = setInterval(() => {
        if (isPlaying && audioFile) {
          recentlyPlayedService.addToRecentlyPlayed(audioFile, progress.position);
          if (user?.consent_analytics && playableRef?.kind === 'library_audio') {
            apiService
              .createListeningEvent({
                audioFileId: playableRef.audioFileId,
                eventType: 'progress',
                positionSec: progress.position,
                durationSec: progress.duration,
                client: 'rn',
              })
              .catch(() => {});
          }
          if (playableRef && (playableRef.kind === 'radio_station' || playableRef.kind === 'podcast_episode')) {
            resumePositionService.set(playableRef, {
              positionSec: progress.position,
              durationSec: progress.duration,
            });
          }
        }
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [audioFile, isPlaying, progress.position, progress.duration, playableRef]);

  const initializePlayer = async () => {
    try {
      // Enable gapless playback
      await TrackPlayer.setupPlayer({
        waitForBuffer: true, // Enable gapless playback
        autoUpdateMetadata: true,
      });
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        // Enable gapless transitions
        progressUpdateEventInterval: 1,
      });
      setIsInitialized(true);
    } catch (error) {
      log.error('Error initializing player', {message: String(error)});
    }
  };

  const setupTrack = async () => {
    if (!audioFile) return;

    try {
      let url = '';
      if (streamUrl) {
        url = streamUrl;
      } else if (localPath) {
        url = localPath.startsWith('file:') ? localPath : `file://${localPath}`;
      } else if (audioFile.supabaseUrl?.startsWith('http')) {
        url = audioFile.supabaseUrl;
      } else {
        const su = await apiService.getAudioStreamUrl(audioFile.id);
        url = su.url;
      }
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: audioFile.id,
        url,
        title: streamTitle ?? audioFile.originalFilename,
        artist: streamUrl ? 'Live stream' : 'Unknown',
      });
    } catch (error) {
      log.error('Error setting up track', {message: String(error)});
    }
  };

  const loadAudioFile = async () => {
    try {
      const file = await apiService.getAudioFile(audioId);
      setAudioFile(file);
      setCurrentAudioId(file.id);
    } catch (error) {
      log.error('Error loading audio file', {message: String(error)});
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
        hapticService.medium();
      } else {
        await TrackPlayer.play();
        hapticService.medium();
      }
    } catch (error) {
      log.error('Error toggling playback', {message: String(error)});
      hapticService.error();
    }
  };

  const handleSeek = async (position: number) => {
    try {
      await TrackPlayer.seekTo(position);
      if (user?.consent_analytics && playableRef?.kind === 'library_audio') {
        apiService
          .createListeningEvent({
            audioFileId: playableRef.audioFileId,
            eventType: 'seek',
            positionSec: position,
            durationSec: progress.duration,
            client: 'rn',
          })
          .catch(() => {});
      }
    } catch (error) {
      log.error('Error seeking', {message: String(error)});
    }
  };

  const handleSeekForward = async (seconds: number) => {
    try {
      const newPosition = Math.min(position + seconds, duration);
      await TrackPlayer.seekTo(newPosition);
      hapticService.light();
    } catch (error) {
      log.error('Error seeking forward', {message: String(error)});
    }
  };

  const handleSeekBackward = async (seconds: number) => {
    try {
      const newPosition = Math.max(position - seconds, 0);
      await TrackPlayer.seekTo(newPosition);
      hapticService.light();
    } catch (error) {
      log.error('Error seeking backward', {message: String(error)});
    }
  };

  const openPlaylistPicker = async () => {
    if (!playableRef) return;
    try {
      setPlaylistDialogOpen(true);
      setPlaylistLoading(true);
      const list = await playlistService.getMixedPlaylists();
      setPlaylists(list);
    } catch (e) {
      log.error('load playlists failed', {message: String(e)});
      Alert.alert('Playlists', 'Could not load playlists.');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canUseBackendMarks = !streamUrl && !!audioFile?.id;

  const parseTimestampToSeconds = (raw: string): number | null => {
    const s = raw.trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const v = Number(s);
      return Number.isFinite(v) && v >= 0 ? v : null;
    }
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return null;
    const parts = s.split(':').map(p => Number(p));
    if (parts.some(p => !Number.isFinite(p))) return null;
    if (parts.length === 2) {
      const [mm, ss] = parts;
      if (ss >= 60) return null;
      return mm * 60 + ss;
    }
    const [hh, mm, ss] = parts;
    if (mm >= 60 || ss >= 60) return null;
    return hh * 3600 + mm * 60 + ss;
  };

  if (loading || !audioFile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const duration = progress.duration || audioFile.duration || 0;
  const position = progress.position || 0;
  const effectiveClipStartSec = clipStartSec;
  const effectiveClipEndSec = clipEndSec;
  const clipDurationSec =
    effectiveClipStartSec != null && effectiveClipEndSec != null
      ? Math.max(0, effectiveClipEndSec - effectiveClipStartSec)
      : 0;

  return (
    <View style={styles.container}>
      {/* Gesture Seek Overlay */}
      {activeTab === 'player' && (
        <GestureSeek
          onSeekForward={handleSeekForward}
          onSeekBackward={handleSeekBackward}
          currentPosition={position}
          duration={duration}
        />
      )}
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'player' | 'settings' | 'lyrics')}
          buttons={[
            {
              value: 'player',
              label: 'Now Playing',
              icon: 'music',
            },
            {
              value: 'lyrics',
              label: 'Lyrics',
              icon: 'format-text',
            },
            {
              value: 'settings',
              label: 'Enhancement',
              icon: 'tune',
            },
          ]}
        />
      </View>

      {activeTab === 'player' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <View style={styles.info}>
                  <Text variant="headlineSmall" numberOfLines={2}>
                    {audioFile.originalFilename}
                  </Text>
                  <Text variant="bodyMedium" style={styles.metadata}>
                    {formatTime(duration)} • {audioFile.fileSize / (1024 * 1024)}{' '}
                    MB
                  </Text>
                </View>
              </View>

              <View style={styles.coverContainer}>
                <MaterialCommunityIcons
                  name="music-note"
                  size={120}
                  color={theme.colors.primary}
                />
              </View>

          {/* Waveform Preview */}
          <View style={styles.waveformContainer}>
            <WaveformPreview
              audioUrl={audioFile.supabaseUrl}
              onSeek={handleSeek}
              height={80}
              selectionStartSec={canUseBackendMarks ? clipStartSec : null}
              selectionEndSec={canUseBackendMarks ? clipEndSec : null}
              onSelectionChange={
                canUseBackendMarks
                  ? range => {
                      setClipStartSec(range.startSec);
                      setClipEndSec(range.endSec);
                    }
                  : undefined
              }
              minSelectionSec={0.25}
            />
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar
              progress={duration > 0 ? position / duration : 0}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <View style={styles.timeContainer}>
              <Text variant="bodySmall">{formatTime(position)}</Text>
              <Text variant="bodySmall">{formatTime(duration)}</Text>
            </View>
          </View>

              <View style={styles.controls}>
                <IconButton
                  icon="skip-previous"
                  size={32}
                  onPress={() => handleSeek(0)}
                />
                <IconButton
                  icon={isPlaying ? 'pause-circle' : 'play-circle'}
                  size={64}
                  iconColor={theme.colors.primary}
                  onPress={handlePlayPause}
                />
                <IconButton
                  icon="skip-next"
                  size={32}
                  onPress={() => handleSeek(duration)}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <IconButton
                  icon="timer-outline"
                  size={24}
                  onPress={() => {
                    hapticService.light();
                    setShowSleepTimer(!showSleepTimer);
                  }}
                />
                <IconButton
                  icon="playlist-plus"
                  size={24}
                  onPress={() => {
                    hapticService.light();
                    openPlaylistPicker();
                  }}
                />
                <IconButton
                  icon="share-variant"
                  size={24}
                  onPress={async () => {
                    hapticService.light();
                    await socialShareService.shareTrack(audioFile);
                  }}
                />
              </View>

              {/* Sleep Timer */}
              {showSleepTimer && <SleepTimer />}

              <View style={styles.statusContainer}>
                <Chip
                  icon="information"
                  style={[
                    styles.chip,
                    {backgroundColor: getStatusColor(audioFile.status, theme)},
                  ]}>
                  {audioFile.status.toUpperCase()}
                </Chip>
              </View>

              {/* Export/Download Buttons */}
              <View style={styles.exportContainer}>
                <Button
                  mode="outlined"
                  icon="download"
                  onPress={async () => {
                    hapticService.selection();
                    try {
                      const path = await exportService.downloadAudioFile(audioFile);
                      if (path) {
                        hapticService.success();
                        Alert.alert('Success', 'Audio file downloaded successfully!');
                      }
                    } catch (error: any) {
                      hapticService.error();
                      Alert.alert('Error', error.message || 'Failed to download file');
                    }
                  }}>
                  Download
                </Button>
                <Button
                  mode="outlined"
                  icon="share"
                  onPress={async () => {
                    hapticService.selection();
                    try {
                      await exportService.shareAudioFile(audioFile);
                      hapticService.success();
                    } catch (error: any) {
                      hapticService.error();
                      Alert.alert('Error', error.message || 'Failed to share file');
                    }
                  }}>
                  Share
                </Button>
              </View>

              {/* Offline */}
              {playableRef?.kind === 'library_audio' || playableRef?.kind === 'podcast_episode' ? (
                <View style={{marginTop: 12}}>
                  <Text variant="titleMedium" style={{marginBottom: 8}}>
                    Offline
                  </Text>
                  <View style={styles.marksRow}>
                    {offlineStatus.state === 'available' && offlineStatus.localPath ? (
                      <Chip icon="check" style={{alignSelf: 'flex-start'}}>
                        Available offline
                      </Chip>
                    ) : offlineStatus.state === 'downloading' ? (
                      <Chip icon="progress-download" style={{alignSelf: 'flex-start'}}>
                        Downloading{offlineStatus.progressPct != null ? ` ${offlineStatus.progressPct}%` : ''}
                      </Chip>
                    ) : offlineStatus.state === 'queued' ? (
                      <Chip icon="progress-clock" style={{alignSelf: 'flex-start'}}>
                        Queued
                      </Chip>
                    ) : offlineStatus.state === 'failed' ? (
                      <Chip icon="alert-circle-outline" style={{alignSelf: 'flex-start'}}>
                        Failed
                      </Chip>
                    ) : null}

                    <Button
                      mode={offlineStatus.state === 'available' ? 'outlined' : 'contained-tonal'}
                      icon={offlineStatus.state === 'available' ? 'delete-outline' : 'download'}
                      onPress={async () => {
                        try {
                          const playable = playableRef!;
                          if (offlineStatus.state === 'available') {
                            await offlineManagerService.remove(playable);
                            setOfflineStatus({state: 'none'});
                            return;
                          }
                          await offlineManagerService.enqueue(playable);
                          Alert.alert('Offline', 'Download queued. Keep the app open for best results.');
                        } catch (e: any) {
                          Alert.alert('Offline', e?.message || 'Could not start download');
                        }
                      }}>
                      {offlineStatus.state === 'available' ? 'Remove' : 'Download offline'}
                    </Button>

                    {offlineStatus.state === 'downloading' || offlineStatus.state === 'queued' ? (
                      <Button
                        mode="text"
                        icon="close-circle-outline"
                        onPress={async () => {
                          try {
                            const playable = playableRef!;
                            await offlineManagerService.cancel(playable);
                            Alert.alert('Offline', 'Download cancelled.');
                          } catch (e: any) {
                            Alert.alert('Offline', e?.message || 'Could not cancel download');
                          }
                        }}>
                        Cancel
                      </Button>
                    ) : null}

                    {offlineStatus.state === 'failed' ? (
                      <Button
                        mode="text"
                        icon="refresh"
                        onPress={async () => {
                          try {
                            const playable = playableRef!;
                            await offlineManagerService.retry(playable);
                            Alert.alert('Offline', 'Retrying download.');
                          } catch (e: any) {
                            Alert.alert('Offline', e?.message || 'Could not retry download');
                          }
                        }}>
                        Retry
                      </Button>
                    ) : null}

                    <Button
                      mode="text"
                      icon="folder-download-outline"
                      onPress={() => navigation.navigate('Activity', {initialSegment: 'offline'})}>
                      Manage
                    </Button>
                  </View>

                  {offlineStatus.state === 'downloading' && offlineStatus.progressPct != null ? (
                    <View style={{marginTop: 8}}>
                      <ProgressBar progress={Math.max(0, Math.min(1, offlineStatus.progressPct / 100))} />
                    </View>
                  ) : null}
                  {offlineStatus.state === 'failed' && offlineStatus.errorMessage ? (
                    <Text variant="bodySmall" style={{marginTop: 6, color: theme.colors.error}}>
                      {offlineStatus.errorMessage}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Moments & Clips */}
              <View style={styles.marksContainer}>
                <Text variant="titleMedium" style={{marginBottom: 8}}>
                  Moments & clips
                </Text>
                {!canUseBackendMarks ? (
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    Moments/clips are available for library audio only (not live streams).
                  </Text>
                ) : (
                  <>
                    <View style={{gap: 8, marginBottom: 10}}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Text variant="labelLarge" style={{flex: 1}}>
                          Moments in this track
                        </Text>
                        {momentsLoading ? <ActivityIndicator size="small" /> : null}
                        <Button
                          mode="text"
                          icon="refresh"
                          onPress={async () => {
                            if (!audioFile) return;
                            try {
                              setMomentsLoading(true);
                              const rows = await apiService.listMomentsForAudio(audioFile.id);
                              const mapped = (rows ?? []).map((m: any) => ({
                                id: String(m.id),
                                positionMs: Number(m.positionMs ?? m.position_ms ?? 0),
                                note: m.note != null ? String(m.note) : null,
                              }));
                              setMomentsForThisTrack(mapped);
                            } finally {
                              setMomentsLoading(false);
                            }
                          }}>
                          Refresh
                        </Button>
                      </View>

                      {momentsForThisTrack.length === 0 ? (
                        <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                          No moments yet. Save your first “stamp” to make this track instantly navigable.
                        </Text>
                      ) : (
                        <View style={{gap: 6}}>
                          {momentsForThisTrack.slice(0, 8).map(m => (
                            <View
                              key={m.id}
                              style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                              <Chip
                                icon="bookmark"
                                onPress={() => {
                                  hapticService.light();
                                  handleSeek(Math.max(0, Math.floor(m.positionMs / 1000)));
                                }}>
                                {formatTime(Math.max(0, Math.floor(m.positionMs / 1000)))}
                                {m.note ? ` · ${m.note}` : ''}
                              </Chip>
                              <IconButton
                                icon="share-variant"
                                size={18}
                                onPress={async () => {
                                  try {
                                    hapticService.selection();
                                    await socialShareService.shareMoment(m.id, m.note || undefined);
                                  } catch {
                                    // ignore
                                  }
                                }}
                              />
                            </View>
                          ))}
                          {momentsForThisTrack.length > 8 ? (
                            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                              +{momentsForThisTrack.length - 8} more (open Activity → Marks to see all)
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {user?.consent_analytics ? (
                      <View style={{gap: 8, marginBottom: 10}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                          <Text variant="labelLarge" style={{flex: 1}}>
                            You replayed these parts
                          </Text>
                          {hotspotsLoading ? <ActivityIndicator size="small" /> : null}
                          <Button
                            mode="text"
                            icon="refresh"
                            onPress={async () => {
                              if (!audioFile) return;
                              try {
                                setHotspotsLoading(true);
                                const items = await apiService.getPersonalHotspots(audioFile.id, 6);
                                setHotspots(items.filter(x => Number.isFinite(x.bucketSec) && x.bucketSec >= 0));
                              } finally {
                                setHotspotsLoading(false);
                              }
                            }}>
                            Refresh
                          </Button>
                        </View>

                        {hotspots.length === 0 ? (
                          <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                            Play and seek a bit—this will surface your “hot spots” automatically.
                          </Text>
                        ) : (
                          <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                            {hotspots.map(h => (
                              <Chip
                                key={`${h.bucketSec}`}
                                icon="fire"
                                onPress={() => {
                                  hapticService.light();
                                  handleSeek(h.bucketSec);
                                }}>
                                {formatTime(h.bucketSec)}
                              </Chip>
                            ))}
                          </View>
                        )}

                        {hotspots.length > 0 ? (
                          <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                            {suggestedMomentSec.map(sec => (
                              <Button
                                key={`suggest-${sec}`}
                                mode="contained-tonal"
                                icon="bookmark-plus-outline"
                                onPress={async () => {
                                  if (!audioFile) return;
                                  try {
                                    hapticService.selection();
                                    await apiService.createMoment({
                                      audioFileId: audioFile.id,
                                      positionMs: Math.round(sec * 1000),
                                      note: undefined,
                                    });
                                    const rows = await apiService.listMomentsForAudio(audioFile.id);
                                    const mapped = (rows ?? []).map((m: any) => ({
                                      id: String(m.id),
                                      positionMs: Number(m.positionMs ?? m.position_ms ?? 0),
                                      note: m.note != null ? String(m.note) : null,
                                    }));
                                    setMomentsForThisTrack(mapped);
                                    hapticService.success();
                                  } catch {
                                    hapticService.error();
                                  }
                                }}>
                                Save {formatTime(sec)}
                              </Button>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    <View style={styles.marksRow}>
                      <Button
                        mode="contained-tonal"
                        icon="bookmark-plus-outline"
                        onPress={() => {
                          hapticService.light();
                          setMomentNote('');
                          setMomentDialogVisible(true);
                        }}>
                        Save moment
                      </Button>
                      <Button
                        mode="outlined"
                        icon="timeline-clock-outline"
                        onPress={() => {
                          hapticService.light();
                          setJumpText(formatTime(position));
                          setJumpDialogVisible(true);
                        }}>
                        Jump to
                      </Button>
                    </View>

                    <View style={styles.clipRow}>
                      <Chip style={styles.clipChip} icon="ray-start">
                        Start: {clipStartSec != null ? formatTime(clipStartSec) : '—'}
                      </Chip>
                      <Chip style={styles.clipChip} icon="ray-end">
                        End: {clipEndSec != null ? formatTime(clipEndSec) : '—'}
                      </Chip>
                      {clipStartSec != null && clipEndSec != null && clipEndSec > clipStartSec ? (
                        <Chip style={styles.clipChip} icon="timer-outline">
                          {formatTime(clipDurationSec)}
                        </Chip>
                      ) : null}
                    </View>

                    <View style={styles.marksRow}>
                      <Button
                        mode="outlined"
                        icon="ray-start"
                        onPress={() => {
                          hapticService.selection();
                          setClipStartSec(position);
                        }}>
                        Set start
                      </Button>
                      <Button
                        mode="outlined"
                        icon="ray-end"
                        onPress={() => {
                          hapticService.selection();
                          setClipEndSec(position);
                        }}>
                        Set end
                      </Button>
                      <Button
                        mode="text"
                        icon="refresh"
                        disabled={clipStartSec == null && clipEndSec == null && !clipTitle}
                        onPress={() => {
                          hapticService.light();
                          setClipStartSec(null);
                          setClipEndSec(null);
                          setClipTitle('');
                          setClipFormat('m4a');
                        }}>
                        Reset
                      </Button>
                    </View>

                    <TextInput
                      label="Clip title (optional)"
                      value={clipTitle}
                      onChangeText={setClipTitle}
                      mode="outlined"
                      style={{marginTop: 8}}
                    />

                    <View style={{marginTop: 10}}>
                      <Text variant="labelLarge" style={{marginBottom: 6}}>
                        Export format
                      </Text>
                      <SegmentedButtons
                        value={clipFormat}
                        onValueChange={v => setClipFormat(v as any)}
                        buttons={[
                          {value: 'm4a', label: 'M4A'},
                          {value: 'mp3', label: 'MP3'},
                          {value: 'wav', label: 'WAV'},
                        ]}
                      />
                    </View>

                    <Button
                      style={{marginTop: 10, alignSelf: 'flex-start'}}
                      mode="contained"
                      icon="content-cut"
                      loading={isClipSubmitting}
                      disabled={
                        isClipSubmitting ||
                        clipStartSec == null ||
                        clipEndSec == null ||
                        clipEndSec <= clipStartSec
                      }
                      onPress={async () => {
                        if (clipStartSec == null || clipEndSec == null) return;
                        if (clipEndSec <= clipStartSec) return;
                        const durMs = Math.round((clipEndSec - clipStartSec) * 1000);
                        if (durMs > 10 * 60 * 1000) {
                          Alert.alert('Clip too long', 'Max clip length is 10 minutes.');
                          return;
                        }
                        try {
                          setIsClipSubmitting(true);
                          hapticService.selection();
                          const created: any = await apiService.createClip({
                            audioFileId: audioFile.id,
                            startMs: Math.round(clipStartSec * 1000),
                            endMs: Math.round(clipEndSec * 1000),
                            title: clipTitle.trim() || undefined,
                          });
                          const clipId = String(created?.id ?? '');
                          if (!clipId) {
                            throw new Error('Clip was created but no clip id returned.');
                          }
                          await apiService.renderClip(clipId, clipFormat);
                          hapticService.success();
                          Alert.alert('Queued', 'Clip render job queued. Track it in Activity → Jobs.');
                          navigation.navigate('Activity', {initialSegment: 'jobs'});
                          setClipStartSec(null);
                          setClipEndSec(null);
                          setClipTitle('');
                          setClipFormat('m4a');
                        } catch (e: any) {
                          hapticService.error();
                          Alert.alert('Error', e?.message || 'Failed to queue clip render');
                        } finally {
                          setIsClipSubmitting(false);
                        }
                      }}>
                      Create & render clip
                    </Button>
                  </>
                )}
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : activeTab === 'lyrics' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}>
          <LyricsDisplay
            artist="Unknown" // TODO: Extract from metadata
            title={audioFile.originalFilename}
            currentTime={progress.position}
          />
        </ScrollView>
      ) : (
        <AudioPlayerSettings
          currentAudioUrl={audioFile?.supabaseUrl}
          audioMetadata={{
            genre: audioFile?.genre,
            bitrate: audioFile?.bitrate,
            sampleRate: audioFile?.sampleRate,
          }}
        />
      )}

      <Portal>
        <Dialog visible={momentDialogVisible} onDismiss={() => setMomentDialogVisible(false)}>
          <Dialog.Title>Save moment</Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodySmall"
              style={{marginBottom: 10, color: theme.colors.onSurfaceVariant}}>
              At {formatTime(position)}
            </Text>
            <TextInput
              label="Note (optional)"
              value={momentNote}
              onChangeText={setMomentNote}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMomentDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                try {
                  hapticService.selection();
                  await apiService.createMoment({
                    audioFileId: audioFile.id,
                    positionMs: Math.round(position * 1000),
                    note: momentNote.trim() || undefined,
                  });
                  try {
                    const rows = await apiService.listMomentsForAudio(audioFile.id);
                    const mapped = (rows ?? []).map((m: any) => ({
                      id: String(m.id),
                      positionMs: Number(m.positionMs ?? m.position_ms ?? 0),
                      note: m.note != null ? String(m.note) : null,
                    }));
                    setMomentsForThisTrack(mapped);
                  } catch {
                    // ignore
                  }
                  hapticService.success();
                  setMomentDialogVisible(false);
                  Alert.alert('Saved', 'Moment saved. View it in Activity → Marks.');
                  navigation.navigate('Activity', {initialSegment: 'marks'});
                } catch (e: any) {
                  hapticService.error();
                  Alert.alert('Error', e?.message || 'Failed to save moment');
                }
              }}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={jumpDialogVisible} onDismiss={() => setJumpDialogVisible(false)}>
          <Dialog.Title>Jump to timestamp</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Timestamp (ss, mm:ss, or hh:mm:ss)"
              value={jumpText}
              onChangeText={setJumpText}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
            />
            <View style={{flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap'}}>
              <Button
                mode="outlined"
                icon="rewind-5"
                onPress={() => {
                  hapticService.selection();
                  const sec = parseTimestampToSeconds(jumpText);
                  const next = sec == null ? Math.max(0, Math.floor(position) - 5) : Math.max(0, sec - 5);
                  setJumpText(formatTime(next));
                }}>
                −5s
              </Button>
              <Button
                mode="outlined"
                icon="fast-forward-5"
                onPress={() => {
                  hapticService.selection();
                  const sec = parseTimestampToSeconds(jumpText);
                  const base = sec == null ? Math.max(0, Math.floor(position)) : sec;
                  const nextRaw = base + 5;
                  const next = duration > 0 ? Math.min(nextRaw, Math.floor(duration)) : nextRaw;
                  setJumpText(formatTime(next));
                }}>
                +5s
              </Button>
              <Button
                mode="text"
                icon="crosshairs-gps"
                onPress={() => {
                  hapticService.light();
                  setJumpText(formatTime(position));
                }}>
                Use current
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJumpDialogVisible(false)}>Cancel</Button>
            <Button
              onPress={async () => {
                const sec = parseTimestampToSeconds(jumpText);
                if (sec == null) {
                  Alert.alert('Invalid timestamp', 'Use ss, mm:ss, or hh:mm:ss.');
                  return;
                }
                const clamped =
                  duration > 0 ? Math.min(Math.max(sec, 0), duration) : Math.max(sec, 0);
                await handleSeek(clamped);
                hapticService.success();
                setJumpDialogVisible(false);
              }}>
              Jump
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={playlistDialogOpen} onDismiss={() => setPlaylistDialogOpen(false)}>
          <Dialog.Title>Add to playlist</Dialog.Title>
          <Dialog.Content>
            {playlistLoading ? (
              <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                Loading playlists…
              </Text>
            ) : (
              <>
                {playlists.length === 0 ? (
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    No playlists yet. Create one below.
                  </Text>
                ) : (
                  <View style={{gap: 8}}>
                    {playlists.slice(0, 12).map(p => (
                      <Button
                        key={p.id}
                        mode="outlined"
                        loading={playlistBusyId === p.id}
                        disabled={!playableRef || playlistBusyId != null}
                        onPress={async () => {
                          if (!playableRef) return;
                          try {
                            setPlaylistBusyId(p.id);
                            await playlistService.addItemToMixedPlaylist(p.id, playableRef);
                            hapticService.success();
                            Alert.alert('Added', `Added to “${p.name}”.`);
                            setPlaylistDialogOpen(false);
                          } catch (e: any) {
                            hapticService.error();
                            Alert.alert('Playlists', e?.message || 'Could not add to playlist.');
                          } finally {
                            setPlaylistBusyId(null);
                          }
                        }}>
                        {p.name}
                      </Button>
                    ))}
                  </View>
                )}

                <View style={{marginTop: 12}}>
                  <TextInput
                    label="New playlist name"
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    mode="outlined"
                  />
                  <Button
                    style={{marginTop: 8, alignSelf: 'flex-start'}}
                    mode="contained"
                    icon="plus"
                    disabled={!newPlaylistName.trim() || playlistBusyId != null}
                    loading={playlistBusyId === 'new'}
                    onPress={async () => {
                      const name = newPlaylistName.trim();
                      if (!name || !playableRef) return;
                      try {
                        setPlaylistBusyId('new');
                        const created = await playlistService.createMixedPlaylist(name);
                        await playlistService.addItemToMixedPlaylist(created.id, playableRef);
                        setNewPlaylistName('');
                        hapticService.success();
                        Alert.alert('Created', `Created “${name}” and added this item.`);
                        setPlaylistDialogOpen(false);
                      } catch (e: any) {
                        hapticService.error();
                        Alert.alert('Playlists', e?.message || 'Could not create playlist.');
                      } finally {
                        setPlaylistBusyId(null);
                      }
                    }}>
                    Create & add
                  </Button>
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPlaylistDialogOpen(false)}>Done</Button>
            <Button onPress={() => navigation.navigate('MixedPlaylists')}>Manage</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function getStatusColor(
  status: AudioFile['status'],
  theme: any,
): string {
  switch (status) {
    case 'completed':
      return theme.colors.primaryContainer;
    case 'processing':
      return theme.colors.secondaryContainer;
    case 'failed':
      return theme.colors.errorContainer;
    default:
      return theme.colors.surfaceVariant;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  header: {
    marginBottom: 24,
  },
  info: {
    alignItems: 'center',
  },
  metadata: {
    marginTop: 8,
    opacity: 0.7,
  },
  coverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginVertical: 32,
  },
  progressContainer: {
    marginVertical: 24,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  chip: {
    marginHorizontal: 4,
  },
  waveformContainer: {
    marginVertical: 16,
    width: '100%',
  },
  exportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    gap: 16,
  },
  marksContainer: {
    marginTop: 16,
    paddingTop: 8,
  },
  marksRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
  },
  clipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 10,
  },
  clipChip: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
});

