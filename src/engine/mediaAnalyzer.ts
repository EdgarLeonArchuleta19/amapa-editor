import { MediaAsset, MediaKind } from '../types/project';
import { encodePCMToWavBlob } from './exportEngine';
import { generateId } from './timelineEngine';

const SUPPORTED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
]);

const SUPPORTED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/mp4',
  'audio/flac',
]);

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function detectMediaKind(file: { name: string; type: string }): MediaKind | null {
  const mime = (file.type || '').toLowerCase();
  if (SUPPORTED_VIDEO_MIMES.has(mime)) return 'video';
  if (SUPPORTED_AUDIO_MIMES.has(mime)) return 'audio';
  if (SUPPORTED_IMAGE_MIMES.has(mime)) return 'image';

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'webm', 'mov', 'ogv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'image';

  return null;
}

export function validateMediaFile(file: File): {
  valid: boolean;
  kind?: MediaKind;
  error?: string;
} {
  if (!file || file.size <= 0) {
    return {
      valid: false,
      error: `File "${file?.name || 'unknown'}" is empty (0 bytes) or unreadable.`,
    };
  }
  const kind = detectMediaKind(file);
  if (!kind) {
    return {
      valid: false,
      error: `Unsupported file format for "${file.name}". Supported formats: MP4, WebM, MOV, MP3, WAV, OGG, AAC, PNG, JPG, WebP, GIF.`,
    };
  }
  return { valid: true, kind };
}

export async function extractAudioWaveformPeaks(
  file: Blob,
  numBuckets = 48
): Promise<number[]> {
  const AudioCtx =
    globalThis.AudioContext ||
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (AudioCtx) {
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioCtx();
      const ab = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      const rawData = audioBuffer.getChannelData(0);
      const blockSize = Math.max(1, Math.floor(rawData.length / numBuckets));
      const peaks: number[] = [];
      for (let i = 0; i < numBuckets; i++) {
        let sum = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize && start + j < rawData.length; j++) {
          const val = Math.abs(rawData[start + j]);
          if (val > sum) sum = val;
        }
        peaks.push(Number(Math.min(1, Math.max(0.06, sum)).toFixed(3)));
      }
      return peaks;
    } catch {
      // Fallback below if video has no audio or browser cannot decode in current context
    } finally {
      if (ctx && typeof ctx.close === 'function') {
        await ctx.close().catch(() => {});
      }
    }
  }

  // Deterministic fallback waveform visualization derived from file bytes
  const fallback: number[] = [];
  let bytes = new Uint8Array(0);
  try {
    const sliceBlob = file.slice(0, 512);
    if (typeof sliceBlob.arrayBuffer === 'function') {
      bytes = new Uint8Array(await sliceBlob.arrayBuffer());
    }
  } catch {
    // Ignore slice read error in test environments
  }
  for (let i = 0; i < numBuckets; i++) {
    const b = bytes.length > 0 ? bytes[i % bytes.length] : (i * 37) % 255;
    const normalized = 0.15 + (b / 255) * 0.75;
    fallback.push(Number(normalized.toFixed(3)));
  }
  return fallback;
}

export async function analyzeMediaFile(
  file: File,
  folder = 'All Media'
): Promise<MediaAsset> {
  const validation = validateMediaFile(file);
  if (!validation.valid || !validation.kind) {
    throw new Error(validation.error || 'Unsupported media file.');
  }

  const kind = validation.kind;
  const objectUrl = URL.createObjectURL(file);
  const now = new Date().toISOString();

  if (kind === 'video') {
    const meta = await probeVideoMetadataAndThumbnail(objectUrl);
    const waveformPeaks = await extractAudioWaveformPeaks(file, 48);
    return {
      id: generateId('media'),
      name: file.name,
      kind: 'video',
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      folder,
      status: 'session',
      thumbnailDataUrl: meta.thumbnailDataUrl,
      waveformPeaks,
      objectUrl,
      createdAt: now,
    };
  }

  if (kind === 'audio') {
    const duration = await probeAudioDuration(objectUrl, file);
    const waveformPeaks = await extractAudioWaveformPeaks(file, 64);
    return {
      id: generateId('media'),
      name: file.name,
      kind: 'audio',
      mimeType: file.type || 'audio/wav',
      fileSize: file.size,
      duration,
      width: 0,
      height: 0,
      folder,
      status: 'session',
      waveformPeaks,
      objectUrl,
      createdAt: now,
    };
  }

  // Image
  const imgMeta = await probeImageMetadata(objectUrl);
  return {
    id: generateId('media'),
    name: file.name,
    kind: 'image',
    mimeType: file.type || 'image/png',
    fileSize: file.size,
    duration: 5,
    width: imgMeta.width,
    height: imgMeta.height,
    folder,
    status: 'session',
    thumbnailDataUrl: imgMeta.thumbnailDataUrl,
    objectUrl,
    createdAt: now,
  };
}

