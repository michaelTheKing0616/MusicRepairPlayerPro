export type PresetCategory = 'home' | 'browse' | 'pro' | 'spatial';

export type PresetRouting = 'realtime' | 'offline' | 'hybrid';

export interface RealtimeChain {
  /** Per-band gain in dB for the standard 10-band centers (31..16k). */
  eqBandsDb?: Partial<Record<number, number>>;
  bassBoostPct?: number;
  trebleEnhancerPct?: number;
  stereoWidthPct?: number;
  compressor?: {
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
    kneeDb?: number;
  };
  normalizerTargetDb?: number;
}

export interface ListeningPresetDefinition {
  id: string;
  familyKey: string;
  tier: number;
  name: string;
  summary: string;
  category: PresetCategory;
  routing: PresetRouting;
  /** 0.1–0.9 — maps to the 9 tiers within a family. */
  intensity: number;
  /** Deterministic FFmpeg `-af` chain for offline rendering. */
  offlineFfmpegAf: string;
  realtime: RealtimeChain;
}
