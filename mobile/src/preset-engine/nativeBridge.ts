import {NativeModules, Platform} from 'react-native';
import {createLogger} from '../utils/logger';
import type {RealtimeChain} from './types';
import {EQ_BANDS} from '../types/audioSettings';

const log = createLogger('PresetNative');

type NativePresetDSP = {
  applyEqBands(sessionId: number, bandsDbJson: string): Promise<boolean>;
  releaseEffects(): Promise<boolean>;
};

function getModule(): NativePresetDSP | undefined {
  return NativeModules.PresetDSP as NativePresetDSP | undefined;
}

export function realtimeChainToEqDbArray(rt: RealtimeChain): number[] {
  const clamp = (g: number, max = 12) => Math.max(-max, Math.min(max, g));
  return EQ_BANDS.map(f => clamp(rt.eqBandsDb?.[f] ?? 0, 12));
}

/**
 * Android: applies global Equalizer on `sessionId` from the active player (pass 0 to skip).
 * iOS: module not linked in this repo template — returns false (use JS audio settings path).
 */
export async function tryApplyNativeEq(
  sessionId: number,
  chain: RealtimeChain,
): Promise<boolean> {
  // Android Equalizer can be attached to the global output mix (sessionId = 0) on many devices.
  // We accept `0` as a best-effort fallback when TrackPlayer's session id isn't accessible.
  if (Platform.OS !== 'android' || sessionId < 0) {
    return false;
  }
  const mod = getModule();
  if (!mod?.applyEqBands) {
    log.debug('PresetDSP native module unavailable');
    return false;
  }
  try {
    const payload = JSON.stringify(realtimeChainToEqDbArray(chain));
    return await mod.applyEqBands(sessionId, payload);
  } catch (e) {
    log.warn('applyEqBands failed', {message: String(e)});
    return false;
  }
}

export async function releaseNativeEq(): Promise<void> {
  const mod = getModule();
  if (mod?.releaseEffects) {
    try {
      await mod.releaseEffects();
    } catch {
      /* ignore */
    }
  }
}
