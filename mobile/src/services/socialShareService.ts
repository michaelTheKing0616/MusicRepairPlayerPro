import Share from 'react-native-share';
import {AudioFile} from '../types';
import {Alert} from 'react-native';
import {createLogger} from '../utils/logger';
import {exportService} from './exportService';
import {
  buildClipSharePayloadV1,
  buildLibraryAudioSharePayloadV1,
  buildMomentSharePayloadV1,
} from './sharePayloads';

/**
 * Social sharing service for tracks and playlists
 */
const log = createLogger('SocialShare');

class SocialShareService {
  /**
   * Share a track
   */
  async shareTrack(audioFile: AudioFile): Promise<void> {
    try {
      const title = `${audioFile.originalFilename || audioFile.filename}`;
      const payload = buildLibraryAudioSharePayloadV1(audioFile.id);
      const message = `Track: ${title}\n\nOpen in Music Repair:\n${payload.deepLink}`;

      const shareOptions = {
        title: 'Share Track',
        message: message,
        url: payload.deepLink,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.message !== 'User did not share') {
        log.error('shareTrack failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share track');
      }
    }
  }

  /**
   * Share a playlist
   */
  async sharePlaylist(
    playlistName: string,
    trackCount: number,
    playlistId?: string
  ): Promise<void> {
    try {
      const message = `🎵 ${playlistName}\n\n${trackCount} tracks\n\nListen on Music Repair App!`;
      
      let url = '';
      if (playlistId) {
        // If you implement playlist URLs
        // url = `${apiService.getBaseUrl()}/playlist/${playlistId}`;
      }

      const shareOptions = {
        title: 'Share Playlist',
        message: message,
        url: url || undefined,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('sharePlaylist failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share playlist');
      }
    }
  }

  /**
   * Share audio repair result
   */
  async shareRepairResult(
    originalFilename: string,
    repairedUrl: string,
    improvement?: string
  ): Promise<void> {
    try {
      const message = `✨ Audio Repair Complete!\n\n${originalFilename}\n${improvement ? `Improvement: ${improvement}\n` : ''}\nCheck it out!`;
      
      const shareOptions = {
        title: 'Share Repaired Audio',
        message: message,
        url: repairedUrl,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareRepairResult failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share repair result');
      }
    }
  }

  /**
   * Share app link
   */
  async shareApp(): Promise<void> {
    try {
      const message = `🎵 Music Repair App\n\nRepair, enhance, and enjoy your music!\n\nDownload now:`;
      const url = 'https://your-app-store-link.com'; // Replace with your app store link

      const shareOptions = {
        title: 'Share App',
        message: message,
        url: url,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareApp failed', {message: String(error)});
      }
    }
  }

  /**
   * Share track as file (via WhatsApp, etc.)
   */
  async shareTrackAsFile(audioFile: AudioFile): Promise<void> {
    try {
      await exportService.shareAudioFile(audioFile);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareTrackAsFile failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share track file');
      }
    }
  }

  /**
   * Share listening statistics
   */
  async shareStats(
    totalPlayTime: number,
    favoriteTrack?: string,
    topGenre?: string
  ): Promise<void> {
    try {
      const hours = Math.floor(totalPlayTime / 3600);
      const minutes = Math.floor((totalPlayTime % 3600) / 60);
      
      let message = `📊 My Music Stats\n\n`;
      message += `Total listening time: ${hours}h ${minutes}m\n`;
      
      if (favoriteTrack) {
        message += `Favorite track: ${favoriteTrack}\n`;
      }
      
      if (topGenre) {
        message += `Top genre: ${topGenre}\n`;
      }
      
      message += `\nMusic Repair App`;

      const shareOptions = {
        title: 'Share Stats',
        message: message,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareStats failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share stats');
      }
    }
  }

  async shareMoment(momentId: string, label?: string): Promise<void> {
    try {
      const payload = buildMomentSharePayloadV1(momentId);
      const message = `${label ? `Moment: ${label}\n\n` : ''}Open in Music Repair:\n${payload.deepLink}`;
      await Share.open({
        title: 'Share Moment',
        message,
        url: payload.deepLink,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareMoment failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share moment');
      }
    }
  }

  async shareClip(clipId: string, label?: string): Promise<void> {
    try {
      const payload = buildClipSharePayloadV1(clipId);
      const message = `${label ? `Clip: ${label}\n\n` : ''}Open in Music Repair:\n${payload.deepLink}`;
      await Share.open({
        title: 'Share Clip',
        message,
        url: payload.deepLink,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        log.error('shareClip failed', {message: String(error)});
        Alert.alert('Error', 'Failed to share clip');
      }
    }
  }
}

export const socialShareService = new SocialShareService();

