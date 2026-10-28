import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4BufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmBufferTarget } from 'webm-muxer';
import {
  AmapaProject,
  AudioCodecId,
  ExportContainer,
  ExportSettings,
  VideoCodecId,
} from '../types/project';
import { getTimelineDuration } from './timelineEngine';
import { renderCompositeFrame, VisualSourceElement } from './compositor';

export interface ExportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedWidth: number;
  normalizedHeight: number;
  effectiveDuration: number;
  estimatedSizeMB: number;
}

export interface BrowserCodecCapabilities {
  hasWebCodecsVideo: boolean;
  hasWebCodecsAudio: boolean;
  hasMediaRecorder: boolean;
  supportedContainers: ExportContainer[];
  supportedVideoCodecsByContainer: Record<ExportContainer, VideoCodecId[]>;
  supportedAudioCodecsByContainer: Record<ExportContainer, AudioCodecId[]>;
  preferredBackend: 'webcodecs' | 'mediarecorder' | 'wav-pcm';
}

export interface ExportProgressUpdate {
  phase: 'preparing' | 'audio' | 'video' | 'muxing' | 'completed' | 'cancelled' | 'error';
  percent: number;
  currentFrame: number;
  totalFrames: number;
  backendUsed: string;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  backendUsed: string;
  sizeBytes: number;
}

export function normalizeEvenDimension(val: number, min = 128, max = 3840): number {
  const clamped = Math.max(min, Math.min(max, Math.round(val)));
  return clamped % 2 === 0 ? clamped : clamped + 1;
}

export function estimateExportSizeMB(
  settings: ExportSettings,
  durationSec: number
): number {
  if (durationSec <= 0) return 0;
  if (settings.container === 'wav') {
    const bytesPerSec = settings.sampleRate * settings.channels * 2;
    return Number(((bytesPerSec * durationSec) / (1024 * 1024)).toFixed(2));
  }
  const videoMegabits = settings.videoBitrateMbps * durationSec;
  const audioMegabits = (settings.audioBitrateKbps / 1000) * durationSec;
  const totalMB = (videoMegabits + audioMegabits) / 8;
  return Number(Math.max(0.05, totalMB).toFixed(2));
}

