import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AmapaProject } from '../types/project';
import {
  formatTimecode,
  getActiveAudioClipsAtTime,
  getTimelineDuration,
} from '../engine/timelineEngine';
import { renderCompositeFrame, VisualSourceElement } from '../engine/compositor';
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
  const visualPoolRef = useRef<Map<string, VisualSourceElement>>(new Map());
  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [previewScale, setPreviewScale] = useState<1 | 0.5 | 0.25>(1);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [decodeWarning, setDecodeWarning] = useState<string | null>(null);

  const totalDuration = useMemo(() => getTimelineDuration(project), [project]);
  const canvasWidth = Math.max(160, Math.round(project.settings.width * previewScale));
  const canvasHeight = Math.max(90, Math.round(project.settings.height * previewScale));

  // Keep media element pool synchronized with project.media
  useEffect(() => {
    const visualPool = visualPoolRef.current;
    const audioPool = audioPoolRef.current;
    const activeIds = new Set(project.media.map((m) => m.id));

    for (const [id, el] of visualPool.entries()) {
      if (!activeIds.has(id)) {
        if ('pause' in el && typeof el.pause === 'function') {
          el.pause();
        }
        visualPool.delete(id);
      }
    }
    for (const [id, el] of audioPool.entries()) {
      if (!activeIds.has(id)) {
        el.pause();
        audioPool.delete(id);
      }
    }

    for (const asset of project.media) {
      if (!asset.objectUrl || asset.status === 'missing') continue;

      if (asset.kind === 'video' && !visualPool.has(asset.id)) {
        const v = document.createElement('video');
        v.src = asset.objectUrl;
        v.playsInline = true;
        v.preload = 'auto';
        v.onerror = () => {
          setDecodeWarning(`Browser could not decode video "${asset.name}".`);
        };
        visualPool.set(asset.id, v);
      } else if (asset.kind === 'image' && !visualPool.has(asset.id)) {
        const img = new Image();
        img.src = asset.objectUrl;
        visualPool.set(asset.id, img);
      } else if (asset.kind === 'audio' && !audioPool.has(asset.id)) {
        const a = document.createElement('audio');
        a.src = asset.objectUrl;
        a.preload = 'auto';
        audioPool.set(asset.id, a);
      }
    }
  }, [project.media]);

  // Synchronize media elements & draw composite frame whenever playheadTime or project changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const visualPool = visualPoolRef.current;
    const audioPool = audioPoolRef.current;

    // Sync video clip positions
    for (const clip of project.clips) {
      if (clip.kind === 'video' && clip.mediaId) {
        const videoEl = visualPool.get(clip.mediaId) as HTMLVideoElement | undefined;
        if (!videoEl || !('currentTime' in videoEl)) continue;

        const isActive =
          playheadTime >= clip.startTime && playheadTime < clip.startTime + clip.duration;
        if (isActive) {
          const targetSourceTime =
            clip.sourceStart + (playheadTime - clip.startTime) * clip.playbackSpeed;
          if (Math.abs(videoEl.currentTime - targetSourceTime) > 0.18) {
            try {
              videoEl.currentTime = targetSourceTime;
            } catch {
              // Ignore seek while metadata still loading
            }
          }
          videoEl.playbackRate = Math.min(4, Math.max(0.25, clip.playbackSpeed * playbackRate));
          if (isPlaying && videoEl.paused) {
            videoEl.play().catch(() => {});
          } else if (!isPlaying && !videoEl.paused) {
            videoEl.pause();
          }
        } else if (!videoEl.paused) {
          videoEl.pause();
        }
      }
    }

    // Sync audio gains & playback
    const activeAudio = getActiveAudioClipsAtTime(project, playheadTime);
    const activeAudioMediaIds = new Map<string, { gain: number; targetTime: number; speed: number }>();
    for (const { clip, effectiveGain } of activeAudio) {
      if (clip.mediaId) {
        const targetTime =
          clip.sourceStart + (playheadTime - clip.startTime) * clip.playbackSpeed;
        activeAudioMediaIds.set(clip.mediaId, {
          gain: Math.min(1, Math.max(0, effectiveGain)),
          targetTime,
          speed: clip.playbackSpeed,
        });
      }
    }

    for (const [mediaId, videoEl] of visualPool.entries()) {
      if ('volume' in videoEl) {
        const info = activeAudioMediaIds.get(mediaId);
        videoEl.muted = !info || info.gain <= 0;
        if (info) {
          videoEl.volume = Math.min(1, Math.max(0, info.gain));
        }
      }
    }

    for (const [mediaId, audioEl] of audioPool.entries()) {
      const info = activeAudioMediaIds.get(mediaId);
      if (info && isPlaying) {
        audioEl.volume = Math.min(1, Math.max(0, info.gain));
        audioEl.playbackRate = Math.min(4, Math.max(0.25, info.speed * playbackRate));
        if (Math.abs(audioEl.currentTime - info.targetTime) > 0.2) {
          try {
            audioEl.currentTime = info.targetTime;
          } catch {
            // Ignore seek before metadata ready
          }
        }
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      } else if (!audioEl.paused) {
        audioEl.pause();
      }
    }

    renderCompositeFrame(
      ctx,
      project,
      playheadTime,
      canvasWidth,
      canvasHeight,
      visualPool
    );
  }, [project, playheadTime, isPlaying, canvasWidth, canvasHeight, playbackRate]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) return;
    if (totalDuration <= 0) {
      onStopPlayback();
      return;
    }

    let rafId = 0;
    let lastTimestamp = performance.now();
    let currentPlayhead = playheadTime >= totalDuration ? 0 : playheadTime;

    const tick = (now: number) => {
      const dtSec = ((now - lastTimestamp) / 1000) * playbackRate;
      lastTimestamp = now;
      currentPlayhead += dtSec;

      if (currentPlayhead >= totalDuration) {
        onSeek(totalDuration);
        onStopPlayback();
        return;
      }

      onSeek(currentPlayhead);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration, playbackRate]);

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
    const next = Math.max(0, Math.min(totalDuration, playheadTime + direction * frameDur));
    onSeek(Number(next.toFixed(4)));
  };

  const handleCaptureSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      const cleanTime = playheadTime.toFixed(2).replace('.', '_');
      a.download = `${(project.name || 'amapa').replace(/\s+/g, '_')}_snapshot_${cleanTime}s.png`;
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
                Active clip at playhead references a missing source file. Relink it in the Media
                Library.
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
          onChange={onSeek}
          ariaLabel="Timeline playhead scrubber"
        />
      </div>

      <div className="preview-controls-bar">
        {/* Left: Timecode readout */}
        <div className="transport-left">
          <span className="timecode-readout" data-testid="timecode-display">
            <strong>{formatTimecode(playheadTime, project.settings.fps)}</strong>
            <span className="timecode-sep"> / </span>
            <span>{formatTimecode(totalDuration, project.settings.fps)}</span>
          </span>
        </div>

        {/* Center: Play/Pause dead-center flanked by jump/step controls */}
        <div className="transport-center">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onSeek(0)}
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
            onClick={() => onSeek(totalDuration)}
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
            title={locale === 'es' ? 'Capturar fotograma actual (PNG)' : 'Capture current frame (PNG)'}
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
