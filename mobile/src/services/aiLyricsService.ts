/**
 * AI Lyrics Transcription Service
 * Uses Whisper API or similar models for real-time lyrics transcription
 * Falls back to API-based lyrics when available
 */

import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {createLogger} from '../utils/logger';

const log = createLogger('AILyrics');

export interface TranscribedLyrics {
  lines: Array<{
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  language?: string;
  duration: number;
}

import {apiService} from './api';

class AILyricsService {

  /**
   * Transcribe audio file to lyrics using AI
   * Uses Whisper or similar speech-to-text model
   */
  async transcribeAudio(
    audioPath: string,
    language?: string,
  ): Promise<TranscribedLyrics | null> {
    try {
      // Check if file exists
      const fileExists = await RNFS.exists(audioPath);
      if (!fileExists) {
        log.warn('audio file not found', {audioPath});
        return null;
      }

      // Read audio file as base64
      const audioBase64 = await RNFS.readFile(audioPath, 'base64');

      // Use centralized API service
      const result = await apiService.transcribeAudio(audioBase64, language);

      // Parse SRT format or structured JSON
      return this.parseTranscriptionResult(result);
    } catch (error) {
      log.warn('transcribeAudio failed', {message: String(error)});
      return null;
    }
  }

  /**
   * Real-time transcription stream (for live audio)
   * Uses WebSocket or Server-Sent Events
   */
  async transcribeStream(
    audioStream: any,
    onProgress?: (text: string, timestamp: number) => void,
  ): Promise<TranscribedLyrics | null> {
    try {
      // This would use WebSocket for real-time streaming
      // Implementation depends on backend support
      log.info('real-time transcription not yet implemented');
      return null;
    } catch (error) {
      log.warn('transcribeStream failed', {message: String(error)});
      return null;
    }
  }

  /**
   * Parse transcription result from backend
   */
  private parseTranscriptionResult(result: any): TranscribedLyrics {
    // Handle different response formats
    if (result.srt) {
      return this.parseSRT(result.srt);
    } else if (result.segments) {
      return {
        lines: result.segments.map((seg: any) => ({
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
          confidence: seg.confidence || 0.9,
        })),
        language: result.language,
        duration: result.duration,
      };
    } else if (result.text && result.segments) {
      // Whisper API format
      return {
        lines: result.segments.map((seg: any) => ({
          text: seg.text.trim(),
          startTime: seg.start,
          endTime: seg.end,
          confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.9,
        })),
        language: result.language,
        duration: result.duration,
      };
    }

    throw new Error('Unknown transcription format');
  }

  /**
   * Parse SRT subtitle format
   */
  private parseSRT(srtContent: string): TranscribedLyrics {
    const lines: TranscribedLyrics['lines'] = [];
    const blocks = srtContent.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines_in_block = block.split('\n');
      if (lines_in_block.length < 3) continue;

      const timeLine = lines_in_block[1];
      const text = lines_in_block.slice(2).join(' ').trim();

      // Parse time: 00:00:00,000 --> 00:00:05,000
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (timeMatch) {
        const startTime =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;
        const endTime =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;

        lines.push({
          text,
          startTime,
          endTime,
          confidence: 0.9, // SRT doesn't include confidence
        });
      }
    }

    return {
      lines,
      duration: lines.length > 0 ? lines[lines.length - 1].endTime : 0,
    };
  }

  /**
   * Convert transcribed lyrics to synced lyrics format
   */
  convertToSyncedLyrics(transcribed: TranscribedLyrics) {
    return {
      synced: true,
      lines: transcribed.lines.map(line => ({
        time: line.startTime,
        text: line.text,
      })),
      language: transcribed.language,
    };
  }
}

export const aiLyricsService = new AILyricsService();

