import AsyncStorage from '@react-native-async-storage/async-storage';
import {MD3LightTheme, MD3DarkTheme, MD3Theme} from 'react-native-paper';
import {createLogger} from '../utils/logger';

const log = createLogger('Theme');

const THEME_STORAGE_KEY = '@music_app:theme';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type CustomColorScheme = {
  primary: string;
  secondary: string;
  tertiary: string;
  error: string;
  surface: string;
  background: string;
};

export interface ThemeConfig {
  mode: ThemeMode;
  customColors?: CustomColorScheme;
  name?: string;
}

/**
 * Theme Service - Manages app themes
 */
class ThemeService {
  private currentTheme: ThemeConfig = {
    mode: 'auto',
  };

  /**
   * Get current theme configuration
   */
  async getTheme(): Promise<ThemeConfig> {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        this.currentTheme = JSON.parse(stored);
      }
      return this.currentTheme;
    } catch (error) {
      log.error('getTheme failed', {message: String(error)});
      return this.currentTheme;
    }
  }

  /**
   * Set theme mode
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    this.currentTheme.mode = mode;
    await this.saveTheme();
  }

  /**
   * Set custom color scheme
   */
  async setCustomColors(colors: CustomColorScheme, name?: string): Promise<void> {
    this.currentTheme.customColors = colors;
    this.currentTheme.name = name;
    await this.saveTheme();
  }

  /**
   * Get theme based on current configuration
   */
  getPaperTheme(isSystemDark: boolean): MD3Theme {
    const shouldUseDark = this.getEffectiveMode(isSystemDark) === 'dark';

    if (this.currentTheme.customColors) {
      return this.createCustomTheme(this.currentTheme.customColors, shouldUseDark);
    }

    return shouldUseDark ? MD3DarkTheme : MD3LightTheme;
  }

  /**
   * Get effective theme mode (resolves 'auto')
   */
  private getEffectiveMode(isSystemDark: boolean): 'light' | 'dark' {
    if (this.currentTheme.mode === 'auto') {
      return isSystemDark ? 'dark' : 'light';
    }
    return this.currentTheme.mode;
  }

  /**
   * Create custom theme from color scheme
   */
  private createCustomTheme(
    colors: CustomColorScheme,
    isDark: boolean
  ): MD3Theme {
    const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        secondary: colors.secondary,
        tertiary: colors.tertiary,
        error: colors.error,
        surface: colors.surface,
        background: colors.background,
      },
    };
  }

  /**
   * Save theme to storage
   */
  private async saveTheme(): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.currentTheme));
    } catch (error) {
      log.error('saveTheme failed', {message: String(error)});
    }
  }

  /**
   * Reset to default theme
   */
  async resetTheme(): Promise<void> {
    this.currentTheme = {
      mode: 'auto',
    };
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
  }

  /**
   * Get predefined color schemes
   */
  getPredefinedSchemes(): Array<{name: string; colors: CustomColorScheme}> {
    return [
      {
        name: 'Ocean Blue',
        colors: {
          primary: '#0288D1',
          secondary: '#03A9F4',
          tertiary: '#B3E5FC',
          error: '#D32F2F',
          surface: '#FFFFFF',
          background: '#F5F5F5',
        },
      },
      {
        name: 'Forest Green',
        colors: {
          primary: '#388E3C',
          secondary: '#66BB6A',
          tertiary: '#C8E6C9',
          error: '#D32F2F',
          surface: '#FFFFFF',
          background: '#F5F5F5',
        },
      },
      {
        name: 'Purple Dream',
        colors: {
          primary: '#7B1FA2',
          secondary: '#9C27B0',
          tertiary: '#E1BEE7',
          error: '#D32F2F',
          surface: '#FFFFFF',
          background: '#F5F5F5',
        },
      },
      {
        name: 'Sunset Orange',
        colors: {
          primary: '#F57C00',
          secondary: '#FF9800',
          tertiary: '#FFE0B2',
          error: '#D32F2F',
          surface: '#FFFFFF',
          background: '#F5F5F5',
        },
      },
      {
        name: 'Dark Amethyst',
        colors: {
          primary: '#6A1B9A',
          secondary: '#9C27B0',
          tertiary: '#CE93D8',
          error: '#EF5350',
          surface: '#1E1E1E',
          background: '#121212',
        },
      },
    ];
  }
}

export const themeService = new ThemeService();

