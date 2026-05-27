/**
 * Storage Service
 * Handles file uploads and downloads to Supabase Storage
 */

import {createClient, SupabaseClient} from '@supabase/supabase-js';
import {logger} from '../utils/logger';

class StorageService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload audio file to Supabase Storage
   */
  async uploadAudio(
    file: Buffer,
    filename: string,
    userId: string,
  ): Promise<{path: string; url: string}> {
    try {
      const filePath = `audio/${userId}/${Date.now()}_${filename}`;
      const {data, error} = await this.supabase.storage
        .from('audio-files')
        .upload(filePath, file, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: {publicUrl},
      } = this.supabase.storage.from('audio-files').getPublicUrl(filePath);

      return {
        path: filePath,
        url: publicUrl,
      };
    } catch (error) {
      logger.error('Error uploading audio:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for audio file
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const {data, error} = await this.supabase.storage
        .from('audio-files')
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Error getting signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudio(path: string): Promise<void> {
    try {
      const {error} = await this.supabase.storage
        .from('audio-files')
        .remove([path]);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error deleting audio:', error);
      throw error;
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: Buffer, filename: string, userId: string): Promise<string> {
    try {
      const filePath = `avatars/${userId}/${filename}`;
      const {error} = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const {
        data: {publicUrl},
      } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();

