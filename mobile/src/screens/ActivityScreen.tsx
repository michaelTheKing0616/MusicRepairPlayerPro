import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  SegmentedButtons,
  IconButton,
  TextInput,
  ActivityIndicator,
  Chip,
  Divider,
  Portal,
  Dialog,
} from 'react-native-paper';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {createLogger} from '../utils/logger';
import {JobSummary, AudioFile} from '../types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {socialShareService} from '../services/socialShareService';
import {offlineManagerService} from '../services/offlineManagerService';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Activity'>;

const log = createLogger('Activity');

type Segment = 'jobs' | 'streams' | 'marks' | 'offline';

type ClipRow = {
  id: string;
  audioFileId: string;
  startMs: number;
  endMs: number;
  title?: string | null;
  artifactAudioFileId?: string | null;
};

type MomentRow = {
  id: string;
  audioFileId: string;
  positionMs: number;
  note?: string | null;
};

function normalizeClip(raw: unknown): ClipRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  const rawAf = o.audioFileId ?? o.audio_file_id;
  const audio = rawAf != null ? String(rawAf) : '';
  if (!id || !audio) {
    return null;
  }
  return {
    id,
    audioFileId: audio,
    startMs: Number(o.startMs ?? o.start_ms ?? 0),
    endMs: Number(o.endMs ?? o.end_ms ?? 0),
    title: o.title != null ? String(o.title) : null,
    artifactAudioFileId:
      o.artifactAudioFileId != null || o.artifact_audio_file_id != null
        ? String(o.artifactAudioFileId ?? o.artifact_audio_file_id)
        : null,
  };
}

function normalizeMoment(raw: unknown): MomentRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : '';
  const rawAf = o.audioFileId ?? o.audio_file_id;
  const audio = rawAf != null ? String(rawAf) : '';
  if (!id || !audio) {
    return null;
  }
  return {
    id,
    audioFileId: audio,
    positionMs: Number(o.positionMs ?? o.position_ms ?? 0),
    note: o.note != null ? String(o.note) : null,
  };
}

