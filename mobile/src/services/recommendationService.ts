import {AudioFile} from '../types';
import {recentlyPlayedService} from './recentlyPlayedService';
import {queueHistoryService} from './queueHistoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createLogger} from '../utils/logger';

const log = createLogger('RecommendationService');

const RECOMMENDATION_CACHE_KEY = '@music_app:recommendations';

export interface Recommendation {
  audioFile: AudioFile;
  score: number; // 0-1, how relevant this recommendation is
  reason: string; // Why this was recommended
  category: 'recommended' | 'similar' | 'trending' | 'discover' | 'mood' | 'genre';
}

interface ListeningPattern {
  genres: Map<string, number>;
  artists: Map<string, number>;
  playCount: number;
  totalListenTime: number;
  favoriteTracks: string[];
  recentTracks: string[];
}

/**
 * AI-based Music Recommendation Service
 * Analyzes listening patterns and provides personalized recommendations
 */
class RecommendationService {
  private cache: Map<string, Recommendation[]> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<Recommendation[]> {
    try {
      // Check cache first
      const cached = await this.getCachedRecommendations(userId);
      if (cached && cached.length > 0) {
        return cached.slice(0, limit);
      }

      // Analyze listening patterns
      const pattern = await this.analyzeListeningPattern(userId);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(pattern, limit);

      // Cache results
      await this.cacheRecommendations(userId, recommendations);

      return recommendations;
    } catch (error) {
      log.warn('Error getting recommendations', {message: String(error)});
      return [];
    }
  }

  /**
   * Get recommendations similar to a specific track
   */
  async getSimilarTracks(
    audioFileId: string,
    limit: number = 10
  ): Promise<Recommendation[]> {
    try {
      const audioFile = await this.getAudioFile(audioFileId);
      if (!audioFile) {
        return [];
      }

      // Get all audio files
      const allFiles = await this.getAllAudioFiles();
      
      // Calculate similarity scores
      const similar = allFiles
        .filter(file => file.id !== audioFileId)
        .map(file => ({
          audioFile: file,
          score: this.calculateSimilarity(audioFile, file),
          reason: 'Similar track',
          category: 'similar' as const,
        }))
        .filter(rec => rec.score > 0.3) // Only include reasonably similar tracks
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return similar;
    } catch (error) {
      log.warn('Error getting similar tracks', {message: String(error)});
      return [];
    }
  }

  /**
   * Generate smart playlist based on criteria
   */
  async generateSmartPlaylist(
    userId: string,
    criteria: {
      genre?: string;
      mood?: 'happy' | 'sad' | 'energetic' | 'calm';
      duration?: number; // Target duration in minutes
      basedOn?: string; // Audio file ID to base playlist on
    }
  ): Promise<AudioFile[]> {
    try {
      let recommendations: Recommendation[] = [];

      if (criteria.basedOn) {
        recommendations = await this.getSimilarTracks(criteria.basedOn, 50);
      } else {
        recommendations = await this.getRecommendations(userId, 50);
      }

      // Filter by criteria
      let filtered = recommendations.map(rec => rec.audioFile);

      if (criteria.genre) {
        // Filter by genre (would need genre metadata)
        filtered = filtered; // TODO: Implement genre filtering
      }

      if (criteria.mood) {
        // Filter by mood (would need mood classification)
        filtered = filtered; // TODO: Implement mood filtering
      }

      // Limit by duration
      if (criteria.duration) {
        filtered = this.limitByDuration(filtered, criteria.duration * 60);
      }

      return filtered;
    } catch (error) {
      log.warn('Error generating smart playlist', {message: String(error)});
      return [];
    }
  }

  /**
   * Get daily mix (like Spotify)
   */
  async getDailyMix(userId: string, mixNumber: number = 1): Promise<AudioFile[]> {
    try {
      const pattern = await this.analyzeListeningPattern(userId);
      
      // Generate different mixes based on mixNumber
      switch (mixNumber) {
        case 1:
          // Mix 1: Favorite tracks
          return await this.getFavoritesBasedMix(pattern, 30);
        case 2:
          // Mix 2: Similar to recent
          return await this.getRecentBasedMix(pattern, 30);
        case 3:
          // Mix 3: Discover (less played)
          return await this.getDiscoverMix(pattern, 30);
        case 4:
          // Mix 4: Genre-based
          return await this.getGenreMix(pattern, 30);
        default:
          return await this.getFavoritesBasedMix(pattern, 30);
      }
    } catch (error) {
      log.error('getDailyMix failed', {message: String(error)});
      return [];
    }
  }

  /**
   * Analyze user listening patterns
   */
  private async analyzeListeningPattern(userId: string): Promise<ListeningPattern> {
    const [recentHistory, queueHistory] = await Promise.all([
      recentlyPlayedService.getRecentlyPlayed(),
      queueHistoryService.getHistory(),
    ]);

    const allHistory = [...recentHistory, ...queueHistory.map(h => ({
      audioFile: h.audioFile,
      playCount: 1,
      playedAt: h.playedAt,
    }))];

    const genres = new Map<string, number>();
    const artists = new Map<string, number>();
    const favoriteTracks: string[] = [];
    const recentTracks = recentHistory
      .slice(0, 20)
      .map(item => item.audioFile.id);

    let totalPlayCount = 0;
    let totalListenTime = 0;

    allHistory.forEach(item => {
      totalPlayCount += item.playCount || 1;
      totalListenTime += (item.audioFile.duration || 0) * (item.playCount || 1);

      // Extract artist/genre from filename (basic extraction)
      const filename = item.audioFile.originalFilename || item.audioFile.filename;
      // Simple heuristic: assume "Artist - Title" format
      const parts = filename.split(' - ');
      if (parts.length > 0) {
        const artist = parts[0].trim();
        artists.set(artist, (artists.get(artist) || 0) + (item.playCount || 1));
      }

      // Mark as favorite if played multiple times
      if ((item.playCount || 0) > 3) {
        favoriteTracks.push(item.audioFile.id);
      }
    });

    return {
      genres,
      artists,
      playCount: totalPlayCount,
      totalListenTime,
      favoriteTracks,
      recentTracks,
    };
  }