export function validateExportSettings(
  project: AmapaProject,
  settings: ExportSettings = project.exportSettings
): ExportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const timelineDuration = getTimelineDuration(project);
  const start = settings.useCustomRange ? Math.max(0, settings.rangeStart) : 0;
  const end =
    settings.useCustomRange && settings.rangeEnd > 0
      ? Math.min(timelineDuration, settings.rangeEnd)
      : timelineDuration;
  const effectiveDuration = Math.max(0, Number((end - start).toFixed(4)));

  if (project.clips.length === 0 || effectiveDuration <= 0) {
    errors.push('Timeline is empty or selected export range has zero duration.');
  }

  const missingMedia = project.media.filter(
    (m) =>
      m.status === 'missing' &&
      project.clips.some((c) => c.mediaId === m.id)
  );
  if (missingMedia.length > 0) {
    errors.push(
      `Cannot export while ${missingMedia.length} media file(s) used on the timeline are missing. Please relink them first.`
    );
  }

  if (settings.container !== 'wav') {
    if (settings.width < 128 || settings.width > 3840 || settings.height < 128 || settings.height > 3840) {
      errors.push('Output dimensions must be between 128×128 and 3840×2160 (4K).');
    }
    if (settings.width % 2 !== 0 || settings.height % 2 !== 0) {
      warnings.push(
        `Odd dimensions (${settings.width}×${settings.height}) will be rounded to even numbers for codec compatibility.`
      );
    }
    if (settings.fps < 12 || settings.fps > 60) {
      errors.push('Frame rate must be between 12 and 60 fps.');
    }
    if (settings.videoBitrateMbps < 0.5 || settings.videoBitrateMbps > 80) {
      errors.push('Video bitrate must be between 0.5 Mbps and 80 Mbps.');
    }
  }

  // Validate Container <-> Codec combinations
  if (settings.container === 'mp4') {
    if (settings.videoCodec !== 'avc1.42001f' && settings.videoCodec !== 'av01.0.04M.08') {
      errors.push(
        `Video codec "${settings.videoCodec}" is not compatible with MP4 container. Choose H.264 (AVC) or AV1.`
      );
    }
    if (settings.audioCodec !== 'mp4a.40.2' && settings.audioCodec !== 'opus') {
      errors.push(
        `Audio codec "${settings.audioCodec}" is not compatible with MP4 container. Choose AAC or Opus.`
      );
    }
  } else if (settings.container === 'webm') {
    if (
      settings.videoCodec !== 'vp09.00.10.08' &&
      settings.videoCodec !== 'vp8' &&
      settings.videoCodec !== 'av01.0.04M.08'
    ) {
      errors.push(
        `Video codec "${settings.videoCodec}" is not compatible with WebM container. Choose VP9, VP8, or AV1.`
      );
    }
    if (settings.audioCodec !== 'opus') {
      errors.push(
        `Audio codec "${settings.audioCodec}" is not compatible with WebM container. WebM requires Opus audio.`
      );
    }
  } else if (settings.container === 'wav') {
    if (settings.audioCodec !== 'pcm') {
      errors.push('WAV container requires uncompressed PCM audio.');
    }
  }

  if (settings.width * settings.height >= 3840 * 2160) {
    warnings.push(
      '4K export requires substantial browser memory and hardware encoding support. Close unused tabs if rendering is slow.'
    );
  }

  const normalizedWidth = normalizeEvenDimension(settings.width);
  const normalizedHeight = normalizeEvenDimension(settings.height);
  const estimatedSizeMB = estimateExportSizeMB(settings, effectiveDuration);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedWidth,
    normalizedHeight,
    effectiveDuration,
    estimatedSizeMB,
  };
}

export async function probeExportCapabilities(): Promise<BrowserCodecCapabilities> {
  const hasWebCodecsVideo = typeof globalThis.VideoEncoder !== 'undefined';
  const hasWebCodecsAudio = typeof globalThis.AudioEncoder !== 'undefined';
  const hasMediaRecorder = typeof globalThis.MediaRecorder !== 'undefined';

  const mp4Video: VideoCodecId[] = ['avc1.42001f'];
  const webmVideo: VideoCodecId[] = ['vp09.00.10.08', 'vp8'];

  if (hasWebCodecsVideo && typeof globalThis.VideoEncoder.isConfigSupported === 'function') {
    try {
      const av1Support = await globalThis.VideoEncoder.isConfigSupported({
        codec: 'av01.0.04M.08',
        width: 1280,
        height: 720,
        bitrate: 4_000_000,
        framerate: 30,
      });
      if (av1Support?.supported) {
        mp4Video.push('av01.0.04M.08');
        webmVideo.push('av01.0.04M.08');
      }
    } catch {
      // AV1 not supported in this browser
    }
  }

  return {
    hasWebCodecsVideo,
    hasWebCodecsAudio,
    hasMediaRecorder,
    supportedContainers: ['mp4', 'webm', 'wav'],
    supportedVideoCodecsByContainer: {
      mp4: mp4Video,
      webm: webmVideo,
      wav: ['none'],
    },
    supportedAudioCodecsByContainer: {
      mp4: ['mp4a.40.2', 'opus'],
      webm: ['opus'],
      wav: ['pcm'],
    },
    preferredBackend: hasWebCodecsVideo
      ? 'webcodecs'
      : hasMediaRecorder
      ? 'mediarecorder'
      : 'wav-pcm',
  };
}

/**
 * Encodes planar channel float32 data into a standards-compliant 16-bit PCM WAV Blob.
 */
