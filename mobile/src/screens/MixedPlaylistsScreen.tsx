import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {createLogger} from '../utils/logger';
import {playlistService, type MixedPlaylist} from '../services/playlistService';

const log = createLogger('MixedPlaylists');

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function playableLabel(p: any): string {
  const kind = String(p?.kind ?? '');
  switch (kind) {
    case 'library_audio':
      return `Library · ${String(p.audioFileId ?? '').slice(0, 8)}…`;
    case 'podcast_episode':
      return `Podcast · ${String(p.episodeId ?? '').slice(0, 8)}…`;
    case 'radio_station':
      return `Radio · ${String(p.name ?? p.stationId ?? 'station')}`;
    case 'local_file':
      return `Local · ${String(p.filename ?? 'file')}`;
    default:
      return kind || 'Playable';
  }
}

export function MixedPlaylistsScreen() {
  const theme = useTheme();
  const [playlists, setPlaylists] = useState<MixedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  const [selected, setSelected] = useState<MixedPlaylist | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await playlistService.getMixedPlaylists();
      setPlaylists(list);
      if (selected) {
        const refreshed = list.find(p => p.id === selected.id) ?? null;
        setSelected(refreshed);
      }
    } catch (e) {
      log.error('load failed', {message: String(e)});
      Alert.alert('Playlists', 'Could not load playlists.');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
  }, [load]);

  const headerSubtitle = useMemo(() => {
    if (loading && playlists.length === 0) return 'Loading…';
    return `${playlists.length} playlist${playlists.length === 1 ? '' : 's'}`;
  }, [loading, playlists.length]);

  const exportPlaylist = async (p: MixedPlaylist) => {
    try {
      const payload = await playlistService.exportMixedPlaylist(p.id);
      if (!payload) {
        Alert.alert('Export', 'Playlist not found.');
        return;
      }
      const outDir = `${RNFS.CachesDirectoryPath}/musicrepair_exports`;
      await RNFS.mkdir(outDir);
      const filename = `playlist_${p.name.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 48)}_${Date.now()}.json`;
      const outPath = `${outDir}/${filename}`;
      await RNFS.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');

      await Share.open({
        title: 'Export playlist',
        url: `file://${outPath}`,
        type: 'application/json',
        failOnCancel: false,
      });
    } catch (e: any) {
      log.error('export failed', {message: String(e)});
      Alert.alert('Export', e?.message || 'Failed to export playlist.');
    }
  };

  const importPlaylist = async () => {
    try {
      const file = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
        presentationStyle: 'fullScreen',
      });
      const uri = file.fileCopyUri ?? file.uri;
      if (!uri) throw new Error('No file URI');
      const raw = await RNFS.readFile(uri, 'utf8');
      const parsed = safeJsonParse(raw);
      if (!parsed || parsed.schema !== 'musicrepair.playlist_share.v1') {
        Alert.alert('Import', 'Unsupported file. Expected a Music Repair playlist export (v1).');
        return;
      }
      await playlistService.importMixedPlaylist(parsed);
      await load();
      Alert.alert('Imported', 'Playlist imported successfully.');
    } catch (e: any) {
      if (DocumentPicker.isCancel(e)) return;
      log.error('import failed', {message: String(e)});
      Alert.alert('Import', e?.message || 'Failed to import playlist.');
    }
  };

  const createPlaylist = async () => {
    const name = createName.trim();
    if (!name) return;
    try {
      const p = await playlistService.createMixedPlaylist(name);
      setCreateOpen(false);
      setCreateName('');
      await load();
      setSelected(p);
    } catch (e: any) {
      log.error('create failed', {message: String(e)});
      Alert.alert('Create playlist', e?.message || 'Failed to create playlist.');
    }
  };

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <View style={styles.header}>
        <View style={{flex: 1}}>
          <Text variant="headlineSmall">Playlists</Text>
          <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
            Mixed sources · Export/Import
          </Text>
        </View>
        <IconButton icon="import" onPress={importPlaylist} />
        <IconButton icon="plus" onPress={() => setCreateOpen(true)} />
      </View>

      <ScrollView contentContainerStyle={styles.pad}>
        <Text variant="labelLarge" style={{color: theme.colors.onSurfaceVariant, marginBottom: 8}}>
          {headerSubtitle}
        </Text>

        {playlists.map(p => (
          <Card
            key={p.id}
            style={[
              styles.card,
              selected?.id === p.id ? {borderColor: theme.colors.primary, borderWidth: 1} : null,
            ]}
            onPress={() => setSelected(p)}>
            <Card.Content style={styles.row}>
              <View style={{flex: 1}}>
                <Text variant="titleMedium">{p.name}</Text>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                  {p.items.length} item{p.items.length === 1 ? '' : 's'}
                </Text>
              </View>
              <IconButton icon="export" onPress={() => exportPlaylist(p)} />
            </Card.Content>
          </Card>
        ))}

        {selected ? (
          <>
            <Divider style={{marginVertical: 16}} />
            <Text variant="titleLarge" style={{marginBottom: 8}}>
              {selected.name}
            </Text>
            {selected.items.length === 0 ? (
              <Text style={{color: theme.colors.onSurfaceVariant}}>
                Empty playlist. Add items from the player (coming next).
              </Text>
            ) : (
              selected.items
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((it, idx) => (
                  <Card key={`${selected.id}-${idx}`} style={styles.itemCard}>
                    <Card.Content>
                      <Text variant="titleSmall">{playableLabel(it.playable as any)}</Text>
                      <View style={{flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap'}}>
                        <Chip compact icon="numeric">
                          #{idx + 1}
                        </Chip>
                        <Chip compact icon="link-variant">
                          {String((it.playable as any)?.kind ?? 'playable')}
                        </Chip>
                      </View>
                    </Card.Content>
                  </Card>
                ))
            )}
          </>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog visible={createOpen} onDismiss={() => setCreateOpen(false)}>
          <Dialog.Title>New playlist</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name"
              value={createName}
              onChangeText={setCreateName}
              mode="outlined"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button onPress={createPlaylist} disabled={!createName.trim()}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pad: {paddingHorizontal: 12, paddingBottom: 24},
  card: {marginBottom: 10, borderRadius: 14},
  itemCard: {marginBottom: 8, borderRadius: 12},
  row: {flexDirection: 'row', alignItems: 'center'},
});

