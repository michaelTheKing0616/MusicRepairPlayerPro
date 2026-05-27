# Mobile AI Music Transformation App - System Architecture

## Technical System Diagram Walkthrough

### Client Layer
**Components:** iOS App (Swift/SwiftUI), Android App (Kotlin/Compose), Web Client (React/Next.js)

**Implementation Notes:**
- Mobile apps use native frameworks for optimal performance and audio I/O
- Web client serves as admin/demo interface using Next.js for SSR and edge functions
- All clients communicate via REST API for async jobs and WebSocket for real-time preview
- Implement progressive upload with resumable chunks (Tus protocol) for large files

**Free Model Integration:**
- On-device preview uses TensorFlow Lite versions of lightweight models (e.g., TinyWhisper, quantized Demucs)
- Full-quality processing happens server-side

---

### API Gateway & Authentication
**Components:** API Gateway (REST + WebSocket), Auth Service (JWT/OAuth2)

**Implementation Notes:**
- Use FastAPI (Python) or Express.js (Node.js) for REST endpoints
- WebSocket support for real-time preview streaming and job status updates
- JWT tokens for stateless authentication; OAuth2 for social login (Google, Apple, GitHub)
- Rate limiting: 100 requests/minute free tier, 1000/minute premium
- API versioning (v1, v2) for backward compatibility

**Recommended Setup:**
- Deploy behind Nginx/Traefik reverse proxy for SSL termination and load balancing
- Use environment-based configuration (dev/staging/prod)

---

### Upload & Job Management
**Components:** Upload Service, Job Queue (RabbitMQ/Redis Queue), Job Scheduler (Celery Beat)

**Implementation Notes:**
- Upload service handles multipart uploads (max 500MB per file)
- Store upload metadata in PostgreSQL; raw audio in object storage (MinIO/S3)
- Job queue uses RabbitMQ for durability or Redis Queue for speed (Redis Streams)
- Celery Beat schedules batch processing and cleanup tasks
- Job states: PENDING → PROCESSING → COMPLETED/FAILED
- Retry logic: 3 attempts with exponential backoff for transient failures

**Storage Tiers:**
- Hot storage (last 30 days): Fast SSD-backed MinIO
- Cold storage (archived): Glacier/S3 IA for compliance/analytics

---

### Inference Cluster
**Components:** Load Balancer, GPU Workers (CUDA 11.8+), Processing Pipeline

**Processing Pipeline Components:**

#### 1. Stem Separator
**Model:** Demucs v4 (Facebook Research) or hybrid-transformer variants  
**Implementation:** PyTorch, requires 4-8GB VRAM per worker  
**Input:** Raw audio (WAV/MP3)  
**Output:** Separated stems (vocals, drums, bass, other)  
**Notes:** Model quantization (INT8) reduces memory by 50% with <5% quality loss

#### 2. Content Extractor
**Model:** Whisper (OpenAI, open-source) or WhisperX (faster, batched)  
**Implementation:** Hugging Face Transformers, ~2GB VRAM  
**Input:** Audio stems or full mix  
**Output:** Transcription, timestamps, language detection  
**Notes:** Use WhisperX for faster batch processing; supports 99 languages

#### 3. Voice/Style Transformer
**Models:** 
- Voice: FreeVC (RVC fork) or SO-VITS-SVC (Sinsy-based)
- Style: DiffSinger (Diffusion-based) or DDSP (Google Research)
**Implementation:** PyTorch, requires 6-12GB VRAM  
**Input:** Source audio + target voice/style reference  
**Output:** Transformed audio waveform  
**Notes:** FreeVC offers better quality; SO-VITS-SVC is more customizable. Quantize to FP16 for 2x speedup

#### 4. Neural Vocoder
**Model:** HiFi-GAN (Universal) or BigVGAN (higher quality, slower)  
**Implementation:** PyTorch, ~1GB VRAM  
**Input:** Mel spectrograms from transformer  
**Output:** High-quality audio waveform (48kHz)  
**Notes:** HiFi-GAN Universal supports any sample rate; BigVGAN for premium tier

#### 5. Post-Mastering Pipeline
**Components:** AudioSR (upsampling), librosa (EQ, normalization, loudness)  
**Implementation:** Python signal processing stack  
**Input:** Generated audio  
**Output:** Mastered audio (LUFS-normalized, noise-reduced, format-converted)  
**Notes:** AudioSR for 2x upsampling if needed; librosa for standard mastering

**Worker Configuration:**
- Minimum: 1x GPU (NVIDIA T4 16GB or RTX 3090 24GB)
- Recommended: 3-5 workers for redundancy and load distribution
- Auto-scaling: Scale up during peak hours (evenings/weekends), down during off-peak

---

### Model Registry
**Component:** Hugging Face Hub integration + local cache

**Implementation Notes:**
- Download models on first use; cache locally (MinIO bucket or local NVMe SSD)
- Model versioning: Tag models (e.g., `demucs-v4`, `whisper-large-v3`)
- Lazy loading: Load models into GPU memory only when needed
- Cache management: LRU eviction for least-used models; keep hot models in memory

**Recommended Models (Free/Open-Source):**
- Demucs v4: `facebookresearch/demucs`
- Whisper: `openai/whisper-large-v3`
- FreeVC: `RVC-Project/Retrieval-based-Voice-Conversion-WebUI` (weights)
- HiFi-GAN: `jik876/hifi-gan` (Universal vocoder)
- AudioSR: `haoheliu/AudioSR`

---

### Real-time Preview Gateway
**Component:** WebSocket server + TensorFlow Lite models

