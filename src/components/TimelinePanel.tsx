import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AmapaProject,
  TimelineClip,
  TimelineTrack,
  TrackKind,
} from '../types/project';
import {
  findSnapTime,
  formatTimecode,
  getTimelineDuration,
} from '../engine/timelineEngine';
import { Locale, translate } from '../i18n/translations';
import {
  Copy,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Lock,
  Magnet,
  Music,
  Plus,
  Scissors,
  Trash2,
  Type,
  Unlock,
  Volume2,
  VolumeX,
  Waves,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface TimelinePanelProps {
  project: AmapaProject;
  playheadTime: number;
  selectedClipId: string | null;
  rippleMode: boolean;
  snapEnabled: boolean;
  locale: Locale;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (timeSec: number) => void;
  onMoveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  onTrimClipStart: (clipId: string, newStartTime: number) => void;
  onTrimClipEnd: (clipId: string, newDuration: number) => void;
  onSplitSelectedClip: () => void;
  onDuplicateSelectedClip: () => void;
  onDeleteSelectedClip: () => void;
  onDetachAudio?: (clipId: string) => void;
  onToggleRipple: () => void;
  onToggleSnap: () => void;
  onAddTrack: (kind: TrackKind) => void;
  onRenameTrack: (trackId: string, name: string) => void;
  onUpdateTrack: (trackId: string, patch: Partial<Omit<TimelineTrack, 'id' | 'kind'>>) => void;
  onDeleteTrack: (trackId: string) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  playheadTime,
  selectedClipId,
  rippleMode,
  snapEnabled,
  locale,
  onSelectClip,
  onSeek,
  onMoveClip,
  onTrimClipStart,
  onTrimClipEnd,
  onSplitSelectedClip,
  onDuplicateSelectedClip,
  onDeleteSelectedClip,
  onDetachAudio,
  onToggleRipple,
  onToggleSnap,
  onAddTrack,
  onRenameTrack,
  onUpdateTrack,
  onDeleteTrack,
}) => {
  const t = (key: string) => translate(locale, key);
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(60);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState<string>('');
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);

  const lanesContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  useEffect(() => {
    const el = lanesContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el) setContainerWidth(Math.max(600, el.clientWidth));
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const sortedTracks = useMemo(
    () => [...project.tracks].sort((a, b) => a.order - b.order),
    [project.tracks]
  );

  const timelineDuration = useMemo(() => getTimelineDuration(project), [project]);
  const visibleSeconds = Math.ceil(containerWidth / pixelsPerSecond);
  const totalCanvasSeconds = Math.max(60, visibleSeconds + 30, Math.ceil(timelineDuration + 20));
  const totalWidthPx = Math.max(containerWidth, Math.round(totalCanvasSeconds * pixelsPerSecond));

  const mediaMap = useMemo(() => {
    const map = new Map<string, (typeof project.media)[number]>();
    for (const m of project.media) map.set(m.id, m);
    return map;
  }, [project.media]);

  const timeTicks = useMemo(() => {
    const stepSec =
      pixelsPerSecond >= 100 ? 1 : pixelsPerSecond >= 50 ? 2 : pixelsPerSecond >= 25 ? 5 : 10;
    const ticks: number[] = [];
    for (let s = 0; s <= totalCanvasSeconds; s += stepSec) {
      ticks.push(s);
    }
    return ticks;
  }, [totalCanvasSeconds, pixelsPerSecond]);

  const handleStartPlayheadScrub = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const updateTimeFromEvent = (clientX: number) => {
      if (!lanesContainerRef.current) return;
      const rect = lanesContainerRef.current.getBoundingClientRect();
      const scrollLeft = lanesContainerRef.current.scrollLeft;
      const xInCanvas = clientX - rect.left + scrollLeft;
      let candidateTime = Math.max(0, xInCanvas / pixelsPerSecond);

      if (snapEnabled) {
        const snapRes = findSnapTime(
          candidateTime,
          project.clips,
          playheadTime,
          undefined,
          10 / pixelsPerSecond
        );
        if (snapRes.didSnap) {
          candidateTime = snapRes.snappedTime;
          setSnapGuideTime(snapRes.snapReference ?? null);
        } else {
          setSnapGuideTime(null);
        }
      } else {
        setSnapGuideTime(null);
      }

      onSeek(Number(candidateTime.toFixed(4)));
    };

    updateTimeFromEvent(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromEvent(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setSnapGuideTime(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startClipDrag = (
    e: React.MouseEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onSelectClip(clip.id);

    const startX = e.clientX;
    const initialStart = clip.startTime;
    const initialDuration = clip.duration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSec = deltaX / pixelsPerSecond;

      if (mode === 'move') {
        let candidateStart = Math.max(0, initialStart + deltaSec);
        if (snapEnabled) {
          const snapRes = findSnapTime(
            candidateStart,
            project.clips,
            playheadTime,
            clip.id,
            10 / pixelsPerSecond
          );
          if (snapRes.didSnap) {
            candidateStart = snapRes.snappedTime;
            setSnapGuideTime(snapRes.snapReference ?? null);
          } else {
            const endSnap = findSnapTime(
              candidateStart + initialDuration,
              project.clips,
              playheadTime,
              clip.id,
              10 / pixelsPerSecond
            );
            if (endSnap.didSnap) {
              candidateStart = Math.max(0, endSnap.snappedTime - initialDuration);
              setSnapGuideTime(endSnap.snapReference ?? null);
            } else {
              setSnapGuideTime(null);
            }
          }
        }
        onMoveClip(clip.id, candidateStart);
      } else if (mode === 'trim-start') {
        const candidateStart = Math.max(0, initialStart + deltaSec);
        onTrimClipStart(clip.id, candidateStart);
      } else if (mode === 'trim-end') {
        const candidateDuration = Math.max(0.1, initialDuration + deltaSec);
        onTrimClipEnd(clip.id, candidateDuration);
      }
    };

    const handleMouseUp = () => {
      setSnapGuideTime(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <section className="panel timeline-panel" aria-label="Timeline Editor">
      <div className="timeline-toolbar">
        <div className="timeline-tools-left">
          <button
            type="button"
            className="toolbar-btn"
            disabled={!selectedClipId}
            onClick={onSplitSelectedClip}
            title={`${t('timeline.split')} (S)`}
            data-testid="timeline-split-btn"
          >
            <Scissors size={13} strokeWidth={1.6} />
            <span>{t('timeline.split')}</span>
          </button>

          <button
            type="button"
            className="toolbar-btn"
            disabled={!selectedClipId}
            onClick={onDuplicateSelectedClip}
            title={`${t('timeline.duplicate')} (D)`}
            data-testid="timeline-duplicate-btn"
          >
            <Copy size={13} strokeWidth={1.6} />
            <span>{t('timeline.duplicate')}</span>
          </button>

          {selectedClipId && onDetachAudio && project.clips.find((c) => c.id === selectedClipId)?.kind === 'video' && (
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => onDetachAudio(selectedClipId)}
              title={locale === 'es' ? 'Separar audio a pista independiente' : 'Detach audio to track'}
              data-testid="timeline-detach-audio-btn"
            >
              <Volume2 size={13} strokeWidth={1.6} />
              <span>{locale === 'es' ? 'Separar Audio' : 'Detach Audio'}</span>
            </button>
          )}

          <button
            type="button"
            className="toolbar-btn danger-hover"
            disabled={!selectedClipId}
            onClick={onDeleteSelectedClip}
            title={`${t('timeline.delete')} (Supr / Delete)`}
            data-testid="timeline-delete-btn"
          >
            <Trash2 size={13} strokeWidth={1.6} />
            <span>{t('timeline.delete')}</span>
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            className={`toolbar-btn compact-btn ${snapEnabled ? 'active-toggle' : ''}`}
            onClick={onToggleSnap}
            title={t('timeline.snap')}
            aria-label={t('timeline.snap')}
          >
            <Magnet size={13} strokeWidth={1.6} />
            <span>{t('timeline.snap')}</span>
          </button>

          <button
            type="button"
            className={`toolbar-btn compact-btn ${rippleMode ? 'active-toggle' : ''}`}
            onClick={onToggleRipple}
            title={t('timeline.ripple')}
            aria-label={t('timeline.ripple')}
            data-testid="timeline-ripple-btn"
          >
            <Waves size={13} strokeWidth={1.6} />
            <span>{t('timeline.ripple')}</span>
          </button>
        </div>

        <div className="timeline-tools-center">
          <span className="toolbar-group-label">
            {locale === 'es' ? 'Pista:' : 'Track:'}
          </span>
          <button
            type="button"
            className="toolbar-btn compact-btn"
            onClick={() => onAddTrack('video')}
          >
            <Plus size={12} strokeWidth={1.6} />
            <span>Video</span>
          </button>
          <button
            type="button"
            className="toolbar-btn compact-btn"
            onClick={() => onAddTrack('audio')}
          >
            <Plus size={12} strokeWidth={1.6} />
            <span>Audio</span>
          </button>
          <button
            type="button"
            className="toolbar-btn compact-btn"
            onClick={() => onAddTrack('text')}
          >
            <Plus size={12} strokeWidth={1.6} />
            <span>{locale === 'es' ? 'Texto' : 'Text'}</span>
          </button>
        </div>

        <div className="timeline-tools-right">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPixelsPerSecond((z) => Math.max(20, z - 15))}
            aria-label="Zoom out timeline"
          >
            <ZoomOut size={14} strokeWidth={1.5} />
          </button>
          <input
            type="range"
            min={20}
            max={180}
            value={pixelsPerSecond}
            onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
            aria-label={t('timeline.zoom')}
            className="zoom-slider"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setPixelsPerSecond((z) => Math.min(180, z + 15))}
            aria-label="Zoom in timeline"
          >
            <ZoomIn size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="timeline-workspace">
        <div className="track-headers-column">
          <div className="ruler-corner-header">
            {locale === 'es' ? 'Pistas' : 'Tracks'}
          </div>

          {sortedTracks.map((track) => (
            <div
              key={track.id}
              className={`track-header-row ${track.locked ? 'locked' : ''}`}
              data-testid={`track-header-${track.id}`}
            >
              <div className="track-name-cell">
                <span className="track-type-icon">
                  {track.kind === 'video' ? (
                    <Film size={13} strokeWidth={1.5} />
                  ) : track.kind === 'audio' ? (
                    <Music size={13} strokeWidth={1.5} />
                  ) : (
                    <Type size={13} strokeWidth={1.5} />
                  )}
                </span>
                {editingTrackId === track.id ? (
                  <input
                    type="text"
                    value={editingTrackName}
                    autoFocus
                    onChange={(e) => setEditingTrackName(e.target.value)}
                    onBlur={() => {
                      onRenameTrack(track.id, editingTrackName);
                      setEditingTrackId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onRenameTrack(track.id, editingTrackName);
                        setEditingTrackId(null);
                      }
                    }}
                    className="track-rename-input"
                  />
                ) : (
                  <span
                    className="track-name-label"
                    onDoubleClick={() => {
                      setEditingTrackId(track.id);
                      setEditingTrackName(track.name);
                    }}
                    title={locale === 'es' ? 'Doble clic para renombrar' : 'Double-click to rename'}
                  >
                    {track.name}
                  </span>
                )}
              </div>

              <div className="track-controls-cell">
                {track.kind !== 'audio' && (
                  <button
                    type="button"
                    className={`track-ctrl-btn ${!track.visible ? 'active-state' : ''}`}
                    onClick={() => onUpdateTrack(track.id, { visible: !track.visible })}
                    title={track.visible ? 'Hide' : 'Show'}
                    aria-label={`Toggle visibility for ${track.name}`}
                  >
                    {track.visible ? (
                      <Eye size={13} strokeWidth={1.5} />
                    ) : (
                      <EyeOff size={13} strokeWidth={1.5} />
                    )}
                  </button>
                )}

                {track.kind !== 'text' && (
                  <button
                    type="button"
                    className={`track-ctrl-btn ${track.muted ? 'active-state' : ''}`}
                    onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                    title={track.muted ? 'Unmute' : 'Mute'}
                    aria-label={`Toggle mute for ${track.name}`}
                  >
                    {track.muted ? (
                      <VolumeX size={13} strokeWidth={1.5} />
                    ) : (
                      <Volume2 size={13} strokeWidth={1.5} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className={`track-ctrl-btn ${track.locked ? 'active-state' : ''}`}
                  onClick={() => onUpdateTrack(track.id, { locked: !track.locked })}
                  title={track.locked ? 'Unlock' : 'Lock'}
                  aria-label={`Toggle lock for ${track.name}`}
                >
                  {track.locked ? (
                    <Lock size={13} strokeWidth={1.5} />
                  ) : (
                    <Unlock size={13} strokeWidth={1.5} />
                  )}
                </button>

                {sortedTracks.length > 1 && (
                  <button
                    type="button"
                    className="track-ctrl-btn"
                    onClick={() => onDeleteTrack(track.id)}
                    title="Delete track"
                    aria-label={`Delete ${track.name}`}
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="timeline-lanes-scroll"
          ref={lanesContainerRef}
          onClick={() => onSelectClip(null)}
        >
          <div className="timeline-canvas-inner" style={{ width: `${totalWidthPx}px` }}>
            <div
              className="timeline-ruler"
              onMouseDown={handleStartPlayheadScrub}
              data-testid="timeline-ruler"
            >
              {timeTicks.map((sec) => (
                <div
                  key={sec}
                  className="ruler-tick"
                  style={{ left: `${sec * pixelsPerSecond}px` }}
                >
                  <span className="ruler-tick-label">
                    {formatTimecode(sec, project.settings.fps)}
                  </span>
                </div>
              ))}
            </div>

            {sortedTracks.map((track) => {
              const trackClips = project.clips.filter((c) => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  className={`track-lane ${!track.visible ? 'dimmed' : ''}`}
                  data-testid={`track-lane-${track.id}`}
                >
                  {trackClips.length === 0 && project.clips.length === 0 && track.kind === 'video' && (
                    <div className="empty-lane-hint">
                      {locale === 'es'
                        ? 'Tus clips de video e imagen aparecerán aquí al subirlos'
                        : 'Your video and image clips will appear here'}
                    </div>
                  )}

                  {trackClips.map((clip) => {
                    const leftPx = clip.startTime * pixelsPerSecond;
                    const widthPx = Math.max(24, clip.duration * pixelsPerSecond);
                    const isSelected = clip.id === selectedClipId;
                    const asset = clip.mediaId ? mediaMap.get(clip.mediaId) : undefined;
                    const waveform = asset?.waveformPeaks;

                    return (
                      <div
                        key={clip.id}
                        className={`timeline-clip-block kind-${clip.kind} ${
                          isSelected ? 'selected' : ''
                        } ${asset?.status === 'missing' ? 'missing-media' : ''}`}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        onMouseDown={(e) => startClipDrag(e, clip, 'move')}
                        data-testid={`timeline-clip-${clip.id}`}
                      >
                        <div
                          className="clip-trim-handle left"
                          title={locale === 'es' ? 'Arrastrar para recortar inicio' : 'Trim start'}
                          onMouseDown={(e) => startClipDrag(e, clip, 'trim-start')}
                        >
                          <span className="trim-grip" />
                        </div>

                        <div className="clip-content">
                          <div className="clip-title-row">
                            <span className="clip-mini-icon">
                              {clip.kind === 'video' ? (
                                <Film size={11} strokeWidth={1.6} />
                              ) : clip.kind === 'audio' ? (
                                <Music size={11} strokeWidth={1.6} />
                              ) : clip.kind === 'image' ? (
                                <ImageIcon size={11} strokeWidth={1.6} />
                              ) : (
                                <Type size={11} strokeWidth={1.6} />
                              )}
                            </span>
                            <span className="clip-label">{clip.name}</span>
                            <span className="clip-dur-label">{clip.duration.toFixed(1)}s</span>
                          </div>

                          {waveform && waveform.length > 0 && (
                            <div className="clip-waveform" aria-hidden="true">
                              {waveform.slice(0, 32).map((peak, idx) => (
                                <span
                                  key={idx}
                                  className="waveform-bar"
                                  style={{ height: `${Math.round(peak * 100)}%` }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <div
                          className="clip-trim-handle right"
                          title={locale === 'es' ? 'Arrastrar para recortar final' : 'Trim end'}
                          onMouseDown={(e) => startClipDrag(e, clip, 'trim-end')}
                        >
                          <span className="trim-grip" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {snapGuideTime !== null && (
              <div
                className="snap-guide-line"
                style={{ left: `${snapGuideTime * pixelsPerSecond}px` }}
              />
            )}

            <div
              className="playhead-line"
              style={{ left: `${playheadTime * pixelsPerSecond}px` }}
              data-testid="playhead-indicator"
            >
              <div
                className="playhead-cap"
                title={locale === 'es' ? 'Arrastrar marcador de tiempo' : 'Drag playhead'}
                onMouseDown={handleStartPlayheadScrub}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
