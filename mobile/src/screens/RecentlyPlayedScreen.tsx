import React, {useEffect, useState} from 'react';
import {View, StyleSheet, FlatList, RefreshControl, ActivityIndicator} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  IconButton,
  Menu,
  List,
  Chip,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {recentlyPlayedService, PlayHistoryItem} from '../services/recentlyPlayedService';
import {RootStackParamList} from '../navigation/AppNavigator';
import {socialShareService} from '../services/socialShareService';
import {hapticService} from '../services/hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('RecentlyPlayedScreen');

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function RecentlyPlayedScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [recent, setRecent] = useState<PlayHistoryItem[]>([]);
  const [mostPlayed, setMostPlayed] = useState<PlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'mostPlayed'>('recent');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recentData, mostPlayedData] = await Promise.all([
        recentlyPlayedService.getRecentlyPlayed(),
        recentlyPlayedService.getMostPlayed(20),
      ]);
      setRecent(recentData);
      setMostPlayed(mostPlayedData);
    } catch (error) {
      log.error('loadData failed', {message: String(error)});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlayTrack = async (audioFileId: string) => {
    hapticService.light();
    navigation.navigate('AudioPlayer', {audioId: audioFileId});
  };

  const handleShare = async (item: PlayHistoryItem) => {
    hapticService.light();
    setMenuVisible(null);
    await socialShareService.shareTrack(item.audioFile);
  };

  const handleRemove = async (audioFileId: string) => {
    hapticService.light();
    setMenuVisible(null);
    await recentlyPlayedService.removeFromHistory(audioFileId);
    await loadData();
  };

  const handleClearAll = () => {
    setMenuVisible(null);
    recentlyPlayedService.clearHistory().then(() => {
      loadData();
    });
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      return 'Just now';
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderTrack = ({item}: {item: PlayHistoryItem}) => {
    const audioFile = item.audioFile;
    return (
      <Card
        style={[styles.card, {backgroundColor: theme.colors.surface}]}
        onPress={() => handlePlayTrack(audioFile.id)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.trackInfo}>
            <MaterialCommunityIcons
              name="music"
              size={24}
              color={theme.colors.primary}
              style={styles.icon}
            />
            <View style={styles.details}>
              <Text
                style={[styles.trackTitle, {color: theme.colors.onSurface}]}
                numberOfLines={1}>
                {audioFile.originalFilename || audioFile.filename}
              </Text>
              <View style={styles.meta}>
                <Text
                  style={[
                    styles.metaText,
                    {color: theme.colors.onSurfaceVariant},
                  ]}>
                  {formatDate(item.playedAt)}
                </Text>
                {item.playCount > 1 && (
                  <Chip
                    mode="flat"
                    compact
                    style={styles.playCountChip}
                    textStyle={{fontSize: 10}}>
                    {item.playCount}x
                  </Chip>
                )}
              </View>
            </View>
          </View>

          <Menu
            visible={menuVisible === audioFile.id}
            onDismiss={() => setMenuVisible(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => {
                  hapticService.light();
                  setMenuVisible(audioFile.id);
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
            <Menu.Item
              onPress={() => handleRemove(audioFile.id)}
              title="Remove"
              leadingIcon="delete-outline"
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
      </View>
    );
  }

  const data = activeTab === 'recent' ? recent : mostPlayed;

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.tabs}>
        <Chip
          selected={activeTab === 'recent'}
          onPress={() => {
            hapticService.light();
            setActiveTab('recent');
          }}
          style={styles.tab}
          icon="clock-outline">
          Recent
        </Chip>
        <Chip
          selected={activeTab === 'mostPlayed'}
          onPress={() => {
            hapticService.light();
            setActiveTab('mostPlayed');
          }}
          style={styles.tab}
          icon="fire">
          Most Played
        </Chip>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="music-note-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[styles.emptyText, {color: theme.colors.onSurfaceVariant}]}>
            {activeTab === 'recent'
              ? 'No recently played tracks'
              : 'No most played tracks'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderTrack}
          keyExtractor={item => `${item.audioFile.id}-${item.playedAt}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            recent.length > 0 && activeTab === 'recent' ? (
              <View style={styles.footer}>
                <IconButton
                  icon="delete-sweep-outline"
                  size={20}
                  onPress={handleClearAll}
                  iconColor={theme.colors.error}
                />
                <Text
                  style={[styles.clearText, {color: theme.colors.error}]}
                  onPress={handleClearAll}>
                  Clear History
                </Text>
              </View>
            ) : null
          }
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
  },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    marginRight: 8,
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
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
  },
  playCountChip: {
    height: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

