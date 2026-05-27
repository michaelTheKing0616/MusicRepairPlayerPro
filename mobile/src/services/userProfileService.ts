/**
 * User Profile Service
 * Manages user profile data, preferences, and customization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('UserProfile');

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  audioQuality: 'standard' | 'high' | 'lossless';
  autoDownload: boolean;
  downloadQuality: 'standard' | 'high' | 'lossless';
  notifications: {
    newReleases: boolean;
    recommendations: boolean;
    repairComplete: boolean;
  };
  privacy: {
    showListeningActivity: boolean;
    allowSharing: boolean;
  };
}

export interface UserStats {
  totalTracksPlayed: number;
  totalListeningTime: number; // in minutes
  favoriteArtists: string[];
  favoriteGenres: string[];
  playlistsCreated: number;
  repairsCompleted: number;
}

const PROFILE_STORAGE_KEY = '@user_profile';
const PREFERENCES_STORAGE_KEY = '@user_preferences';

class UserProfileService {
  private cachedProfile: UserProfile | null = null;

  /**
   * Get user profile (from cache or API)
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      // Try cache first
      if (this.cachedProfile) {
        return this.cachedProfile;
      }

      // Try local storage
      const cached = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (cached) {
        this.cachedProfile = JSON.parse(cached);
        return this.cachedProfile;
      }

      // Fetch from API
      const profile = await apiService.getUserProfile();
      if (profile) {
        await this.saveProfileLocally(profile);
        this.cachedProfile = profile;
      }

      return profile;
    } catch (error) {
      log.error('getProfile failed', {message: String(error)});
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const updated = await apiService.updateUserProfile(updates);
      if (updated) {
        this.cachedProfile = updated;
        await this.saveProfileLocally(updated);
      }
      return updated;
    } catch (error) {
      log.error('updateProfile failed', {message: String(error)});
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<UserPreferences>): Promise<boolean> {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        return false;
      }

      const updatedPreferences = {
        ...profile.preferences,
        ...preferences,
      };

      const updated = await this.updateProfile({
        preferences: updatedPreferences,
      });

      return updated !== null;
    } catch (error) {
      log.error('updatePreferences failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Update avatar
   */
  async updateAvatar(avatarUri: string): Promise<boolean> {
    try {
      // Upload avatar to backend
      const avatarUrl = await apiService.uploadAvatar(avatarUri);
      if (avatarUrl) {
        await this.updateProfile({avatar: avatarUrl});
        return true;
      }
      return false;
    } catch (error) {
      log.error('updateAvatar failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Save profile locally
   */
  private async saveProfileLocally(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      await AsyncStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify(profile.preferences),
      );
    } catch (error) {
      log.error('saveProfileLocally failed', {message: String(error)});
    }
  }

  /**
   * Clear cached profile
   */
  async clearCache(): Promise<void> {
    this.cachedProfile = null;
    await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    await AsyncStorage.removeItem(PREFERENCES_STORAGE_KEY);
  }

  /**
   * Get preferences (quick access)
   */
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const cached = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      const profile = await this.getProfile();
      return profile?.preferences || null;
    } catch (error) {
      log.error('getPreferences failed', {message: String(error)});
      return null;
    }
  }
}

export const userProfileService = new UserProfileService();