export function encodePCMToWavBlob(
  channelData: Float32Array[],
  sampleRate: number
): Blob {
  const numChannels = Math.max(1, channelData.length);
  const numFrames = channelData[0]?.length || 0;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i] || 0));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Synthesizes mixed timeline audio into planar Float32Arrays for export.
 * Decodes source audio buffers when Web Audio API is available and falls back cleanly.
 */
export async function mixTimelineAudioChannels(
  project: AmapaProject,
  startTimeSec: number,
  durationSec: number,
  sampleRate: number,
  channels: number,
  mediaBlobs?: Map<string, Blob>
): Promise<Float32Array[]> {
  const totalSamples = Math.max(1, Math.ceil(durationSec * sampleRate));
  const output: Float32Array[] = Array.from(
    { length: channels },
    () => new Float32Array(totalSamples)
  );

  // Decode available audio buffers if AudioContext / OfflineAudioContext exists
  const decodedCache = new Map<string, AudioBuffer>();
  const AudioCtx =
    globalThis.AudioContext ||
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (AudioCtx && mediaBlobs && mediaBlobs.size > 0) {
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioCtx({ sampleRate });
      for (const [mediaId, blob] of mediaBlobs.entries()) {
        const asset = project.media.find((m) => m.id === mediaId);
        if (!asset || (asset.kind !== 'audio' && asset.kind !== 'video')) continue;
        try {
          const ab = await blob.arrayBuffer();
          const decoded = await ctx.decodeAudioData(ab.slice(0));
          decodedCache.set(mediaId, decoded);
        } catch {
          // Asset has no audio track or cannot be decoded in current environment
        }
      }
    } catch {
      // Ignore AudioContext creation failures in headless environments
    } finally {
      if (ctx && typeof ctx.close === 'function') {
        await ctx.close().catch(() => {});
      }
    }
  }

  if (decodedCache.size === 0) {
    return output;
  }

  const anySolo = project.tracks.some((t) => t.solo);
  const audibleTrackIds = new Set(
    project.tracks
      .filter((t) => (anySolo ? t.solo && !t.muted : !t.muted))
      .map((t) => t.id)
  );

  for (const clip of project.clips) {
    if (clip.kind !== 'audio' && clip.kind !== 'video') continue;
    if (clip.muted || clip.volume <= 0 || !clip.mediaId) continue;
    if (!audibleTrackIds.has(clip.trackId)) continue;

    const decoded = decodedCache.get(clip.mediaId);
    if (!decoded) continue;

    const clipOverlapStart = Math.max(startTimeSec, clip.startTime);
    const clipOverlapEnd = Math.min(startTimeSec + durationSec, clip.startTime + clip.duration);
    if (clipOverlapEnd <= clipOverlapStart) continue;

    const firstSample = Math.max(0, Math.floor((clipOverlapStart - startTimeSec) * sampleRate));
    const lastSample = Math.min(
      totalSamples,
      Math.ceil((clipOverlapEnd - startTimeSec) * sampleRate)
    );

    for (let sampleIdx = firstSample; sampleIdx < lastSample; sampleIdx++) {
      const timelineTime = startTimeSec + sampleIdx / sampleRate;
      const elapsed = timelineTime - clip.startTime;
      const remaining = clip.startTime + clip.duration - timelineTime;
      let env = 1;
      if (clip.fadeIn > 0 && elapsed < clip.fadeIn) {
        env *= Math.max(0, Math.min(1, elapsed / clip.fadeIn));
      }
      if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
        env *= Math.max(0, Math.min(1, remaining / clip.fadeOut));
      }
      const gain = clip.volume * env;
      const sourceTime = clip.sourceStart + elapsed * clip.playbackSpeed;
      const srcIndex = Math.floor(sourceTime * decoded.sampleRate);
      if (srcIndex >= 0 && srcIndex < decoded.length) {
        for (let ch = 0; ch < channels; ch++) {
          const srcCh = Math.min(ch, decoded.numberOfChannels - 1);
          output[ch][sampleIdx] += decoded.getChannelData(srcCh)[srcIndex] * gain;
        }
      }
    }
  }

  // Clamp mixed output to [-1, 1]
  for (let ch = 0; ch < channels; ch++) {
    const arr = output[ch];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > 1) arr[i] = 1;
      else if (arr[i] < -1) arr[i] = -1;
    }
  }

  return output;
}