**Implementation Notes:**
- Lightweight models (quantized, mobile-optimized) for instant preview
- WebSocket streaming for low-latency (<500ms) preview generation
- Cache preview results in Redis (TTL: 1 hour) to avoid recomputation
- Fallback to server-side preview if mobile model fails

**Mobile Models:**
- TinyWhisper (transcription preview)
- Quantized Demucs (stem preview, 2-stem only)
- Lightweight vocoder (LPCNet or similar)

---

### Storage Layer
**Components:** Raw Audio Storage (MinIO/S3), Processed Audio Storage, Redis Cache, PostgreSQL

**Implementation Notes:**
- **Raw Storage:** MinIO (S3-compatible) for cost control or AWS S3 for scale
- **Processed Storage:** Separate bucket with lifecycle policies (delete after 90 days for free tier)
- **Redis Cache:** Store job results, metadata, user sessions (16GB instance minimum)
- **PostgreSQL:** Job metadata, user accounts, subscription data (managed instance recommended)

**Data Retention:**
- Free tier: 7 days retention
- Premium: 90 days retention
- Export-only: No retention (immediate delete after export)

---

### Delivery & Monitoring
**Components:** CDN (Cloudflare/Vercel Edge), Telemetry Service, Admin Console

**CDN Implementation:**
- Cloudflare for global distribution (free tier available)
- Cache processed audio at edge (24-hour TTL)
- Signed URLs for secure, time-limited access

**Telemetry:**
- Prometheus for metrics (job latency, GPU utilization, queue depth)
- Grafana dashboards for real-time monitoring
- AlertManager for critical failures (job queue backup, GPU failures)
- Log aggregation: ELK stack or Loki for centralized logs

**Admin Console:**
- React dashboard for monitoring jobs, users, system health
- Model deployment interface (upload new models, A/B testing)
- User management and billing override tools

---

## Recommended Cloud Setup

### Option 1: Bare-Metal GPU (Best Performance)
**Provider:** Lambda Labs, Vast.ai, or RunPod  
**Specs:** 
- Workers: 3x NVIDIA RTX 3090 (24GB) or RTX 4090 (24GB)
- CPU: 16+ cores, 64GB RAM per worker
- Storage: 1TB NVMe SSD per worker for model cache
- Network: 10Gbps+
**Cost:** ~$0.40-0.80/hour per worker (~$870-1,750/month for 3 workers)

### Option 2: Cloud VPS (Scalable)
**Provider:** AWS EC2 (g4dn.xlarge/g5.xlarge), Google Cloud (n1-standard-4 + T4), Azure (NC-series)  
**Specs:**
- Workers: 3-5 instances with NVIDIA T4 (16GB) or A10G (24GB)
- Auto-scaling group (min: 1, max: 10)
- Spot instances for cost savings (60-70% discount)
**Cost:** ~$0.50-1.50/hour per instance (on-demand), ~$0.20-0.50/hour (spot)

### Option 3: Hybrid (Cost-Optimized)
**Provider:** Vast.ai/RunPod (spot GPU) + Hetzner/OVH (CPU services)  
**Setup:**
- GPU workers: Spot instances on Vast.ai ($0.20-0.40/hour)
- API/Queue/DB: Hetzner dedicated servers (~$50-100/month)
- Storage: Backblaze B2 or Wasabi (S3-compatible, cheaper than S3)
**Cost:** ~$500-800/month total

**Infrastructure Services:**
- PostgreSQL: Managed (AWS RDS, Supabase, or self-hosted on Hetzner)
- Redis: Managed (Redis Cloud, Upstash) or self-hosted
- CDN: Cloudflare (free tier) or CloudFront

---

## Cost Optimization Strategies

### 1. Model Quantization
- Convert FP32 models to FP16 (2x faster, 50% memory reduction)
- INT8 quantization for non-critical models (HiFi-GAN, content extractor)
- **Savings:** 30-40% GPU memory, enabling more concurrent jobs per worker

### 2. Batch Processing
- Batch similar jobs (same model, similar duration) for GPU efficiency
- Dynamic batching: Queue jobs for 2-5 seconds to accumulate batches
- **Savings:** 2-3x throughput improvement

### 3. Spot Instances & Auto-Scaling
- Use spot/preemptible instances for 60-70% cost reduction
- Implement graceful shutdown (save checkpoint, resume on new instance)
- Auto-scale down during off-peak hours (1 worker minimum, 10 max)
- **Savings:** 50-70% infrastructure costs

### 4. Caching & Optimization
- Cache frequently used models in GPU memory (avoid reload overhead)
- Cache intermediate results (stems, transcriptions) in Redis
- Use faster models for free tier (TinyWhisper vs. Whisper Large)
- **Savings:** 20-30% compute reduction

### 5. Storage Optimization
- Compress audio storage (FLAC for archival, MP3 320kbps for delivery)
- Lifecycle policies: Move to cold storage after 30 days, delete after 90
- CDN caching to reduce origin requests
- **Savings:** 60-80% storage costs

### 6. Model Selection by Tier
- Free tier: Fast, lightweight models (TinyWhisper, quantized Demucs)
- Premium tier: High-quality models (Whisper Large, full Demucs, BigVGAN)
- **Benefit:** Reduces compute for non-paying users while maintaining quality for premium

**Estimated Monthly Costs (Optimized):**
- Infrastructure (3 GPU workers, spot): $400-600
- Storage (1TB processed audio): $20-50
- Database/Redis/CDN: $50-100
- **Total:** ~$470-750/month (scales with usage)

