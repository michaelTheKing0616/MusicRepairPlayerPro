import {AudioFile} from '../types';
import {LISTENING_PRESETS, getListeningPreset} from './catalog';
import type {ListeningPresetDefinition} from './types';

/** Deterministic scoring from lightweight metadata (no external ML). */
export function recommendListeningPresetsForLibrary(
  files: AudioFile[],
  limit = 8,
): ListeningPresetDefinition[] {
  const genres = files.map(f => (f.genre || '').toLowerCase());
  const rockish = genres.some(g => /rock|metal|punk/.test(g));
  const classical = genres.some(g => /classical|orchestra|soundtrack/.test(g));
  const electronic = genres.some(g => /electronic|edm|house|techno/.test(g));
  const jazz = genres.some(g => /jazz/.test(g));

  const pick = (familyKey: string, tier = 5) =>
    getListeningPreset(`${familyKey}.t${tier}`) ?? LISTENING_PRESETS[0]!;

  const out: ListeningPresetDefinition[] = [];
  if (classical) {
    out.push(pick('reference_flat', 4), pick('space_proxy', 3), pick('treble_air', 2));
  } else if (jazz) {
    out.push(pick('warmth_body', 5), pick('reference_flat', 4), pick('stereo_immersive', 3));
  } else if (electronic) {
    out.push(pick('punch_transient', 6), pick('bass_enhance', 5), pick('stereo_immersive', 5));
  } else if (rockish) {
    out.push(pick('punch_transient', 6), pick('bass_enhance', 4), pick('loudness_consistent', 5));
  } else {
    out.push(pick('vocal_clarity', 5), pick('reference_flat', 3), pick('treble_air', 3));
  }

  const seen = new Set<string>();
  const uniq: ListeningPresetDefinition[] = [];
  for (const p of out) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      uniq.push(p);
    }
  }
  for (const p of LISTENING_PRESETS) {
    if (uniq.length >= limit) break;
    if (!seen.has(p.id)) {
      seen.add(p.id);
      uniq.push(p);
    }
  }
  return uniq.slice(0, limit);
}
