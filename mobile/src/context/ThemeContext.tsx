import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {useColorScheme} from 'react-native';
import {MD3Theme, useTheme as usePaperTheme} from 'react-native-paper';
import {themeService} from '../services/themeService';

interface ThemeContextType {
  theme: MD3Theme;
  setTheme: (theme: MD3Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({children}: {children: ReactNode}) {
  const systemColorScheme = useColorScheme();
  const isSystemDark = systemColorScheme === 'dark';
  const [theme, setTheme] = useState<MD3Theme>(
    themeService.getPaperTheme(isSystemDark)
  );
  const [isDark, setIsDark] = useState(isSystemDark);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const config = await themeService.getTheme();
    const effectiveTheme = themeService.getPaperTheme(
      config.mode === 'auto' ? isSystemDark : config.mode === 'dark'
    );
    setTheme(effectiveTheme);
    setIsDark(config.mode === 'auto' ? isSystemDark : config.mode === 'dark');
  };

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    await themeService.setThemeMode(newMode);
    const newTheme = themeService.getPaperTheme(newMode === 'dark');
    setTheme(newTheme);
    setIsDark(newMode === 'dark');
  };

  return (
    <ThemeContext.Provider value={{theme, setTheme, isDark, toggleTheme}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