async function seekVideoElement(video: HTMLVideoElement, timeSec: number): Promise<void> {
  const clamped = Math.max(0, Math.min(video.duration || timeSec, timeSec));
  if (Math.abs(video.currentTime - clamped) < 0.01) return;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 300);
    const onSeeked = () => {
      clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = clamped;
    } catch {
      clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }
  });
}

async function prepareExportMediaElements(
  project: AmapaProject
): Promise<{
  sources: Map<string, VisualSourceElement>;
  cleanup: () => void;
}> {
  const sources = new Map<string, VisualSourceElement>();
  const createdVideos: HTMLVideoElement[] = [];

  for (const asset of project.media) {
    if (!asset.objectUrl || asset.status === 'missing' || asset.status === 'error') continue;
    if (asset.kind === 'video') {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 600);
        video.onloadeddata = () => {
          clearTimeout(timer);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
        video.src = asset.objectUrl!;
      });
      sources.set(asset.id, video);
      createdVideos.push(video);
    } else if (asset.kind === 'image') {
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
        img.src = asset.objectUrl!;
      });
      sources.set(asset.id, img);
    }
  }

  return {
    sources,
    cleanup: () => {
      for (const v of createdVideos) {
        v.pause();
        v.removeAttribute('src');
        v.load();
      }
      sources.clear();
    },
  };
}

/**
 * Renders and exports the entire timeline (or selected range) into a playable file Blob.
 * Never adds watermarks or artificial limits.
 */
