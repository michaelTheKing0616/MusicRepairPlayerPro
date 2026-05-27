import {Platform, Alert, Share} from 'react-native';
import RNFS from 'react-native-fs';
import {AudioFile} from '../types';
import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('Export');

class ExportService {
  /**
   * Download audio file to device storage
   */
  async downloadAudioFile(audioFile: AudioFile): Promise<string | null> {
    try {
      // Create downloads directory path
      const downloadsPath =
        Platform.OS === 'ios'
          ? RNFS.DocumentDirectoryPath
          : RNFS.DownloadDirectoryPath;

      const fileExtension = audioFile.filename.split('.').pop() || 'mp3';
      const localPath = `${downloadsPath}/${audioFile.originalFilename || `audio_${audioFile.id}.${fileExtension}`}`;

      // Check if file already exists
      const fileExists = await RNFS.exists(localPath);
      if (fileExists) {
        // Add timestamp to filename
        const timestamp = Date.now();
        const nameParts = audioFile.originalFilename.split('.');
        const ext = nameParts.pop();
        const name = nameParts.join('.');
        const newPath = `${downloadsPath}/${name}_${timestamp}.${ext}`;
        return await this.downloadFile(audioFile.supabaseUrl, newPath);
      }

      return await this.downloadFile(audioFile.supabaseUrl, localPath);
    } catch (error) {
      log.error('downloadAudioFile failed', {message: String(error)});
      Alert.alert('Error', 'Failed to download audio file');
      return null;
    }
  }

  /**
   * Download file from URL to local path
   */
  private async downloadFile(url: string, localPath: string): Promise<string> {
    const downloadOptions = {
      fromUrl: url,
      toFile: localPath,
      progress: (res: any) => {
        const percentage = Math.floor((res.bytesWritten / res.contentLength) * 100);
        log.debug('download progress', {percentage});
      },
    };

    const result = await RNFS.downloadFile(downloadOptions).promise;
    
    if (result.statusCode === 200) {
      return localPath;
    } else {
      throw new Error(`Download failed with status: ${result.statusCode}`);
    }
  }

  /**
   * Share audio file (opens native share dialog)
   */
  async shareAudioFile(audioFile: AudioFile): Promise<void> {
    try {
      // First download the file
      const localPath = await this.downloadAudioFile(audioFile);
      if (!localPath) {
        throw new Error('Failed to download file for sharing');
      }

      // Check if file exists
      const fileExists = await RNFS.exists(localPath);
      if (!fileExists) {
        throw new Error('File does not exist');
      }

      // Get file URI based on platform
      const fileUri =
        Platform.OS === 'ios'
          ? localPath
          : `file://${localPath}`;

      await Share.share({
        url: fileUri,
        title: audioFile.originalFilename,
        message: `Check out this audio: ${audioFile.originalFilename}`,
      });
    } catch (error: any) {
      log.error('shareAudioFile failed', {message: String(error)});
      Alert.alert('Error', error.message || 'Failed to share audio file');
    }
  }

  /**
   * Export to different formats
   */
  async exportToFormat(
    audioFile: AudioFile,
    format: 'mp3' | 'wav' | 'flac',
  ): Promise<string | null> {
    try {
      // In a real implementation, this would convert the audio format
      // For now, we'll just download the original file
      // You can add format conversion using a backend API endpoint
      
      Alert.alert(
        'Format Conversion',
        `Format conversion to ${format} would require server-side processing. This feature can be added via the backend API.`,
      );

      return await this.downloadAudioFile(audioFile);
    } catch (error) {
      log.error('exportToFormat failed', {message: String(error)});
      return null;
    }
  }

  /**
   * Get file info for export
   */
  async getFileInfo(audioFile: AudioFile): Promise<{
    size: string;
    format: string;
    duration?: string;
  }> {
    const sizeMB = (audioFile.fileSize / (1024 * 1024)).toFixed(2);
    const format = audioFile.filename.split('.').pop() || 'unknown';
    const duration = audioFile.duration
      ? `${Math.floor(audioFile.duration / 60)}:${Math.floor(audioFile.duration % 60).toString().padStart(2, '0')}`
      : undefined;

    return {
      size: `${sizeMB} MB`,
      format: format.toUpperCase(),
      duration,
    };
  }
}

export const exportService = new ExportService();

