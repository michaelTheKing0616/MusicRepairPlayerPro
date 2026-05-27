import React, {useEffect, useState} from 'react';
import {View, StyleSheet, FlatList, RefreshControl, ActivityIndicator} from 'react-native';
import {
  Button,
  Card,
  Text,
  useTheme,
  Chip,
  IconButton,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {AudioFile} from '../types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';
import {recommendationService} from '../services/recommendationService';
import {hapticService} from '../services/hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('Discovery');

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface DiscoverySection {
  title: string;
  subtitle?: string;
  tracks: AudioFile[];
  type: 'new' | 'trending' | 'discover' | 'genres';
}

export function DiscoveryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuth();
  const [sections, setSections] = useState<DiscoverySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDiscovery();
  }, []);

  const loadDiscovery = async () => {
    try {
      setLoading(true);
      const allFiles = await apiService.getAudioFiles();

      // New Releases (most recently uploaded)
      const newReleases: AudioFile[] = [...allFiles]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 10);

      // Trending (most played recently)
      const trending: AudioFile[] = []; // Would need play count data
      if (user) {
        const recommendations = await recommendationService.getRecommendations(
          user.id,
          10
        );
        trending.push(...recommendations.map(r => r.audioFile));
      }

      // Discover Weekly (AI-curated)
      const discoverWeekly: AudioFile[] = [];
      if (user) {
        const mix = await recommendationService.getDailyMix(user.id, 3);
        discoverWeekly.push(...mix);
      }

      setSections([
        {
          title: 'New Releases',
          subtitle: 'Latest additions to the library',
          tracks: newReleases,
          type: 'new',
        },
        {
          title: 'Trending Now',
          subtitle: 'What\'s hot right now',
          tracks: trending.length > 0 ? trending : newReleases.slice(0, 10),
          type: 'trending',
        },
        {
          title: 'Discover Weekly',
          subtitle: 'Your personalized mix',
          tracks: discoverWeekly.length > 0 ? discoverWeekly : newReleases.slice(0, 10),
          type: 'discover',
        },
      ]);
    } catch (error) {
      log.error('loadDiscovery failed', {message: String(error)});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDiscovery();
  };

  const handlePlayTrack = (audioFileId: string) => {
    hapticService.light();
    navigation.navigate('AudioPlayer', {audioId: audioFileId});
  };

  const renderSection = ({item: section}: {item: DiscoverySection}) => {
    if (section.tracks.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
              {section.title}
            </Text>
            {section.subtitle && (
              <Text
                style={[
                  styles.sectionSubtitle,
                  {color: theme.colors.onSurfaceVariant},
                ]}>
                {section.subtitle}
              </Text>
            )}
          </View>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => {
              // Navigate to section detail
            }}
          />
        </View>

        <FlatList
          horizontal
          data={section.tracks}
          renderItem={({item}) => renderTrack(item)}
          keyExtractor={track => track.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trackList}
        />
      </View>
    );
  };

  const renderTrack = (track: AudioFile) => {
    return (
      <Card
        style={[styles.trackCard, {backgroundColor: theme.colors.surface}]}
        onPress={() => handlePlayTrack(track.id)}>
        <Card.Content style={styles.trackCardContent}>
          <View style={[styles.artworkPlaceholder, {backgroundColor: theme.colors.primaryContainer}]}>
            <MaterialCommunityIcons
              name="music"
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <Text
            style={[styles.trackName, {color: theme.colors.onSurface}]}
            numberOfLines={1}>
            {track.originalFilename || track.filename}
          </Text>
          {track.artist && (
            <Text
              style={[styles.trackArtist, {color: theme.colors.onSurfaceVariant}]}
              numberOfLines={1}>
              {track.artist}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
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
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={section => section.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text
              style={[styles.headerTitle, {color: theme.colors.onSurface}]}>
              Discover Music
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {color: theme.colors.onSurfaceVariant},
              ]}>
              Find your next favorite song
            </Text>
            <Button
              mode="contained-tonal"
              icon="radio"
              style={{marginTop: 12, alignSelf: 'flex-start'}}
              onPress={() => {
                hapticService.light();
                navigation.navigate('Activity', {initialSegment: 'streams'});
              }}>
              Radio, podcasts & jobs
            </Button>
          </View>
        }
      />
    </View>
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
  content: {
    paddingBottom: 16,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  trackList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trackCard: {
    width: 160,
    marginRight: 12,
    elevation: 2,
  },
  trackCardContent: {
    alignItems: 'center',
    padding: 12,
  },
  artworkPlaceholder: {
    width: 136,
    height: 136,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 12,
    textAlign: 'center',
  },
});

