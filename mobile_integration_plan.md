# Mobile Integration Plan
## AI Music Transformation App - Server-Mobile Integration Guide

**Version:** 1.0  
**Last Updated:** 2024  
**Target Platforms:** iOS (Swift), Android (Kotlin), React Native (TypeScript)

---

## Table of Contents

1. [API Contract Examples](#api-contract-examples)
2. [SDK Function Signatures](#sdk-function-signatures)
3. [On-Device vs Cloud Inference](#on-device-vs-cloud-inference)
4. [Network Resilience Patterns](#network-resilience-patterns)
5. [Battery & Privacy Recommendations](#battery--privacy-recommendations)
6. [OpenAPI Specification](#openapi-specification)

---

## API Contract Examples

### 1. Upload Audio

**Endpoint:** `POST /api/v1/audio/upload`

**Request:**
```http
POST /api/v1/audio/upload HTTP/1.1
Host: api.example.com
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="song.wav"
Content-Type: audio/wav

[binary audio data]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="metadata"

{"duration": 180.5, "sample_rate": 44100, "channels": 2}
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

**Response (200 OK):**
```json
{
  "job_id": "job_abc123def456",
  "status": "uploaded",
  "file_info": {
    "id": "file_xyz789",
    "filename": "song.wav",
    "duration": 180.5,
    "sample_rate": 44100,
    "channels": 2,
    "file_size": 31752000,
    "uploaded_at": "2024-01-15T10:30:00Z"
  },
  "upload_url": "https://storage.example.com/uploads/file_xyz789.wav",
  "chunk_size": 5242880,
  "resume_url": "https://api.example.com/api/v1/audio/uploads/file_xyz789/resume"
}
```

**Response (413 Payload Too Large):**
```json
{
  "error": "file_too_large",
  "message": "File size exceeds maximum allowed size of 500MB",
  "max_size": 524288000,
  "received_size": 600000000
}
```

---

### 2. Request Transform

**Endpoint:** `POST /api/v1/transform`

**Request:**
```json
{
  "job_id": "job_abc123def456",
  "transform_type": "voice",
  "params": {
    "voice_preset": "preset_male_baritone_001",
    "intensity": 0.85,
    "preserve_pitch": true,
    "style_preset": null
  },
  "options": {
    "separate_stems": true,
    "extract_content": true,
    "quality": "high"
  }
}
```

**Response (202 Accepted):**
```json
{
  "transform_id": "transform_xyz789",
  "job_id": "job_abc123def456",
  "status": "queued",
  "estimated_completion": "2024-01-15T10:35:00Z",
  "status_url": "https://api.example.com/api/v1/transform/transform_xyz789/status",
  "queue_position": 3
}
```

**Response (400 Bad Request):**
```json
{
  "error": "invalid_preset",
  "message": "Voice preset 'invalid_preset' not found",
  "available_presets": ["preset_male_baritone_001", "preset_female_soprano_001"]
}
```

---

### 3. Job Status

**Endpoint:** `GET /api/v1/jobs/{job_id}/status`

**Response (200 OK - Processing):**
```json
{
  "job_id": "job_abc123def456",
  "status": "processing",
  "progress": {
    "stage": "voice_conversion",
    "percent_complete": 65,
    "current_operation": "Neural vocoder synthesis",
    "stages": [
      {"name": "stem_separation", "status": "completed", "duration_ms": 12500},
      {"name": "content_extraction", "status": "completed", "duration_ms": 3200},
      {"name": "voice_conversion", "status": "in_progress", "duration_ms": 8500},
      {"name": "vocoder", "status": "pending", "duration_ms": null},
      {"name": "post_processing", "status": "pending", "duration_ms": null}
    ]
  },
  "estimated_time_remaining": 25,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:32:15Z"
}
```

**Response (200 OK - Completed):**
```json
{
  "job_id": "job_abc123def456",
  "status": "completed",
  "progress": {
    "percent_complete": 100,
    "total_duration_ms": 45000
  },
  "result": {
    "download_url": "https://cdn.example.com/results/job_abc123def456/transformed.wav",
    "signed_url": "https://cdn.example.com/results/job_abc123def456/transformed.wav?signature=abc123&expires=2024-01-15T11:00:00Z",
    "file_size": 31200000,
    "duration": 180.5,
    "stems": {
      "vocals": "https://cdn.example.com/results/job_abc123def456/vocals.wav",
      "drums": "https://cdn.example.com/results/job_abc123def456/drums.wav",
      "bass": "https://cdn.example.com/results/job_abc123def456/bass.wav",
      "other": "https://cdn.example.com/results/job_abc123def456/other.wav"
    }
  },
  "metadata": {
    "transcription": "Sample transcribed text...",
    "language": "en",
    "tempo": 120,
    "key": "C major"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:32:45Z"
}
```

**Response (200 OK - Failed):**
```json
{
  "job_id": "job_abc123def456",
  "status": "failed",
  "error": {
    "code": "inference_error",
    "message": "GPU memory allocation failed",
    "retryable": true,
    "retry_after": 30
  },
  "created_at": "2024-01-15T10:30:00Z",
  "failed_at": "2024-01-15T10:31:20Z"
}
```

---

### 4. Streaming Preview (WebSocket)

**WebSocket URL:** `wss://api.example.com/api/v1/preview/stream?job_id={job_id}&token={jwt_token}`

**Client → Server (Start Preview):**
```json
{
  "action": "start_preview",
  "job_id": "job_abc123def456",
  "preview_type": "voice_conversion",
  "params": {
    "voice_preset": "preset_male_baritone_001",
    "intensity": 0.85
  }
}
```

**Server → Client (Audio Chunk):**
```json
{
  "type": "audio_chunk",
  "sequence": 42,
  "timestamp_ms": 10500,
  "audio_data": "base64_encoded_audio_chunk",
  "format": "pcm_16bit_16khz_mono"
}
```

**Server → Client (Status Update):**
```json
{
  "type": "status",
  "status": "processing",
  "progress": 65,
  "message": "Generating preview chunk..."
}
```

**Server → Client (Error):**
```json
{
  "type": "error",
  "code": "preview_timeout",
  "message": "Preview generation timed out"
}
```

---

### 5. Download Result

**Endpoint:** `GET /api/v1/jobs/{job_id}/download`

**Response (302 Redirect):**
```http
HTTP/1.1 302 Found
Location: https://cdn.example.com/results/job_abc123def456/transformed.wav?signature=xyz789&expires=2024-01-15T11:00:00Z
X-File-Size: 31200000
X-Content-Type: audio/wav
```

**Response (200 OK - Direct Download):**
```http
HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Length: 31200000
Content-Disposition: attachment; filename="transformed.wav"
X-Audio-Duration: 180.5
X-Sample-Rate: 44100
X-Channels: 2

[binary audio data]
```

---

### 6. Real-Time Preview Gateway

**Endpoint:** `POST /api/v1/preview/realtime`

**Request:**
```json
{
  "audio_chunk": "base64_encoded_pcm_16bit_16khz_mono",
  "chunk_index": 0,
  "transform_params": {
    "voice_preset": "preset_male_baritone_001",
    "intensity": 0.85
  }
}
```

**Response (200 OK):**
```json
{
  "preview_chunk": "base64_encoded_transformed_audio",
  "chunk_index": 0,
  "latency_ms": 450,
  "format": "pcm_16bit_16khz_mono"
}
```

---

## SDK Function Signatures

### React Native (TypeScript)

```typescript
// src/services/audioTransformService.ts

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

interface TransformParams {
  voicePreset?: string;
  stylePreset?: string;
  intensity?: number; // 0.0 - 1.0
  preservePitch?: boolean;
  separateStems?: boolean;
}

interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    stage: string;
    percentComplete: number;
    currentOperation: string;
    stages: Array<{
      name: string;
      status: string;
      durationMs?: number;
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
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

class AudioTransformService {
  /**
   * Upload audio file with resumable chunking
   */
  async uploadAudio(
    fileUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ jobId: string; fileId: string }>;

  /**
   * Request transformation with parameters
   */
  async requestTransform(
    jobId: string,
    params: TransformParams
  ): Promise<{ transformId: string; estimatedCompletion: Date }>;

  /**
   * Poll job status with exponential backoff
   */
  async pollJobStatus(
    jobId: string,
    onUpdate?: (status: JobStatus) => void,
    options?: {
      interval?: number;
      maxAttempts?: number;
      onError?: (error: Error) => void;
    }
  ): Promise<JobStatus>;

  /**
   * Stream preview via WebSocket
   */
  async streamPreview(
    jobId: string,
    params: TransformParams,
    onAudioChunk: (audioData: ArrayBuffer, sequence: number) => void,
    onError?: (error: Error) => void
  ): Promise<() => void>; // Returns cleanup function

  /**
   * Download transformed result
   */
  async downloadResult(
    downloadUrl: string,
    outputPath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string>; // Returns local file path
}
```

---

### iOS (Swift)

```swift
// AudioTransformService.swift

import Foundation
import Combine

struct UploadProgress {
    let loaded: Int64
    let total: Int64
    var percent: Double { Double(loaded) / Double(total) }
}

struct TransformParams {
    var voicePreset: String?
    var stylePreset: String?
    var intensity: Double = 0.85 // 0.0 - 1.0
    var preservePitch: Bool = true
    var separateStems: Bool = false
}

enum JobStatus: String, Codable {
    case queued
    case processing
    case completed
    case failed
}

struct JobStatusResponse: Codable {
    let jobId: String
    let status: JobStatus
    let progress: ProgressInfo?
    let result: DownloadResult?
    let error: ErrorInfo?
}

class AudioTransformService {
    private let baseURL: URL
    private let session: URLSession
    
    init(baseURL: URL, apiKey: String) {
        self.baseURL = baseURL
        // Configure session with auth
    }
    
    /**
     * Upload audio file with resumable chunking
     */
    func uploadAudio(
        fileURL: URL,
        onProgress: ((UploadProgress) -> Void)? = nil
    ) async throws -> (jobId: String, fileId: String)
    
    /**
     * Request transformation with parameters
     */
    func requestTransform(
        jobId: String,
        params: TransformParams
    ) async throws -> (transformId: String, estimatedCompletion: Date)
    
    /**
     * Poll job status with exponential backoff
     */
    func pollJobStatus(
        jobId: String,
        onUpdate: ((JobStatusResponse) -> Void)? = nil,
        maxAttempts: Int = 100
    ) async throws -> JobStatusResponse
    
    /**
     * Stream preview via WebSocket
     */
    func streamPreview(
        jobId: String,
        params: TransformParams,
        onAudioChunk: @escaping (Data, Int) -> Void,
        onError: ((Error) -> Void)? = nil
    ) -> AsyncStream<Void>
    
    /**
     * Download transformed result
     */
    func downloadResult(
        downloadURL: URL,
        outputPath: URL,
        onProgress: ((UploadProgress) -> Void)? = nil
    ) async throws -> URL
}
```

---

### Android (Kotlin)

```kotlin
// AudioTransformService.kt

data class UploadProgress(
    val loaded: Long,
    val total: Long
) {
    val percent: Double get() = loaded.toDouble() / total.toDouble()
}

data class TransformParams(
    val voicePreset: String? = null,
    val stylePreset: String? = null,
    val intensity: Double = 0.85, // 0.0 - 1.0
    val preservePitch: Boolean = true,
    val separateStems: Boolean = false
)

enum class JobStatus {
    QUEUED, PROCESSING, COMPLETED, FAILED
}

data class JobStatusResponse(
    val jobId: String,
    val status: JobStatus,
    val progress: ProgressInfo? = null,
    val result: DownloadResult? = null,
    val error: ErrorInfo? = null
)

class AudioTransformService(
    private val baseUrl: String,
    private val apiKey: String
) {
    private val client: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(apiKey))
        .build()
    
    /**
     * Upload audio file with resumable chunking
     */
    suspend fun uploadAudio(
        fileUri: Uri,
        onProgress: (suspend (UploadProgress) -> Unit)? = null
    ): Pair<String, String> // jobId, fileId
    
    /**
     * Request transformation with parameters
     */
    suspend fun requestTransform(
        jobId: String,
        params: TransformParams
    ): Pair<String, Date> // transformId, estimatedCompletion
    
    /**
     * Poll job status with exponential backoff
     */
    suspend fun pollJobStatus(
        jobId: String,
        onUpdate: (suspend (JobStatusResponse) -> Unit)? = null,
        maxAttempts: Int = 100
    ): JobStatusResponse
    
    /**
     * Stream preview via WebSocket
     */
    fun streamPreview(
        jobId: String,
        params: TransformParams,
        onAudioChunk: (ByteArray, Int) -> Unit,
        onError: (Throwable) -> Unit
    ): Flow<Unit>
    
    /**
     * Download transformed result
     */
    suspend fun downloadResult(
        downloadUrl: String,
        outputPath: File,
        onProgress: (suspend (UploadProgress) -> Unit)? = null
    ): File
}
```

---

## On-Device vs Cloud Inference

### On-Device Components (Mobile)

**Recommended for on-device:**

1. **Lightweight Denoiser** (DeepFilterNet Lite)
   - Model: Quantized DeepFilterNet (<10MB)
   - Use Case: Real-time noise reduction for preview
   - Latency: <50ms per chunk
   - License: MIT

2. **Sample Preview Generator**
   - Model: TinyWhisper or quantized Demucs (2-stem only)
   - Use Case: Quick preview before full upload
   - Latency: <2s for 10-second sample
   - License: MIT/Apache 2.0

3. **Audio Format Conversion**
   - Library: FFmpeg mobile (libavformat)
   - Use Case: Format normalization before upload
   - Latency: Real-time or faster

4. **Pitch/Key Detection**
   - Library: librosa mobile port or Essentia.js
   - Use Case: Metadata extraction
   - Latency: <1s

5. **Waveform Visualization**
   - Custom implementation or Wav2Bar
   - Use Case: UI visualization
   - Latency: Real-time

### Cloud-Only Components (Server)

**Must run on server:**

1. **Stem Separation** (Demucs v4)
   - Reason: Requires 4-6GB VRAM, slow on mobile
   - Latency: 90-120s on GPU vs 10+ minutes on mobile CPU

2. **Voice Conversion** (FreeVC/SO-VITS-SVC)
   - Reason: Requires 6-8GB VRAM, large models
   - Latency: 45-60s on GPU vs impossible on mobile

3. **Style Transfer** (DiffSinger)
   - Reason: Diffusion model, very slow
   - Latency: 60-90s on GPU

4. **Neural Vocoder** (HiFi-GAN)
   - Reason: Can run on-device but quality suffers
   - Recommendation: Server for quality, on-device for preview only

5. **Full Content Extraction** (WhisperX)
   - Reason: Large model, better quality on server
   - On-device: Use TinyWhisper for quick preview

### Hybrid Approach (Recommended)

```typescript
// Smart routing based on user tier and network
async function requestTransform(
  jobId: string,
  params: TransformParams,
  options: {
    useOnDevicePreview?: boolean;
    quality?: 'preview' | 'high';
  }
) {
  if (options.useOnDevicePreview && options.quality === 'preview') {
    // On-device preview (2-3s latency)
    return await onDevicePreview(jobId, params);
  } else {
    // Cloud processing (high quality, 2-3min)
    return await cloudTransform(jobId, params);
  }
}
```

---

## Network Resilience Patterns

### 1. Resumable Uploads (Tus Protocol)

```typescript
// React Native implementation
import * as tus from 'tus-js-client';

class ResumableUploader {
  async upload(
    fileUri: string,
    uploadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const file = {
        uri: fileUri,
        type: 'audio/wav',
        name: 'audio.wav'
      };

      const upload = new tus.Upload(file, {
        endpoint: uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: 'audio.wav',
          filetype: 'audio/wav'
        },
        onError: (error) => {
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percent = (bytesUploaded / bytesTotal) * 100;
          onProgress(percent);
        },
        onSuccess: () => {
          resolve(upload.url!);
        },
        onChunkComplete: (chunkSize, bytesAccepted, bytesTotal) => {
          // Save resume token
          AsyncStorage.setItem(
            `upload_${fileUri}`,
            JSON.stringify({
              url: upload.url,
              bytesUploaded: bytesAccepted
            })
          );
        }
      });

      // Check for existing upload
      AsyncStorage.getItem(`upload_${fileUri}`).then((saved) => {
        if (saved) {
          const { url } = JSON.parse(saved);
          upload.url = url;
        }
        upload.start();
      });
    });
  }
}
```

### 2. Chunked Uploads (Fallback)

```typescript
class ChunkedUploader {
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

  async uploadChunked(
    fileUri: string,
    uploadUrl: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    const fileInfo = await RNFS.stat(fileUri);
    const totalChunks = Math.ceil(fileInfo.size / this.CHUNK_SIZE);
    let uploadedChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, fileInfo.size);
      
      const chunk = await RNFS.read(fileUri, fileInfo.size, start);
      
      await this.uploadChunk(
        chunk,
        uploadUrl,
        i,
        totalChunks,
        fileInfo.size
      );

      uploadedChunks++;
      onProgress((uploadedChunks / totalChunks) * 100);
    }

    return uploadUrl;
  }

  private async uploadChunk(
    chunk: string,
    uploadUrl: string,
    chunkIndex: number,
    totalChunks: number,
    totalSize: number
  ): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await axios.post(
          `${uploadUrl}/chunk`,
          chunk,
          {
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Chunk-Index': chunkIndex.toString(),
              'X-Total-Chunks': totalChunks.toString(),
              'X-Total-Size': totalSize.toString()
            }
          }
        );
        return;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await this.exponentialBackoff(3 - retries);
      }
    }
  }
}
```

### 3. Exponential Backoff for Polling

```typescript
class JobPoller {
  private baseInterval = 1000; // 1 second
  private maxInterval = 30000; // 30 seconds
  private maxAttempts = 300; // 5 minutes at max interval

  async pollJobStatus(
    jobId: string,
    onUpdate: (status: JobStatus) => void,
    onComplete: (status: JobStatus) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    let attempt = 0;
    let currentInterval = this.baseInterval;

    const poll = async () => {
      try {
        const status = await apiService.getJobStatus(jobId);
        
        onUpdate(status);

        if (status.status === 'completed' || status.status === 'failed') {
          onComplete(status);
          return;
        }

        attempt++;
        if (attempt >= this.maxAttempts) {
          throw new Error('Polling timeout exceeded');
        }

        // Exponential backoff with jitter
        currentInterval = Math.min(
          currentInterval * 1.5,
          this.maxInterval
        );
        const jitter = Math.random() * 0.3 * currentInterval;
        const delay = currentInterval + jitter;

        setTimeout(poll, delay);
      } catch (error) {
        onError(error as Error);
      }
    };

    poll();
  }
}
```

### 4. Network State Management

```typescript
import NetInfo from '@react-native-community/netinfo';

class NetworkAwareService {
  private isOnline = true;
  private queue: Array<() => Promise<void>> = [];

  constructor() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.processQueue();
      }
    });
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    if (!this.isOnline) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await this.executeWithRetry(operation, maxRetries);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    let lastError: Error;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (error.response?.status >= 500 || error.code === 'NETWORK_ERROR') {
          await this.exponentialBackoff(i);
          continue;
        }
        throw error;
      }
    }
    throw lastError!;
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Queue operation failed:', error);
        }
      }
    }
  }

  private exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

---

## Battery & Privacy Recommendations

### 1. Background Uploads

**iOS (Swift):**
```swift
// Use URLSession background configuration
let config = URLSessionConfiguration.background(
    withIdentifier: "com.app.audioUpload"
)
config.isDiscretionary = false // Don't wait for optimal conditions
config.sessionSendsLaunchEvents = true
let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)

// Upload task continues even when app is backgrounded
let task = session.uploadTask(with: request, fromFile: fileURL)
task.resume()
```

**Android (Kotlin):**
```kotlin
// Use WorkManager for background uploads
val uploadWork = OneTimeWorkRequestBuilder<AudioUploadWorker>()
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .setRequiresBatteryNotLow(true) // Optional
            .build()
    )
    .setBackoffCriteria(
        BackoffPolicy.EXPONENTIAL,
        OneTimeWorkRequest.MIN_BACKOFF_MILLIS,
        TimeUnit.MILLISECONDS
    )
    .build()

WorkManager.getInstance(context).enqueue(uploadWork)
```

**React Native:**
```typescript
import BackgroundFetch from 'react-native-background-fetch';

// Configure background fetch
BackgroundFetch.configure(
  {
    minimumFetchInterval: 15, // minutes
    stopOnTerminate: false,
    startOnBoot: true
  },
  async (taskId) => {
    await processPendingUploads();
    BackgroundFetch.finish(taskId);
  }
);
```

### 2. Battery Optimization

**Best Practices:**
- Use batch processing instead of individual API calls
- Cache results locally to avoid re-downloading
- Use WebSocket for real-time updates (more efficient than polling)
- Implement request coalescing (group multiple requests)
- Use exponential backoff to reduce battery drain from failed requests

```typescript
class BatteryOptimizedService {
  private requestQueue: Map<string, Promise<any>> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  // Coalesce duplicate requests
  async requestWithCoalescing<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  // Batch multiple requests
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    maxBatchSize = 5
  ): Promise<T[]> {
    const batches: Array<Array<() => Promise<T>>> = [];
    for (let i = 0; i < requests.length; i += maxBatchSize) {
      batches.push(requests.slice(i, i + maxBatchSize));
    }

    const results: T[] = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(fn => fn()));
      results.push(...batchResults);
      // Small delay between batches to reduce battery impact
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}
```

### 3. User Consent Dialogs

**Privacy-First Consent Flow:**

```typescript
// src/components/ConsentFlow.tsx

interface ConsentState {
  audioProcessing: boolean;
  voiceCloning: boolean;
  dataRetention: boolean;
  analytics: boolean;
  modelTraining: boolean;
}

const ConsentFlow: React.FC<{
  onConsent: (state: ConsentState) => void;
}> = ({ onConsent }) => {
  return (
    <ConsentModal>
      <ConsentSection
        title="Audio Processing Consent"
        description="We need your permission to process your audio files on our servers using AI models. Your audio will be temporarily stored for processing and deleted after 7 days (free tier) or 90 days (premium tier)."
        required={true}
        onToggle={(value) => setConsent({ ...consent, audioProcessing: value })}
      />

      <ConsentSection
        title="Voice Cloning Consent"
        description="Voice transformation features require processing your voice characteristics. You must be 18+ to use this feature. We prohibit impersonation or deceptive use. Your transformed audio will contain an imperceptible watermark."
        required={false}
        onToggle={(value) => setConsent({ ...consent, voiceCloning: value })}
      />

      <ConsentSection
        title="Model Training (Optional)"
        description="Allow us to use your anonymized audio (with your voice removed) to improve our AI models. You can opt out anytime. This helps us provide better service to all users."
        required={false}
        onToggle={(value) => setConsent({ ...consent, modelTraining: value })}
      />

      <AgeGate
        minimumAge={18}
        onVerified={() => setAgeVerified(true)}
      />

      <Button
        disabled={!consent.audioProcessing || !ageVerified}
        onPress={() => onConsent(consent)}
      >
        I Understand and Agree
      </Button>
    </ConsentModal>
  );
};
```

**iOS Consent (Swift):**
```swift
class ConsentManager {
    func requestAudioProcessingConsent() async -> Bool {
        // Show consent dialog
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                let alert = UIAlertController(
                    title: "Audio Processing Consent",
                    message: "We need your permission to process audio files...",
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "Accept", style: .default) { _ in
                    continuation.resume(returning: true)
                })
                alert.addAction(UIAlertAction(title: "Decline", style: .cancel) { _ in
                    continuation.resume(returning: false)
                })
                // Present alert
            }
        }
    }
}
```

**Android Consent (Kotlin):**
```kotlin
class ConsentManager(private val context: Context) {
    suspend fun requestAudioProcessingConsent(): Boolean = suspendCancellableCoroutine { cont ->
        MaterialAlertDialogBuilder(context)
            .setTitle("Audio Processing Consent")
            .setMessage("We need your permission to process audio files...")
            .setPositiveButton("Accept") { _, _ ->
                cont.resume(true)
            }
            .setNegativeButton("Decline") { _, _ ->
                cont.resume(false)
            }
            .setOnCancelListener {
                cont.resume(false)
            }
            .show()
    }
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: AI Music Transformation API
  version: 1.0.0
  description: API for transforming audio with AI models (voice conversion, style transfer, stem separation)

servers:
  - url: https://api.example.com/api/v1
    description: Production server
  - url: https://staging-api.example.com/api/v1
    description: Staging server

tags:
  - name: Audio
    description: Audio upload and management
  - name: Transform
    description: Transformation jobs
  - name: Preview
    description: Real-time previews
  - name: Jobs
    description: Job status and results

paths:
  /audio/upload:
    post:
      tags: [Audio]
      summary: Upload audio file
      operationId: uploadAudio
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                metadata:
                  type: object
                  properties:
                    duration:
                      type: number
                    sample_rate:
                      type: integer
                    channels:
                      type: integer
      responses:
        '200':
          description: Upload successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResponse'
        '413':
          description: File too large
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /transform:
    post:
      tags: [Transform]
      summary: Request transformation
      operationId: requestTransform
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TransformRequest'
      responses:
        '202':
          description: Transformation queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransformResponse'

  /jobs/{jobId}/status:
    get:
      tags: [Jobs]
      summary: Get job status
      operationId: getJobStatus
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Job status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/JobStatus'

  /jobs/{jobId}/download:
    get:
      tags: [Jobs]
      summary: Download result
      operationId: downloadResult
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
        - name: format
          in: query
          schema:
            type: string
            enum: [wav, mp3, flac]
            default: wav
      responses:
        '200':
          description: File download
          content:
            audio/wav:
              schema:
                type: string
                format: binary
        '302':
          description: Redirect to CDN
          headers:
            Location:
              schema:
                type: string

  /preview/stream:
    get:
      tags: [Preview]
      summary: WebSocket endpoint for streaming preview
      operationId: streamPreview
      parameters:
        - name: jobId
          in: query
          required: true
          schema:
            type: string
        - name: token
          in: query
          required: true
          schema:
            type: string
      responses:
        '101':
          description: Switching to WebSocket protocol

components:
  schemas:
    UploadResponse:
      type: object
      properties:
        job_id:
          type: string
        status:
          type: string
          enum: [uploaded]
        file_info:
          $ref: '#/components/schemas/FileInfo'
        upload_url:
          type: string
          format: uri
        chunk_size:
          type: integer
        resume_url:
          type: string
          format: uri

    TransformRequest:
      type: object
      required: [job_id, transform_type]
      properties:
        job_id:
          type: string
        transform_type:
          type: string
          enum: [voice, style, combined]
        params:
          $ref: '#/components/schemas/TransformParams'
        options:
          $ref: '#/components/schemas/TransformOptions'

    TransformParams:
      type: object
      properties:
        voice_preset:
          type: string
        style_preset:
          type: string
        intensity:
          type: number
          minimum: 0
          maximum: 1
          default: 0.85
        preserve_pitch:
          type: boolean
          default: true

    TransformOptions:
      type: object
      properties:
        separate_stems:
          type: boolean
          default: false
        extract_content:
          type: boolean
          default: false
        quality:
          type: string
          enum: [preview, standard, high]
          default: high

    TransformResponse:
      type: object
      properties:
        transform_id:
          type: string
        job_id:
          type: string
        status:
          type: string
          enum: [queued]
        estimated_completion:
          type: string
          format: date-time
        status_url:
          type: string
          format: uri
        queue_position:
          type: integer

    JobStatus:
      type: object
      properties:
        job_id:
          type: string
        status:
          type: string
          enum: [queued, processing, completed, failed]
        progress:
          $ref: '#/components/schemas/ProgressInfo'
        result:
          $ref: '#/components/schemas/DownloadResult'
        error:
          $ref: '#/components/schemas/ErrorInfo'

    ProgressInfo:
      type: object
      properties:
        stage:
          type: string
        percent_complete:
          type: number
          minimum: 0
          maximum: 100
        current_operation:
          type: string
        stages:
          type: array
          items:
            $ref: '#/components/schemas/StageInfo'

    StageInfo:
      type: object
      properties:
        name:
          type: string
        status:
          type: string
          enum: [pending, in_progress, completed, failed]
        duration_ms:
          type: integer
          nullable: true

    DownloadResult:
      type: object
      properties:
        download_url:
          type: string
          format: uri
        signed_url:
          type: string
          format: uri
        file_size:
          type: integer
        duration:
          type: number
        stems:
          $ref: '#/components/schemas/Stems'

    Stems:
      type: object
      properties:
        vocals:
          type: string
          format: uri
          nullable: true
        drums:
          type: string
          format: uri
          nullable: true
        bass:
          type: string
          format: uri
          nullable: true
        other:
          type: string
          format: uri
          nullable: true

    FileInfo:
      type: object
      properties:
        id:
          type: string
        filename:
          type: string
        duration:
          type: number
        sample_rate:
          type: integer
        channels:
          type: integer
        file_size:
          type: integer
        uploaded_at:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        code:
          type: string
          nullable: true

    ErrorInfo:
      type: object
      properties:
        code:
          type: string
        message:
          type: string
        retryable:
          type: boolean
        retry_after:
          type: integer
          nullable: true

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## Risks & Mitigations

### 1. Network Failures
**Risk:** Uploads fail on poor connections, wasting user time and battery  
**Mitigation:**
- Implement resumable uploads (Tus protocol)
- Chunked uploads with retry logic
- Queue operations when offline, sync when online
- Show clear error messages with retry options

### 2. Battery Drain
**Risk:** Continuous polling and background processing drain battery  
**Mitigation:**
- Use WebSocket instead of polling when possible
- Implement exponential backoff for status checks
- Batch operations to reduce network calls
- Use background tasks only when necessary

### 3. Privacy Concerns
**Risk:** Users concerned about audio data handling  
**Mitigation:**
- Clear consent dialogs with plain language
- Transparent data retention policies
- On-device preview options for privacy-sensitive users
- End-to-end encryption for audio uploads (optional premium feature)

### 4. Latency Issues
**Risk:** Slow processing frustrates users  
**Mitigation:**
- Provide real-time preview for instant feedback
- Show accurate progress indicators
- Estimate completion times based on historical data
- Queue position visibility for transparency

### 5. Model Licensing
**Risk:** Using models without proper licensing  
**Mitigation:**
- Verify all model licenses before integration
- Document model sources and licenses
- Include attribution in app credits
- Regular license compliance audits

