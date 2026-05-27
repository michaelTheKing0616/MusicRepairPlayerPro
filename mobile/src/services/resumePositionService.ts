import AsyncStorage from '@react-native-async-storage/async-storage';
import type {PlayableRef} from '../types';

const STORAGE_PREFIX = '@music_app:resume:';

type ResumeEntry = {
  positionSec: number;
  durationSec?: number;
  updatedAtIso: string;
};

function stablePlayableKey(playable: PlayableRef): string {
  // Keep deterministic and URL-safe-ish. Never include unbounded metadata.
  switch (playable.kind) {
    case 'library_audio':
      return `library_audio:${playable.audioFileId}`;
    case 'local_file':
      return `local_file:${playable.localUri}`;
    case 'radio_station':
      // Station id preferred; fall back to URL since stations may be ad-hoc.
      return `radio_station:${playable.stationId || playable.streamUrl}`;
    case 'podcast_episode':
      return `podcast_episode:${playable.episodeId || playable.enclosureUrl}`;
    default: {
      const _exhaustive: never = playable;
      return String(_exhaustive);
    }
  }
}

class ResumePositionService {
  async get(playable: PlayableRef): Promise<ResumeEntry | null> {
    const key = STORAGE_PREFIX + stablePlayableKey(playable);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ResumeEntry;
      if (!Number.isFinite(parsed.positionSec)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async set(playable: PlayableRef, entry: {positionSec: number; durationSec?: number}): Promise<void> {
    const key = STORAGE_PREFIX + stablePlayableKey(playable);
    const payload: ResumeEntry = {
      positionSec: Math.max(0, entry.positionSec),
      durationSec: entry.durationSec != null ? Math.max(0, entry.durationSec) : undefined,
      updatedAtIso: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  }
}

export const resumePositionService = new ResumePositionService();

