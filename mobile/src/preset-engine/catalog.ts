import {ListeningPresetDefinition, PresetCategory, PresetRouting, RealtimeChain} from './types';

const nf = (v: number, digits = 2) => v.toFixed(digits);

type Family = {
  key: string;
  category: PresetCategory;
  routing: PresetRouting;
  title: string;
  describe: (tier: number, alpha: number) => string;
  build: (tier: number, alpha: number) => {af: string; rt: RealtimeChain};
};

const families: Family[] = [
  {
    key: 'reference_flat',
    category: 'home',
    routing: 'hybrid',
    title: 'Reference',
    describe: (tier, alpha) =>
      `Neutral tonal balance with light protection limiting (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}% drive)`,
    build: (_, alpha) => {
      const hp = 20 + 10 * alpha;
      const lp = 19900 - 450 * alpha;
      const thr = -28 + 6 * alpha;
      const ratio = 1.1 + 0.55 * alpha;
      const af = [
        `highpass=f=${nf(hp, 1)}`,
        `lowpass=f=${nf(lp, 0)}`,
        `acompressor=threshold=${nf(thr)}dB:ratio=${nf(ratio, 2)}:attack=${nf(
          25 + 20 * alpha,
          1,
        )}:release=${nf(220 + 90 * alpha, 0)}:knee=${nf(2 + 7 * alpha, 1)}`,
        `alimiter=limit=${nf(0.96 + 0.02 * alpha, 2)}:attack=${nf(5 + 10 * alpha, 1)}:release=${nf(
          120 + 40 * alpha,
          0,
        )}`,
      ].join(',');
      return {
        af,
        rt: {
          normalizerTargetDb: -17 - 5 * alpha,
          compressor: {
            thresholdDb: thr,
            ratio,
            attackMs: 25 + 20 * alpha,
            releaseMs: 220 + 90 * alpha,
            kneeDb: 2 + 7 * alpha,
          },
          eqBandsDb: {},
        },
      };
    },
  },
  {
    key: 'vocal_clarity',
    category: 'home',
    routing: 'hybrid',
    title: 'Vocal Focus',
    describe: (tier, alpha) =>
      `Adds presence and articulation without harshness (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}%)`,
    build: (_, alpha) => {
      const lift2k = 1 + 6 * alpha;
      const lift4k = 0.8 + 4.5 * alpha;
      const dip7k = 0.8 + 2.6 * alpha;
      const warmth = -0.6 - 1.9 * alpha;
      const af = [
        `highpass=f=${nf(75 + 30 * alpha, 1)}`,
        `equalizer=f=1000:width_type=h:width=1:g=${nf(warmth, 2)}`,
        `equalizer=f=2500:width_type=h:width=1:g=${nf(lift2k, 2)}`,
        `equalizer=f=4500:width_type=h:width=1:g=${nf(lift4k, 2)}`,
        `equalizer=f=7500:width_type=h:width=1.2:g=-${nf(dip7k, 2)}`,
        `acompressor=threshold=${nf(-22 + 4 * alpha)}dB:ratio=${nf(1.8 + 1.1 * alpha, 2)}:attack=${nf(
          8 + 6 * alpha,
          1,
        )}:release=${nf(120 + 60 * alpha, 0)}`,
      ].join(',');
      return {
        af,
        rt: {
          eqBandsDb: {
            1000: warmth,
            2000: lift2k * 0.95,
            4000: lift4k * 0.9,
            8000: -dip7k * 0.8,
          },
          compressor: {
            thresholdDb: -22 + 4 * alpha,
            ratio: 1.8 + 1.1 * alpha,
            attackMs: 8 + 6 * alpha,
            releaseMs: 120 + 60 * alpha,
            kneeDb: 3 + 4 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'bass_enhance',
    category: 'browse',
    routing: 'hybrid',
    title: 'Bass Weight',
    describe: (tier, alpha) =>
      `Extends low-end weight and punch while controlling mud (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}%)`,
    build: (_, alpha) => {
      const sub = 2.2 + 6.5 * alpha;
      const low = 1.1 + 3.3 * alpha;
      const mud = -0.7 - 2.2 * alpha;
      const af = [
        `highpass=f=${nf(28 + 10 * alpha, 1)}`,
        `equalizer=f=62:width_type=h:width=1.2:g=${nf(sub, 2)}`,
        `equalizer=f=125:width_type=h:width=1:g=${nf(low, 2)}`,
        `equalizer=f=250:width_type=h:width=1:g=${nf(0.4 + 1.1 * alpha, 2)}`,
        `equalizer=f=400:width_type=h:width=1:g=${nf(mud, 2)}`,
        `acompressor=threshold=${nf(-20 + 5 * alpha)}dB:ratio=${nf(2.2 + 1.4 * alpha, 2)}:attack=${nf(
          7 + 5 * alpha,
          1,
        )}:release=${nf(140 + 70 * alpha, 0)}`,
      ].join(',');
      return {
        af,
        rt: {
          bassBoostPct: 18 + 55 * alpha,
          eqBandsDb: {
            62: sub * 0.85,
            125: low * 0.85,
            250: 0.4 + 1.1 * alpha,
            500: mud * 0.6,
          },
          compressor: {
            thresholdDb: -20 + 5 * alpha,
            ratio: 2.2 + 1.4 * alpha,
            attackMs: 7 + 5 * alpha,
            releaseMs: 140 + 70 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'treble_air',
    category: 'browse',
    routing: 'hybrid',
    title: 'Air & Detail',
    describe: (tier, alpha) =>
      `Opens high-frequency detail and space (${tier}/9 • ${nf(alpha * 100, 0)}%)`,
    build: (_, alpha) => {
      const air = 0.9 + 4.6 * alpha;
      const presence = 0.4 + 2.1 * alpha;
      const low = -0.35 - 1.1 * alpha;
      const af = [
        `highpass=f=${nf(60 + 25 * alpha, 1)}`,
        `equalizer=f=250:width_type=h:width=1:g=${nf(low, 2)}`,
        `equalizer=f=4000:width_type=h:width=1:g=${nf(presence, 2)}`,
        `equalizer=f=10000:width_type=h:width=1:g=${nf(air, 2)}`,
        `equalizer=f=16000:width_type=h:width=1:g=${nf(0.6 + 2.9 * alpha, 2)}`,
        `acompressor=threshold=${nf(-22 + 3.5 * alpha)}dB:ratio=${nf(1.5 + 0.8 * alpha, 2)}:attack=${nf(
          12 + 10 * alpha,
          1,
        )}:release=${nf(150 + 50 * alpha, 0)}:knee=${nf(4 + 3 * alpha, 1)}`,
      ].join(',');
      return {
        af,
        rt: {
          trebleEnhancerPct: 20 + 60 * alpha,
          eqBandsDb: {
            250: low,
            4000: presence,
            8000: air * 0.75,
            16000: 0.6 + 2.9 * alpha,
          },
          compressor: {
            thresholdDb: -22 + 3.5 * alpha,
            ratio: 1.5 + 0.8 * alpha,
            attackMs: 12 + 10 * alpha,
            releaseMs: 150 + 50 * alpha,
            kneeDb: 4 + 3 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'warmth_body',
    category: 'browse',
    routing: 'hybrid',
    title: 'Warmth',
    describe: (tier, alpha) =>
      `Adds body and smoothness without dulling detail (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}%)`,
    build: (_, alpha) => {
      const lows = 1.6 + 3.9 * alpha;
      const mids = -0.4 - 1.4 * alpha;
      const high = -0.5 - 1.9 * alpha;
      const af = [
        `highpass=f=${nf(38 + 10 * alpha, 1)}`,
        `equalizer=f=62:width_type=h:width=1.2:g=${nf(lows, 2)}`,
        `equalizer=f=125:width_type=h:width=1:g=${nf(lows * 0.82, 2)}`,
        `equalizer=f=1000:width_type=h:width=1:g=${nf(mids, 2)}`,
        `equalizer=f=8000:width_type=h:width=1:g=${nf(high, 2)}`,
        `acompressor=threshold=${nf(-21 + 4 * alpha)}dB:ratio=${nf(1.85 + 0.9 * alpha, 2)}:attack=${nf(
          10 + 12 * alpha,
          1,
        )}:release=${nf(200 + 80 * alpha, 0)}:knee=${nf(5 + 6 * alpha, 1)}`,
      ].join(',');
      return {
        af,
        rt: {
          eqBandsDb: {
            62: lows * 0.9,
            125: lows * 0.75,
            250: lows * 0.45,
            1000: mids,
            8000: high,
          },
          compressor: {
            thresholdDb: -21 + 4 * alpha,
            ratio: 1.85 + 0.9 * alpha,
            attackMs: 10 + 12 * alpha,
            releaseMs: 200 + 80 * alpha,
            kneeDb: 5 + 6 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'punch_transient',
    category: 'pro',
    routing: 'hybrid',
    title: 'Punch',
    describe: (tier, alpha) =>
      `Firmer lows and tighter dynamics for impact (${tier}/9 • ${nf(alpha * 100, 0)}%)`,
    build: (_, alpha) => {
      const low = 0.8 + 2.9 * alpha;
      const scoop = -0.6 - 2.7 * alpha;
      const highs = 0.5 + 1.9 * alpha;
      const af = [
        `equalizer=f=90:width_type=h:width=1.1:g=${nf(low, 2)}`,
        `equalizer=f=500:width_type=h:width=1:g=${nf(scoop, 2)}`,
        `equalizer=f=5000:width_type=h:width=1:g=${nf(highs, 2)}`,
        `acompressor=threshold=${nf(-24 + 6 * alpha)}dB:ratio=${nf(
          3.6 + 2.4 * alpha,
          2,
        )}:attack=${nf(3 + 2 * alpha, 1)}:release=${nf(90 + 65 * alpha, 0)}:knee=${nf(1 + 5 * alpha, 1)}`,
        `alimiter=limit=${nf(0.95 + 0.03 * alpha, 2)}:attack=${nf(5 + 5 * alpha, 1)}:release=${nf(
          140 + 30 * alpha,
          0,
        )}`,
      ].join(',');
      return {
        af,
        rt: {
          eqBandsDb: {
            62: low * 0.85,
            500: scoop,
            4000: 0.5 + 1.9 * alpha,
          },
          compressor: {
            thresholdDb: -24 + 6 * alpha,
            ratio: 3.6 + 2.4 * alpha,
            attackMs: 3 + 2 * alpha,
            releaseMs: 90 + 65 * alpha,
            kneeDb: 1 + 5 * alpha,
          },
          bassBoostPct: 14 + 30 * alpha,
        },
      };
    },
  },
  {
    key: 'loudness_consistent',
    category: 'pro',
    routing: 'offline',
    title: 'Level Match',
    describe: (tier, alpha) =>
      `Smoother perceived loudness for consistent playback (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}%)`,
    build: (_, alpha) => {
      const agg = 5 + 10 * alpha;
      const af = [
        `highpass=f=${nf(35 + 10 * alpha, 1)}`,
        `acompressor=threshold=${nf(-26 + 6 * alpha)}dB:ratio=${nf(
          2.2 + 1.35 * alpha,
          2,
        )}:attack=${nf(8 + 6 * alpha, 1)}:release=${nf(250 + 80 * alpha, 0)}`,
        `dynaudnorm=f=${nf(150 + 120 * alpha, 0)}:g=${nf(agg)}`,
        `alimiter=limit=${nf(0.97)}:attack=${nf(10)}:release=${nf(210)}`,
      ].join(',');
      return {
        af,
        rt: {
          normalizerTargetDb: -15 - 8 * alpha,
          compressor: {
            thresholdDb: -26 + 6 * alpha,
            ratio: 2.2 + 1.35 * alpha,
            attackMs: 8 + 6 * alpha,
            releaseMs: 250 + 80 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'stereo_immersive',
    category: 'spatial',
    routing: 'hybrid',
    title: 'Immersive Width',
    describe: (tier, alpha) =>
      `Controlled side enhancement and ambience (${tier}/9 • ${nf(alpha * 100, 0)}%)`,
    build: (_, alpha) => {
      const m = 0.12 + 0.72 * alpha;
      const blur = `aecho=${nf(0.85 - 0.05 * alpha, 2)}:${nf(
        0.86 - 0.04 * alpha,
        2,
      )}:${nf(28 + 10 * alpha, 0)}:${nf(0.08 + 0.06 * alpha, 2)}`;
      const af = [
        `extrastereo=m=${nf(m, 2)}`,
        blur,
        `acompressor=threshold=${nf(-22 + 3 * alpha)}dB:ratio=${nf(
          1.7 + 0.7 * alpha,
          2,
        )}:attack=${nf(14 + 12 * alpha, 1)}:release=${nf(160 + 60 * alpha, 0)}`,
      ].join(',');
      return {
        af,
        rt: {
          stereoWidthPct: 18 + 70 * alpha,
          compressor: {
            thresholdDb: -22 + 3 * alpha,
            ratio: 1.7 + 0.7 * alpha,
            attackMs: 14 + 12 * alpha,
            releaseMs: 160 + 60 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'space_proxy',
    category: 'spatial',
    routing: 'hybrid',
    title: 'Stage Depth',
    describe: (tier, alpha) =>
      `Subtle space cues for depth perception (${tier}/9 • ${nf(alpha * 100, 0)}%)`,
    build: (_, alpha) => {
      const d1 = Math.round(62 + 30 * alpha);
      const d2 = Math.round(62 + 30 * alpha + 52 + 26 * alpha);
      const dec = nf(0.22 + 0.18 * alpha, 2);
      const fb = nf(0.28 + 0.18 * alpha, 2);
      const af = [
        `highpass=f=${nf(70 + 20 * alpha, 1)}`,
        `aecho=0.8:0.9:${d1}:${dec}`,
        `aecho=0.8:0.9:${d2}:${fb}`,
        `acompressor=threshold=${nf(-23 + 3.5 * alpha)}dB:ratio=${nf(
          1.55 + 0.85 * alpha,
          2,
        )}:attack=${nf(10 + 8 * alpha, 1)}:release=${nf(190 + 50 * alpha, 0)}`,
      ].join(',');
      return {
        af,
        rt: {
          stereoWidthPct: 22 + 40 * alpha,
          normalizerTargetDb: -18 - 6 * alpha,
          compressor: {
            thresholdDb: -23 + 3.5 * alpha,
            ratio: 1.55 + 0.85 * alpha,
            attackMs: 10 + 8 * alpha,
            releaseMs: 190 + 50 * alpha,
          },
        },
      };
    },
  },
  {
    key: 'master_polish',
    category: 'pro',
    routing: 'offline',
    title: 'Polish',
    describe: (tier, alpha) =>
      `Gentle mastering-style glue and safety limiting (${tier}/9 • ${nf(
        alpha * 100,
        0,
      )}%)`,
    build: (_, alpha) => {
      const af = [
        `highpass=f=${nf(35 + 8 * alpha, 1)}`,
        `equalizer=f=140:width_type=h:width=1:g=${nf(-0.4 - 1.9 * alpha, 2)}`,
        `equalizer=f=2500:width_type=h:width=1:g=${nf(0.35 + 1.85 * alpha, 2)}`,
        `acompressor=threshold=${nf(-20 + 4 * alpha)}dB:ratio=${nf(
          3.9 + 1.25 * alpha,
          2,
        )}:attack=${nf(4 + 2 * alpha, 1)}:release=${nf(120 + 40 * alpha, 0)}:knee=${nf(
          6 + 3 * alpha,
          1,
        )}`,
        `alimiter=limit=${nf(0.94 + 0.03 * alpha, 2)}:attack=${nf(8 + 9 * alpha, 1)}:release=${nf(
          200 + 50 * alpha,
          0,
        )}`,
      ].join(',');
      return {
        af,
        rt: {
          eqBandsDb: {
            125: -0.3 - 1.2 * alpha,
            2000: 0.35 + 1.85 * alpha,
            8000: 0.2 + 1.25 * alpha,
          },
          compressor: {
            thresholdDb: -20 + 4 * alpha,
            ratio: 3.9 + 1.25 * alpha,
            attackMs: 4 + 2 * alpha,
            releaseMs: 120 + 40 * alpha,
            kneeDb: 6 + 3 * alpha,
          },
        },
      };
    },
  },
];

function buildPreset(
  family: Family,
  tier: number,
): ListeningPresetDefinition {
  const alpha = tier / 10;
  const {af, rt} = family.build(tier, alpha);
  return {
    id: `${family.key}.t${tier}`,
    familyKey: family.key,
    tier,
    name: `${family.title} • ${tier}/9`,
    summary: family.describe(tier, alpha),
    category: family.category,
    routing: family.routing,
    intensity: alpha,
    offlineFfmpegAf: af,
    realtime: rt,
  };
}

/** Full catalog — 10 families × 9 tiers = 90 listening presets (deterministic FFmpeg chains). */
export const LISTENING_PRESETS: ListeningPresetDefinition[] = families.flatMap(
  family => Array.from({length: 9}, (_, i) => buildPreset(family, i + 1)),
);

const byId = new Map(LISTENING_PRESETS.map(p => [p.id, p]));

export function getListeningPreset(id: string): ListeningPresetDefinition | undefined {
  return byId.get(id);
}
