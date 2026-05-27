import TrackPlayer, {State} from 'react-native-track-player';
import {audioSettingsService} from './audioSettingsService';
import {createLogger} from '../utils/logger';

const log = createLogger('Crossfade');

class CrossfadeService {
  private isCrossfading = false;
  private fadeOutInterval: ReturnType<typeof setInterval> | null = null;
  private fadeInInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Get crossfade settings
   */
  private async getCrossfadeSettings() {
    const settings = await audioSettingsService.loadSettings();
    return settings.crossfade;
  }

  /**
   * Start crossfade between tracks
   */
  async startCrossfade(
    currentTrackId: string,
    nextTrackId: string,
    duration: number = 3,
  ): Promise<void> {
    if (this.isCrossfading) {
      log.warn('crossfade already in progress');
      return;
    }

    const settings = await this.getCrossfadeSettings();
    if (!settings.enabled) {
      return;
    }

    const fadeDuration = (settings.duration || duration) * 1000; // Convert to ms
    this.isCrossfading = true;

    try {
      // Get current volume
      const currentVolume = await TrackPlayer.getVolume();
      const steps = 20;
      const stepDuration = fadeDuration / steps;
      const volumeStep = currentVolume / steps;

      // Fade out current track
      let currentStep = 0;
      this.fadeOutInterval = setInterval(async () => {
        currentStep++;
        const newVolume = Math.max(0, currentVolume - volumeStep * currentStep);
        
        try {
          await TrackPlayer.setVolume(newVolume);
        } catch (error) {
          log.warn('fade out failed', {message: String(error)});
        }

        if (currentStep >= steps) {
          if (this.fadeOutInterval) {
            clearInterval(this.fadeOutInterval);
            this.fadeOutInterval = null;
          }

          // Switch to next track
          await this.switchToNextTrack(nextTrackId, currentVolume);
        }
      }, stepDuration);
    } catch (error) {
      log.error('startCrossfade failed', {message: String(error)});
      this.isCrossfading = false;
    }
  }

  /**
   * Switch to next track and fade in
   */
  private async switchToNextTrack(
    nextTrackId: string,
    targetVolume: number,
  ): Promise<void> {
    try {
      // Get next track (you'll need to implement queue management)
      // For now, we'll just play the next track
      const queue = await TrackPlayer.getQueue();
      const currentIndex = queue.findIndex(t => t.id === nextTrackId);
      
      if (currentIndex !== -1) {
        await TrackPlayer.skipToNext();
        await TrackPlayer.setVolume(0);
        
        // Fade in new track
        const settings = await this.getCrossfadeSettings();
        const fadeDuration = (settings.duration || 3) * 1000;
        const steps = 20;
        const stepDuration = fadeDuration / steps;
        const volumeStep = targetVolume / steps;

        let currentStep = 0;
        this.fadeInInterval = setInterval(async () => {
          currentStep++;
          const newVolume = Math.min(targetVolume, volumeStep * currentStep);
          
          try {
            await TrackPlayer.setVolume(newVolume);
          } catch (error) {
            log.warn('fade in failed', {message: String(error)});
          }

          if (currentStep >= steps) {
            if (this.fadeInInterval) {
              clearInterval(this.fadeInInterval);
              this.fadeInInterval = null;
            }
            this.isCrossfading = false;
          }
        }, stepDuration);
      }
    } catch (error) {
      log.error('switchToNextTrack failed', {message: String(error)});
      this.isCrossfading = false;
    }
  }

  /**
   * Stop crossfade
   */
  stopCrossfade(): void {
    if (this.fadeOutInterval) {
      clearInterval(this.fadeOutInterval);
      this.fadeOutInterval = null;
    }
    if (this.fadeInInterval) {
      clearInterval(this.fadeInInterval);
      this.fadeInInterval = null;
    }
    this.isCrossfading = false;
  }

  /**
   * Check if crossfade is enabled
   */
  async isEnabled(): Promise<boolean> {
    const settings = await this.getCrossfadeSettings();
    return settings.enabled;
  }
}

export const crossfadeService = new CrossfadeService();