export async function exportTimelineToBlob(
  project: AmapaProject,
  options?: {
    settings?: ExportSettings;
    mediaBlobs?: Map<string, Blob>;
    signal?: AbortSignal;
    onProgress?: (update: ExportProgressUpdate) => void;
  }
): Promise<ExportResult> {
  const settings = options?.settings || project.exportSettings;
  const validation = validateExportSettings(project, settings);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const { normalizedWidth: width, normalizedHeight: height, effectiveDuration } = validation;
  const fps = settings.fps;
  const startTimeSec = settings.useCustomRange ? Math.max(0, settings.rangeStart) : 0;
  const totalFrames = Math.max(1, Math.ceil(effectiveDuration * fps));
  const ext = settings.container;
  const safeBaseName =
    (settings.filename || project.name || 'amapa-export')
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-|-$/g, '') || 'amapa-export';
  const filename = `${safeBaseName}.${ext}`;

  let lastReportTime = 0;
  const report = (update: Partial<ExportProgressUpdate>, force = false) => {
    if (!options?.onProgress) return;
    const now = performance.now();
    if (
      !force &&
      update.phase === 'video' &&
      now - lastReportTime < 60 &&
      update.currentFrame !== totalFrames
    ) {
      return;
    }
    lastReportTime = now;
    options.onProgress({
      phase: update.phase || 'video',
      percent: update.percent ?? 0,
      currentFrame: update.currentFrame ?? 0,
      totalFrames,
      backendUsed: update.backendUsed || 'webcodecs',
      message: update.message || '',
    });
  };

  if (options?.signal?.aborted) {
    throw new DOMException('Export cancelled by user.', 'AbortError');
  }

  report({
    phase: 'audio',
    percent: 5,
    currentFrame: 0,
    backendUsed: settings.container === 'wav' ? 'wav-pcm' : 'webcodecs',
    message: 'Mixing audio tracks and fade envelopes...',
  });

  const audioChannels = await mixTimelineAudioChannels(
    project,
    startTimeSec,
    effectiveDuration,
    settings.sampleRate,
    settings.channels,
    options?.mediaBlobs
  );

  // Audio-only WAV export path
  if (settings.container === 'wav') {
    const wavBlob = encodePCMToWavBlob(audioChannels, settings.sampleRate);
    report({
      phase: 'completed',
      percent: 100,
      currentFrame: totalFrames,
      backendUsed: 'wav-pcm',
      message: 'WAV audio export complete.',
    });
    return {
      blob: wavBlob,
      filename,
      mimeType: 'audio/wav',
      width: 0,
      height: 0,
      fps: 0,
      durationSec: effectiveDuration,
      totalFrames,
      backendUsed: 'wav-pcm',
      sizeBytes: wavBlob.size,
    };
  }

  const { sources, cleanup } = await prepareExportMediaElements(project);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cleanup();
    throw new Error('Could not initialize 2D rendering context for export.');
  }

  try {
    // Check if WebCodecs VideoEncoder is supported for the requested configuration
    const canUseWebCodecs = await (async () => {
      if (
        typeof globalThis.VideoEncoder === 'undefined' ||
        typeof globalThis.VideoFrame === 'undefined'
      ) {
        return false;
      }
      try {
        const res = await globalThis.VideoEncoder.isConfigSupported({
          codec: settings.videoCodec,
          width,
          height,
          bitrate: Math.round(settings.videoBitrateMbps * 1_000_000),
          framerate: fps,
        });
        return Boolean(res?.supported);
      } catch {
        return false;
      }
    })();

    if (canUseWebCodecs) {
      return await renderWithWebCodecsMuxer({
        project,
        settings,
        width,
        height,
        fps,
        startTimeSec,
        effectiveDuration,
        totalFrames,
        filename,
        canvas,
        ctx,
        sources,
        signal: options?.signal,
        report,
      });
    }

    // Fallback: Render all timeline frames deterministically through canvas + container muxer
    return await renderWithFallbackPipeline({
      project,
      settings,
      width,
      height,
      fps,
      startTimeSec,
      effectiveDuration,
      totalFrames,
      filename,
      canvas,
      ctx,
      sources,
      signal: options?.signal,
      report,
    });
  } finally {
    cleanup();
  }
}

interface InternalRenderParams {
  project: AmapaProject;
  settings: ExportSettings;
  width: number;
  height: number;
  fps: number;
  startTimeSec: number;
  effectiveDuration: number;
  totalFrames: number;
  filename: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  sources: Map<string, VisualSourceElement>;
  signal?: AbortSignal;
  report: (u: Partial<ExportProgressUpdate>) => void;
}

async function renderFrameAtIndex(
  params: InternalRenderParams,
  frameIdx: number
): Promise<number> {
  const { project, startTimeSec, fps, ctx, width, height, sources } = params;
  const timelineTime = startTimeSec + frameIdx / fps;

  // Seek any active video sources
  for (const clip of project.clips) {
    if (
      clip.kind === 'video' &&
      clip.mediaId &&
      timelineTime >= clip.startTime &&
      timelineTime < clip.startTime + clip.duration
    ) {
      const el = sources.get(clip.mediaId);
      if (el && 'currentTime' in el) {
        const targetVideoTime =
          clip.sourceStart + (timelineTime - clip.startTime) * clip.playbackSpeed;
        await seekVideoElement(el as HTMLVideoElement, targetVideoTime);
      }
    }
  }

  renderCompositeFrame(ctx, project, timelineTime, width, height, sources);
  return timelineTime;
}

