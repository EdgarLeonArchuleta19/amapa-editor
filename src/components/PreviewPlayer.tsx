import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AmapaProject } from '../types/project';
import {
  formatTimecode,
  getActiveAudioClipsAtTime,
  getTimelineDuration,
} from '../engine/timelineEngine';
import { renderCompositeFrame, VisualSourceElement } from '../engine/compositor';
import { playheadBus } from '../engine/playheadBus';
import { rustRevealInExplorer, rustSaveExportedFile } from '../engine/tauriBridge';
import { Locale, translate } from '../i18n/translations';
import { CustomScrubber } from './CustomScrubber';
import {
  AlertTriangle,
  Camera,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface PreviewPlayerProps {
  project: AmapaProject;
  playheadTime: number;
  isPlaying: boolean;
  locale: Locale;
  onSeek: (timeSec: number) => void;
  onTogglePlay: () => void;
  onStopPlayback: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  project,
  playheadTime,
  isPlaying,
  locale,
  onSeek,
  onTogglePlay,
  onStopPlayback,
}) => {
  const t = (key: string) => translate(locale, key);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timecodeStrongRef = useRef<HTMLElement | null>(null);

  // Per-clip media element pools so split clips, PiP clips, and detached audio clips never conflict
  const visualPoolRef = useRef<Map<string, VisualSourceElement>>(new Map());
  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [previewScale, setPreviewScale] = useState<1 | 0.5 | 0.25>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [decodeWarning, setDecodeWarning] = useState<string | null>(null);

  const totalDuration = useMemo(() => getTimelineDuration(project), [project]);
  const canvasWidth = Math.max(160, Math.round(project.settings.width * previewScale));
  const canvasHeight = Math.max(90, Math.round(project.settings.height * previewScale));

  const projectRef = useRef(project);
  projectRef.current = project;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const canvasSizeRef = useRef({ width: canvasWidth, height: canvasHeight });
  canvasSizeRef.current = { width: canvasWidth, height: canvasHeight };

  const redrawCanvasOnly = useCallback((timeSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderCompositeFrame(
      ctx,
      projectRef.current,
      timeSec,
      canvasSizeRef.current.width,
      canvasSizeRef.current.height,
      visualPoolRef.current
    );
  }, []);

  const syncMediaAndRender = useCallback(
    (timeSec: number, playing: boolean) => {
      const currentProject = projectRef.current;
      const rate = playbackRateRef.current;
      const visualPool = visualPoolRef.current;
      const audioPool = audioPoolRef.current;

      // 1. Compute active audio gains (covers both audio clips and unmuted video clips)
      const activeAudio = getActiveAudioClipsAtTime(currentProject, timeSec);
      const activeAudioByClipId = new Map<
        string,
        { gain: number; targetTime: number; speed: number }
      >();
      for (const { clip, effectiveGain } of activeAudio) {
        const targetTime =
          clip.sourceStart + (timeSec - clip.startTime) * clip.playbackSpeed;
        activeAudioByClipId.set(clip.id, {
          gain: Math.min(1, Math.max(0, effectiveGain)),
          targetTime,
          speed: clip.playbackSpeed,
        });
      }

      // 2. Sync video clip elements (pooled per clip.id)
      for (const clip of currentProject.clips) {
        if (clip.kind === 'video' && clip.mediaId) {
          const videoEl = visualPool.get(clip.id) as HTMLVideoElement | undefined;
          if (!videoEl || !('currentTime' in videoEl)) continue;

          const isActive =
            timeSec >= clip.startTime && timeSec < clip.startTime + clip.duration;
          const audioInfo = activeAudioByClipId.get(clip.id);

          if (isActive) {
            const targetSourceTime =
              clip.sourceStart + (timeSec - clip.startTime) * clip.playbackSpeed;
            const driftThreshold = playing ? 0.24 : 0.03;

            if (Math.abs(videoEl.currentTime - targetSourceTime) > driftThreshold) {
              try {
                videoEl.currentTime = targetSourceTime;
              } catch {
                // Metadata still loading
              }
            }

            videoEl.playbackRate = Math.min(
              4,
              Math.max(0.25, clip.playbackSpeed * rate)
            );
            videoEl.muted = !playing || !audioInfo || audioInfo.gain <= 0;
            if (audioInfo) {
              videoEl.volume = Math.min(1, Math.max(0, audioInfo.gain));
            }

            if (playing && videoEl.paused) {
              videoEl.play().catch(() => {});
            } else if (!playing && !videoEl.paused) {
              videoEl.pause();
            }
          } else {
            if (!videoEl.paused) videoEl.pause();
            videoEl.muted = true;
          }
        }
      }

      // 3. Sync standalone & detached audio clip elements (pooled per clip.id)
      for (const clip of currentProject.clips) {
        if (clip.kind === 'audio' && clip.mediaId) {
          const audioEl = audioPool.get(clip.id);
          if (!audioEl) continue;

          const audioInfo = activeAudioByClipId.get(clip.id);
          if (audioInfo && playing) {
            audioEl.volume = Math.min(1, Math.max(0, audioInfo.gain));
            audioEl.playbackRate = Math.min(
              4,
              Math.max(0.25, audioInfo.speed * rate)
            );
            if (Math.abs(audioEl.currentTime - audioInfo.targetTime) > 0.22) {
              try {
                audioEl.currentTime = audioInfo.targetTime;
              } catch {
                // Metadata still loading
              }
            }
            if (audioEl.paused) {
              audioEl.play().catch(() => {});
            }
          } else if (!audioEl.paused) {
            audioEl.pause();
          }
        }
      }

      // 4. Composite visual frame onto Canvas 2D
      redrawCanvasOnly(timeSec);
    },
    [redrawCanvasOnly]
  );

  // Synchronize per-clip media element pools whenever project.media or project.clips change
  useEffect(() => {
    const visualPool = visualPoolRef.current;
    const audioPool = audioPoolRef.current;

    const mediaMap = new Map<string, (typeof project.media)[number]>();
    for (const m of project.media) {
      if (m.objectUrl && m.status !== 'missing') {
        mediaMap.set(m.id, m);
      }
    }

    const activeVisualKeys = new Set<string>();
    const activeAudioKeys = new Set<string>();

    // Ensure image assets are loaded by asset.id
    for (const asset of mediaMap.values()) {
      if (asset.kind === 'image') {
        activeVisualKeys.add(asset.id);
        if (!visualPool.has(asset.id)) {
          const img = new Image();
          img.onload = () => redrawCanvasOnly(playheadBus.getTime());
          img.src = asset.objectUrl!;
          visualPool.set(asset.id, img);
        }
      }
    }

    // Ensure each video clip has its own HTMLVideoElement, and each audio clip has its own HTMLAudioElement
    for (const clip of project.clips) {
      if (!clip.mediaId) continue;
      const asset = mediaMap.get(clip.mediaId);
      if (!asset || !asset.objectUrl) continue;

      if (clip.kind === 'video') {
        activeVisualKeys.add(clip.id);
        const existing = visualPool.get(clip.id) as HTMLVideoElement | undefined;
        if (!existing || existing.src !== asset.objectUrl) {
          if (existing && 'pause' in existing) existing.pause();
          const v = document.createElement('video');
          v.src = asset.objectUrl;
          v.playsInline = true;
          v.preload = 'auto';
          v.onloadeddata = () => {
            if (!isPlayingRef.current) redrawCanvasOnly(playheadBus.getTime());
          };
          v.onseeked = () => {
            if (!isPlayingRef.current) redrawCanvasOnly(playheadBus.getTime());
          };
          v.onerror = () => {
            setDecodeWarning(`No se pudo decodificar el video "${asset.name}".`);
          };
          visualPool.set(clip.id, v);
        }
      } else if (clip.kind === 'audio') {
        // Supports both native audio files AND detached audio from video files!
        activeAudioKeys.add(clip.id);
        const existing = audioPool.get(clip.id);
        if (!existing || existing.src !== asset.objectUrl) {
          if (existing) existing.pause();
          const a = document.createElement('audio');
          a.src = asset.objectUrl;
          a.preload = 'auto';
          audioPool.set(clip.id, a);
        }
      }
    }

    // Cleanup removed clips/assets
    for (const [key, el] of visualPool.entries()) {
      if (!activeVisualKeys.has(key)) {
        if ('pause' in el && typeof el.pause === 'function') el.pause();
        visualPool.delete(key);
      }
    }
    for (const [key, el] of audioPool.entries()) {
      if (!activeAudioKeys.has(key)) {
        el.pause();
        audioPool.delete(key);
      }
    }

    // Immediately render current frame after pool update
    syncMediaAndRender(playheadBus.getTime(), isPlayingRef.current);
  }, [project.media, project.clips, redrawCanvasOnly, syncMediaAndRender]);

  // Sync when playheadTime or project visual properties change while paused or via external seek
  useEffect(() => {
    playheadBus.setTime(playheadTime);
    if (timecodeStrongRef.current) {
      timecodeStrongRef.current.textContent = formatTimecode(
        playheadTime,
        project.settings.fps
      );
    }
    syncMediaAndRender(playheadTime, isPlaying);
  }, [
    project,
    playheadTime,
    isPlaying,
    canvasWidth,
    canvasHeight,
    playbackRate,
    syncMediaAndRender,
  ]);

  // High-frequency 60-120 FPS playback loop (decoupled from full React tree re-renders!)
  useEffect(() => {
    if (!isPlaying) return;
    if (totalDuration <= 0) {
      onStopPlayback();
      return;
    }

    let rafId = 0;
    let lastTimestamp = performance.now();
    let lastReactSyncTimestamp = lastTimestamp;
    let currentPlayhead =
      playheadBus.getTime() >= totalDuration ? 0 : playheadBus.getTime();

    const tick = (now: number) => {
      const dtSec = ((now - lastTimestamp) / 1000) * playbackRateRef.current;
      lastTimestamp = now;
      currentPlayhead += dtSec;

      if (currentPlayhead >= totalDuration) {
        playheadBus.setTime(totalDuration);
        syncMediaAndRender(totalDuration, false);
        onSeek(totalDuration);
        onStopPlayback();
        return;
      }

      // 1. Emit to imperative subscribers (Timeline playhead line, CustomScrubber) at 60-120 FPS
      playheadBus.setTime(currentPlayhead);

      // 2. Update timecode readout directly in the DOM
      if (timecodeStrongRef.current) {
        timecodeStrongRef.current.textContent = formatTimecode(
          currentPlayhead,
          projectRef.current.settings.fps
        );
      }

      // 3. Draw composite frame directly to Canvas 2D
      syncMediaAndRender(currentPlayhead, true);

      // 4. Sync React state at a calm 4 Hz so React UI never lags during playback
      if (now - lastReactSyncTimestamp >= 250) {
        lastReactSyncTimestamp = now;
        onSeek(Number(currentPlayhead.toFixed(4)));
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      // Sync exact stop position back to React state when pausing
      onSeek(Number(playheadBus.getTime().toFixed(4)));
    };
  }, [isPlaying, totalDuration, onSeek, onStopPlayback, syncMediaAndRender]);

  const missingClipAtPlayhead = useMemo(() => {
    const missingIds = new Set(
      project.media.filter((m) => m.status === 'missing').map((m) => m.id)
    );
    return project.clips.some(
      (c) =>
        c.mediaId &&
        missingIds.has(c.mediaId) &&
        playheadTime >= c.startTime &&
        playheadTime < c.startTime + c.duration
    );
  }, [project.media, project.clips, playheadTime]);

  const stepFrame = (direction: -1 | 1) => {
    const frameDur = 1 / (project.settings.fps || 30);
    const current = playheadBus.getTime();
    const next = Math.max(0, Math.min(totalDuration, current + direction * frameDur));
    const rounded = Number(next.toFixed(4));
    playheadBus.setTime(rounded);
    onSeek(rounded);
  };

  const handleCaptureSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const cleanTime = playheadBus.getTime().toFixed(2).replace('.', '_');
      const filename = `${(project.name || 'amapa').replace(/\s+/g, '_')}_snapshot_${cleanTime}s.png`;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        const savedPath = await rustSaveExportedFile(filename, blob);
        if (savedPath) {
          await rustRevealInExplorer(savedPath);
          return;
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Snapshot capture failed:', err);
    }
  };

  return (
    <section className="panel preview-panel" aria-label="Preview Player">
      <div className="preview-stage">
        <div className="canvas-viewport">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="preview-canvas"
            data-testid="preview-canvas"
          />

          {missingClipAtPlayhead && (
            <div className="preview-warning-overlay" role="status">
              <AlertTriangle size={16} />
              <span>
                {locale === 'es'
                  ? 'El clip en el cabezal hace referencia a un archivo faltante. Revincúlalo en la biblioteca.'
                  : 'Active clip at playhead references a missing source file. Relink it in the Media Library.'}
              </span>
            </div>
          )}

          {decodeWarning && (
            <div className="preview-warning-overlay" role="alert">
              <AlertTriangle size={16} />
              <span>{decodeWarning}</span>
            </div>
          )}
        </div>
      </div>

      <div className="preview-scrubber-row">
        <CustomScrubber
          value={playheadTime}
          min={0}
          max={Math.max(0.1, totalDuration)}
          fps={project.settings.fps}
          onChange={(tSec) => {
            playheadBus.setTime(tSec);
            onSeek(tSec);
          }}
          ariaLabel="Timeline playhead scrubber"
        />
      </div>

      <div className="preview-controls-bar">
        {/* Left: Timecode readout */}
        <div className="transport-left">
          <span className="timecode-readout" data-testid="timecode-display">
            <strong ref={timecodeStrongRef}>
              {formatTimecode(playheadTime, project.settings.fps)}
            </strong>
            <span className="timecode-sep"> / </span>
            <span>{formatTimecode(totalDuration, project.settings.fps)}</span>
          </span>
        </div>

        {/* Center: Play/Pause dead-center flanked by jump/step controls */}
        <div className="transport-center">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              playheadBus.setTime(0);
              onSeek(0);
            }}
            title={locale === 'es' ? 'Ir al inicio (Home)' : 'Jump to start (Home)'}
            aria-label={locale === 'es' ? 'Ir al inicio' : 'Jump to start'}
          >
            <RotateCcw size={15} />
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => stepFrame(-1)}
            title={t('preview.stepBack')}
            aria-label={t('preview.stepBack')}
          >
            <SkipBack size={16} />
          </button>

          <button
            type="button"
            className="play-toggle-btn"
            onClick={onTogglePlay}
            title={isPlaying ? t('preview.pause') : t('preview.play')}
            aria-label={isPlaying ? t('preview.pause') : t('preview.play')}
            data-testid="preview-play-btn"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => stepFrame(1)}
            title={t('preview.stepForward')}
            aria-label={t('preview.stepForward')}
          >
            <SkipForward size={16} />
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              playheadBus.setTime(totalDuration);
              onSeek(totalDuration);
            }}
            title={locale === 'es' ? 'Ir al final (End)' : 'Jump to end (End)'}
            aria-label={locale === 'es' ? 'Ir al final' : 'Jump to end'}
          >
            <RotateCw size={15} />
          </button>
        </div>

        {/* Right: Snapshot button, Playback Speed, Preview Quality Resolution */}
        <div className="transport-right">
          <button
            type="button"
            className="icon-btn"
            onClick={handleCaptureSnapshot}
            title={
              locale === 'es'
                ? 'Capturar fotograma actual (PNG)'
                : 'Capture current frame (PNG)'
            }
            aria-label="Capture snapshot"
          >
            <Camera size={15} />
          </button>

          <label className="compact-select">
            <span>Speed</span>
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              aria-label={t('preview.speed')}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1.0×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2.0×</option>
            </select>
          </label>

          <label className="compact-select">
            <span>Res</span>
            <select
              value={previewScale}
              onChange={(e) => setPreviewScale(Number(e.target.value) as 1 | 0.5 | 0.25)}
              aria-label={t('preview.quality')}
            >
              <option value={1}>100%</option>
              <option value={0.5}>50%</option>
              <option value={0.25}>25%</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
};
