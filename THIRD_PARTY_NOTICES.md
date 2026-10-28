# Third-Party Notices and License Audit

AMAPA is licensed under the **MIT License**. Every runtime dependency bundled with AMAPA has been audited for open-source license compatibility and free redistribution rights.

## Runtime Dependencies

| Package | License | Purpose |
| :--- | :--- | :--- |
| `react` | MIT | Declarative UI rendering |
| `react-dom` | MIT | DOM bindings for React |
| `lucide-react` | ISC | Accessible vector icons |
| `mp4-muxer` | MIT | Pure TypeScript ISO BMFF / MP4 container muxer for WebCodecs |
| `webm-muxer` | MIT | Pure TypeScript Matroska / WebM container muxer for WebCodecs |

## Codec & Browser Media Processing Notice

AMAPA performs video and audio decoding, compositing, and encoding using standards-compliant Web APIs built into the user's browser:
- **HTMLMediaElement / Canvas 2D / OffscreenCanvas**
- **Web Audio API / OfflineAudioContext**
- **WebCodecs API (`VideoEncoder`, `AudioEncoder`, `VideoFrame`, `AudioData`)** coupled with `mp4-muxer` and `webm-muxer` (MIT)
- **MediaStream Recording API (`MediaRecorder`)** fallback
- **Pure TypeScript WAV (RIFF PCM) encoder** for lossless audio exports

AMAPA does **not** bundle proprietary codec binaries or GPL-only non-redistributable encoders. Hardware and software codec implementations (such as H.264/AVC, VP8, VP9, AV1, AAC, and Opus) are provided by the host browser environment (`navigator.mediaCapabilities` / `VideoEncoder.isConfigSupported` / `MediaRecorder.isTypeSupported`).
