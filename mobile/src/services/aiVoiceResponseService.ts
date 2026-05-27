/**
 * AI Voice Response Service
 * Provides AI-generated voice responses for system messages and interactions
 */

import {Platform} from 'react-native';
import TrackPlayer from 'react-native-track-player';

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  duration?: number;
}

import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('AIVoice');

class AIVoiceResponseService {
  private isEnabled = true;
  private currentVoice: 'male' | 'female' | 'neutral' = 'neutral';
  private speechRate: number = 1.0;

  /**
   * Generate and speak a response
   */
  async speak(text: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // For now, use device TTS
      // In future, could use AI-generated voice from backend
      if (Platform.OS === 'web') {
        this.speakWeb(text);
      } else {
        // Use native TTS
        // Would need react-native-tts or similar
        log.info('voice response', {text});
      }
    } catch (error) {
      log.error('speak failed', {message: String(error)});
    }
  }

  /**
   * Speak using Web Speech API
   */
  private speakWeb(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    
    // Choose voice based on preference
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => {
      if (this.currentVoice === 'female') {
        return voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('zira');
      } else if (this.currentVoice === 'male') {
        return voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('david');
      }
      return true;
    });
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Generate AI voice response from backend
   */
  async generateAIResponse(
    context: string,
    message: string,
  ): Promise<VoiceResponse | null> {
    try {
      const result = await apiService.generateVoiceResponse(context, message);
      return {
        text: result.text ?? result.reply ?? '',
        audioUrl: result.audioUrl,
        duration: result.duration,
      };
    } catch (error) {
      log.error('generateAIResponse failed', {message: String(error)});
      return null;
    }
  }

  /**
   * System message responses
   */
  async respondToSystemMessage(type: string, data?: any): Promise<void> {
    const messages: Record<string, string> = {
      'repair_complete': `Audio repair completed successfully. ${data?.filename || 'Your audio'} is ready to play.`,
      'repair_failed': 'Sorry, audio repair failed. Please try again or check your file.',
      'download_complete': `Download complete. ${data?.filename || 'File'} saved to your device.`,
      'track_identified': `I found this song: ${data?.title || 'Unknown'} by ${data?.artist || 'Unknown Artist'}.`,
      'playlist_created': 'Playlist created successfully.',
      'track_added': 'Track added to playlist.',
      'network_offline': 'You are offline. Some features may not be available.',
      'network_online': 'Connection restored. All features are now available.',
    };

    const message = messages[type] || 'Task completed.';
    await this.speak(message);
  }

  /**
   * Enable/disable voice responses
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Set voice preference
   */
  setVoice(voice: 'male' | 'female' | 'neutral'): void {
    this.currentVoice = voice;
  }

  /**
   * Set speech rate
   */
  setSpeechRate(rate: number): void {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const aiVoiceResponseService = new AIVoiceResponseService();

