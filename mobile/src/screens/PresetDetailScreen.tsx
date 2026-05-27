import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  List,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {getListeningPreset} from '../preset-engine/catalog';
import {requiresOfflineRender, prefersRealtimePlayback} from '../preset-engine/routing';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useListeningPresetControl} from '../context/PresetContext';
import {apiService} from '../services/api';
import {AudioFile} from '../types';
import {createLogger} from '../utils/logger';
import {hapticService} from '../services/hapticService';

const log = createLogger('PresetDetail');

type R = RouteProp<RootStackParamList, 'PresetDetail'>;
type Nav = StackNavigationProp<RootStackParamList>;

export function PresetDetailScreen() {
  const theme = useTheme();
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const paramsId = route.params.presetId;
  const base = getListeningPreset(paramsId);

  const [tier, setTier] = useState(base?.tier ?? 5);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [pickOpen, setPickOpen] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const {applyRealtimeToSavedSettings, applyNativeRealtimeIfPossible} = useListeningPresetControl();

  useEffect(() => {
    const p = getListeningPreset(paramsId);
    if (p) setTier(p.tier);
  }, [paramsId]);

  const effectiveId = useMemo(() => {
    if (!base) return paramsId;
    return `${base.familyKey}.t${Math.round(tier)}`;
  }, [base, paramsId, tier]);

  const preset = getListeningPreset(effectiveId) ?? base;

  const loadFiles = useCallback(async () => {
    try {
      const list = await apiService.getAudioFiles();
      setFiles(list);
    } catch (e) {
      log.warn('list files failed', {message: String(e)});
    }
  }, []);

  const onApplyRealtime = async () => {
    if (!preset) return;
    hapticService.medium();
    await applyRealtimeToSavedSettings(preset.id);
    const nativeOk = await applyNativeRealtimeIfPossible(preset.id);
    Alert.alert(
      'Applied',
      nativeOk
        ? 'Preset mapped to saved player settings. Android native EQ applied.'
        : 'Preset mapped to saved player settings. Native realtime EQ is best-effort (Android-only; iOS not supported here). If you do not hear a change, use offline render for guaranteed processing.',
    );
  };

  const startRender = async (fileId: string) => {
    if (!preset) return;
    try {
      const res = await apiService.enqueuePresetRender(fileId, preset.id);
      setLastJobId(res.id);
      setPickOpen(false);
      Alert.alert(
        'Render queued',
        `Job id ${res.id}. Poll GET /jobs/${res.id}/status or add a Jobs screen to your flow.`,
      );
    } catch (e) {
      Alert.alert('Queue failed', String(e));
    }
  };

  const openRenderPicker = async () => {
    await loadFiles();
    setPickOpen(true);
  };

  if (!preset) {
    return (
      <View style={styles.center}>
        <Text>Unknown preset</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{backgroundColor: theme.colors.background, padding: 16}}>
      <Text variant="headlineSmall">{preset.name}</Text>
      <Text style={{color: theme.colors.onSurfaceVariant, marginVertical: 8}}>{preset.summary}</Text>
      <View style={styles.row}>
        <Chip icon="tag">{preset.category}</Chip>
        <Chip icon="transit-connection-variant">{preset.routing}</Chip>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Pro intensity (tier)" subtitle="1 = gentle · 9 = strong" />
        <Card.Content>
          <Slider
            minimumValue={1}
            maximumValue={9}
            step={1}
            value={tier}
            onValueChange={setTier}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.surfaceVariant}
            thumbTintColor={theme.colors.primary}
          />
          <Text variant="labelLarge">
            Tier {Math.round(tier)} → {preset.id}
          </Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={{marginTop: 16}}>
        Macros
      </Text>
      <View style={styles.row}>
        {[
          {label: 'Vocal', id: 'vocal_clarity.t5'},
          {label: 'Bass', id: 'bass_enhance.t5'},
          {label: 'Immersive', id: 'stereo_immersive.t5'},
        ].map(m => (
          <Chip
            key={m.id}
            onPress={() => {
              navigation.setParams({presetId: m.id});
            }}>
            {m.label}
          </Chip>
        ))}
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Hybrid routing</Text>
          <Text style={{marginVertical: 8}}>
            Realtime-compatible: {prefersRealtimePlayback(preset.routing) ? 'yes (approx EQ)' : 'no'}
          </Text>
          <Text>
            Offline-only catalog flag:{' '}
            {requiresOfflineRender(preset.routing) ? 'yes (preview still maps EQ loosely)' : 'no'}
          </Text>
          <Button mode="contained" style={{marginTop: 12}} onPress={onApplyRealtime}>
            Apply realtime map
          </Button>
          <Button mode="outlined" style={{marginTop: 8}} onPress={openRenderPicker}>
            Render full FFmpeg chain (cloud)
          </Button>
          {lastJobId ? (
            <Text style={{marginTop: 12}} selectable>
              Last job: {lastJobId}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={pickOpen} onDismiss={() => setPickOpen(false)}>
          <Dialog.Title>Select source file</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{maxHeight: 320}}>
              {files.map(f => (
                <List.Item
                  key={f.id}
                  title={f.filename}
                  description={`${f.format ?? ''}`}
                  onPress={() => startRender(f.id)}
                />
              ))}
              {files.length === 0 ? <List.Item title="No uploaded files yet" /> : null}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickOpen(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8},
  card: {marginVertical: 8},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
