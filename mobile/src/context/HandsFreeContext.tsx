import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createLogger} from '../utils/logger';

const log = createLogger('HandsFree');

interface HandsFreeContextType {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

const HandsFreeContext = createContext<HandsFreeContextType | undefined>(
  undefined,
);

const STORAGE_KEY = '@hands_free_enabled';

export function HandsFreeProvider({children}: {children: ReactNode}) {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabledState(JSON.parse(stored));
      }
    } catch (error) {
      log.error('loadState failed', {message: String(error)});
    }
  };

  const setEnabled = async (value: boolean) => {
    setEnabledState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      log.error('setEnabled failed', {message: String(error)});
    }
  };

  const toggle = () => {
    setEnabled(!enabled);
  };

  return (
    <HandsFreeContext.Provider
      value={{
        enabled,
        toggle,
        setEnabled,
      }}>
      {children}
    </HandsFreeContext.Provider>
  );
}

export function useHandsFree() {
  const context = useContext(HandsFreeContext);
  if (context === undefined) {
    throw new Error('useHandsFree must be used within a HandsFreeProvider');
  }
  return context;
}

