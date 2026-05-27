import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PaperProvider, MD3Theme} from 'react-native-paper';
import {darkTheme, theme as lightTheme} from '../theme/theme';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = '@music_app_theme_mode';

type ThemeAppState = {
  mode: ThemeMode;
  toggleMode: () => void;
  paperTheme: MD3Theme;
};

const ThemeAppContext = createContext<ThemeAppState | undefined>(undefined);

export function ThemeAppProvider({children}: {children: React.ReactNode}) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const paperTheme = mode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(() => ({mode, toggleMode, paperTheme}), [mode, toggleMode, paperTheme]);

  return (
    <ThemeAppContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeAppContext.Provider>
  );
}

export function useThemeApp() {
  const ctx = useContext(ThemeAppContext);
  if (!ctx) throw new Error('useThemeApp must be inside ThemeAppProvider');
  return ctx;
}
