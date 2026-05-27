import {ListeningPresetDefinition} from './types';

const EQ_FREQUENCIES = new Set([
  31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
]);

const OFFLINE_AF_ALLOWED = /^[a-z0-9_\-=:,.\[\]|%*+^'@ ]+$/i;

export function validateListeningPreset(p: ListeningPresetDefinition): string[] {
  const errors: string[] = [];

  if (!p.id || !/^[a-z0-9._-]+$/i.test(p.id)) {
    errors.push(`Invalid id: ${p.id}`);
  }

  if (!p.familyKey) {
    errors.push('Missing familyKey');
  }

  if (!Number.isInteger(p.tier) || p.tier < 1 || p.tier > 9) {
    errors.push(`tier must be integer 1..9 (got ${p.tier})`);
  }

  if (!Number.isFinite(p.intensity) || p.intensity < 0.09 || p.intensity > 0.91) {
    errors.push(`intensity out of expected band (got ${p.intensity})`);
  }

  if (!p.offlineFfmpegAf || !OFFLINE_AF_ALLOWED.test(p.offlineFfmpegAf)) {
    errors.push('offlineFfmpegAf is empty or contains unexpected characters');
  }

  const rt = p.realtime;
  if (rt.eqBandsDb) {
    for (const [freq, gain] of Object.entries(rt.eqBandsDb)) {
      if (gain === undefined) {
        continue;
      }
      const f = Number(freq);
      if (!EQ_FREQUENCIES.has(f)) {
        errors.push(`Unexpected EQ band frequency ${freq}`);
      }
      if (!Number.isFinite(gain) || Math.abs(gain) > 18) {
        errors.push(`EQ gain out of range for ${freq}: ${gain}`);
      }
    }
  }

  if (rt.bassBoostPct !== undefined) {
    if (!Number.isFinite(rt.bassBoostPct) || rt.bassBoostPct < 0 || rt.bassBoostPct > 100) {
      errors.push(`bassBoostPct out of range: ${rt.bassBoostPct}`);
    }
  }

  if (rt.trebleEnhancerPct !== undefined) {
    if (
      !Number.isFinite(rt.trebleEnhancerPct) ||
      rt.trebleEnhancerPct < 0 ||
      rt.trebleEnhancerPct > 100
    ) {
      errors.push(`trebleEnhancerPct out of range: ${rt.trebleEnhancerPct}`);
    }
  }

  if (rt.stereoWidthPct !== undefined) {
    if (!Number.isFinite(rt.stereoWidthPct) || rt.stereoWidthPct < 0 || rt.stereoWidthPct > 100) {
      errors.push(`stereoWidthPct out of range: ${rt.stereoWidthPct}`);
    }
  }

  if (rt.compressor) {
    const c = rt.compressor;
    if (!Number.isFinite(c.thresholdDb) || c.thresholdDb > 0 || c.thresholdDb < -60) {
      errors.push(`compressor.thresholdDb out of range: ${c.thresholdDb}`);
    }
    if (!Number.isFinite(c.ratio) || c.ratio < 1 || c.ratio > 20) {
      errors.push(`compressor.ratio out of range: ${c.ratio}`);
    }
    if (!Number.isFinite(c.attackMs) || c.attackMs < 0.1 || c.attackMs > 200) {
      errors.push(`compressor.attackMs out of range: ${c.attackMs}`);
    }
    if (!Number.isFinite(c.releaseMs) || c.releaseMs < 5 || c.releaseMs > 2000) {
      errors.push(`compressor.releaseMs out of range: ${c.releaseMs}`);
    }
    if (c.kneeDb !== undefined) {
      if (!Number.isFinite(c.kneeDb) || c.kneeDb < 0 || c.kneeDb > 30) {
        errors.push(`compressor.kneeDb out of range: ${c.kneeDb}`);
      }
    }
  }

  if (rt.normalizerTargetDb !== undefined) {
    if (!Number.isFinite(rt.normalizerTargetDb) || rt.normalizerTargetDb > 0 || rt.normalizerTargetDb < -30) {
      errors.push(`normalizerTargetDb out of range: ${rt.normalizerTargetDb}`);
    }
  }

  return errors;
}