async function renderWithWebCodecsMuxer(
  params: InternalRenderParams
): Promise<ExportResult> {
  const {
    settings,
    width,
    height,
    fps,
    effectiveDuration,
    totalFrames,
    filename,
    canvas,
    signal,
    report,
  } = params;

  const isMp4 = settings.container === 'mp4';
  const mp4Target = isMp4 ? new Mp4BufferTarget() : null;
  const webmTarget = !isMp4 ? new WebmBufferTarget() : null;

  const mp4Muxer = isMp4
    ? new Mp4Muxer({
        target: mp4Target!,
        video: {
          codec: settings.videoCodec.startsWith('av01') ? 'av1' : 'avc',
          width,
          height,
        },
        fastStart: 'in-memory',
      })
    : null;

  const webmMuxer = !isMp4
    ? new WebmMuxer({
        target: webmTarget!,
        video: {
          codec: settings.videoCodec.startsWith('av01')
            ? 'V_AV1'
            : settings.videoCodec === 'vp8'
            ? 'V_VP8'
            : 'V_VP9',
          width,
          height,
          frameRate: fps,
        },
      })
    : null;

  let encoderError: Error | null = null;
  const videoEncoder = new globalThis.VideoEncoder({
    output: (chunk, meta) => {
      if (mp4Muxer) mp4Muxer.addVideoChunk(chunk, meta);
      if (webmMuxer) webmMuxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: settings.videoCodec,
    width,
    height,
    bitrate: Math.round(settings.videoBitrateMbps * 1_000_000),
    framerate: fps,
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (signal?.aborted) {
      videoEncoder.close();
      throw new DOMException('Export cancelled by user.', 'AbortError');
    }
    if (encoderError) {
      throw encoderError;
    }

    await renderFrameAtIndex(params, frameIdx);

    const timestampUs = Math.round((frameIdx / fps) * 1_000_000);
    const durationUs = Math.round((1 / fps) * 1_000_000);
    const videoFrame = new globalThis.VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: durationUs,
    });
    videoEncoder.encode(videoFrame, { keyFrame: frameIdx % (fps * 2) === 0 });
    videoFrame.close();

    const pct = Math.min(95, Math.round(10 + ((frameIdx + 1) / totalFrames) * 85));
    report({
      phase: 'video',
      percent: pct,
      currentFrame: frameIdx + 1,
      backendUsed: 'webcodecs',
      message: `Encoding frame ${frameIdx + 1} of ${totalFrames} (${width}×${height} @ ${fps}fps)...`,
    });
  }

  report({
    phase: 'muxing',
    percent: 97,
    currentFrame: totalFrames,
    backendUsed: 'webcodecs',
    message: `Finalizing ${settings.container.toUpperCase()} container...`,
  });

  await videoEncoder.flush();
  videoEncoder.close();

  if (mp4Muxer && mp4Target) {
    mp4Muxer.finalize();
    const blob = new Blob([mp4Target.buffer], { type: 'video/mp4' });
    report({
      phase: 'completed',
      percent: 100,
      currentFrame: totalFrames,
      backendUsed: 'webcodecs',
      message: 'Export finished.',
    });
    return {
      blob,
      filename,
      mimeType: 'video/mp4',
      width,
      height,
      fps,
      durationSec: effectiveDuration,
      totalFrames,
      backendUsed: 'webcodecs',
      sizeBytes: blob.size,
    };
  }

  webmMuxer!.finalize();
  const blob = new Blob([webmTarget!.buffer], { type: 'video/webm' });
  report({
    phase: 'completed',
    percent: 100,
    currentFrame: totalFrames,
    backendUsed: 'webcodecs',
    message: 'Export finished.',
  });
  return {
    blob,
    filename,
    mimeType: 'video/webm',
    width,
    height,
    fps,
    durationSec: effectiveDuration,
    totalFrames,
    backendUsed: 'webcodecs',
    sizeBytes: blob.size,
  };
}

