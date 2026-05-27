import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {audioSettingsService} from '../services/audioSettingsService';
import type {AudioSettings} from '../types/audioSettings';
import {getListeningPreset} from '../preset-engine/catalog';
import {realtimeChainToAudioSettingsPartial} from '../preset-engine/applyRealtimeToAudioSettings';
import {requiresOfflineRender, prefersRealtimePlayback} from '../preset-engine/routing';
import {releaseNativeEq, tryApplyNativeEq} from '../preset-engine/nativeBridge';

type PresetContextValue = {
  activePresetId: string | null;
  playbackAudioSessionAndroid: number;
  setPlaybackAudioSessionAndroid: (sid: number) => void;
  selectPresetId: (id: string | null) => void;
  applyRealtimeToSavedSettings: (presetId: string) => Promise<void>;
  applyNativeRealtimeIfPossible: (presetId: string) => Promise<boolean>;
};

const PresetContext = createContext<PresetContextValue | undefined>(undefined);

function mergeAudioSettings(cur: AudioSettings, partial: Partial<AudioSettings>): AudioSettings {
  return {
    ...cur,
    ...partial,
    eq: partial.eq
      ? {...cur.eq, ...partial.eq, bands: partial.eq.bands ?? cur.eq.bands}
      : cur.eq,
    bassBoost: partial.bassBoost ? {...cur.bassBoost, ...partial.bassBoost} : cur.bassBoost,
    trebleEnhancer: partial.trebleEnhancer
      ? {...cur.trebleEnhancer, ...partial.trebleEnhancer}
      : cur.trebleEnhancer,
    compressor: partial.compressor ? {...cur.compressor, ...partial.compressor} : cur.compressor,
    normalizer: partial.normalizer ? {...cur.normalizer, ...partial.normalizer} : cur.normalizer,
    crossfade: partial.crossfade ? {...cur.crossfade, ...partial.crossfade} : cur.crossfade,
    autoEQ: partial.autoEQ ? {...cur.autoEQ, ...partial.autoEQ} : cur.autoEQ,
    playback: partial.playback ? {...cur.playback, ...partial.playback} : cur.playback,
  };
}

export function PresetProvider({children}: {children: React.ReactNode}) {
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  // 0 = global output mix (best-effort). If we later plumb an actual TrackPlayer session id,
  // it can override this value for more accurate attachment.
  const [playbackAudioSessionAndroid, setPlaybackAudioSessionAndroid] = useState(0);

  const selectPresetId = useCallback((id: string | null) => {
    setActivePresetId(id);
  }, []);

  const applyRealtimeToSavedSettings = useCallback(async (presetId: string) => {
    const p = getListeningPreset(presetId);
    if (!p) return;
    if (!prefersRealtimePlayback(p.routing)) {
      await releaseNativeEq();
      return;
    }
    const partial = realtimeChainToAudioSettingsPartial(p.realtime);
    const cur = await audioSettingsService.loadSettings();
    await audioSettingsService.saveSettings(mergeAudioSettings(cur, partial));
    setActivePresetId(presetId);
  }, []);

  const applyNativeRealtimeIfPossible = useCallback(
    async (presetId: string) => {
      const p = getListeningPreset(presetId);
      if (!p || requiresOfflineRender(p.routing)) {
        await releaseNativeEq();
        return false;
      }
      if (!prefersRealtimePlayback(p.routing)) {
        await releaseNativeEq();
        return false;
      }
      const ok = await tryApplyNativeEq(playbackAudioSessionAndroid, p.realtime);
      if (ok) setActivePresetId(presetId);
      return ok;
    },
    [playbackAudioSessionAndroid],
  );

  const value = useMemo<PresetContextValue>(
    () => ({
      activePresetId,
      playbackAudioSessionAndroid,
      setPlaybackAudioSessionAndroid,
      selectPresetId,
      applyRealtimeToSavedSettings,
      applyNativeRealtimeIfPossible,
    }),
    [
      activePresetId,
      playbackAudioSessionAndroid,
      selectPresetId,
      applyRealtimeToSavedSettings,
      applyNativeRealtimeIfPossible,
    ],
  );

  return <PresetContext.Provider value={value}>{children}</PresetContext.Provider>;
}

export function useListeningPresetControl() {
  const ctx = useContext(PresetContext);
  if (!ctx) throw new Error('useListeningPresetControl must be inside PresetProvider');
  return ctx;
}
