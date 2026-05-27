import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import RNFS from 'react-native-fs';
import {createLogger} from '../utils/logger';

const log = createLogger('AudioTransform');

// ============================================================================
// Types
// ============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface TransformParams {
  voicePreset?: string;
  stylePreset?: string;
  intensity?: number; // 0.0 - 1.0
  preservePitch?: boolean;
  separateStems?: boolean;
  extractContent?: boolean;
  quality?: 'preview' | 'standard' | 'high';
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

interface UploadResponse {
  job_id: string;
  status: string;
  file_info: {
    id: string;
    filename: string;
    duration: number;
    sample_rate: number;
    channels: number;
    file_size: number;
    uploaded_at: string;
  };
  upload_url: string;
  chunk_size: number;
  resume_url: string;
}

interface TransformResponse {
  transform_id: string;
  job_id: string;
  status: string;
  estimated_completion: string;
  status_url: string;
  queue_position: number;
}

// ============================================================================
// Configuration
// ============================================================================

const getApiUrl = () => {
  if (__DEV__) {
    // Android emulator uses special IP
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000/api/v1';
    }
    // iOS simulator and other dev
    return 'http://localhost:8000/api/v1';
  }
  // Production
  return 'https://api.example.com/api/v1';
};

const API_BASE_URL = getApiUrl();

// ============================================================================
// Audio Transform Service
// ============================================================================

