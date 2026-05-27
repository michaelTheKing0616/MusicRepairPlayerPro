import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthResponse, AudioFile, JobStatus, JobSummary} from '../types';
import {createLogger} from '../utils/logger';
import {getApiBaseUrl, getApiOrigin} from '../config/apiConfig';

const log = createLogger('ApiService');

// Matches FastAPI `settings.API_V1_PREFIX` (/api/v1).
export const API_BASE_URL = getApiBaseUrl();

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      async error => {
        log.warn('HTTP error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
        });
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
      },
    );
  }

  /** Turn relative API paths (e.g. `/api/v1/...`) into absolute URLs for fetch/TrackPlayer. */
  resolveAbsoluteUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    if (pathOrUrl.startsWith('/')) {
      return `${getApiOrigin()}${pathOrUrl}`;
    }
    return pathOrUrl;
  }

  /** Low-level GET for services that need arbitrary paths (e.g. identification helpers). */
  httpGet<T = unknown>(url: string, config?: AxiosRequestConfig) {
    return this.client.get<T>(url, config);
  }

  /** Low-level POST (supports FormData) for multipart and ad-hoc endpoints. */
  httpPost<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) {
    return this.client.post<T>(url, data, config);
  }

  private mapJobStatusPayload(data: Record<string, any>): JobStatus {
    const progress = data.progress;
    return {
      jobId: String(data.job_id ?? data.jobId),
      status: data.status,
      progress: progress
        ? {
            stage: progress.stage ?? '',
            percentComplete: Math.round(
              progress.percent_complete ?? progress.percentComplete ?? 0,
            ),
            currentOperation:
              progress.current_operation ?? progress.currentOperation ?? '',
            stages: (progress.stages ?? []).map((s: Record<string, any>) => ({
              name: String(s.name),
              status: s.status,
              durationMs: s.duration_ms ?? s.durationMs ?? null,
            })),
          }
        : undefined,
      result: data.result
        ? {
            downloadUrl:
              data.result.download_url ?? data.result.downloadUrl ?? '',
            signedUrl: data.result.signed_url ?? data.result.signedUrl ?? '',
            fileSize: data.result.file_size ?? data.result.fileSize ?? 0,
            duration: data.result.duration ?? 0,
            stems: data.result.stems,
          }
        : undefined,
      metadata: data.metadata,
      error: data.error,
      createdAt: data.created_at ?? data.createdAt,
      updatedAt: data.updated_at ?? data.updatedAt,
      completedAt: data.completed_at ?? data.completedAt,
    };
  }

  private mapBackendAudioFile(row: Record<string, any>): AudioFile {
    return {
      id: String(row.id),
      userId: String(row.user_id ?? row.userId ?? ''),
      filename: row.filename,
      originalFilename: row.original_filename ?? row.originalFilename,
      fileSize: row.file_size ?? row.fileSize,
      duration: row.duration,
      mimeType: row.mime_type ?? row.mimeType ?? 'audio/wav',
      supabaseUrl: row.supabaseUrl
        ? this.resolveAbsoluteUrl(row.supabaseUrl)
        : '',
      supabasePath: String(row.id),
      status: row.status,
      createdAt: new Date(row.created_at ?? row.createdAt),
      updatedAt: new Date(row.updated_at ?? row.updatedAt ?? row.created_at),
      artist: row.artist,
      title: row.title,
      album: row.album,
      genre: row.genre,
      year: row.year,
      format: row.format,
      bitrate: row.bitrate,
      sampleRate: row.sample_rate ?? row.sampleRate,
    };
  }

  // Auth endpoints
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      name,
    });
    // Backend returns user directly, login to get token
    const user = response.data;
    // Login after registration to get token
    return await this.login(email, password);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    const data = response.data;
    const token = data.access_token;
    
    // Store access token
    await AsyncStorage.setItem('auth_token', token);
    
    // Get user info with token
    const userResponse = await this.client.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const user = userResponse.data;
    
    // Store user info
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    return {
      user: user,
      token: token,
    };
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
  }

  async getCurrentUser() {
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  // Audio file endpoints
  async getAudioFiles(): Promise<AudioFile[]> {
    const response = await this.client.get<any[]>('/audio/files');
    return response.data.map(r => this.mapBackendAudioFile(r));
  }

  async getAudioFile(id: string): Promise<AudioFile> {
    const response = await this.client.get(`/audio/files/${id}`);
    return this.mapBackendAudioFile(response.data);
  }

  async deleteAudioFile(id: string): Promise<void> {
    await this.client.delete(`/audio/files/${id}`);
  }

  /** Presigned URL for TrackPlayer / ExoPlayer (short-lived). */
  async getAudioStreamUrl(fileId: string): Promise<{
    url: string;
    expiresInSeconds: number;
    fileId: string;
  }> {
    const response = await this.client.get(`/audio/files/${fileId}/stream-url`);
    const d = response.data;
    return {
      url: d.url,
      expiresInSeconds: d.expiresInSeconds ?? d.expires_in_seconds,
      fileId: String(d.fileId ?? d.file_id ?? fileId),
    };
  }

  async enqueuePresetRender(
    audioFileId: string,
    presetId: string,
  ): Promise<{id: string; audioFileId: string; presetId: string; status: string}> {
    const response = await this.client.post('/audio/preset-render', {
      audioFileId,
      presetId,
    });
    return response.data;
  }

  async getListeningPresetCatalogLite(): Promise<
    {
      id: string;
      familyKey: string;
      tier: number;
      name: string;
      summary: string;
      category: string;
      routing: string;
      intensity: number;
    }[]
  > {
    const response = await this.client.get('/listening-presets/catalog');
    return response.data;
  }

  async getRadioStations(): Promise<
    {id: string; slug: string; name: string; streamUrl: string; genre?: string}[]
  > {
    const response = await this.client.get('/experience/radio/stations');
    return (response.data as any[]).map(r => ({
      id: String(r.id),
      slug: r.slug,
      name: r.name,
      streamUrl: r.stream_url ?? r.streamUrl,
      genre: r.genre,
    }));
  }

  async getPodcastEpisodes(
    showSlug: string,
  ): Promise<
    {
      id: string;
      showSlug: string;
      title: string;
      description?: string;
      enclosureUrl: string;
      durationSec?: number;
      publishedAt?: string;
    }[]
  > {
    const response = await this.client.get(`/experience/podcasts/${encodeURIComponent(showSlug)}/episodes`);
    return (response.data as any[]).map(e => ({
      id: String(e.id),
      showSlug: e.show_slug ?? e.showSlug,
      title: e.title,
      description: e.description,
      enclosureUrl: e.enclosure_url ?? e.enclosureUrl,
      durationSec: e.duration_sec ?? e.durationSec,
      publishedAt: e.published_at ?? e.publishedAt,
    }));
  }

  async createClip(body: {
    audioFileId: string;
    startMs: number;
    endMs: number;
    title?: string;
  }): Promise<unknown> {
    const response = await this.client.post('/experience/clips', body);
    return response.data;
  }

  async listClips(): Promise<unknown[]> {
    const response = await this.client.get('/experience/clips');
    return response.data;
  }

  async getClip(clipId: string): Promise<unknown> {
    const response = await this.client.get(`/experience/clips/${encodeURIComponent(clipId)}`);
    return response.data;
  }

  async deleteClip(clipId: string): Promise<void> {
    await this.client.delete(`/experience/clips/${clipId}`);
  }

  async renderClip(clipId: string, format: 'm4a' | 'mp3' | 'wav' = 'm4a'): Promise<{
    id: string;
    clipId: string;
    format: string;
    status: string;
  }> {
    const response = await this.client.post(`/experience/clips/${encodeURIComponent(clipId)}/render`, null, {
      params: {format},
    });
    return response.data;
  }

  async createMoment(body: {
    audioFileId: string;
    positionMs: number;
    note?: string;
  }): Promise<unknown> {
    const response = await this.client.post('/experience/moments', body);
    return response.data;
  }

  async listMoments(): Promise<unknown[]> {
    const response = await this.client.get('/experience/moments');
    return response.data;
  }

  async listMomentsForAudio(audioFileId: string): Promise<unknown[]> {
    const response = await this.client.get('/experience/moments', {params: {audioFileId}});
    return response.data;
  }

  async getMoment(momentId: string): Promise<unknown> {
    const response = await this.client.get(`/experience/moments/${encodeURIComponent(momentId)}`);
    return response.data;
  }

  async uploadAudioFile(
    uri: string,
    filename: string,
    onProgress?: (progress: number) => void,
  ): Promise<AudioFile> {
    const {audioFile} = await this.uploadAudioFileWithJob(uri, filename, onProgress);
    return audioFile;
  }

  async uploadAudioFileWithJob(
    uri: string,
    filename: string,
    onProgress?: (progress: number) => void,
  ): Promise<{audioFile: AudioFile; uploadJobId: string}> {
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'audio/mpeg',
    } as any);

    const response = await this.client.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(progress);
        }
      },
    });

    // Backend returns UploadResponse with file_info and job_id
    const uploadResponse = response.data;
    const uploadJobId = String(uploadResponse.job_id ?? uploadResponse.jobId ?? '');
    // Return in format expected by app
    const fi = uploadResponse.file_info;
    const audioFile: AudioFile = {
      id: fi.id,
      userId: '',
      filename: fi.filename,
      originalFilename: fi.filename,
      fileSize: fi.file_size,
      duration: fi.duration,
      mimeType: 'audio/wav',
      supabaseUrl: this.resolveAbsoluteUrl(uploadResponse.upload_url),
      supabasePath: fi.id,
      status: 'uploaded',
      createdAt: new Date(fi.uploaded_at),
      updatedAt: new Date(),
    };
    return {audioFile, uploadJobId};
  }

  // Audio repair: POST enqueues Celery worker; poll /jobs/:id/status
  async repairAudio(
    audioFileId: string,
    modelType: 'deepfilternet' | 'demucs' | 'uvr',
    enhancementSettings?: any,
  ): Promise<{id: string; audioFileId: string; modelType: string; status: string}> {
    const response = await this.client.post<{id: string; audioFileId: string; modelType: string; status: string}>(
      '/audio/repair',
      {
        audioFileId,
        modelType,
        enhancementSettings,
      },
    );
    return response.data;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await this.client.get(`/jobs/${jobId}/status`);
    return this.mapJobStatusPayload(response.data);
  }

  async createListeningEvent(body: {
    audioFileId: string;
    eventType: 'play' | 'pause' | 'seek' | 'progress' | 'complete';
    positionSec?: number;
    durationSec?: number;
    client?: string;
  }): Promise<void> {
    await this.client.post('/recommendations/events', body);
  }

  async getRecommendationsFeed(limit = 20): Promise<
    {audioFileId: string; score: number; reason: string; title?: string | null}[]
  > {
    const res = await this.client.get('/recommendations/feed', {params: {limit}});
    return (res.data?.items ?? []).map((it: any) => ({
      audioFileId: String(it.audioFileId ?? it.audio_file_id ?? ''),
      score: Number(it.score ?? 0),
      reason: String(it.reason ?? ''),
      title: it.title != null ? String(it.title) : null,
    }));
  }

  async getPersonalHotspots(audioFileId: string, limit = 8): Promise<{bucketSec: number; score: number; eventCount: number}[]> {
    const res = await this.client.get('/recommendations/hotspots', {
      params: {audioFileId, bucketSizeSec: 5, limit},
    });
    return (res.data?.items ?? []).map((it: any) => ({
      bucketSec: Number(it.bucketSec ?? it.bucket_sec ?? 0),
      score: Number(it.score ?? 0),
      eventCount: Number(it.eventCount ?? it.event_count ?? 0),
    }));
  }

  async listJobs(limit = 50): Promise<JobSummary[]> {
    const response = await this.client.get<Record<string, unknown>[]>('/jobs', {
      params: {limit},
    });
    return (response.data ?? []).map(row => ({
      id: String(row.id ?? ''),
      jobType: String(row.job_type ?? row.jobType ?? ''),
      status: String(row.status ?? ''),
      progressPercent: Number(row.progress_percent ?? row.progressPercent ?? 0),
      progressMessage:
        (row.progress_message ?? row.progressMessage) != null
          ? String(row.progress_message ?? row.progressMessage)
          : null,
      audioFileId: String(row.audio_file_id ?? row.audioFileId ?? ''),
      resultFileId:
        row.result_file_id != null || row.resultFileId != null
          ? String(row.result_file_id ?? row.resultFileId)
          : null,
      params: (row.params as Record<string, unknown>) ?? null,
      errorCode:
        row.error_code != null || row.errorCode != null
          ? String(row.error_code ?? row.errorCode)
          : null,
      errorMessage:
        row.error_message != null || row.errorMessage != null
          ? String(row.error_message ?? row.errorMessage)
          : null,
      createdAt:
        row.created_at != null ? String(row.created_at) : row.createdAt != null ? String(row.createdAt) : '',
      updatedAt:
        row.updated_at != null
          ? String(row.updated_at)
          : row.updatedAt != null
            ? String(row.updatedAt)
            : null,
    }));
  }

  // Audio analysis endpoint
  async analyzeAudio(audioId: string, _audioUrl?: string): Promise<any> {
    const response = await this.client.post(`/audio/${audioId}/analyze`, {});
    return response.data;
  }

  // Audio transcription endpoint (server reads object from MinIO when audioFileId provided)
  async transcribeAudio(audioFileId: string, language?: string): Promise<any> {
    const response = await this.client.post('/audio/transcribe', {
      audioFileId,
      language: language || 'auto',
      format: 'srt',
    });
    return response.data;
  }

  // User profile endpoints
  async getUserProfile(): Promise<any> {
    const response = await this.client.get('/user/profile');
    return response.data;
  }

  async updateUserProfile(updates: any): Promise<any> {
    const response = await this.client.put('/user/profile', updates);
    return response.data;
  }

  async uploadAvatar(avatarUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: avatarUri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    } as any);

    const response = await this.client.post('/user/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.avatarUrl;
  }

  // Music identification (server relays AcoustID when `ACOUSTID_API_KEY` is set)
  async identifyMusicFingerprint(fingerprint: string): Promise<any> {
    const response = await this.client.post('/identify/audio', {fingerprint});
    return response.data;
  }

  /** @deprecated Prefer `identifyMusicFingerprint` with Chromaprint output */
  async identifyMusic(audioData: string): Promise<any> {
    const response = await this.client.post('/identify/audio', {audioData});
    return response.data;
  }

  // AI voice response endpoint
  async generateVoiceResponse(context: string, message: string): Promise<any> {
    const response = await this.client.post('/ai/voice-response', {
      context,
      message,
    });
    return response.data;
  }
}

export const apiService = new ApiService();