  /**
   * Generate recommendations based on listening pattern
   */
  private async generateRecommendations(
    pattern: ListeningPattern,
    limit: number
  ): Promise<Recommendation[]> {
    const allFiles = await this.getAllAudioFiles();
    const recommendations: Recommendation[] = [];

    // Recommend based on favorite artists
    const topArtists = Array.from(pattern.artists.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    allFiles.forEach(file => {
      const filename = file.originalFilename || file.filename;
      const parts = filename.split(' - ');
      const artist = parts.length > 0 ? parts[0].trim() : '';

      if (topArtists.includes(artist) && !pattern.recentTracks.includes(file.id)) {
        recommendations.push({
          audioFile: file,
          score: 0.8,
          reason: `Similar to your favorite artist: ${artist}`,
          category: 'similar',
        });
      }
    });

    // Recommend undiscovered tracks
    allFiles.forEach(file => {
      if (!pattern.recentTracks.includes(file.id) && !pattern.favoriteTracks.includes(file.id)) {
        recommendations.push({
          audioFile: file,
          score: 0.6,
          reason: 'Discover something new',
          category: 'discover',
        });
      }
    });

    // Sort by score and return top results
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two tracks
   */
  private calculateSimilarity(file1: AudioFile, file2: AudioFile): number {
    let score = 0;

    // Filename similarity (basic)
    const name1 = (file1.originalFilename || file1.filename).toLowerCase();
    const name2 = (file2.originalFilename || file2.filename).toLowerCase();

    // Simple similarity: check for common words
    const words1 = name1.split(/[\s-]+/);
    const words2 = name2.split(/[\s-]+/);
    const commonWords = words1.filter(w => words2.includes(w) && w.length > 2);
    
    if (commonWords.length > 0) {
      score += 0.4;
    }

    // Duration similarity
    if (file1.duration && file2.duration) {
      const durationDiff = Math.abs(file1.duration - file2.duration);
      const maxDuration = Math.max(file1.duration, file2.duration);
      if (maxDuration > 0) {
        score += 0.3 * (1 - Math.min(durationDiff / maxDuration, 1));
      }
    }

    // File size similarity (rough quality indicator)
    const sizeDiff = Math.abs(file1.fileSize - file2.fileSize);
    const maxSize = Math.max(file1.fileSize, file2.fileSize);
    if (maxSize > 0) {
      score += 0.3 * (1 - Math.min(sizeDiff / maxSize, 1));
    }

    return Math.min(score, 1);
  }

  /**
   * Helper methods
   */
  private async getCachedRecommendations(userId: string): Promise<Recommendation[] | null> {
    try {
      const cached = await AsyncStorage.getItem(`${RECOMMENDATION_CACHE_KEY}:${userId}`);
      if (cached) {
        const {recommendations, timestamp} = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          return recommendations;
        }
      }
    } catch (error) {
      log.warn('Error getting cached recommendations', {message: String(error)});
    }
    return null;
  }

  private async cacheRecommendations(userId: string, recommendations: Recommendation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${RECOMMENDATION_CACHE_KEY}:${userId}`,
        JSON.stringify({
          recommendations,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      log.warn('Error caching recommendations', {message: String(error)});
    }
  }

  private async getAllAudioFiles(): Promise<AudioFile[]> {
    try {
      const {apiService} = await import('./api');
      return await apiService.getAudioFiles();
    } catch (error) {
      log.warn('Error getting audio files', {message: String(error)});
      return [];
    }
  }

  private async getAudioFile(id: string): Promise<AudioFile | null> {
    try {
      const {apiService} = await import('./api');
      return await apiService.getAudioFile(id);
    } catch (error) {
      log.warn('Error getting audio file', {message: String(error)});
      return null;
    }
  }

  private limitByDuration(files: AudioFile[], targetDuration: number): AudioFile[] {
    let totalDuration = 0;
    const result: AudioFile[] = [];

    for (const file of files) {
      if (totalDuration >= targetDuration) {
        break;
      }
      result.push(file);
      totalDuration += file.duration || 0;
    }

    return result;
  }

  private async getFavoritesBasedMix(pattern: ListeningPattern, limit: number): Promise<AudioFile[]> {
    const allFiles = await this.getAllAudioFiles();
    return allFiles
      .filter(file => pattern.favoriteTracks.includes(file.id))
      .slice(0, limit);
  }

  private async getRecentBasedMix(pattern: ListeningPattern, limit: number): Promise<AudioFile[]> {
    const recommendations = await this.getSimilarTracks(pattern.recentTracks[0] || '', limit);
    return recommendations.map(rec => rec.audioFile);
  }

  private async getDiscoverMix(pattern: ListeningPattern, limit: number): Promise<AudioFile[]> {
    const allFiles = await this.getAllAudioFiles();
    return allFiles
      .filter(file => !pattern.recentTracks.includes(file.id) && !pattern.favoriteTracks.includes(file.id))
      .slice(0, limit);
  }

  private async getGenreMix(pattern: ListeningPattern, limit: number): Promise<AudioFile[]> {
    // Would need genre metadata
    return this.getFavoritesBasedMix(pattern, limit);
  }
}

export const recommendationService = new RecommendationService();

