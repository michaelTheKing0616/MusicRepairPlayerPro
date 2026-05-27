import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  Menu,
  IconButton,
  Portal,
  Dialog,
  Button,
  useTheme,
  Searchbar,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {localMusicService} from '../services/localMusicService';
import {LocalMusicFile} from '../types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {hapticService} from '../services/hapticService';
import {createLogger} from '../utils/logger';

type NavigationProp = StackNavigationProp<RootStackParamList>;

type ViewMode = 'local' | 'cloud';

const log = createLogger('Library');

export function LibraryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [localSongs, setLocalSongs] = useState<LocalMusicFile[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<LocalMusicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('local');
  const [permissionError, setPermissionError] = useState(false);
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album'>('title');

  // Scan local music when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'local') {
        scanLocalMusic();
      }
    }, [viewMode]),
  );

  useEffect(() => {
    if (viewMode === 'local') {
      scanLocalMusic();
    }
  }, [viewMode]);

  // Filter songs based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSongs(localSongs);
    } else {
      const filtered = localSongs.filter(
        song =>
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.album.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredSongs(filtered);
    }
  }, [searchQuery, localSongs]);

  const scanLocalMusic = async () => {
    try {
      setLoading(true);
      setPermissionError(false);

      // Check and request permissions
      const hasPermissions = await localMusicService.hasPermissions();
      if (!hasPermissions) {
        const granted = await localMusicService.requestPermissions();
        if (!granted) {
          setPermissionError(true);
          setLoading(false);
          Alert.alert(
            'Permission Required',
            'Storage permission is required to scan your music library. Please grant permission in settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Try Again',
                onPress: () => scanLocalMusic(),
              },
            ],
          );
          return;
        }
      }

      // Scan for music files
      const songs = await localMusicService.getAllSongs({
        sortBy,
        sortOrder: 'asc',
      });

      setLocalSongs(songs);
      setFilteredSongs(songs);
      hapticService.success();
    } catch (error: any) {
      log.error('scanLocalMusic failed', {message: String(error)});
      setPermissionError(true);
      Alert.alert('Error', error.message || 'Failed to scan music files');
      hapticService.error();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    scanLocalMusic();
  };

  const handlePlay = (song: LocalMusicFile) => {
    hapticService.selection();
    // Navigate to audio player with local song path
    // For now, we'll just log it - you'll need to implement local playback
    navigation.navigate('AudioPlayer', {
      audioId: song.id,
      localPath: song.path,
    } as any);
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const renderSong = ({item}: {item: LocalMusicFile}) => (
    <Card
      style={styles.card}
      onPress={() => handlePlay(item)}
      onLongPress={() => setMenuVisible(item.id)}>
      <Card.Content>
        <View style={styles.cardContent}>
          <View style={styles.albumArtContainer}>
            {item.cover ? (
              <View style={[styles.albumArt, {backgroundColor: theme.colors.surfaceVariant}]}>
                <Text variant="bodyLarge" style={styles.albumArtText}>
                  {item.title.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={[styles.albumArt, {backgroundColor: theme.colors.primaryContainer}]}>
                <MaterialCommunityIcons
                  name="music"
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
            )}
          </View>
          <View style={styles.songInfo}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.songTitle}>
              {item.title}
            </Text>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.songArtist}>
              {item.artist}
            </Text>
            <View style={styles.songMeta}>
              <Text variant="bodySmall" style={styles.metaText}>
                {item.album}
              </Text>
              <Text variant="bodySmall" style={styles.metaText}>
                • {formatDuration(item.duration)}
              </Text>
            </View>
          </View>
          <IconButton
            icon="play-circle"
            size={32}
            iconColor={theme.colors.primary}
            onPress={() => handlePlay(item)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && localSongs.length === 0) {
    return (
      <View style={[styles.centerContainer, {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Scanning your music library...
        </Text>
        <Text variant="bodySmall" style={styles.loadingSubtext}>
          This may take a moment
        </Text>
      </View>
    );
  }

  if (permissionError) {
    return (
      <View style={[styles.centerContainer, {backgroundColor: theme.colors.background}]}>
        <MaterialCommunityIcons
          name="lock-alert"
          size={64}
          color={theme.colors.error}
        />
        <Text variant="titleLarge" style={styles.errorText}>
          Permission Required
        </Text>
        <Text variant="bodyMedium" style={styles.errorSubtext}>
          Please grant storage permission to access your music library
        </Text>
        <Button
          mode="contained"
          onPress={scanLocalMusic}
          style={styles.retryButton}
          icon="refresh">
          Grant Permission
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search songs, artists, albums..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          icon="magnify"
        />
      </View>

      {/* Sort Chips */}
      <View style={styles.sortContainer}>
        <Text variant="bodySmall" style={styles.sortLabel}>
          Sort by:
        </Text>
        <Chip
          selected={sortBy === 'title'}
          onPress={() => {
            setSortBy('title');
            const sorted = [...localSongs].sort((a, b) =>
              a.title.localeCompare(b.title),
            );
            setLocalSongs(sorted);
          }}
          style={styles.chip}>
          Title
        </Chip>
        <Chip
          selected={sortBy === 'artist'}
          onPress={() => {
            setSortBy('artist');
            const sorted = [...localSongs].sort((a, b) =>
              a.artist.localeCompare(b.artist),
            );
            setLocalSongs(sorted);
          }}
          style={styles.chip}>
          Artist
        </Chip>
        <Chip
          selected={sortBy === 'album'}
          onPress={() => {
            setSortBy('album');
            const sorted = [...localSongs].sort((a, b) =>
              a.album.localeCompare(b.album),
            );
            setLocalSongs(sorted);
          }}
          style={styles.chip}>
          Album
        </Chip>
      </View>

      {/* Song Count */}
      <View style={styles.countContainer}>
        <Text variant="bodyMedium" style={styles.countText}>
          {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
        </Text>
        <Button
          mode="contained-tonal"
          compact
          icon="playlist-music"
          onPress={() => {
            hapticService.selection();
            navigation.navigate('MixedPlaylists');
          }}>
          Playlists
        </Button>
        <IconButton
          icon="refresh"
          size={20}
          onPress={handleRefresh}
          disabled={refreshing}
        />
      </View>

      {/* Songs List */}
      {filteredSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="music-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleLarge" style={styles.emptyText}>
            {searchQuery ? 'No songs found' : 'No music found'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {searchQuery
              ? 'Try a different search term'
              : 'Make sure you have music files on your device'}
          </Text>
          {!searchQuery && (
            <Button
              mode="outlined"
              onPress={handleRefresh}
              style={styles.refreshButton}
              icon="refresh">
              Scan Again
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredSongs}
          renderItem={renderSong}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    opacity: 0.7,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortLabel: {
    marginRight: 4,
  },
  chip: {
    marginRight: 4,
  },
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  countText: {
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArtContainer: {
    marginRight: 12,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtText: {
    fontWeight: 'bold',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontWeight: '600',
  },
  songArtist: {
    marginTop: 4,
    opacity: 0.8,
  },
  songMeta: {
    flexDirection: 'row',
    marginTop: 4,
    opacity: 0.6,
  },
  metaText: {
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  refreshButton: {
    marginTop: 16,
  },
  errorText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
});
