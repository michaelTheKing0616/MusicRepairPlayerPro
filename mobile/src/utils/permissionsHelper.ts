/**
 * Comprehensive Permissions Helper
 * Centralized permission management for all app features
 */

import {Platform} from 'react-native';
import {
  request,
  check,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';
import {createLogger} from './logger';

const log = createLogger('Permissions');

export type PermissionType =
  | 'microphone'
  | 'storage'
  | 'storage_android_13'
  | 'media_library'
  | 'notification';

class PermissionsHelper {
  private getAndroidSdkVersion(): number {
    return typeof Platform.Version === 'number'
      ? Platform.Version
      : Number.parseInt(String(Platform.Version), 10);
  }

  /**
   * Get permission type based on platform and Android version.
   * Returns null when handled outside react-native-permissions (e.g. iOS notifications).
   */
  private getPermission(permission: PermissionType): Permission | null {
    if (Platform.OS === 'ios') {
      switch (permission) {
        case 'microphone':
          return PERMISSIONS.IOS.MICROPHONE;
        case 'media_library':
          return PERMISSIONS.IOS.MEDIA_LIBRARY;
        case 'notification':
          return null;
        default:
          throw new Error(`Permission ${permission} not supported on iOS`);
      }
    } else {
      // Android
      const sdk = this.getAndroidSdkVersion();
      if (sdk >= 33) {
        // Android 13+
        switch (permission) {
          case 'microphone':
            return PERMISSIONS.ANDROID.RECORD_AUDIO;
          case 'storage':
          case 'storage_android_13':
            return PERMISSIONS.ANDROID.READ_MEDIA_AUDIO;
          case 'notification':
            return PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
          default:
            throw new Error(`Permission ${permission} not supported`);
        }
      } else if (sdk >= 30) {
        // Android 11-12
        switch (permission) {
          case 'microphone':
            return PERMISSIONS.ANDROID.RECORD_AUDIO;
          case 'storage':
            return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
          case 'notification':
            return PERMISSIONS.ANDROID.POST_NOTIFICATIONS;
          default:
            throw new Error(`Permission ${permission} not supported`);
        }
      } else {
        // Android 10 and below
        switch (permission) {
          case 'microphone':
            return PERMISSIONS.ANDROID.RECORD_AUDIO;
          case 'storage':
            return PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
          default:
            throw new Error(`Permission ${permission} not supported`);
        }
      }
    }
  }

  /**
   * Check if permission is granted
   */
  async checkPermission(permission: PermissionType): Promise<boolean> {
    try {
      const perm = this.getPermission(permission);
      if (!perm) {
        return true;
      }
      const result = await check(perm);
      return result === RESULTS.GRANTED;
    } catch (error) {
      log.error('check failed', {permission, message: String(error)});
      return false;
    }
  }

  /**
   * Request permission
   */
  async requestPermission(permission: PermissionType): Promise<boolean> {
    try {
      const perm = this.getPermission(permission);
      if (!perm) {
        return true;
      }
      const result = await request(perm);
      return result === RESULTS.GRANTED;
    } catch (error) {
      log.error('request failed', {permission, message: String(error)});
      return false;
    }
  }

  /**
   * Check and request permission if needed
   */
  async ensurePermission(permission: PermissionType): Promise<boolean> {
    const hasPermission = await this.checkPermission(permission);
    if (hasPermission) {
      return true;
    }
    return this.requestPermission(permission);
  }

  /**
   * Request multiple permissions
   */
  async requestMultiplePermissions(
    permissions: PermissionType[],
  ): Promise<Record<PermissionType, boolean>> {
    const results: Record<string, boolean> = {};

    for (const permission of permissions) {
      results[permission] = await this.requestPermission(permission);
    }

    return results as Record<PermissionType, boolean>;
  }

  /**
   * Request permissions for voice commands
   */
  async requestVoicePermissions(): Promise<boolean> {
    return this.ensurePermission('microphone');
  }

  /**
   * Request permissions for music identification
   */
  async requestMusicIdentificationPermissions(): Promise<boolean> {
    return this.ensurePermission('microphone');
  }

  /**
   * Request permissions for offline downloads
   */
  async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS === 'android' && this.getAndroidSdkVersion() >= 33) {
      return this.ensurePermission('storage_android_13');
    }
    return this.ensurePermission('storage');
  }

  /**
   * Request permissions for local music library
   */
  async requestMediaLibraryPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return this.ensurePermission('media_library');
    }
    return this.requestStoragePermissions();
  }

  /**
   * Request all app permissions
   */
  async requestAllPermissions(): Promise<Record<PermissionType, boolean>> {
    const permissions: PermissionType[] = ['microphone', 'storage'];

    if (Platform.OS === 'android' && this.getAndroidSdkVersion() >= 33) {
      permissions.push('storage_android_13', 'notification');
    }

    if (Platform.OS === 'ios') {
      permissions.push('media_library', 'notification');
    }

    return this.requestMultiplePermissions(permissions);
  }

  /**
   * Check if all required permissions are granted
   */
  async checkAllPermissions(): Promise<Record<PermissionType, boolean>> {
    const permissions: PermissionType[] = ['microphone', 'storage'];

    if (Platform.OS === 'android' && this.getAndroidSdkVersion() >= 33) {
      permissions.push('storage_android_13', 'notification');
    }

    if (Platform.OS === 'ios') {
      permissions.push('media_library', 'notification');
    }

    const results: Record<string, boolean> = {};
    for (const permission of permissions) {
      results[permission] = await this.checkPermission(permission);
    }

    return results as Record<PermissionType, boolean>;
  }
}

export const permissionsHelper = new PermissionsHelper();