class AudioTransformService {
  private client: AxiosInstance;
  private isOnline: boolean = true;
  private requestQueue: Array<() => Promise<void>> = [];
  private activePollers: Map<string, () => void> = new Map();
  private activeWebSockets: Map<string, WebSocket> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
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
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
      },
    );

    // Network state monitoring
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.processQueue();
      }
    });

    // Initialize network state
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  // ========================================================================
  // Upload Audio (with resumable chunking)
  // ========================================================================

  async uploadAudio(
    fileUri: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ jobId: string; fileId: string }> {
    try {
      // Check if upload was previously started
      const savedUpload = await AsyncStorage.getItem(`upload_${fileUri}`);
      if (savedUpload) {
        const { uploadUrl, uploadedBytes, totalSize } = JSON.parse(savedUpload);
        return this.resumeUpload(fileUri, uploadUrl, uploadedBytes, totalSize, onProgress);
      }

      // Get file info
      const fileInfo = await RNFS.stat(fileUri);
      const fileSize = fileInfo.size;

      // Create upload session
      const response = await this.client.post<UploadResponse>('/audio/upload', {
        filename: fileUri.split('/').pop(),
        file_size: fileSize,
        content_type: 'audio/wav',
      });

      const { job_id, file_info, upload_url, chunk_size, resume_url } = response.data;

      // Save upload state
      await AsyncStorage.setItem(
        `upload_${fileUri}`,
        JSON.stringify({
          uploadUrl: upload_url,
          resumeUrl: resume_url,
          uploadedBytes: 0,
          totalSize: fileSize,
          jobId: job_id,
          fileId: file_info.id,
        }),
      );

      // Upload file in chunks
      const CHUNK_SIZE = chunk_size || 5 * 1024 * 1024; // 5MB default
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      let uploadedBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);

        // Read chunk
        const chunk = await RNFS.read(fileUri, end - start, start, 'base64');

        // Upload chunk with retry
        await this.uploadChunkWithRetry(
          Buffer.from(chunk, 'base64'),
          upload_url,
          i,
          totalChunks,
          fileSize,
        );

        uploadedBytes = end;
        onProgress?.({
          loaded: uploadedBytes,
          total: fileSize,
          percent: (uploadedBytes / fileSize) * 100,
        });

        // Update saved state
        await AsyncStorage.setItem(
          `upload_${fileUri}`,
          JSON.stringify({
            uploadUrl: upload_url,
            resumeUrl: resume_url,
            uploadedBytes,
            totalSize: fileSize,
            jobId: job_id,
            fileId: file_info.id,
          }),
        );
      }

      // Mark upload as complete
      await AsyncStorage.removeItem(`upload_${fileUri}`);

      return { jobId: job_id, fileId: file_info.id };
    } catch (error) {
      throw this.handleError(error, 'Failed to upload audio file');
    }
  }

  private async resumeUpload(
    fileUri: string,
    uploadUrl: string,
    uploadedBytes: number,
    totalSize: number,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ jobId: string; fileId: string }> {
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const startChunk = Math.floor(uploadedBytes / CHUNK_SIZE);
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

    for (let i = startChunk; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);

      const chunk = await RNFS.read(fileUri, end - start, start, 'base64');
      await this.uploadChunkWithRetry(
        Buffer.from(chunk, 'base64'),
        uploadUrl,
        i,
        totalChunks,
        totalSize,
      );

      uploadedBytes = end;
      onProgress?.({
        loaded: uploadedBytes,
        total: totalSize,
        percent: (uploadedBytes / totalSize) * 100,
      });
    }

    await AsyncStorage.removeItem(`upload_${fileUri}`);

    // Get job ID from saved state
    const saved = await AsyncStorage.getItem(`upload_${fileUri}`);
    if (saved) {
      const { jobId, fileId } = JSON.parse(saved);
      return { jobId, fileId };
    }

    throw new Error('Failed to resume upload');
  }

  private async uploadChunkWithRetry(
    chunk: Buffer,
    uploadUrl: string,
    chunkIndex: number,
    totalChunks: number,
    totalSize: number,
    maxRetries: number = 3,
  ): Promise<void> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await this.client.post(
          `${uploadUrl}/chunk`,
          chunk,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Chunk-Index': chunkIndex.toString(),
              'X-Total-Chunks': totalChunks.toString(),
              'X-Total-Size': totalSize.toString(),
            },
          },
        );
        return;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw error;
        }
        await this.exponentialBackoff(retries);
      }
    }
  }

  // ========================================================================
  // Request Transform
  // ========================================================================

  async requestTransform(
    jobId: string,
    params: TransformParams,
  ): Promise<{ transformId: string; estimatedCompletion: Date }> {
    try {
      const response = await this.client.post<TransformResponse>('/transform', {
        job_id: jobId,
        transform_type: params.stylePreset ? 'combined' : 'voice',
        params: {
          voice_preset: params.voicePreset,
          style_preset: params.stylePreset,
          intensity: params.intensity ?? 0.85,
          preserve_pitch: params.preservePitch ?? true,
        },
        options: {
          separate_stems: params.separateStems ?? false,
          extract_content: params.extractContent ?? false,
          quality: params.quality ?? 'high',
        },
      });

      return {
        transformId: response.data.transform_id,
        estimatedCompletion: new Date(response.data.estimated_completion),
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to request transformation');
    }
  }

  // ========================================================================
  // Poll Job Status (with exponential backoff)
  // ========================================================================

  async pollJobStatus(
    jobId: string,
    onUpdate?: (status: JobStatus) => void,
    options?: {
      interval?: number;
      maxAttempts?: number;
      onError?: (error: Error) => void;
    },
  ): Promise<JobStatus> {
    const baseInterval = options?.interval || 1000; // 1 second
    const maxInterval = 30000; // 30 seconds
    const maxAttempts = options?.maxAttempts || 300; // 5 minutes at max interval

    let attempt = 0;
    let currentInterval = baseInterval;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getJobStatus(jobId);
          onUpdate?.(status);

          if (status.status === 'completed' || status.status === 'failed') {
            this.activePollers.delete(jobId);
            resolve(status);
            return;
          }

          attempt++;
          if (attempt >= maxAttempts) {
            this.activePollers.delete(jobId);
            const error = new Error('Polling timeout exceeded');
            options?.onError?.(error);
            reject(error);
            return;
          }

          // Exponential backoff with jitter
          currentInterval = Math.min(currentInterval * 1.5, maxInterval);
          const jitter = Math.random() * 0.3 * currentInterval;
          const delay = currentInterval + jitter;

          const timeoutId = setTimeout(poll, delay);
          this.activePollers.set(jobId, () => clearTimeout(timeoutId));
        } catch (error) {
          this.activePollers.delete(jobId);
          const err = this.handleError(error, 'Failed to poll job status');
          options?.onError?.(err);
          reject(err);
        }
      };

      poll();
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const response = await this.client.get<JobStatus>(`/jobs/${jobId}/status`);
      return this.mapJobStatus(response.data);
    } catch (error) {
      throw this.handleError(error, 'Failed to get job status');
    }
  }

  stopPolling(jobId: string): void {
    const stop = this.activePollers.get(jobId);
    if (stop) {
      stop();
      this.activePollers.delete(jobId);
    }
  }

  // ========================================================================
  // Stream Preview (WebSocket)
  // ========================================================================

  async streamPreview(
    jobId: string,
    params: TransformParams,
    onAudioChunk: (audioData: ArrayBuffer, sequence: number) => void,
    onError?: (error: Error) => void,
  ): Promise<() => void> {
    return new Promise((resolve, reject) => {
      try {
        const token = AsyncStorage.getItem('auth_token');
        const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/preview/stream?job_id=${jobId}&token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          // Send start preview message
          ws.send(
            JSON.stringify({
              action: 'start_preview',
              job_id: jobId,
              preview_type: params.stylePreset ? 'combined' : 'voice_conversion',
              params: {
                voice_preset: params.voicePreset,
                style_preset: params.stylePreset,
                intensity: params.intensity ?? 0.85,
              },
            }),
          );

          // Return cleanup function
          resolve(() => {
            ws.close();
            this.activeWebSockets.delete(jobId);
          });
        };

        ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'audio_chunk') {
              // Decode base64 audio data
              const audioBuffer = Buffer.from(data.audio_data, 'base64').buffer;
              onAudioChunk(audioBuffer, data.sequence);
            } else if (data.type === 'error') {
              const error = new Error(data.message);
              onError?.(error);
            }
          } catch (error) {
            onError?.(error as Error);
          }
        };

        ws.onerror = error => {
          const err = new Error('WebSocket error');
          onError?.(err);
          reject(err);
        };

        ws.onclose = () => {
          this.activeWebSockets.delete(jobId);
        };

        this.activeWebSockets.set(jobId, ws);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================================================================
  // Download Result
  // ========================================================================

  async downloadResult(
    downloadUrl: string,
    outputPath: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<string> {
    try {
      const downloadOptions = {
        fromUrl: downloadUrl,
        toFile: outputPath,
        progress: (res: { bytesWritten: number; contentLength: number }) => {
          if (onProgress && res.contentLength) {
            onProgress({
              loaded: res.bytesWritten,
              total: res.contentLength,
              percent: (res.bytesWritten / res.contentLength) * 100,
            });
          }
        },
      };

      const result = await RNFS.downloadFile(downloadOptions).promise;
      if (result.statusCode === 200) {
        return outputPath;
      } else {
        throw new Error(`Download failed with status ${result.statusCode}`);
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to download result');
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private mapJobStatus(data: any): JobStatus {
    return {
      jobId: data.job_id,
      status: data.status,
      progress: data.progress
        ? {
            stage: data.progress.stage,
            percentComplete: data.progress.percent_complete,
            currentOperation: data.progress.current_operation,
            stages: data.progress.stages?.map((s: any) => ({
              name: s.name,
              status: s.status,
              durationMs: s.duration_ms,
            })),
          }
        : undefined,
      result: data.result
        ? {
            downloadUrl: data.result.download_url,
            signedUrl: data.result.signed_url,
            fileSize: data.result.file_size,
            duration: data.result.duration,
            stems: data.result.stems,
          }
        : undefined,
      metadata: data.metadata,
      error: data.error,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
    };
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private handleError(error: any, defaultMessage: string): Error {
    if (error.response) {
      // API error
      const message = error.response.data?.message || defaultMessage;
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error. Please check your connection.');
    } else {
      // Other error
      return error instanceof Error ? error : new Error(defaultMessage);
    }
  }

  private async processQueue(): Promise<void> {
    while (this.requestQueue.length > 0 && this.isOnline) {
      const operation = this.requestQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          log.warn('queue operation failed', {message: String(error)});
        }
      }
    }
  }
}

// Export singleton instance
export const audioTransformService = new AudioTransformService();

