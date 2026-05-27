import {Platform} from 'react-native';

/**
 * Backend API configuration.
 *
 * Emulator defaults:
 * - Android emulator → 10.0.2.2 (host machine)
 * - iOS simulator → localhost
 *
 * Physical device testing:
 * Set DEV_API_HOST_OVERRIDE to your PC's LAN IP (same Wi‑Fi), e.g. '192.168.1.42'.
 * Ensure the FastAPI server listens on 0.0.0.0:8000 and your firewall allows port 8000.
 */
export const DEV_API_HOST_OVERRIDE: string | null = null;

/** Production API origin (no trailing slash). Update before store release builds. */
export const PRODUCTION_API_BASE_URL = 'https://your-api-domain.com/api/v1';

export function getApiBaseUrl(): string {
  if (!__DEV__) {
    return PRODUCTION_API_BASE_URL;
  }

  const host =
    DEV_API_HOST_OVERRIDE ??
    (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

  return `http://${host}:8000/api/v1`;
}

export function getApiOrigin(): string {
  return getApiBaseUrl().replace(/\/?api\/v1\/?$/i, '');
}
