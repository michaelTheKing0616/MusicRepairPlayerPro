import {createLogger} from '../utils/logger';

const log = createLogger('DeepLinks');

export type DeepLink =
  | {kind: 'library_audio'; audioId: string; startAtSec?: number}
  | {kind: 'moment'; momentId: string}
  | {kind: 'clip'; clipId: string};

// Keep this stable; it’s part of the share contract.
export const DEEP_LINK_PREFIX = 'musicrepair://';

function encodeQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function buildLibraryAudioLink(audioId: string, startAtSec?: number): string {
  return `${DEEP_LINK_PREFIX}play/library/${encodeURIComponent(audioId)}${encodeQuery({
    t: startAtSec != null ? Math.max(0, Math.round(startAtSec * 1000) / 1000) : undefined,
  })}`;
}

export function buildMomentLink(momentId: string): string {
  return `${DEEP_LINK_PREFIX}moment/${encodeURIComponent(momentId)}`;
}

export function buildClipLink(clipId: string): string {
  return `${DEEP_LINK_PREFIX}clip/${encodeURIComponent(clipId)}`;
}

export function buildActivityLink(initialSegment: 'jobs' | 'streams' | 'marks' = 'jobs'): string {
  return `${DEEP_LINK_PREFIX}activity${encodeQuery({tab: initialSegment})}`;
}

export function parseDeepLink(url: string): DeepLink | null {
  try {
    if (!url.startsWith(DEEP_LINK_PREFIX)) return null;
    const u = new URL(url);
    const host = u.host; // e.g. "play", "moment", "clip"
    const parts = u.pathname.split('/').filter(Boolean);
    if (host === 'play' && parts[0] === 'library' && parts[1]) {
      const audioId = decodeURIComponent(parts[1]);
      const tRaw = u.searchParams.get('t');
      const t = tRaw != null ? Number(tRaw) : undefined;
      return {
        kind: 'library_audio',
        audioId,
        startAtSec: t != null && Number.isFinite(t) && t >= 0 ? t : undefined,
      };
    }
    if (host === 'moment' && parts[0]) {
      return {kind: 'moment', momentId: decodeURIComponent(parts[0])};
    }
    if (host === 'clip' && parts[0]) {
      return {kind: 'clip', clipId: decodeURIComponent(parts[0])};
    }
    if (host === 'activity') {
      const tab = u.searchParams.get('tab') as any;
      // Activity is handled by navigation config; we treat it as non-applicable here.
      return null;
    }
    return null;
  } catch (e) {
    log.warn('parseDeepLink failed', {message: String(e), url});
    return null;
  }
}