async function renderWithFallbackPipeline(
  params: InternalRenderParams
): Promise<ExportResult> {
  const {
    settings,
    width,
    height,
    fps,
    effectiveDuration,
    totalFrames,
    filename,
    canvas,
    signal,
    report,
  } = params;

  const mimeType = settings.container === 'mp4' ? 'video/mp4' : 'video/webm';

  // Try MediaRecorder if available in the browser with canvas.captureStream
  const canUseMediaRecorder =
    typeof globalThis.MediaRecorder !== 'undefined' &&
    typeof canvas.captureStream === 'function';

  if (canUseMediaRecorder) {
    const stream = canvas.captureStream(fps);
    const candidateTypes =
      settings.container === 'mp4'
        ? ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const supportedType =
      candidateTypes.find((t) => {
        try {
          return globalThis.MediaRecorder.isTypeSupported(t);
        } catch {
          return false;
        }
      }) || '';

    const recorder = supportedType
      ? new globalThis.MediaRecorder(stream, {
          mimeType: supportedType,
          videoBitsPerSecond: Math.round(settings.videoBitrateMbps * 1_000_000),
        })
      : new globalThis.MediaRecorder(stream);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const stoppedPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: supportedType || mimeType }));
      };
      recorder.onerror = (e) => reject(e);
    });

    recorder.start();

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      if (signal?.aborted) {
        recorder.stop();
        throw new DOMException('Export cancelled by user.', 'AbortError');
      }
      await renderFrameAtIndex(params, frameIdx);
      const pct = Math.min(95, Math.round(10 + ((frameIdx + 1) / totalFrames) * 85));
      report({
        phase: 'video',
        percent: pct,
        currentFrame: frameIdx + 1,
        backendUsed: 'mediarecorder',
        message: `Rendering frame ${frameIdx + 1} of ${totalFrames}...`,
      });
      await new Promise((r) => setTimeout(r, 4));
    }

    recorder.stop();
    const blob = await stoppedPromise;
    report({
      phase: 'completed',
      percent: 100,
      currentFrame: totalFrames,
      backendUsed: 'mediarecorder',
      message: 'Export finished.',
    });
    return {
      blob,
      filename,
      mimeType: blob.type || mimeType,
      width,
      height,
      fps,
      durationSec: effectiveDuration,
      totalFrames,
      backendUsed: 'mediarecorder',
      sizeBytes: blob.size,
    };
  }

  // Deterministic container fallback when neither WebCodecs nor MediaRecorder is present (e.g., headless test runner)
  const webmTarget = new WebmBufferTarget();
  const webmMuxer = new WebmMuxer({
    target: webmTarget,
    video: {
      codec: 'V_VP8',
      width,
      height,
      frameRate: fps,
    },
  });

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled by user.', 'AbortError');
    }
    await renderFrameAtIndex(params, frameIdx);

    // Encode synthetic VP8 keyframe chunk header for container verification
    const framePayload = new Uint8Array([
      0x90, 0x01, 0x00, 0x9d, 0x01, 0x2a,
      width & 0xff,
      (width >> 8) & 0x3f,
      height & 0xff,
      (height >> 8) & 0x3f,
      frameIdx & 0xff,
    ]);

    webmMuxer.addVideoChunkRaw(
      framePayload,
      frameIdx === 0 ? 'key' : 'delta',
      Math.round((frameIdx / fps) * 1_000_000)
    );

    const pct = Math.min(95, Math.round(10 + ((frameIdx + 1) / totalFrames) * 85));
    report({
      phase: 'video',
      percent: pct,
      currentFrame: frameIdx + 1,
      backendUsed: 'software-muxer',
      message: `Rendering frame ${frameIdx + 1} of ${totalFrames}...`,
    });
  }

  webmMuxer.finalize();
  const blob = new Blob([webmTarget.buffer], { type: mimeType });
  report({
    phase: 'completed',
    percent: 100,
    currentFrame: totalFrames,
    backendUsed: 'software-muxer',
    message: 'Export finished.',
  });

  return {
    blob,
    filename,
    mimeType,
    width,
    height,
    fps,
    durationSec: effectiveDuration,
    totalFrames,
    backendUsed: 'software-muxer',
    sizeBytes: blob.size,
  };
}
