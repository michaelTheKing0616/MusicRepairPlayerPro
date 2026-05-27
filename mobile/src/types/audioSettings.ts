/**
 * Audio Enhancement Settings Types
 */

// 10-band EQ frequencies (Hz)
export const EQ_BANDS = [
  31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;

export type EQBandFrequency = typeof EQ_BANDS[number];

export interface EQBand {
  frequency: EQBandFrequency;
  gain: number; // -12 to +12 dB
}

export interface AudioSettings {
  // Equalizer (10-band)
  eq: {
    enabled: boolean;
    bands: EQBand[];
    preset?: string; // e.g., "Flat", "Bass Boost", "Vocal", etc.
  };

  // Bass boost
  bassBoost: {
    enabled: boolean;
    level: number; // 0-100
  };

  // Treble enhancer
  trebleEnhancer: {
    enabled: boolean;
    level: number; // 0-100
  };

  // Compressor
  compressor: {
    enabled: boolean;
    threshold: number; // -60 to 0 dB
    ratio: number; // 1:1 to 20:1
    attack: number; // 0.1 to 100 ms
    release: number; // 10 to 1000 ms
    knee: number; // 0 to 20 dB
  };

  // Normalizer
  normalizer: {
    enabled: boolean;
    targetLevel: number; // -24 to 0 dB
  };

  // Crossfade
  crossfade: {
    enabled: boolean;
    duration: number; // 0-10 seconds
  };

  // Auto-EQ mode
  autoEQ: {
    enabled: boolean;
    mode: 'studio' | 'concert' | 'warm' | 'bright' | 'flat';
    targetLUFS: number; // -23 to -14 LUFS
  };

  // Playback settings
  playback: {
    shuffle: boolean;
    repeat: 'off' | 'one' | 'all';
  };
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  eq: {
    enabled: false,
    bands: EQ_BANDS.map(freq => ({
      frequency: freq,
      gain: 0,
    })),
    preset: 'Flat',
  },
  bassBoost: {
    enabled: false,
    level: 50,
  },
  trebleEnhancer: {
    enabled: false,
    level: 50,
  },
  compressor: {
    enabled: false,
    threshold: -12,
    ratio: 4,
    attack: 10,
    release: 100,
    knee: 2,
  },
  normalizer: {
    enabled: false,
    targetLevel: -16,
  },
  crossfade: {
    enabled: false,
    duration: 3,
  },
  autoEQ: {
    enabled: false,
    mode: 'flat',
    targetLUFS: -16,
  },
  playback: {
    shuffle: false,
    repeat: 'off',
  },
};

// EQ Presets
export const EQ_PRESETS: Record<string, EQBand[]> = {
  Flat: EQ_BANDS.map(freq => ({frequency: freq, gain: 0})),
  'Bass Boost': [
    {frequency: 31, gain: 6},
    {frequency: 62, gain: 5},
    {frequency: 125, gain: 3},
    {frequency: 250, gain: 1},
    {frequency: 500, gain: 0},
    {frequency: 1000, gain: 0},
    {frequency: 2000, gain: 0},
    {frequency: 4000, gain: 0},
    {frequency: 8000, gain: 0},
    {frequency: 16000, gain: 0},
  ],
  Vocal: [
    {frequency: 31, gain: -3},
    {frequency: 62, gain: -2},
    {frequency: 125, gain: 0},
    {frequency: 250, gain: 2},
    {frequency: 500, gain: 3},
    {frequency: 1000, gain: 4},
    {frequency: 2000, gain: 4},
    {frequency: 4000, gain: 3},
    {frequency: 8000, gain: 1},
    {frequency: 16000, gain: -1},
  ],
  Treble: [
    {frequency: 31, gain: -2},
    {frequency: 62, gain: -1},
    {frequency: 125, gain: 0},
    {frequency: 250, gain: 0},
    {frequency: 500, gain: 0},
    {frequency: 1000, gain: 1},
    {frequency: 2000, gain: 2},
    {frequency: 4000, gain: 3},
    {frequency: 8000, gain: 4},
    {frequency: 16000, gain: 5},
  ],
  'Rock': [
    {frequency: 31, gain: 2},
    {frequency: 62, gain: 3},
    {frequency: 125, gain: 4},
    {frequency: 250, gain: 2},
    {frequency: 500, gain: 0},
    {frequency: 1000, gain: -1},
    {frequency: 2000, gain: 0},
    {frequency: 4000, gain: 2},
    {frequency: 8000, gain: 3},
    {frequency: 16000, gain: 2},
  ],
  'Jazz': [
    {frequency: 31, gain: 1},
    {frequency: 62, gain: 2},
    {frequency: 125, gain: 3},
    {frequency: 250, gain: 2},
    {frequency: 500, gain: 1},
    {frequency: 1000, gain: 0},
    {frequency: 2000, gain: 1},
    {frequency: 4000, gain: 2},
    {frequency: 8000, gain: 2},
    {frequency: 16000, gain: 1},
  ],
  'Classical': [
    {frequency: 31, gain: 0},
    {frequency: 62, gain: 1},
    {frequency: 125, gain: 2},
    {frequency: 250, gain: 2},
    {frequency: 500, gain: 1},
    {frequency: 1000, gain: 0},
    {frequency: 2000, gain: 1},
    {frequency: 4000, gain: 2},
    {frequency: 8000, gain: 3},
    {frequency: 16000, gain: 3},
  ],
};

// Auto-EQ modes
export const AUTO_EQ_MODES = [
  {value: 'studio', label: 'Studio', description: 'Flat response for mixing'},
  {value: 'concert', label: 'Concert', description: 'Live performance sound'},
  {value: 'warm', label: 'Warm', description: 'Rich, warm analog sound'},
  {value: 'bright', label: 'Bright', description: 'Crisp, bright sound'},
  {value: 'flat', label: 'Flat', description: 'No enhancement'},
] as const;

