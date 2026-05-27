import React, {useEffect, useState} from 'react';
import {View, StyleSheet, FlatList, ActivityIndicator, ScrollView, Image} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  Chip,
  IconButton,
  Button,
} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {AudioFile} from '../types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {hapticService} from '../services/hapticService';
import {socialShareService} from '../services/socialShareService';
import {createLogger} from '../utils/logger';

const log = createLogger('ArtistAlbumScreen');

type ArtistAlbumRouteProp = RouteProp<
  RootStackParamList,
  'ArtistAlbum'
>;

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function ArtistAlbumScreen() {
  const theme = useTheme();
  const route = useRoute<ArtistAlbumRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const {type, name} = route.params;
  const [tracks, setTracks] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [albumInfo, setAlbumInfo] = useState<{
    year?: number;
    genre?: string;
    trackCount: number;
  } | null>(null);

  useEffect(() => {
    loadTracks();
    loadArtwork();
  }, [type, name]);

  const loadTracks = async () => {
    try {
      const allFiles = await apiService.getAudioFiles();
      
      let filtered: AudioFile[] = [];
      if (type === 'artist') {
        filtered = allFiles.filter(file => file.artist === name);
      } else if (type === 'album') {
        filtered = allFiles.filter(file => file.album === name);
        // Extract album info
        if (filtered.length > 0) {
          const firstTrack = filtered[0];
          setAlbumInfo({
            year: firstTrack.year,
            genre: firstTrack.genre,
            trackCount: filtered.length,
          });
        }
      }

      setTracks(filtered);
    } catch (error) {
      log.error('loadTracks failed', {message: String(error)});
    } finally {
      setLoading(false);
    }
  };

  const loadArtwork = async () => {
    try {
      if (type === 'album' && tracks.length > 0) {
        const artworkUrl = tracks[0].artworkUrl;
        if (artworkUrl) {
          setArtwork(artworkUrl);
        }
      }
    } catch (error) {
      log.warn('loadArtwork failed', {message: String(error)});
    }
  };

  const handlePlayTrack = (audioFileId: string) => {
    hapticService.light();
    navigation.navigate('AudioPlayer', {audioId: audioFileId});
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      hapticService.medium();
      handlePlayTrack(tracks[0].id);
      // TODO: Queue all tracks
    }
  };

  const handleShare = async () => {
    hapticService.light();
    await socialShareService.sharePlaylist(name, tracks.length);
  };

  const renderTrack = ({item, index}: {item: AudioFile; index: number}) => {
    return (
      <Card
        style={[styles.trackCard, {backgroundColor: theme.colors.surface}]}
        onPress={() => handlePlayTrack(item.id)}>
        <Card.Content style={styles.trackContent}>
          <View style={styles.trackNumber}>
            <Text style={[styles.number, {color: theme.colors.onSurfaceVariant}]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.trackInfo}>
            <Text
              style={[styles.trackTitle, {color: theme.colors.onSurface}]}
              numberOfLines={1}>
              {item.title || item.originalFilename || item.filename}
            </Text>
            {type === 'artist' && item.album && (
              <Text
                style={[styles.trackAlbum, {color: theme.colors.onSurfaceVariant}]}
                numberOfLines={1}>
                {item.album}
              </Text>
            )}
          </View>
          <Text
            style={[styles.trackDuration, {color: theme.colors.onSurfaceVariant}]}>
            {formatDuration(item.duration)}
          </Text>
          <IconButton
            icon="play"
            size={20}
            onPress={() => handlePlayTrack(item.id)}
          />
        </Card.Content>
      </Card>
    );
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {backgroundColor: theme.colors.background},
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Header */}
      <View style={styles.header}>
        {artwork ? (
          <Image source={{uri: artwork}} style={styles.artwork} />
        ) : (
          <View
            style={[
              styles.artworkPlaceholder,
              {backgroundColor: theme.colors.primaryContainer},
            ]}>
            <MaterialCommunityIcons
              name={type === 'artist' ? 'account-music' : 'album'}
              size={64}
              color={theme.colors.primary}
            />
          </View>
        )}
        <Text style={[styles.name, {color: theme.colors.onSurface}]}>
          {name}
        </Text>
        {albumInfo && (
          <View style={styles.infoRow}>
            {albumInfo.year && (
              <Text
                style={[styles.infoText, {color: theme.colors.onSurfaceVariant}]}>
                {albumInfo.year}
              </Text>
            )}
            {albumInfo.genre && (
              <Chip mode="flat" compact style={styles.chip}>
                {albumInfo.genre}
              </Chip>
            )}
            <Text
              style={[styles.infoText, {color: theme.colors.onSurfaceVariant}]}>
              {albumInfo.trackCount} tracks
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handlePlayAll}
            icon="play"
            style={styles.actionButton}>
            Play All
          </Button>
          <IconButton
            icon="share-variant"
            size={24}
            onPress={handleShare}
          />
        </View>
      </View>

      {/* Tracks List */}
      <View style={styles.tracksSection}>
        <Text
          style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
          {type === 'artist' ? 'Popular Tracks' : 'Tracks'}
        </Text>
        {tracks.map((track, index) => (
          <Card
            key={track.id}
            style={[styles.trackCard, {backgroundColor: theme.colors.surface}]}
            onPress={() => handlePlayTrack(track.id)}>
            <Card.Content style={styles.trackContent}>
              <View style={styles.trackNumber}>
                <Text style={[styles.number, {color: theme.colors.onSurfaceVariant}]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.trackInfo}>
                <Text
                  style={[styles.trackTitle, {color: theme.colors.onSurface}]}
                  numberOfLines={1}>
                  {track.title || track.originalFilename || track.filename}
                </Text>
                {type === 'artist' && track.album && (
                  <Text
                    style={[styles.trackAlbum, {color: theme.colors.onSurfaceVariant}]}
                    numberOfLines={1}>
                    {track.album}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.trackDuration, {color: theme.colors.onSurfaceVariant}]}>
                {formatDuration(track.duration)}
              </Text>
              <IconButton
                icon="play"
                size={20}
                onPress={() => handlePlayTrack(track.id)}
              />
            </Card.Content>
          </Card>
        ))}
      </View>

      {tracks.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="music-note-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
            No tracks found
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  artwork: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  artworkPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
  },
  chip: {
    height: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  tracksSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  trackCard: {
    marginBottom: 8,
    elevation: 1,
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
  },
  number: {
    fontSize: 14,
    fontWeight: '500',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  trackAlbum: {
    fontSize: 12,
  },
  trackDuration: {
    fontSize: 14,
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});

