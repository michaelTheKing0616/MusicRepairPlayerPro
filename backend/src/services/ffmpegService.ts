import {exec} from 'child_process';
import {promisify} from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  format?: 'mp3' | 'wav' | 'flac' | 'm4a';
  bitrate?: string;
  sampleRate?: number;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

class FFmpegService {
  /**
   * Check if FFmpeg is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert audio format using FFmpeg
   */
  async convertFormat(options: FFmpegOptions): Promise<void> {
    const {
      inputPath,
      outputPath,
      format = 'mp3',
      bitrate = '192k',
      sampleRate,
      normalize = false,
      fadeIn,
      fadeOut,
    } = options;

    // Build FFmpeg command
    let command = `ffmpeg -i "${inputPath}"`;

    // Add audio filters
    const filters: string[] = [];

    if (normalize) {
      filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    }

    if (fadeIn) {
      filters.push(`afade=t=in:st=0:d=${fadeIn}`);
    }

    if (fadeOut) {
      // Get duration first for fade out
      const duration = await this.getDuration(inputPath);
      const fadeOutStart = Math.max(0, duration - fadeOut);
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeOut}`);
    }

    if (filters.length > 0) {
      command += ` -af "${filters.join(',')}"`;
    }

    // Set output options
    command += ` -b:a ${bitrate}`;

    if (sampleRate) {
      command += ` -ar ${sampleRate}`;
    }

    // Set format based on extension
    command += ` -f ${format}`;
    command += ` "${outputPath}"`;

    try {
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: any) {
      throw new Error(`FFmpeg conversion failed: ${error.message}`);
    }
  }

  /**
   * Apply audio effects using FFmpeg
   */
  async applyEffects(
    inputPath: string,
    outputPath: string,
    effects: {
      bass?: number; // dB boost
      treble?: number; // dB boost
      volume?: number; // dB change
      reverb?: boolean;
      compressor?: {
        threshold: number;
        ratio: number;
      };
    },
  ): Promise<void> {
    const filters: string[] = [];

    // Bass boost
    if (effects.bass) {
      filters.push(`bass=g=${effects.bass / 10}:f=100`);
    }

    // Treble boost
    if (effects.treble) {
      filters.push(`treble=g=${effects.treble / 10}:f=4000`);
    }

    // Volume adjustment
    if (effects.volume) {
      filters.push(`volume=${effects.volume}dB`);
    }

    // Reverb
    if (effects.reverb) {
      filters.push(
        'aecho=0.8:0.9:1000:0.3',
      );
    }

    // Compressor
    if (effects.compressor) {
      filters.push(
        `acompressor=threshold=${effects.compressor.threshold}dB:ratio=${effects.compressor.ratio}`,
      );
    }

    const filterComplex = filters.length > 0 ? filters.join(',') : 'anull';

    const command = `ffmpeg -i "${inputPath}" -af "${filterComplex}" "${outputPath}"`;

    try {
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: any) {
      throw new Error(`FFmpeg effects failed: ${error.message}`);
    }
  }

  /**
   * Get audio file duration
   */
  async getDuration(filePath: string): Promise<number> {
    try {
      const {stdout} = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      );
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Extract audio metadata
   */
  async getMetadata(filePath: string): Promise<Record<string, string>> {
    try {
      const {stdout} = await execAsync(
        `ffprobe -v error -show_entries format_tags=artist,title,album,genre -of default=noprint_wrappers=1 "${filePath}"`,
      );
      
      const metadata: Record<string, string> = {};
      stdout.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join('=').trim();
        }
      });
      
      return metadata;
    } catch {
      return {};
    }
  }

  /**
   * Create crossfade between two audio files
   */
  async createCrossfade(
    input1Path: string,
    input2Path: string,
    outputPath: string,
    crossfadeDuration: number = 3,
  ): Promise<void> {
    const duration1 = await this.getDuration(input1Path);
    const fadeOutStart = Math.max(0, duration1 - crossfadeDuration);

    const command = `ffmpeg -i "${input1Path}" -i "${input2Path}" -filter_complex "[0:a]afade=t=out:st=${fadeOutStart}:d=${crossfadeDuration}[a0];[1:a]afade=t=in:st=0:d=${crossfadeDuration}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2" "${outputPath}"`;

    try {
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: any) {
      throw new Error(`FFmpeg crossfade failed: ${error.message}`);
    }
  }
}

export const ffmpegService = new FFmpegService();

