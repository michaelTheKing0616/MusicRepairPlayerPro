/**
 * Voice Command Service
 * Handles voice recognition and command processing
 */

import {Platform} from 'react-native';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {hapticService} from './hapticService';
import {createLogger} from '../utils/logger';

const log = createLogger('Voice');

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
  };
}

class VoiceCommandService {
  private isListening = false;
  private recognition: any = null;
  private onCommandCallback?: (result: VoiceCommandResult) => void;

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
   * Initialize voice recognition
   */
  async initialize(onCommand: (result: VoiceCommandResult) => void): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      this.onCommandCallback = onCommand;

      // For web, use Web Speech API
      if (Platform.OS === 'web') {
        return this.initializeWebSpeech();
      }

      // For mobile, would use react-native-voice or similar
      // For now, return false as native implementation needs native modules
      log.warn('Native voice recognition requires additional setup');
      return false;
    } catch (error) {
      log.error('initialize failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Initialize Web Speech API (for web platform)
   */
  private async initializeWebSpeech(): Promise<boolean> {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return false;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const confidence = event.results[event.results.length - 1][0].confidence;
      
      const command = this.parseCommand(transcript);
      if (this.onCommandCallback) {
        this.onCommandCallback({
          command,
          confidence,
          text: transcript,
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      log.error('speech recognition error', {message: String(event?.error ?? event)});
    };

    return true;
  }

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    if (!this.recognition) {
      const initialized = await this.initialize((result) => {
        // Will be handled by callback
      });
      if (!initialized) {
        return false;
      }
    }

    try {
      if (Platform.OS === 'web' && this.recognition) {
        this.recognition.start();
        this.isListening = true;
        hapticService.selection();
        return true;
      }

      // Native implementation would go here
      return false;
    } catch (error) {
      log.error('startListening failed', {message: String(error)});
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.isListening && this.recognition) {
      if (Platform.OS === 'web') {
        this.recognition.stop();
      }
      this.isListening = false;
    }
  }

  /**
   * Parse voice command from text
   */
  private parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase().trim();

    // Play commands
    if (lowerText.match(/\b(play|start|resume)\b/)) {
      return 'play';
    }

    // Pause commands
    if (lowerText.match(/\b(pause|stop)\b/)) {
      return 'pause';
    }

    // Next track
    if (lowerText.match(/\b(next|skip|forward)\b/)) {
      return 'next';
    }

    // Previous track
    if (lowerText.match(/\b(previous|back|go back)\b/)) {
      return 'previous';
    }

    // Volume up
    if (lowerText.match(/\b(volume up|louder|increase volume)\b/)) {
      return 'volume_up';
    }

    // Volume down
    if (lowerText.match(/\b(volume down|quieter|decrease volume)\b/)) {
      return 'volume_down';
    }

    // Shuffle
    if (lowerText.match(/\b(shuffle|random)\b/)) {
      return 'shuffle';
    }

    // Repeat
    if (lowerText.match(/\b(repeat|loop)\b/)) {
      return 'repeat';
    }

    // Seek forward
    if (lowerText.match(/\b(seek forward|fast forward|skip ahead)\b/)) {
      return 'seek_forward';
    }

    // Seek backward
    if (lowerText.match(/\b(seek back|rewind|go back)\b/)) {
      return 'seek_backward';
    }

    // What's playing
    if (lowerText.match(/\b(what's playing|what is playing|current song|now playing)\b/)) {
      return 'whats_playing';
    }

    // Search
    if (lowerText.match(/\b(search|find|play)\b/)) {
      return 'search';
    }

    return 'unknown';
  }

  /**
   * Extract entities from command text
   */
  extractEntities(text: string): VoiceCommandResult['entities'] {
    // Extract numbers (for volume, seek amount, etc.)
    const numberMatch = text.match(/\b(\d+)\b/);
    const number = numberMatch ? parseInt(numberMatch[1]) : undefined;

    // Extract search query (text after "search" or "play")
    const searchMatch = text.match(/\b(?:search|find|play)\s+(.+)/i);
    const query = searchMatch ? searchMatch[1].trim() : undefined;

    return {
      number,
      query,
    };
  }
}

export const voiceCommandService = new VoiceCommandService();

