/**
 * Music Charts Service
 * Fetches music charts by region and genre
 */

import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('MusicCharts');

export interface ChartTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  position: number;
  previousPosition?: number;
  peakPosition?: number;
  weeksOnChart?: number;
  streams?: number;
}

export interface MusicChart {
  id: string;
  name: string;
  region: string;
  genre?: string;
  tracks: ChartTrack[];
  lastUpdated: Date;
}

export type ChartRegion =
  | 'global'
  | 'us'
  | 'uk'
  | 'ca'
  | 'au'
  | 'de'
  | 'fr'
  | 'jp'
  | 'kr'
  | 'in'
  | 'br'
  | 'mx'
  | 'es'
  | 'it'
  | 'nl'
  | 'se'
  | 'no'
  | 'dk'
  | 'fi'
  | 'pl'
  | 'za'
  | 'ng';

export type ChartGenre =
  | 'all'
  | 'pop'
  | 'rock'
  | 'hip-hop'
  | 'r-b'
  | 'country'
  | 'electronic'
  | 'latin'
  | 'jazz'
  | 'classical'
  | 'k-pop'
  | 'j-pop'
  | 'afrobeat'
  | 'reggae'
  | 'folk'
  | 'metal'
  | 'indie';

class MusicChartsService {
  private readonly BACKEND_API_URL = 'http://localhost:3000/api';
  private cachedCharts: Map<string, {chart: MusicChart; timestamp: number}> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  /**
   * Get charts by region
   */
  async getChartsByRegion(
    region: ChartRegion,
    genre?: ChartGenre,
  ): Promise<MusicChart> {
    try {
      const cacheKey = `charts_${region}_${genre || 'all'}`;
      const cached = this.cachedCharts.get(cacheKey);

      // Return cached if still valid
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.chart;
      }

      // Use centralized API service
      const token = await (async () => {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          return await AsyncStorage.getItem('auth_token');
        } catch {
          return null;
        }
      })();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Fetch from API
      const response = await fetch(
        `${this.BACKEND_API_URL}/charts?region=${region}${genre ? `&genre=${genre}` : ''}`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch charts: ${response.statusText}`);
      }

      const chart: MusicChart = await response.json();

      // Cache the result
      this.cachedCharts.set(cacheKey, {
        chart,
        timestamp: Date.now(),
      });

      return chart;
    } catch (error) {
      log.warn('getChartsByRegion failed', {message: String(error)});
      // Return mock data for development
      return this.getMockCharts(region, genre);
    }
  }

  /**
   * Get top charts globally
   */
  async getGlobalCharts(genre?: ChartGenre): Promise<MusicChart> {
    return this.getChartsByRegion('global', genre);
  }

  /**
   * Get available regions
   */
  getAvailableRegions(): Array<{code: ChartRegion; name: string}> {
    return [
      {code: 'global', name: 'Global'},
      {code: 'us', name: 'United States'},
      {code: 'uk', name: 'United Kingdom'},
      {code: 'ca', name: 'Canada'},
      {code: 'au', name: 'Australia'},
      {code: 'de', name: 'Germany'},
      {code: 'fr', name: 'France'},
      {code: 'jp', name: 'Japan'},
      {code: 'kr', name: 'South Korea'},
      {code: 'in', name: 'India'},
      {code: 'br', name: 'Brazil'},
      {code: 'mx', name: 'Mexico'},
      {code: 'es', name: 'Spain'},
      {code: 'it', name: 'Italy'},
      {code: 'nl', name: 'Netherlands'},
      {code: 'se', name: 'Sweden'},
      {code: 'no', name: 'Norway'},
      {code: 'dk', name: 'Denmark'},
      {code: 'fi', name: 'Finland'},
      {code: 'pl', name: 'Poland'},
      {code: 'za', name: 'South Africa'},
      {code: 'ng', name: 'Nigeria'},
    ];
  }

  /**
   * Get available genres
   */
  getAvailableGenres(): Array<{code: ChartGenre; name: string}> {
    return [
      {code: 'all', name: 'All Genres'},
      {code: 'pop', name: 'Pop'},
      {code: 'rock', name: 'Rock'},
      {code: 'hip-hop', name: 'Hip-Hop'},
      {code: 'r-b', name: 'R&B'},
      {code: 'country', name: 'Country'},
      {code: 'electronic', name: 'Electronic'},
      {code: 'latin', name: 'Latin'},
      {code: 'jazz', name: 'Jazz'},
      {code: 'classical', name: 'Classical'},
      {code: 'k-pop', name: 'K-Pop'},
      {code: 'j-pop', name: 'J-Pop'},
      {code: 'afrobeat', name: 'Afrobeat'},
      {code: 'reggae', name: 'Reggae'},
      {code: 'folk', name: 'Folk'},
      {code: 'metal', name: 'Metal'},
      {code: 'indie', name: 'Indie'},
    ];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cachedCharts.clear();
  }

  /**
   * Get mock charts for development
   */
  private getMockCharts(region: ChartRegion, genre?: ChartGenre): MusicChart {
    const mockTracks: ChartTrack[] = [
      {
        id: '1',
        title: 'Popular Song 1',
        artist: 'Artist Name',
        position: 1,
        previousPosition: 2,
        peakPosition: 1,
        weeksOnChart: 15,
      },
      {
        id: '2',
        title: 'Popular Song 2',
        artist: 'Another Artist',
        position: 2,
        previousPosition: 1,
        peakPosition: 1,
        weeksOnChart: 20,
      },
      {
        id: '3',
        title: 'Popular Song 3',
        artist: 'Third Artist',
        position: 3,
        previousPosition: 3,
        peakPosition: 2,
        weeksOnChart: 8,
      },
    ];

    return {
      id: `chart_${region}_${genre || 'all'}`,
      name: `${region.toUpperCase()} ${genre ? genre.toUpperCase() : 'Top'} Chart`,
      region,
      genre,
      tracks: mockTracks,
      lastUpdated: new Date(),
    };
  }
}

export const musicChartsService = new MusicChartsService();

