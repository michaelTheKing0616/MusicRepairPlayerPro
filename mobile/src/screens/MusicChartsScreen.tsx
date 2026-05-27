import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  useTheme,
  SegmentedButtons,
  IconButton,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {
  musicChartsService,
  MusicChart,
  ChartTrack,
  ChartRegion,
  ChartGenre,
} from '../services/musicChartsService';
import {RootStackParamList} from '../navigation/AppNavigator';
import {hapticService} from '../services/hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('MusicChartsScreen');

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function MusicChartsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [chart, setChart] = useState<MusicChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<ChartRegion>('global');
  const [selectedGenre, setSelectedGenre] = useState<ChartGenre>('all');
  const [regionMenuVisible, setRegionMenuVisible] = useState(false);
  const [genreMenuVisible, setGenreMenuVisible] = useState(false);

  const regions = musicChartsService.getAvailableRegions();
  const genres = musicChartsService.getAvailableGenres();

  useEffect(() => {
    loadCharts();
  }, [selectedRegion, selectedGenre]);

  const loadCharts = async () => {
    try {
      setLoading(true);
      const chartData = await musicChartsService.getChartsByRegion(
        selectedRegion,
        selectedGenre === 'all' ? undefined : selectedGenre,
      );
      setChart(chartData);
      hapticService.success();
    } catch (error) {
      log.error('loadCharts failed', {message: String(error)});
      hapticService.error();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    musicChartsService.clearCache();
    loadCharts();
  }, [selectedRegion, selectedGenre]);

  const handleTrackPress = (track: ChartTrack) => {
    hapticService.selection();
    // Navigate to player or search for track
    // navigation.navigate('AudioPlayer', { audioId: track.id });
  };

  const getPositionChange = (track: ChartTrack) => {
    if (!track.previousPosition) return null;
    const change = track.previousPosition - track.position;
    if (change > 0) return {icon: 'arrow-up', color: theme.colors.primary};
    if (change < 0) return {icon: 'arrow-down', color: theme.colors.error};
    return {icon: 'minus', color: theme.colors.onSurfaceVariant};
  };

  const renderTrack = ({item, index}: {item: ChartTrack; index: number}) => {
    const positionChange = getPositionChange(item);
    const regionName = regions.find(r => r.code === selectedRegion)?.name || selectedRegion;
    const genreName = genres.find(g => g.code === selectedGenre)?.name || 'All';

    return (
      <Card
        style={styles.trackCard}
        onPress={() => handleTrackPress(item)}
        mode="outlined">
        <Card.Content>
          <View style={styles.trackRow}>
            <View style={styles.positionContainer}>
              <Text
                variant="headlineSmall"
                style={[styles.position, {color: theme.colors.primary}]}>
                {item.position}
              </Text>
              {positionChange && (
                <MaterialCommunityIcons
                  name={positionChange.icon}
                  size={16}
                  color={positionChange.color}
                />
              )}
            </View>

            <View style={styles.trackInfo}>
              <Text variant="titleMedium" numberOfLines={1} style={styles.trackTitle}>
                {item.title}
              </Text>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.trackArtist}>
                {item.artist}
              </Text>
              {item.album && (
                <Text variant="bodySmall" numberOfLines={1} style={styles.trackAlbum}>
                  {item.album}
                </Text>
              )}
            </View>

            <View style={styles.trackStats}>
              {item.weeksOnChart && (
                <Text variant="bodySmall" style={styles.stat}>
                  {item.weeksOnChart}w
                </Text>
              )}
              {item.peakPosition && (
                <Text variant="bodySmall" style={styles.stat}>
                  Peak: #{item.peakPosition}
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !chart) {
    return (
      <View
        style={[styles.centerContainer, {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading charts...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Filters */}
      <Card style={styles.filterCard} mode="outlined">
        <Card.Content>
          <View style={styles.filterRow}>
            <Menu
              visible={regionMenuVisible}
              onDismiss={() => setRegionMenuVisible(false)}
              anchor={
                <Chip
                  icon="earth"
                  onPress={() => setRegionMenuVisible(true)}
                  style={styles.filterChip}>
                  {regions.find(r => r.code === selectedRegion)?.name || 'Region'}
                </Chip>
              }>
              {regions.map(region => (
                <Menu.Item
                  key={region.code}
                  onPress={() => {
                    setSelectedRegion(region.code);
                    setRegionMenuVisible(false);
                    hapticService.selection();
                  }}
                  title={region.name}
                />
              ))}
            </Menu>

            <Menu
              visible={genreMenuVisible}
              onDismiss={() => setGenreMenuVisible(false)}
              anchor={
                <Chip
                  icon="music"
                  onPress={() => setGenreMenuVisible(true)}
                  style={styles.filterChip}>
                  {genres.find(g => g.code === selectedGenre)?.name || 'Genre'}
                </Chip>
              }>
              {genres.map(genre => (
                <Menu.Item
                  key={genre.code}
                  onPress={() => {
                    setSelectedGenre(genre.code);
                    setGenreMenuVisible(false);
                    hapticService.selection();
                  }}
                  title={genre.name}
                />
              ))}
            </Menu>

            <IconButton
              icon="refresh"
              size={20}
              onPress={handleRefresh}
              disabled={refreshing}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Chart Header */}
      {chart && (
        <View style={styles.header}>
          <Text variant="headlineSmall" style={[styles.chartTitle, {color: theme.colors.onSurface}]}>
            {chart.name}
          </Text>
          <Text variant="bodySmall" style={[styles.lastUpdated, {color: theme.colors.onSurfaceVariant}]}>
            Updated {chart.lastUpdated.toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Tracks List */}
      {chart && chart.tracks.length > 0 ? (
        <FlatList
          data={chart.tracks}
          renderItem={renderTrack}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="chart-line"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleLarge" style={styles.emptyText}>
            No charts available
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Try selecting a different region or genre
          </Text>
        </View>
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
  filterCard: {
    margin: 16,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  chartTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastUpdated: {
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  trackCard: {
    marginBottom: 12,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  position: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    opacity: 0.8,
    marginBottom: 2,
  },
  trackAlbum: {
    opacity: 0.6,
  },
  trackStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stat: {
    opacity: 0.6,
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
});