export function ActivityScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const initial = route.params?.initialSegment ?? 'jobs';
  const [segment, setSegment] = useState<Segment>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const [stations, setStations] = useState<
    {id: string; name: string; streamUrl: string; genre?: string}[]
  >([]);
  const [podcastSlug, setPodcastSlug] = useState('musicrepair_samples');
  const [episodes, setEpisodes] = useState<
    {id: string; title: string; enclosureUrl: string}[]
  >([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [moments, setMoments] = useState<MomentRow[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [marksLoading, setMarksLoading] = useState(true);
  const [momentDialogOpen, setMomentDialogOpen] = useState(false);
  const [momentAudioId, setMomentAudioId] = useState<string | null>(null);
  const [momentPositionMs, setMomentPositionMs] = useState('0');
  const [momentNote, setMomentNote] = useState('');
  const [momentSaving, setMomentSaving] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const list = await apiService.listJobs(60);
      setJobs(list);
    } catch (e) {
      log.error('listJobs failed', {message: String(e)});
      Alert.alert('Jobs', 'Could not load job list.');
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadStreams = useCallback(async () => {
    try {
      setStreamsLoading(true);
      const r = await apiService.getRadioStations();
      setStations(r);
    } catch (e) {
      log.error('radio failed', {message: String(e)});
      Alert.alert('Radio', 'Could not load stations.');
    } finally {
      setStreamsLoading(false);
    }
  }, []);

  const loadPodcasts = useCallback(async () => {
    try {
      setStreamsLoading(true);
      const eps = await apiService.getPodcastEpisodes(podcastSlug.trim() || 'musicrepair_samples');
      setEpisodes(
        eps.map(e => ({
          id: e.id,
          title: e.title,
          enclosureUrl: e.enclosureUrl,
        })),
      );
    } catch (e) {
      log.error('podcasts failed', {message: String(e)});
      Alert.alert('Podcasts', 'Could not load episodes for this show slug.');
    } finally {
      setStreamsLoading(false);
    }
  }, [podcastSlug]);

  const loadMarks = useCallback(async () => {
    try {
      setMarksLoading(true);
      const [c, m, files] = await Promise.all([
        apiService.listClips(),
        apiService.listMoments(),
        apiService.getAudioFiles(),
      ]);
      setClips(c.map(normalizeClip).filter(Boolean) as ClipRow[]);
      setMoments(m.map(normalizeMoment).filter(Boolean) as MomentRow[]);
      setAudioFiles(files.slice(0, 30));
      if (!momentAudioId && files.length) {
        setMomentAudioId(files[0].id);
      }
    } catch (e) {
      log.error('marks failed', {message: String(e)});
      Alert.alert('Bookmarks', 'Could not load clips or moments.');
    } finally {
      setMarksLoading(false);
    }
  }, [momentAudioId]);

  useEffect(() => {
    const s = route.params?.initialSegment;
    if (s) {
      setSegment(s);
    }
  }, [route.params?.initialSegment]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (segment === 'streams') {
      loadStreams();
      loadPodcasts();
    }
  }, [segment, loadStreams, loadPodcasts]);

  useEffect(() => {
    if (segment === 'marks') {
      loadMarks();
    }
  }, [segment, loadMarks]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (segment === 'jobs') {
        await loadJobs();
      } else if (segment === 'streams') {
        await Promise.all([loadStreams(), loadPodcasts()]);
      } else {
        await loadMarks();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleJobPress = async (job: JobSummary) => {
    try {
      if (job.status.toLowerCase() === 'completed' && job.resultFileId) {
        navigation.navigate('AudioPlayer', {
          audioId: job.resultFileId,
        });
        return;
      }
      const st = await apiService.getJobStatus(job.id);
      const lines = [
        `Status: ${st.status}`,
        st.progress?.currentOperation
          ? `Step: ${st.progress.currentOperation}`
          : '',
        st.error?.message ? `Error: ${st.error.message}` : '',
      ].filter(Boolean);
      Alert.alert(job.jobType || 'Job', lines.join('\n'));
    } catch (e) {
      log.error('job detail failed', {message: String(e)});
      Alert.alert('Job', 'Could not load job status.');
    }
  };

  const handleDeleteClip = (clip: ClipRow) => {
    Alert.alert('Delete clip', clip.title || clip.id, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteClip(clip.id);
            await loadMarks();
          } catch (e) {
            log.error('deleteClip failed', {message: String(e)});
            Alert.alert('Delete', 'Failed to delete clip.');
          }
        },
      },
    ]);
  };

  const saveMoment = async () => {
    if (!momentAudioId) {
      Alert.alert('Moment', 'Select a track first.');
      return;
    }
    const pos = parseInt(momentPositionMs, 10);
    if (Number.isNaN(pos) || pos < 0) {
      Alert.alert('Moment', 'Position (ms) must be a non-negative number.');
      return;
    }
    try {
      setMomentSaving(true);
      await apiService.createMoment({
        audioFileId: momentAudioId,
        positionMs: pos,
        note: momentNote.trim() || undefined,
      });
      setMomentDialogOpen(false);
      setMomentNote('');
      setMomentPositionMs('0');
      await loadMarks();
    } catch (e) {
      log.error('createMoment failed', {message: String(e)});
      Alert.alert('Moment', 'Could not save moment.');
    } finally {
      setMomentSaving(false);
    }
  };

  const openPlayerStream = (
    url: string,
    title: string,
    key: string,
    kind: 'radio_station' | 'podcast_episode' = 'radio_station',
    podcastEpisodeId?: string,
  ) => {
    navigation.navigate('AudioPlayer', {
      audioId: key,
      streamUrl: url,
      streamTitle: title,
      streamKind: kind,
      podcastEpisodeId,
    });
  };

  const renderJobs = () => {
    if (jobsLoading && !jobs.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    if (!jobs.length) {
      return (
        <Text style={{color: theme.colors.onSurfaceVariant, padding: 16}}>
          No jobs yet. Start a repair or preset render from elsewhere in the app.
        </Text>
      );
    }
    return (
      <>
        {jobs.map(item => (
          <Card
            key={item.id}
            style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}
            onPress={() => handleJobPress(item)}>
            <Card.Content style={styles.rowInner}>
              <View style={{flex: 1}}>
                <Text variant="titleSmall" style={{color: theme.colors.onSurface}}>
                  {item.jobType}
                </Text>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                  {item.status}
                  {item.progressMessage ? ` · ${item.progressMessage}` : ''}
                </Text>
                <Text variant="labelSmall" style={{color: theme.colors.outline, marginTop: 4}}>
                  {item.progressPercent}%
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={theme.colors.onSurfaceVariant}
              />
            </Card.Content>
          </Card>
        ))}
      </>
    );
  };

  const renderStreams = () => (
    <View>
      <Text variant="titleSmall" style={[styles.blockTitle, {color: theme.colors.onSurface}]}>
        Radio
      </Text>
      {streamsLoading && !stations.length ? (
        <ActivityIndicator style={{marginVertical: 16}} color={theme.colors.primary} />
      ) : (
        stations.map(s => (
          <Card
            key={s.id}
            style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}
            onPress={() => openPlayerStream(s.streamUrl, s.name, `radio-${s.id}`, 'radio_station')}>
            <Card.Content style={styles.rowInner}>
              <View style={{flex: 1}}>
                <Text variant="titleSmall" style={{color: theme.colors.onSurface}}>
                  {s.name}
                </Text>
                {s.genre ? (
                  <Chip compact style={{alignSelf: 'flex-start', marginTop: 4}}>
                    {s.genre}
                  </Chip>
                ) : null}
              </View>
              <IconButton
                icon="play"
                onPress={() => openPlayerStream(s.streamUrl, s.name, `radio-${s.id}`, 'radio_station')}
              />
            </Card.Content>
          </Card>
        ))
      )}

      <Divider style={{marginVertical: 16}} />
      <Text variant="titleSmall" style={[styles.blockTitle, {color: theme.colors.onSurface}]}>
        Podcasts
      </Text>
      <TextInput
        label="Show slug"
        value={podcastSlug}
        onChangeText={setPodcastSlug}
        mode="outlined"
        style={styles.input}
      />
      <Button mode="contained-tonal" onPress={loadPodcasts} loading={streamsLoading} style={styles.mb}>
        Load episodes
      </Button>
      {episodes.map(ep => (
        <Card
          key={ep.id}
          style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}
          onPress={() =>
            openPlayerStream(ep.enclosureUrl, ep.title, `podcast-${ep.id}`, 'podcast_episode', ep.id)
          }>
          <Card.Content style={styles.rowInner}>
            <View style={{flex: 1}}>
              <Text variant="titleSmall" style={{color: theme.colors.onSurface}} numberOfLines={2}>
                {ep.title}
              </Text>
            </View>
            <IconButton
              icon="play"
              onPress={() =>
                openPlayerStream(ep.enclosureUrl, ep.title, `podcast-${ep.id}`, 'podcast_episode', ep.id)
              }
            />
          </Card.Content>
        </Card>
      ))}
    </View>
  );

  const renderMarks = () => {
    if (marksLoading && !clips.length && !moments.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    return (
      <View>
        <View style={styles.markActions}>
          <Button mode="contained" icon="bookmark-plus" onPress={() => setMomentDialogOpen(true)}>
            Add moment
          </Button>
        </View>
        <Text variant="titleSmall" style={[styles.blockTitle, {color: theme.colors.onSurface}]}>
          Clips
        </Text>
        {clips.length === 0 ? (
          <Text style={{color: theme.colors.onSurfaceVariant, marginBottom: 12}}>No clips saved.</Text>
        ) : (
          clips.map(c => (
            <Card key={c.id} style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}>
              <Card.Content style={styles.rowInner}>
                <View style={{flex: 1}}>
                  <Text variant="titleSmall" style={{color: theme.colors.onSurface}}>
                    {c.title || 'Clip'}
                  </Text>
                  <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                    {c.startMs}–{c.endMs} ms · file {c.audioFileId.slice(0, 8)}…
                  </Text>
                  {c.artifactAudioFileId ? (
                    <Chip compact style={{alignSelf: 'flex-start', marginTop: 6}} icon="check">
                      Rendered
                    </Chip>
                  ) : (
                    <Chip compact style={{alignSelf: 'flex-start', marginTop: 6}} icon="progress-clock">
                      Not rendered yet
                    </Chip>
                  )}
                </View>
                {c.artifactAudioFileId ? (
                  <IconButton
                    icon="play"
                    onPress={() =>
                      navigation.navigate('AudioPlayer', {audioId: c.artifactAudioFileId as string})
                    }
                  />
                ) : null}
                <IconButton
                  icon="share-variant"
                  onPress={() => socialShareService.shareClip(c.id, c.title || 'Clip')}
                />
                <IconButton icon="delete-outline" onPress={() => handleDeleteClip(c)} />
              </Card.Content>
            </Card>
          ))
        )}
        <Text variant="titleSmall" style={[styles.blockTitle, {color: theme.colors.onSurface}]}>
          Moments
        </Text>
        {moments.length === 0 ? (
          <Text style={{color: theme.colors.onSurfaceVariant}}>No moments yet.</Text>
        ) : (
          moments.map(m => (
            <Card key={m.id} style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}>
              <Card.Content style={styles.rowInner}>
                <View style={{flex: 1}}>
                  <Text variant="titleSmall" style={{color: theme.colors.onSurface}}>
                    {Math.round(m.positionMs)} ms
                  </Text>
                  {m.note ? (
                    <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                      {m.note}
                    </Text>
                  ) : null}
                  <Text variant="labelSmall" style={{color: theme.colors.outline}}>
                    {m.audioFileId.slice(0, 8)}…
                  </Text>
                </View>
                <IconButton
                  icon="play"
                  onPress={() =>
                    navigation.navigate('AudioPlayer', {
                      audioId: m.audioFileId,
                      startAtSec: Math.max(0, m.positionMs / 1000),
                    })
                  }
                />
                <IconButton
                  icon="share-variant"
                  onPress={() => socialShareService.shareMoment(m.id, m.note || undefined)}
                />
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    );
  };

  const renderOffline = () => {
    const assets = offlineManagerService.list();
    if (!assets.length) {
      return (
        <Text style={{color: theme.colors.onSurfaceVariant, padding: 16}}>
          No offline downloads yet. Use the Download button in the player.
        </Text>
      );
    }
    return (
      <View style={{gap: 12}}>
        {assets.map(a => (
          <Card key={a.id} style={[styles.rowCard, {backgroundColor: theme.colors.surface}]}>
            <Card.Content style={styles.rowInner}>
              <View style={{flex: 1}}>
                <Text variant="titleSmall" style={{color: theme.colors.onSurface}}>
                  {a.playable.kind}
                </Text>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                  {a.state}
                  {a.progressPct != null ? ` · ${a.progressPct}%` : ''}
                </Text>
                {a.errorMessage ? (
                  <Text variant="bodySmall" style={{color: theme.colors.error, marginTop: 4}}>
                    {a.errorMessage}
                  </Text>
                ) : null}
              </View>

              {a.state === 'failed' ? (
                <IconButton
                  icon="refresh"
                  onPress={async () => {
                    try {
                      await offlineManagerService.retry(a.playable);
                    } catch (e) {
                      log.warn('retry failed', {message: String(e)});
                    }
                  }}
                />
              ) : null}

              {a.state === 'downloading' || a.state === 'queued' ? (
                <IconButton
                  icon="close-circle-outline"
                  onPress={async () => {
                    try {
                      await offlineManagerService.cancel(a.playable);
                    } catch (e) {
                      log.warn('cancel failed', {message: String(e)});
                    }
                  }}
                />
              ) : null}

              <IconButton
                icon="delete-outline"
                onPress={async () => {
                  try {
                    await offlineManagerService.remove(a.playable);
                  } catch (e) {
                    log.warn('remove offline failed', {message: String(e)});
                  }
                }}
              />
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <SegmentedButtons
        value={segment}
        onValueChange={v => setSegment(v as Segment)}
        buttons={[
          {value: 'jobs', label: 'Jobs'},
          {value: 'streams', label: 'Listen'},
          {value: 'marks', label: 'Marks'},
          {value: 'offline', label: 'Offline'},
        ]}
        style={styles.seg}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.scrollPad}>
        {segment === 'jobs' && renderJobs()}
        {segment === 'streams' && renderStreams()}
        {segment === 'marks' && renderMarks()}
        {segment === 'offline' && renderOffline()}
      </ScrollView>

      <Portal>
        <Dialog visible={momentDialogOpen} onDismiss={() => setMomentDialogOpen(false)}>
          <Dialog.Title>New moment</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{marginBottom: 8}}>
              Pick a library file and timestamp (milliseconds).
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {audioFiles.map(f => (
                <Chip
                  key={f.id}
                  selected={momentAudioId === f.id}
                  onPress={() => setMomentAudioId(f.id)}
                  style={{marginRight: 8}}>
                  {(f.originalFilename || f.filename).slice(0, 18)}
                </Chip>
              ))}
            </ScrollView>
            <TextInput
              label="Position (ms)"
              value={momentPositionMs}
              onChangeText={setMomentPositionMs}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Note (optional)"
              value={momentNote}
              onChangeText={setMomentNote}
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMomentDialogOpen(false)}>Cancel</Button>
            <Button onPress={saveMoment} loading={momentSaving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  seg: {margin: 12},
  scrollPad: {paddingHorizontal: 12, paddingBottom: 32},
  rowCard: {marginBottom: 8, borderRadius: 12},
  rowInner: {flexDirection: 'row', alignItems: 'center'},
  blockTitle: {marginTop: 8, marginBottom: 8, fontWeight: '600'},
  centered: {padding: 32, alignItems: 'center'},
  input: {marginBottom: 8},
  mb: {marginBottom: 12},
  markActions: {marginBottom: 12},
  chips: {maxHeight: 48, marginBottom: 8},
});
