import {EQ_BANDS, AudioSettings} from '../types/audioSettings';
import {RealtimeChain} from './types';

const clampGain = (g: number, max = 12) => Math.max(-max, Math.min(max, g));

/** Maps catalog realtime parameters into persisted player settings used by EQ / enhancement sliders. */
export function realtimeChainToAudioSettingsPartial(rt: RealtimeChain): Partial<AudioSettings> {
  const bands = EQ_BANDS.map(freq => {
    const adj = rt.eqBandsDb?.[freq] ?? 0;
    // UI and most 10-band EQ implementations expect roughly ±12dB. Keep this consistent.
    return {frequency: freq as (typeof EQ_BANDS)[number], gain: clampGain(adj, 12)};
  });

  const partial: Partial<AudioSettings> = {
    eq: {
      enabled: true,
      bands,
      preset: 'ListeningPreset',
    },
    bassBoost: {
      enabled: rt.bassBoostPct != null && rt.bassBoostPct > 5,
      level: rt.bassBoostPct != null ? Math.round(rt.bassBoostPct) : 50,
    },
    trebleEnhancer: {
      enabled: rt.trebleEnhancerPct != null && rt.trebleEnhancerPct > 5,
      level: rt.trebleEnhancerPct != null ? Math.round(rt.trebleEnhancerPct) : 50,
    },
    compressor:
      rt.compressor != null
        ? {
            enabled: true,
            threshold: Math.max(-60, Math.min(0, rt.compressor.thresholdDb)),
            ratio: Math.max(1, Math.min(20, rt.compressor.ratio)),
            attack: Math.max(0.1, Math.min(100, rt.compressor.attackMs)),
            release: Math.max(10, Math.min(1000, rt.compressor.releaseMs)),
            knee: rt.compressor.kneeDb != null ? Math.max(0, Math.min(20, rt.compressor.kneeDb)) : 2,
          }
        : undefined,
    normalizer:
      rt.normalizerTargetDb != null
        ? {
            enabled: true,
            targetLevel: Math.max(-24, Math.min(0, rt.normalizerTargetDb)),
          }
        : undefined,
  };
  return partial;
}
