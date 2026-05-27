import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import type {OfflineAsset, OfflineState, PlayableRef} from '../types';
import {apiService} from './api';
import {createLogger} from '../utils/logger';

const log = createLogger('OfflineManager');

const STORAGE_KEY = '@music_app:offline_assets:v1';
const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/offline_assets_v1`;

function nowIso() {
  return new Date().toISOString();
}

function stablePlayableKey(playable: PlayableRef): string {
  switch (playable.kind) {
    case 'library_audio':
      return `library_audio:${playable.audioFileId}`;
    case 'podcast_episode':
      return `podcast_episode:${playable.episodeId || playable.enclosureUrl}`;
    case 'radio_station':
      return `radio_station:${playable.stationId || playable.streamUrl}`;
    case 'local_file':
      return `local_file:${playable.localUri}`;
    default: {
      const _x: never = playable;
      return String(_x);
    }
  }
}

function assetIdForPlayable(playable: PlayableRef): string {
  // Deterministic id for idempotent enqueues.
  return stablePlayableKey(playable);
}

function extForPlayable(playable: PlayableRef): string {
  if (playable.kind === 'podcast_episode') return 'mp3';
  if (playable.kind === 'library_audio') return 'bin';
  return 'bin';
}

type StoredState = {
  assets: Record<string, OfflineAsset>;
};

class OfflineManagerService {
  private mem: StoredState = {assets: {}};
  private inflight: Set<string> = new Set();
  private netUnsub: null | (() => void) = null;

  async initialize(): Promise<void> {
    await RNFS.mkdir(DOWNLOAD_DIR);
    await this.load();
    await this.reconcileFileExistence();
    // Auto-resume queued/failed downloads once back online.
    this.netUnsub?.();
    this.netUnsub = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        const candidates = Object.values(this.mem.assets).filter(
          a => a.state === 'queued' || a.state === 'failed',
        );
        for (const a of candidates) {
          this.kickDownload(a.id).catch(() => {});
        }
      }
    });
  }

  list(): OfflineAsset[] {
    return Object.values(this.mem.assets).sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
  }

  get(playable: PlayableRef): OfflineAsset | null {
    const id = assetIdForPlayable(playable);
    return this.mem.assets[id] ?? null;
  }

  async enqueue(playable: PlayableRef): Promise<OfflineAsset> {
    const id = assetIdForPlayable(playable);
    const existing = this.mem.assets[id];
    const base: OfflineAsset =
      existing ??
      ({
        id,
        playable,
        state: 'queued',
        createdAtIso: nowIso(),
        updatedAtIso: nowIso(),
      } satisfies OfflineAsset);

    // Idempotent: if already available, just return.
    if (base.state === 'available' && base.localPath && (await RNFS.exists(base.localPath))) {
      return base;
    }

    const next: OfflineAsset = {
      ...base,
      playable,
      state: 'queued',
      progressPct: 0,
      errorMessage: undefined,
      updatedAtIso: nowIso(),
    };
    this.mem.assets[id] = next;
    await this.save();
    this.kickDownload(id).catch(e => {
      log.warn('kickDownload failed', {message: String(e)});
    });
    return next;
  }

  async remove(playable: PlayableRef): Promise<void> {
    const id = assetIdForPlayable(playable);
    const cur = this.mem.assets[id];
    if (!cur) return;
    if (cur.downloadJobId != null) {
      try {
        RNFS.stopDownload(cur.downloadJobId);
      } catch {
        // ignore
      }
    }
    if (cur.localPath && (await RNFS.exists(cur.localPath))) {
      await RNFS.unlink(cur.localPath).catch(() => {});
    }
    delete this.mem.assets[id];
    await this.save();
  }

  async cancel(playable: PlayableRef): Promise<void> {
    const id = assetIdForPlayable(playable);
    const cur = this.mem.assets[id];
    if (!cur) return;
    if (cur.downloadJobId != null) {
      try {
        RNFS.stopDownload(cur.downloadJobId);
      } catch {
        // ignore
      }
    }
    this.mem.assets[id] = {
      ...cur,
      state: 'failed',
      progressPct: cur.progressPct ?? 0,
      errorMessage: 'Download cancelled.',
      downloadJobId: undefined,
      updatedAtIso: nowIso(),
    };
    await this.save();
  }

  async retry(playable: PlayableRef): Promise<void> {
    const id = assetIdForPlayable(playable);
    await this.kickDownload(id);
  }

  async kickDownload(id: string): Promise<void> {
    if (this.inflight.has(id)) return;
    const asset = this.mem.assets[id];
    if (!asset) return;
    if (asset.playable.kind !== 'library_audio' && asset.playable.kind !== 'podcast_episode') {
      this.mem.assets[id] = {
        ...asset,
        state: 'failed',
        errorMessage: 'Offline downloads are supported for library audio and podcasts only.',
        updatedAtIso: nowIso(),
      };
      await this.save();
      return;
    }

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      this.mem.assets[id] = {
        ...asset,
        state: 'failed',
        errorMessage: 'You are offline. Connect to download.',
        updatedAtIso: nowIso(),
      };
      await this.save();
      return;
    }

    this.inflight.add(id);
    try {
      await this.downloadWithRetries(id, 2);
    } finally {
      this.inflight.delete(id);
    }
  }

  private async downloadWithRetries(id: string, retries: number): Promise<void> {
    let attempt = 0;
    // simple linear backoff
    while (attempt <= retries) {
      try {
        await this.downloadOnce(id);
        return;
      } catch (e: any) {
        attempt += 1;
        const msg = e?.message || String(e);
        log.warn('download attempt failed', {id, attempt, msg});
        if (attempt > retries) {
          const cur = this.mem.assets[id];
          if (cur) {
            this.mem.assets[id] = {
              ...cur,
              state: 'failed',
              errorMessage: msg,
              updatedAtIso: nowIso(),
            };
            await this.save();
          }
          return;
        }
        await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
  }

  private async downloadOnce(id: string): Promise<void> {
    const asset = this.mem.assets[id];
    if (!asset) return;

    const playable = asset.playable;
    const ext = extForPlayable(playable);
    const localPath = `${DOWNLOAD_DIR}/${encodeURIComponent(id)}.${ext}`;

    let fromUrl = '';
    if (playable.kind === 'library_audio') {
      const su = await apiService.getAudioStreamUrl(playable.audioFileId);
      fromUrl = su.url;
    } else if (playable.kind === 'podcast_episode') {
      fromUrl = playable.enclosureUrl;
    }

    this.mem.assets[id] = {
      ...asset,
      state: 'downloading',
      localPath,
      progressPct: 0,
      bytesDownloaded: 0,
      downloadJobId: undefined,
      errorMessage: undefined,
      updatedAtIso: nowIso(),
    };
    await this.save();

    const res = RNFS.downloadFile({
      fromUrl,
      toFile: localPath,
      progressDivider: 5,
      progress: p => {
        const total = Number(p.contentLength || 0);
        const written = Number(p.bytesWritten || 0);
        const pct = total > 0 ? Math.round((written / total) * 100) : undefined;
        const cur = this.mem.assets[id];
        if (!cur) return;
        this.mem.assets[id] = {
          ...cur,
          bytesTotal: total > 0 ? total : cur.bytesTotal,
          bytesDownloaded: written,
          progressPct: pct ?? cur.progressPct,
          updatedAtIso: nowIso(),
        };
      },
    });
    // Capture job id for cancel.
    {
      const cur = this.mem.assets[id];
      if (cur) {
        this.mem.assets[id] = {
          ...cur,
          downloadJobId: Number((res as any).jobId),
          updatedAtIso: nowIso(),
        };
        await this.save();
      }
    }

    const result = await res.promise;
    if (result.statusCode !== 200) {
      throw new Error(`Download failed (${result.statusCode})`);
    }

    this.mem.assets[id] = {
      ...this.mem.assets[id],
      state: 'available',
      progressPct: 100,
      downloadJobId: undefined,
      updatedAtIso: nowIso(),
    } as OfflineAsset;
    await this.save();
  }

  private async load(): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StoredState;
      if (parsed?.assets && typeof parsed.assets === 'object') {
        this.mem.assets = parsed.assets;
      }
    } catch {
      // ignore
    }
  }

  private async save(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.mem));
  }

  private async reconcileFileExistence(): Promise<void> {
    const entries = Object.entries(this.mem.assets);
    for (const [id, a] of entries) {
      if (a.state === 'available' && a.localPath) {
        const ok = await RNFS.exists(a.localPath);
        if (!ok) {
          this.mem.assets[id] = {
            ...a,
            state: 'evicted',
            localPath: undefined,
            progressPct: undefined,
            bytesDownloaded: undefined,
            bytesTotal: undefined,
            updatedAtIso: nowIso(),
          };
        }
      }
    }
    await this.save();
  }
}

export const offlineManagerService = new OfflineManagerService();

