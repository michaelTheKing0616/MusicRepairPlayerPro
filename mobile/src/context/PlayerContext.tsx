import React, {createContext, useContext, useMemo, useState} from 'react';

type PlayerState = {
  currentAudioId: string | null;
  setCurrentAudioId: (id: string | null) => void;
};

const PlayerContext = createContext<PlayerState | undefined>(undefined);

export function PlayerProvider({children}: {children: React.ReactNode}) {
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const v = useMemo(
    () => ({
      currentAudioId,
      setCurrentAudioId,
    }),
    [currentAudioId],
  );
  return <PlayerContext.Provider value={v}>{children}</PlayerContext.Provider>;
}

export function usePlayerContextOptional() {
  return useContext(PlayerContext);
}

export function usePlayerContext() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerContext must be inside PlayerProvider');
  return ctx;
}
