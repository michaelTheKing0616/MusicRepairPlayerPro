export interface User {
  id: string;
  email: string;
  name: string;
  is_active?: boolean;
  is_premium?: boolean;
  consent_audio_processing?: boolean;
  consent_voice_cloning?: boolean;
  consent_analytics?: boolean;
  /** Matches backend `User.age_verified` (voice-cloning gate). */
  age_verified?: boolean;
  createdAt: Date;
}

export interface AudioFile {
  id: string;
  userId: string;
  filename: string;
  originalFilename: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  supabaseUrl: string;
  supabasePath: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  // Metadata fields (optional, populated by identification)
  artist?: string;
  title?: string;
  album?: string;
  genre?: string;
  year?: number;
  artworkUrl?: string;
  format?: 'mp3' | 'flac' | 'alac' | 'wav' | 'm4a' | 'ogg';
  bitrate?: number;
  sampleRate?: number;
}

export interface AudioRepairRequest {
  id: string;
  audioFileId: string;
  modelType: 'deepfilternet' | 'demucs' | 'uvr';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  repairedAudioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

// Audio Transform Types
export interface TransformParams {
  voicePreset?: string;
  stylePreset?: string;
  intensity?: number; // 0.0 - 1.0
  preservePitch?: boolean;
  separateStems?: boolean;
  extractContent?: boolean;
  quality?: 'preview' | 'standard' | 'high';
}

// ===========================
// Phase 4: Playables & sharing
// ===========================

export type PlayableKind =
  | 'library_audio'
  | 'local_file'
  | 'radio_station'
  | 'podcast_episode';

/**
 * Canonical reference for any playable entity.
 * Must be stable for resume-position, offline caching, playlists, and sharing.
 */
export type PlayableRef =
  | {kind: 'library_audio'; audioFileId: string}
  | {kind: 'local_file'; localUri: string; filename?: string}
  | {kind: 'radio_station'; stationId: string; streamUrl: string; name?: string}
  | {kind: 'podcast_episode'; episodeId: string; enclosureUrl: string; title?: string; showSlug?: string};

export type QueueItem = {
  id: string; // stable queue item id (uuid or deterministic)
  playable: PlayableRef;
  /** Preferred UI label; safe for stream-only items. */
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  addedAtIso: string;
};

// ===========================
// Phase 4: Offline assets
// ===========================

export type OfflineState = 'queued' | 'downloading' | 'available' | 'failed' | 'evicted';

export type OfflineAsset = {
  id: string;
  playable: PlayableRef;
  state: OfflineState;
  /** RNFS local file path */
  localPath?: string;
  /** RNFS download job id (used for cancel). */
  downloadJobId?: number;
  /** 0..100 */
  progressPct?: number;
  /** bytes */
  bytesTotal?: number;
  /** bytes */
  bytesDownloaded?: number;
  errorMessage?: string;
  createdAtIso: string;
  updatedAtIso: string;
};

/** Row from `GET /jobs` (snake_case normalized in apiService). */
export interface JobSummary {
  id: string;
  jobType: string;
  status: string;
  progressPercent: number;
  progressMessage?: string | null;
  audioFileId: string;
  resultFileId?: string | null;
  params?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    stage: string;
    percentComplete: number;
    currentOperation: string;
    stages: Array<{
      name: string;
      status: 'pending' | 'in_progress' | 'completed' | 'failed';
      durationMs?: number | null;
    }>;
  };
  result?: {
    downloadUrl: string;
    signedUrl: string;
    fileSize: number;
    duration: number;
    stems?: {
      vocals?: string;
      drums?: string;
      bass?: string;
      other?: string;
    };
  };
  metadata?: {
    transcription?: string;
    language?: string;
    tempo?: number;
    key?: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    retryAfter?: number;
  };
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface ConsentState {
  audioProcessing: boolean;
  voiceCloning: boolean;
  dataRetention: boolean;
  analytics: boolean;
  modelTraining: boolean;
}

// Local Music File Types
export interface LocalMusicFile {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in milliseconds
  path: string;
  fileName: string;
  fileSize: number;
  cover?: string;
  genre?: string;
  year?: number;
  track?: number;
  bitrate?: number;
  sampleRate?: number;
}

