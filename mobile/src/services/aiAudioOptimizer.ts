/**
 * AI Audio Optimizer Service
 * Analyzes audio and automatically sets optimal EQ, bass boost, treble, compressor, etc.
 * Goes beyond simple Auto-EQ to provide intelligent audio enhancement
 */

import {AudioSettings} from '../types/audioSettings';
import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('AIAudioOptimizer');

export interface AudioAnalysis {
  frequencyProfile: {
    bass: number; // 0-100
    mids: number; // 0-100
    treble: number; // 0-100
  };
  dynamicRange: number; // 0-100
  peakLevel: number; // dB
  averageLoudness: number; // LUFS
  genre?: string;
  recommendedSettings: OptimizedAudioSettings;
}

export interface OptimizedAudioSettings {
  eq: number[]; // 10-band EQ values
  bassBoost: number; // 0-100
  trebleEnhancer: number; // 0-100
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  normalizer: {
    targetLevel: number; // LUFS
  };
  crossfade: boolean;
  reasoning: string; // Why these settings were chosen
}

class AIAudioOptimizerService {
  /**
   * Analyze audio file and generate optimal settings
   */
  async analyzeAndOptimize(audioUrl: string, audioId?: string): Promise<OptimizedAudioSettings> {
    try {
      // Use centralized API service
      if (audioId) {
        const analysis: AudioAnalysis = await apiService.analyzeAudio(audioId, audioUrl);
        return analysis.recommendedSettings;
      } else {
        // If no ID, use direct URL approach
        const analysis: AudioAnalysis = await apiService.analyzeAudio('temp', audioUrl);
        return analysis.recommendedSettings;
      }
    } catch (error) {
      log.warn('analyzeAndOptimize failed', {message: String(error)});
      // Fallback to intelligent defaults based on audio metadata
      return this.generateIntelligentDefaults();
    }
  }

  /**
   * Quick optimize based on audio metadata (when full analysis unavailable)
   */
  async quickOptimize(metadata: {
    genre?: string;
    bitrate?: number;
    sampleRate?: number;
  }): Promise<OptimizedAudioSettings> {
    // Use genre-based presets as starting point
    const genrePresets: Record<string, Partial<OptimizedAudioSettings>> = {
      rock: {
        bassBoost: 15,
        trebleEnhancer: 20,
        eq: [2, 1, 0, -1, 0, 1, 3, 5, 4, 2],
        reasoning: 'Enhanced for rock: boosted bass and treble for impact',
      },
      pop: {
        bassBoost: 10,
        trebleEnhancer: 15,
        eq: [1, 2, 3, 2, 1, 0, 2, 4, 5, 3],
        reasoning: 'Optimized for pop: balanced with slight treble boost',
      },
      classical: {
        bassBoost: 0,
        trebleEnhancer: 5,
        eq: [0, 0, 0, 0, 0, 0, 1, 2, 3, 2],
        reasoning: 'Classical preset: minimal processing for natural sound',
      },
      hiphop: {
        bassBoost: 25,
        trebleEnhancer: 10,
        eq: [5, 4, 2, 0, -1, 0, 1, 2, 3, 2],
        reasoning: 'Hip-hop preset: strong bass boost, balanced mids',
      },
      electronic: {
        bassBoost: 20,
        trebleEnhancer: 25,
        eq: [4, 3, 1, 0, 1, 2, 4, 6, 7, 5],
        reasoning: 'Electronic preset: enhanced bass and sparkling treble',
      },
      jazz: {
        bassBoost: 5,
        trebleEnhancer: 10,
        eq: [1, 1, 2, 2, 1, 0, 1, 2, 3, 2],
        reasoning: 'Jazz preset: warm, natural sound with slight enhancements',
      },
    };

    const preset = genrePresets[metadata.genre?.toLowerCase() || ''] || genrePresets.pop;

    return {
      eq: preset.eq || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: preset.bassBoost || 10,
      trebleEnhancer: preset.trebleEnhancer || 10,
      compressor: {
        threshold: -12,
        ratio: 3,
        attack: 10,
        release: 100,
      },
      normalizer: {
        targetLevel: -16, // LUFS
      },
      crossfade: true,
      reasoning: preset.reasoning || 'Balanced preset for general listening',
    };
  }

  /**
   * Apply optimized settings to audio settings
   */
  applyOptimizedSettings(
    currentSettings: AudioSettings,
    optimized: OptimizedAudioSettings,
  ): AudioSettings {
    const eqBands = currentSettings.eq.bands.map((band, idx) => ({
      ...band,
      gain: optimized.eq[idx] ?? band.gain,
    }));

    return {
      ...currentSettings,
      eq: {
        ...currentSettings.eq,
        enabled: true,
        bands: eqBands,
        preset: 'AI Optimized',
      },
      bassBoost: {
        ...currentSettings.bassBoost,
        enabled: optimized.bassBoost > 0,
        level: optimized.bassBoost,
      },
      trebleEnhancer: {
        ...currentSettings.trebleEnhancer,
        enabled: optimized.trebleEnhancer > 0,
        level: optimized.trebleEnhancer,
      },
      compressor: {
        ...currentSettings.compressor,
        enabled: true,
        threshold: optimized.compressor.threshold,
        ratio: optimized.compressor.ratio,
        attack: optimized.compressor.attack,
        release: optimized.compressor.release,
      },
      normalizer: {
        ...currentSettings.normalizer,
        enabled: true,
        targetLevel: optimized.normalizer.targetLevel,
      },
      crossfade: {
        ...currentSettings.crossfade,
        enabled: optimized.crossfade,
      },
    };
  }

  /**
   * Generate intelligent defaults when analysis fails
   */
  private generateIntelligentDefaults(): OptimizedAudioSettings {
    return {
      eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bassBoost: 10,
      trebleEnhancer: 10,
      compressor: {
        threshold: -12,
        ratio: 3,
        attack: 10,
        release: 100,
      },
      normalizer: {
        targetLevel: -16,
      },
      crossfade: true,
      reasoning: 'Default balanced settings for optimal listening experience',
    };
  }

  /**
   * Real-time optimization suggestion based on current playback
   */
  suggestRealTimeOptimization(currentSettings: AudioSettings, feedback?: {
    tooBass?: boolean;
    tooTreble?: boolean;
    tooQuiet?: boolean;
    tooLoud?: boolean;
  }): Partial<OptimizedAudioSettings> {
    const suggestions: Partial<OptimizedAudioSettings> = {};

    if (feedback?.tooBass) {
      suggestions.bassBoost = Math.max(
        0,
        currentSettings.bassBoost.level - 10,
      );
      suggestions.reasoning = 'Reducing bass boost based on feedback';
    }

    if (feedback?.tooTreble) {
      suggestions.trebleEnhancer = Math.max(
        0,
        currentSettings.trebleEnhancer.level - 10,
      );
      suggestions.reasoning = 'Reducing treble enhancement based on feedback';
    }

    if (feedback?.tooQuiet) {
      suggestions.normalizer = {
        targetLevel: (currentSettings.normalizer?.targetLevel || -16) + 2,
      };
      suggestions.reasoning = 'Increasing target loudness based on feedback';
    }

    if (feedback?.tooLoud) {
      suggestions.normalizer = {
        targetLevel: (currentSettings.normalizer?.targetLevel || -16) - 2,
      };
      suggestions.reasoning = 'Reducing target loudness based on feedback';
    }

    return suggestions;
  }
}

export const aiAudioOptimizerService = new AIAudioOptimizerService();