async function probeVideoMetadataAndThumbnail(objectUrl: string): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}> {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 800);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    video.src = objectUrl;
  });

  const duration =
    Number.isFinite(video.duration) && video.duration > 0
      ? Number(video.duration.toFixed(3))
      : 5;
  const width = video.videoWidth || 1920;
  const height = video.videoHeight || 1080;

  let thumbnailDataUrl: string | undefined;
  try {
    const seekPoint = Math.min(1, duration * 0.2);
    video.currentTime = seekPoint;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 400);
      video.onseeked = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 160;
    thumbCanvas.height = 90;
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 160, 90);
      ctx.drawImage(video, 0, 0, 160, 90);
      thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
    }
  } catch {
    // Ignore thumbnail generation failure in headless environments
  } finally {
    video.removeAttribute('src');
    video.load();
  }

  return { duration, width, height, thumbnailDataUrl };
}

async function probeAudioDuration(objectUrl: string, file: Blob): Promise<number> {
  const audio = document.createElement('audio');
  audio.preload = 'metadata';

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 600);
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve();
    };
    audio.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    audio.src = objectUrl;
  });

  const mediaDuration = audio.duration;
  audio.removeAttribute('src');
  audio.load();

  if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
    return Number(mediaDuration.toFixed(3));
  }

  // Fallback for WAV PCM header inspection
  try {
    const slice = file.slice(0, 44);
    if (file.size >= 44 && typeof slice.arrayBuffer === 'function') {
      const header = new DataView(await slice.arrayBuffer());
      const byteRate = header.getUint32(28, true);
      const dataSize = header.getUint32(40, true);
      if (byteRate > 0 && dataSize > 0) {
        return Number((dataSize / byteRate).toFixed(3));
      }
    }
  } catch {
    // Ignore header parse error
  }
  return 4;
}

async function probeImageMetadata(objectUrl: string): Promise<{
  width: number;
  height: number;
  thumbnailDataUrl?: string;
}> {
  const img = new Image();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 500);
    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    img.src = objectUrl;
  });

  const width = img.naturalWidth || 1280;
  const height = img.naturalHeight || 720;
  let thumbnailDataUrl: string | undefined;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 160, 90);
      ctx.drawImage(img, 0, 0, 160, 90);
      thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    }
  } catch {
    // Ignore in headless environments
  }

  return { width, height, thumbnailDataUrl };
}

/**
 * Generates synthetic playable WAV audio & SVG/PNG graphic files in-browser
 * so beginners can immediately test multitrack editing & export without external files.
 */
export function createSynthesizedAudioFile(
  name = 'ambient-chime.wav',
  durationSec = 4
): File {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.15) * Math.max(0, 1 - t / durationSec);
    // Warm C-major triad chord (C4, E4, G4)
    const wave =
      Math.sin(2 * Math.PI * 261.63 * t) * 0.35 +
      Math.sin(2 * Math.PI * 329.63 * t) * 0.25 +
      Math.sin(2 * Math.PI * 392.0 * t) * 0.2;
    left[i] = wave * env;
    right[i] = wave * env * 0.95;
  }

  const wavBlob = encodePCMToWavBlob([left, right], sampleRate);
  return new File([wavBlob], name, { type: 'audio/wav' });
}

export function createSynthesizedGraphicFile(name = 'amapa-scene-card.svg'): File {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#bg)"/>
    <circle cx="1520" cy="280" r="210" fill="#38bdf8" fill-opacity="0.18"/>
    <circle cx="400" cy="820" r="280" fill="#818cf8" fill-opacity="0.15"/>
    <rect x="140" y="140" width="1640" height="800" rx="28" fill="none" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="4"/>
  </svg>`;
  return new File([svg], name, { type: 'image/svg+xml' });
}
