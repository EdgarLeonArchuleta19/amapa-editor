# AMAPA Architecture & Technical Design

## 1. Architectural Overview

AMAPA is a static, local-first, browser-based non-linear video editor (NLE) written in TypeScript and React. It requires **no backend server, no desktop wrapper (no Electron/Tauri), and no server-side media uploads**.

```
+-----------------------------------------------------------------------+
|                              AMAPA UI                                 |
|  TopBar | MediaLibrary | PreviewPlayer | PropertiesPanel | Timeline   |
+-----------------------------------------------------------------------+
        |                        |                         |
        v                        v                         v
+-------------------+  +--------------------+  +------------------------+
| Project State &   |  | Compositor Engine  |  | Export Subsystem       |
| History Engine    |  | (Canvas 2D +       |  | 1. WebCodecs + Muxer   |
| (Pure TS Model +  |  |  Web Audio Mixer)  |  |    (mp4-muxer /        |
|  Undo/Redo Stack) |  |                    |  |     webm-muxer)        |
+-------------------+  +--------------------+  | 2. MediaRecorder Stream|
        |                        |             | 3. PCM WAV Audio       |
        v                        v             +------------------------+
+-------------------+  +--------------------+
| Storage Subsystem |  | Media Analyzer     |
| IndexedDB + JSON  |  | Async Thumbnails & |
| Package Import/Ex |  | Audio Waveforms    |
+-------------------+  +--------------------+
```

## 2. Major Technical Trade-offs

### Media Decoding & Preview Rendering
- **Decision:** Hybrid HTMLMediaElement pool + 2D Canvas compositor (`src/engine/compositor.ts`) with configurable preview scaling (`100%`, `50%`, `25%`).
- **Why not a plain `<video>` element?** A single `<video>` element can only play one source file at a time and cannot composite multiple video tracks, picture-in-picture transforms, image overlays, titles, color adjustments, or crossfade transitions in a unified coordinate space.
- **Trade-off:** Seeking multiple high-bitrate 4K videos simultaneously in the browser can stress hardware decoders. To mitigate this, AMAPA provides a **Preview Resolution Scale** selector (`100%`, `50%`, `25%`) and only decodes media elements that overlap the current playhead window.

### Audio Mixing & Synchronization
- **Decision:** Synchronized media element gain envelopes during real-time preview, paired with offline Web Audio rendering (`OfflineAudioContext`) during deterministic export.
- **Why?** `OfflineAudioContext` mixes multiple audio and video tracks, clip trim offsets, playback speeds, track volumes, mute/solo states, and fade-in/fade-out envelopes faster than real-time with sample-accurate precision.

### Final Rendering & Export Pipeline
- **Decision:** Multi-backend export engine (`src/engine/exportEngine.ts`) with runtime capability probing (`probeExportCapabilities()`):
  1. **WebCodecs (`VideoEncoder` + `AudioEncoder`) + `mp4-muxer` / `webm-muxer`:** Primary deterministic frame-by-frame renderer. Steps the timeline frame-by-frame (`t = frameIndex / fps`), seeks active media clips, composites onto an offscreen/export canvas, encodes `VideoFrame`s at exact timestamps, renders mixed audio via `OfflineAudioContext`, encodes `AudioData` chunks, and muxes into a compliant `.mp4` (H.264/AVC + AAC/Opus) or `.webm` (VP9/VP8/AV1 + Opus) container.
  2. **`MediaRecorder` + `canvas.captureStream()` + `AudioContext.createMediaStreamDestination()`:** Automatic fallback for browsers where WebCodecs is disabled or a specific container/codec combination is only supported via `MediaRecorder`.
  3. **Lossless WAV (RIFF PCM) Encoder:** Built-in pure TypeScript encoder for audio-only exports and environments without compressed audio encoders.
- **Why not FFmpeg.wasm as the primary renderer?** `FFmpeg.wasm` requires `SharedArrayBuffer` (COOP/COEP headers that can break third-party embeds), downloads ~30 MB of WASM on startup, copies full raw frames across WASM linear memory, and runs software encoding 5–20x slower than hardware-accelerated `WebCodecs`. Our WebCodecs + Muxer pipeline starts instantly, uses hardware encoding where available, and has zero memory cap on output file size when paired with chunked buffers.

### Memory Management & Persistence
- **Decision:** Keep original imported `File` / `Blob` objects untouched (zero transcoding on import). Store project metadata and optional media blobs in **IndexedDB** (`src/storage/projectStorage.ts`) alongside portable `.amapa.json` project file export/import.
- **Missing Media & Relinking:** Each media asset records a fingerprint (`name`, `size`, `type`, `duration`). When a project JSON is opened on another machine or after browser storage is cleared, AMAPA marks the asset as `missing` and lets the user relink the file with one click while preserving all timeline clips, trims, transforms, and effects.
