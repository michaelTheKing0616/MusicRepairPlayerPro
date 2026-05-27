/**
 * Enhanced Voice Command Service
 * Native mobile support with entity extraction and context awareness
 */

import {Platform} from 'react-native';
import Voice from '@react-native-voice/voice';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {hapticService} from './hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('VoiceEnhanced');

export type VoiceCommand =
  | 'play'
  | 'pause'
  | 'next'
  | 'previous'
  | 'volume_up'
  | 'volume_down'
  | 'shuffle'
  | 'repeat'
  | 'seek_forward'
  | 'seek_backward'
  | 'whats_playing'
  | 'search'
  | 'play_artist'
  | 'play_song'
  | 'play_album'
  | 'add_to_playlist'
  | 'unknown';

export interface VoiceCommandResult {
  command: VoiceCommand;
  confidence: number;
  text: string;
  entities?: {
    query?: string;
    number?: number;
    artist?: string;
    song?: string;
    album?: string;
    playlist?: string;
  };
  context?: {
    currentTrack?: string;
    isPlaying?: boolean;
  };
}

class EnhancedVoiceCommandService {
  private isListening = false;
  private onCommandCallback?: (result: VoiceCommandResult) => void;
  private currentContext: VoiceCommandResult['context'] = {};

  /**
   * Set current playback context
   */
  setContext(context: VoiceCommandResult['context']) {
    this.currentContext = {...this.currentContext, ...context};
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      let permission;
      if (Platform.OS === 'android') {
        permission = PERMISSIONS.ANDROID.RECORD_AUDIO;
      } else {
        permission = PERMISSIONS.IOS.MICROPHONE;
      }

      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      log.error('permission request failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Initialize voice recognition (native)
   */
  async initialize(onCommand: (result: VoiceCommandResult) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      this.onCommandCallback = onCommand;

      // Set up Voice event handlers
      Voice.onSpeechStart = this.onSpeechStart.bind(this);
      Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
      Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
      Voice.onSpeechError = this.onSpeechError.bind(this);
      Voice.onSpeechResults = this.onSpeechResults.bind(this);
      Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);

      return true;
    } catch (error) {
      log.error('initialize failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Start listening for voice commands
   */
  async startListening(language: string = 'en-US'): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    try {
      await Voice.start(language);
      this.isListening = true;
      hapticService.selection();
      return true;
    } catch (error) {
      log.error('startListening failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      log.warn('stopListening failed', {message: String(error)});
    }
  }

  /**
   * Cancel listening
   */
  async cancel(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (error) {
      log.warn('cancel failed', {message: String(error)});
    }
  }

  /**
   * Destroy voice recognition
   */
  destroy(): void {
    Voice.destroy().then(() => {
      this.isListening = false;
    });
  }

  // Voice event handlers
  private onSpeechStart = (e: any) => {
    log.debug('speech start');
  };

  private onSpeechRecognized = (e: any) => {
    log.debug('speech recognized');
  };

  private onSpeechEnd = (e: any) => {
    log.debug('speech end');
  };

  private onSpeechError = (e: any) => {
    log.error('speech error', {message: String((e as any)?.error ?? e)});
    this.isListening = false;
  };

  private onSpeechResults = (e: any) => {
    const results = e.value || [];
    if (results.length > 0) {
      const transcript = results[0];
      this.processCommand(transcript);
    }
  };

  private onSpeechPartialResults = (e: any) => {
    // Handle partial results if needed
    const results = e.value || [];
    if (results.length > 0) {
      log.debug('partial', {text: String(results[0])});
    }
  };

  /**
   * Process voice command with entity extraction
   */
  private processCommand(text: string): void {
    if (!this.onCommandCallback) {
      return;
    }

    const command = this.parseCommand(text);
    const entities = this.extractEntities(text);
    
    const result: VoiceCommandResult = {
      command,
      confidence: 0.9, // Voice recognition provides confidence
      text,
      entities,
      context: this.currentContext,
    };

    this.onCommandCallback(result);
    hapticService.medium();
  }

  /**
   * Parse voice command from text with context awareness
   */
  private parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase().trim();

    // Context-aware commands
    if (this.currentContext?.isPlaying) {
      if (lowerText.match(/\b(pause|stop)\b/)) {
        return 'pause';
      }
    } else {
      if (lowerText.match(/\b(play|start|resume)\b/)) {
        // Check if specific track requested
        if (lowerText.match(/\b(play|start)\s+.+/)) {
          return 'search';
        }
        return 'play';
      }
    }

    // Artist-specific commands
    if (lowerText.match(/\bplay\s+(artist|by)\s+.+/)) {
      return 'play_artist';
    }

    // Song-specific commands
    if (lowerText.match(/\bplay\s+(song|track)\s+.+/)) {
      return 'play_song';
    }

    // Album-specific commands
    if (lowerText.match(/\bplay\s+album\s+.+/)) {
      return 'play_album';
    }

    // Playlist commands
    if (lowerText.match(/\badd\s+(to\s+)?playlist\s+.+/)) {
      return 'add_to_playlist';
    }

    // Standard commands
    if (lowerText.match(/\b(next|skip|forward)\b/)) {
      return 'next';
    }

    if (lowerText.match(/\b(previous|back|go back)\b/)) {
      return 'previous';
    }

    if (lowerText.match(/\b(volume up|louder|increase volume)\b/)) {
      return 'volume_up';
    }

    if (lowerText.match(/\b(volume down|quieter|decrease volume)\b/)) {
      return 'volume_down';
    }

    if (lowerText.match(/\b(shuffle|random)\b/)) {
      return 'shuffle';
    }

    if (lowerText.match(/\b(repeat|loop)\b/)) {
      return 'repeat';
    }

    if (lowerText.match(/\b(seek forward|fast forward|skip ahead)\b/)) {
      return 'seek_forward';
    }

    if (lowerText.match(/\b(seek back|rewind|go back)\b/)) {
      return 'seek_backward';
    }

    if (lowerText.match(/\b(what's playing|what is playing|current song|now playing)\b/)) {
      return 'whats_playing';
    }

    return 'unknown';
  }

  /**
   * Extract entities from command text (enhanced)
   */
  extractEntities(text: string): VoiceCommandResult['entities'] {
    const lowerText = text.toLowerCase().trim();
    const entities: VoiceCommandResult['entities'] = {};

    // Extract numbers (for volume, seek amount, etc.)
    const numberMatch = text.match(/\b(\d+)\b/);
    if (numberMatch) {
      entities.number = parseInt(numberMatch[1]);
    }

    // Extract artist name
    const artistPatterns = [
      /\bplay\s+(artist|by)\s+(.+?)(?:\s+album|\s+song|$)/i,
      /\bartist\s+(.+?)(?:\s+album|\s+song|$)/i,
    ];
    for (const pattern of artistPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[2]) {
        entities.artist = match[2].trim();
        break;
      }
    }

    // Extract song name
    const songPatterns = [
      /\bplay\s+(song|track)\s+(.+?)(?:\s+by|\s+artist|$)/i,
      /\bsong\s+(.+?)(?:\s+by|\s+artist|$)/i,
    ];
    for (const pattern of songPatterns) {
      const match = lowerText.match(pattern);
      if (match && match[2]) {
        entities.song = match[2].trim();
        break;
      }
    }

    // Extract album name
    const albumMatch = lowerText.match(/\bplay\s+album\s+(.+?)(?:\s+by|\s+artist|$)/i);
    if (albumMatch && albumMatch[1]) {
      entities.album = albumMatch[1].trim();
    }

    // Extract playlist name
    const playlistMatch = lowerText.match(/\badd\s+(to\s+)?playlist\s+(.+?)$/i);
    if (playlistMatch && playlistMatch[2]) {
      entities.playlist = playlistMatch[2].trim();
    }

    // Extract general search query (fallback)
    if (!entities.artist && !entities.song && !entities.album) {
      const searchPatterns = [
        /\bplay\s+(.+?)(?:\s+by|\s+artist|$)/i,
        /\bfind\s+(.+?)$/i,
        /\bsearch\s+(.+?)$/i,
      ];
      for (const pattern of searchPatterns) {
        const match = lowerText.match(pattern);
        if (match && match[1]) {
          entities.query = match[1].trim();
          break;
        }
      }
    }

    return entities;
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const voiceModule = Voice as unknown as {
        getSupportedLanguages?: () => Promise<string[]>;
      };
      if (!voiceModule.getSupportedLanguages) {
        return ['en-US'];
      }
      return await voiceModule.getSupportedLanguages();
    } catch (error) {
      log.warn('getAvailableLanguages failed', {message: String(error)});
      return ['en-US'];
    }
  }

  /**
   * Check if voice recognition is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const availability = await Voice.isAvailable();
      return availability === 1;
    } catch (error) {
      return false;
    }
  }
}

export const enhancedVoiceCommandService = new EnhancedVoiceCommandService();

