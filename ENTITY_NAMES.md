# Entity and module names (MusicRepairApp)

This glossary keeps product, API, and DSP layers aligned across **FastAPI**, **Celery**, **MinIO**, **React Native**, **TrackPlayer**, **FFmpeg**, **Android `Equalizer`**, and future **AVAudioEngine** work.

## Listening preset engine (90 × tiered catalog)

| Name | Meaning |
| --- | --- |
| `ListeningPresetDefinition` | One row in `mobile/src/preset-engine/catalog.ts`; 10 `familyKey` × 9 `tier` tiers. |
| `offlineFfmpegAf` | Exact worker-side `-af` chain; exported to `backend/app/data/listening_presets.json`. |
| `realtime` (`RealtimeChain`) | Ten canonical EQ centers (31–16k Hz) plus macro controls for the in-app player mapping. |
| `routing` | `realtime` \| `offline` \| `hybrid` — controls whether cloud render is mandatory. |
| **preset_render job** | Celery task `process_preset_render` mirrors `repair`: download → FFmpeg → upload WAV. |

Export command: `cd mobile && npm run export-presets`.

## Audio storage and streaming

| Name | Meaning |
| --- | --- |
| `AudioFile` | DB + MinIO object in `raw-audio` / `processed-audio`. |
| `GET /audio/files/{id}/stream-url` | Returns a **presigned GET** for TrackPlayer (`apiService.getAudioStreamUrl`). |

## Native DSP bridges

| Platform | Module | Role |
| --- | --- | --- |
| Android | `PresetDSP` (`PresetDSPModule.java`) | **Proven:** `android.media.audiofx.Equalizer` keyed by **audio session id** (non-zero). **Emerging:** Oboe/AAudio PCM graph for bespoke multiband/IR processing (not required for catalog v1). |
| iOS | `PresetDSP` (`ios/PresetDSPModule.m`) | **Proven:** RN bridge compiles as `PresetDSP` no-op alongside JS `audioSettings` merge. **Emerging:** standalone `AVAudioEngine` path when decoupled from RNTP’s `AVQueuePlayer`. |

**Perf / underrun mitigations**: prefer **pcm_s16le** worker output, keep graphs bounded (no unbounded buffering in `acompressor` loops), prefetch via TrackPlayer buffers, regenerate presigned URLs before expiry during long listens.

## Product surfaces wired to `/api/v1/experience`

| Resource | Routes |
| --- | --- |
| Clips | `POST/GET/DELETE /experience/clips` |
| Moments | `POST/GET /experience/moments` |
| Radio | `GET /experience/radio/stations` |
| Podcasts | `GET /experience/podcasts/{show_slug}/episodes` |

## Integrations (`/integrations` routers)

| Route | Behavior |
| --- | --- |
| `POST /audio/transcribe` | Streams object from storage through **Whisper CLI** when installed; otherwise 503. |
| `POST /identify/audio` | Proxies AcoustID when **`ACOUSTID_API_KEY`** is set; otherwise 503. |
| `POST /ai/voice-response` | Structured stub compatible with RN TTS layering. |

## Mobile contexts

| Context | Responsibility |
| --- | --- |
| `PresetProvider` | Active preset selection, merges realtime map into AsyncStorage-backed `audioSettingsService`. |
| `PlayerProvider` | Tracks currently loaded library `audioId` for coordination with Sound UI. |
| `ThemeAppProvider` | Supplies Paper `MD3Theme` + dark/light persistence. |

## Jobs

| job_type | Celery module | Progress stages |
| --- | --- | --- |
| `repair` | `repair_tasks.py` | download → ffmpeg_repair → upload |
| `preset_render` | `preset_render_tasks.py` | download → ffmpeg_preset → upload |
| transform | `transform_tasks.py` | stem / ML pipeline stages |

## Phase 4: Playables, playlists, offline, recommendations

| Name | Type | Meaning |
| --- | --- | --- |
| `PlayableKind` | union (`'library_audio' | 'local_file' | 'radio_station' | 'podcast_episode'`) | Canonical discriminator for anything the player can play. |
| `PlayableRef` | interface | Stable reference used for queue items, playlists, resume-position, and share payloads. |
| `QueueItem` | interface | One entry in the playback queue (a `PlayableRef` + display metadata + optional provenance). |
| `ResumePositionKey` | string | Deterministic key derived from `PlayableRef` for saving last position (seconds). |
| `MixedPlaylist` | interface | Playlist that can contain mixed sources (library + podcasts + radio + local). |
| `PlaylistSharePayloadV1` | JSON schema | Export/import format for playlists; versioned for forward compatibility. |
| `OfflineAsset` | interface | A downloaded artifact on device storage, keyed by `PlayableRef` + integrity metadata. |
| `OfflineState` | enum | `queued | downloading | available | failed | evicted`. |
| `ListeningEvent` | backend table | Immutable event log row (play/pause/seek/complete) used for recommendations. |
| `RecommendationsFeed` | API response | Ranked list(s) of `PlayableRef` suggestions + reasons. |
