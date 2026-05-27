import React, {useEffect, useState} from 'react';
import {View, StyleSheet, FlatList, RefreshControl, ActivityIndicator} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  Chip,
  IconButton,
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {recommendationService, Recommendation} from '../services/recommendationService';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';
import {hapticService} from '../services/hapticService';
import {socialShareService} from '../services/socialShareService';
import {apiService} from '../services/api';
import {recommendListeningPresetsForLibrary} from '../preset-engine/listeningReco';
import type {ListeningPresetDefinition} from '../preset-engine/types';
import {createLogger} from '../utils/logger';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const screenLog = createLogger('RecommendationsScreen');

export function RecommendationsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'recommended' | 'similar' | 'discover' | 'presets'
  >('recommended');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [listeningPresetRecs, setListeningPresetRecs] = useState<ListeningPresetDefinition[]>(
    [],
  );

  useEffect(() => {
    loadRecommendations();
  }, [activeTab]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      let results: Recommendation[] = [];

      if (activeTab === 'recommended' && user) {
        // Prefer backend recommendations feed when analytics consent is enabled.
        if (user.consent_analytics) {
          const feed = await apiService.getRecommendationsFeed(20);
          const files = await apiService.getAudioFiles();
          const byId = new Map(files.map(f => [f.id, f]));
          results = feed
            .map(it => {
              const af = byId.get(it.audioFileId);
              if (!af) return null;
              return {
                audioFile: af,
                score: it.score,
                reason: it.reason || 'Picked for you',
                category: 'recommended' as const,
              };
            })
            .filter(Boolean) as Recommendation[];
        } else {
          results = await recommendationService.getRecommendations(user.id, 20);
        }
      } else if (activeTab === 'similar') {
        // Get similar to recently played
        const {recentlyPlayedService} = await import('../services/recentlyPlayedService');
        const recent = await recentlyPlayedService.getRecentlyPlayed();
        if (recent.length > 0) {
          results = await recommendationService.getSimilarTracks(
            recent[0].audioFile.id,
            20
          );
        }
      } else if (activeTab === 'discover') {
        // Discover new music
        if (user) {
          const {recommendationService: recService} = await import('../services/recommendationService');
          const mix = await recService.getDailyMix(user.id, 3); // Mix 3 is Discover
          results = mix.map((audioFile, index) => ({
            audioFile,
            score: Math.max(0.2, 1 - index * 0.03),
            reason: 'Picked for discovery based on your listening',
            category: 'discover' as const,
          }));
        }
      } else if (activeTab === 'presets') {
        const corpus = await apiService.getAudioFiles();
        setListeningPresetRecs(recommendListeningPresetsForLibrary(corpus, 12));
        setRecommendations([]);
        return;
      }

      setRecommendations(results);
    } catch (error) {
      screenLog.warn('Error loading recommendations', {message: String(error)});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecommendations();
  };

  const handlePlayTrack = (audioFileId: string) => {
    hapticService.light();
    navigation.navigate('AudioPlayer', {audioId: audioFileId});
  };

  const handleShare = async (recommendation: Recommendation) => {
    hapticService.light();
    setSelectedTrackId(null);
    await socialShareService.shareTrack(recommendation.audioFile);
  };

  const renderRecommendation = ({item}: {item: Recommendation}) => {
    const audioFile = item.audioFile;
    return (
      <Card
        style={[styles.card, {backgroundColor: theme.colors.surface}]}
        onPress={() => handlePlayTrack(audioFile.id)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.trackInfo}>
            <MaterialCommunityIcons
              name={
                item.category === 'similar'
                  ? 'music-circle'
                  : item.category === 'discover'
                  ? 'compass'
                  : 'recommend'
              }
              size={32}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <View style={styles.details}>
              <Text
                style={[styles.trackTitle, {color: theme.colors.onSurface}]}
                numberOfLines={1}>
                {audioFile.originalFilename || audioFile.filename}
              </Text>
              <Text
                style={[styles.reason, {color: theme.colors.onSurfaceVariant}]}
                numberOfLines={1}>
                {item.reason}
              </Text>
              <View style={styles.meta}>
                <Chip
                  mode="flat"
                  compact
                  style={styles.categoryChip}
                  textStyle={{fontSize: 10}}>
                  {item.category}
                </Chip>
                <Text
                  style={[styles.score, {color: theme.colors.onSurfaceVariant}]}>
                  {Math.round(item.score * 100)}% match
                </Text>
              </View>
            </View>
          </View>

          <Menu
            visible={selectedTrackId === audioFile.id}
            onDismiss={() => setSelectedTrackId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => {
                  hapticService.light();
                  setSelectedTrackId(audioFile.id);
                }}
              />
            }>
            <Menu.Item
              onPress={() => handlePlayTrack(audioFile.id)}
              title="Play"
              leadingIcon="play"
            />
            <Menu.Item
              onPress={() => handleShare(item)}
              title="Share"
              leadingIcon="share-variant"
            />
          </Menu>
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
        <Text
          style={[styles.loadingText, {color: theme.colors.onSurfaceVariant}]}>
          Analyzing your music taste...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.tabs}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={value => {
            hapticService.light();
            setActiveTab(value as typeof activeTab);
          }}
          buttons={[
            {
              value: 'recommended',
              label: 'For You',
              icon: 'recommend',
            },
            {
              value: 'similar',
              label: 'Similar',
              icon: 'music-circle',
            },
            {
              value: 'discover',
              label: 'Discover',
              icon: 'compass',
            },
            {
              value: 'presets',
              label: 'Sound',
              icon: 'tune-vertical',
            },
          ]}
        />
      </View>

      {activeTab === 'presets' ? (
        listeningPresetRecs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="tune-vertical"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
              No preset suggestions yet
            </Text>
            <Text style={[styles.emptySubtext, {color: theme.colors.onSurfaceVariant}]}>
              Upload tracks or open the Sound tab for the full 90-preset catalog.
            </Text>
          </View>
        ) : (
          <FlatList
            data={listeningPresetRecs}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <Card
                style={styles.card}
                onPress={() => {
                  hapticService.light();
                  navigation.getParent()?.navigate('PresetDetail', {presetId: item.id});
                }}>
                <Card.Content style={styles.cardContent}>
                  <MaterialCommunityIcons name="playlist-star" size={32} color={theme.colors.primary} />
                  <View style={styles.details}>
                    <Text style={[styles.trackTitle, {color: theme.colors.onSurface}]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.reason, {color: theme.colors.onSurfaceVariant}]}
                      numberOfLines={2}>
                      {item.summary}
                    </Text>
                    <Chip compact style={styles.categoryChip}>
                      {item.category} · {item.routing}
                    </Chip>
                  </View>
                </Card.Content>
              </Card>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )
      ) : recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="music-note-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
            No recommendations yet
          </Text>
          <Text
            style={[
              styles.emptySubtext,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Start playing music to get personalized recommendations
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={item => item.audioFile.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  tabs: {
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    height: 20,
  },
  score: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

