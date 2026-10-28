import {
  AmapaProject,
  CanvasFitMode,
  ClipColorAdjustments,
  ClipKind,
  ClipTransform,
  ClipTransition,
  ExportPreset,
  ExportSettings,
  MediaAsset,
  TextOverlayStyle,
  TimelineClip,
  TimelineTrack,
  TrackKind,
} from '../types/project';

export interface AspectRatioPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  descriptionKey: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '16:9', label: '16:9', width: 1920, height: 1080, descriptionKey: 'Horizontal (16:9)' },
  { id: '9:16', label: '9:16', width: 1080, height: 1920, descriptionKey: 'Vertical (9:16)' },
  { id: '1:1', label: '1:1', width: 1080, height: 1080, descriptionKey: 'Cuadrado (1:1)' },
  { id: '4:5', label: '4:5', width: 1080, height: 1350, descriptionKey: 'Retrato (4:5)' },
  { id: '3:4', label: '3:4', width: 1080, height: 1440, descriptionKey: 'Vertical (3:4)' },
  { id: '4:3', label: '4:3', width: 1440, height: 1080, descriptionKey: 'Clásico (4:3)' },
  { id: '21:9', label: '21:9', width: 2560, height: 1080, descriptionKey: 'Cinemático (21:9)' },
];

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: '1080p-landscape',
    labelKey: 'preset.1080p',
    descriptionKey: 'preset.1080p.desc',
    width: 1920,
    height: 1080,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 8,
    audioBitrateKbps: 192,
  },
  {
    id: '720p-landscape',
    labelKey: 'preset.720p',
    descriptionKey: 'preset.720p.desc',
    width: 1280,
    height: 720,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 5,
    audioBitrateKbps: 128,
  },
  {
    id: '1440p-landscape',
    labelKey: 'preset.1440p',
    descriptionKey: 'preset.1440p.desc',
    width: 2560,
    height: 1440,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 16,
    audioBitrateKbps: 192,
  },
  {
    id: '4k-uhd',
    labelKey: 'preset.4k',
    descriptionKey: 'preset.4k.desc',
    width: 3840,
    height: 2160,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 28,
    audioBitrateKbps: 256,
  },
  {
    id: 'vertical-1080x1920',
    labelKey: 'preset.vertical',
    descriptionKey: 'preset.vertical.desc',
    width: 1080,
    height: 1920,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 8,
    audioBitrateKbps: 192,
  },
  {
    id: 'square-1080x1080',
    labelKey: 'preset.square',
    descriptionKey: 'preset.square.desc',
    width: 1080,
    height: 1080,
    fps: 30,
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    videoBitrateMbps: 6,
    audioBitrateKbps: 192,
  },
  {
    id: 'webm-vp9-1080p',
    labelKey: 'preset.webm',
    descriptionKey: 'preset.webm.desc',
    width: 1920,
    height: 1080,
    fps: 30,
    container: 'webm',
    videoCodec: 'vp09.00.10.08',
    audioCodec: 'opus',
    videoBitrateMbps: 6,
    audioBitrateKbps: 160,
  },
];

export interface TitlePreset {
  id: string;
  name: string;
  style: TextOverlayStyle;
  defaultY: number;
}

export const TITLE_PRESETS: TitlePreset[] = [
  {
    id: 'headline-center',
    name: 'Título principal',
    defaultY: 0,
    style: {
      text: 'Título',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 72,
      fontWeight: '800',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0,
      outlineColor: '#000000',
      outlineWidth: 2,
      align: 'center',
      presetId: 'headline-center',
    },
  },
  {
    id: 'lower-third',
    name: 'Subtítulo inferior',
    defaultY: 34,
    style: {
      text: 'Subtítulo',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 44,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#111111',
      backgroundOpacity: 0.85,
      outlineColor: '#000000',
      outlineWidth: 0,
      align: 'left',
      presetId: 'lower-third',
    },
  },
  {
    id: 'minimal-serif',
    name: 'Clásico Serif',
    defaultY: 0,
    style: {
      text: 'Escena I',
      fontFamily: 'Georgia, serif',
      fontSize: 64,
      fontWeight: 'normal',
      fontStyle: 'italic',
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0,
      outlineColor: '#000000',
      outlineWidth: 2,
      align: 'center',
      presetId: 'minimal-serif',
    },
  },
  {
    id: 'subtitle-clean',
    name: 'Subtítulo centrado',
    defaultY: 38,
    style: {
      text: 'Texto de diálogo o subtítulo',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 38,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0.6,
      outlineColor: '#000000',
      outlineWidth: 2,
      align: 'center',
      presetId: 'subtitle-clean',
    },
  },
  {
    id: 'tag-badge',
    name: 'Etiqueta destacada',
    defaultY: -36,
    style: {
      text: 'NOVEDAD',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 30,
      fontWeight: '800',
      fontStyle: 'normal',
      color: '#ffffff',
      backgroundColor: '#111111',
      backgroundOpacity: 0.9,
      outlineColor: '#000000',
      outlineWidth: 0,
      align: 'center',
      presetId: 'tag-badge',
    },
  },
];

export interface ColorFilterPreset {
  id: string;
  name: string;
  color: ClipColorAdjustments;
}

export const COLOR_FILTER_PRESETS: ColorFilterPreset[] = [
  {
    id: 'neutral',
    name: 'Neutro (Original)',
    color: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour (Cálido)',
    color: { brightness: 6, contrast: 12, saturation: 18, temperature: 35 },
  },
  {
    id: 'bw-noir',
    name: 'B&W Noir (B&N)',
    color: { brightness: -4, contrast: 32, saturation: -100, temperature: 0 },
  },
  {
    id: 'cyber-cool',
    name: 'Cyber Cool (Frío)',
    color: { brightness: 0, contrast: 14, saturation: 10, temperature: -40 },
  },
  {
    id: 'vintage-90s',
    name: 'Vintage 90s',
    color: { brightness: 4, contrast: -8, saturation: -18, temperature: 16 },
  },
  {
    id: 'vivid-pop',
    name: 'Vivid Pop (Reels)',
    color: { brightness: 6, contrast: 22, saturation: 40, temperature: 0 },
  },
];

export interface PiPPreset {
  id: string;
  name: string;
  scale: number;
  x: number;
  y: number;
}

export const PIP_PRESETS: PiPPreset[] = [
  { id: 'top-right', name: 'Sup-Der', scale: 0.32, x: 32, y: -30 },
  { id: 'bottom-right', name: 'Inf-Der', scale: 0.32, x: 32, y: 30 },
  { id: 'bottom-left', name: 'Inf-Izq', scale: 0.32, x: -32, y: 30 },
  { id: 'top-left', name: 'Sup-Izq', scale: 0.32, x: -32, y: -30 },
  { id: 'fullscreen', name: 'Pantalla', scale: 1.0, x: 0, y: 0 },
];

let idCounter = 0;
export function generateId(prefix = 'id'): string {
  idCounter += 1;
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${randomPart}`;
}

export function createDefaultTransform(): ClipTransform {
  return {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
    opacity: 1,
    cropTop: 0,
    cropRight: 0,
    cropBottom: 0,
    cropLeft: 0,
  };
}

export function createDefaultColor(): ClipColorAdjustments {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
  };
}

export function createDefaultTransition(): ClipTransition {
  return {
    type: 'none',
    inDuration: 0,
    outDuration: 0,
  };
}

export function createDefaultExportSettings(name = 'amapa-video'): ExportSettings {
  return {
    mode: 'simple',
    presetId: '1080p-landscape',
    container: 'mp4',
    videoCodec: 'avc1.42001f',
    audioCodec: 'mp4a.40.2',
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitrateMbps: 8,
    audioBitrateKbps: 192,
    sampleRate: 48000,
    channels: 2,
    filename: name,
    useCustomRange: false,
    rangeStart: 0,
    rangeEnd: 0,
  };
}

export function createDefaultProject(name = 'Untitled Project'): AmapaProject {
  const now = new Date().toISOString();
  const tracks: TimelineTrack[] = [
    {
      id: 'track-text-1',
      name: 'Texto',
      kind: 'text',
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: 0,
    },
    {
      id: 'track-video-1',
      name: 'Video 1',
      kind: 'video',
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: 1,
    },
    {
      id: 'track-audio-1',
      name: 'Audio 1',
      kind: 'audio',
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: 2,
    },
  ];

  return {
    schemaVersion: 1,
    id: generateId('proj'),
    name,
    createdAt: now,
    updatedAt: now,
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
      aspectRatio: '16:9',
      fitMode: 'fit',
    },
    folders: ['All Media', 'Footage', 'Audio', 'Graphics'],
    media: [],
    tracks,
    clips: [],
    exportSettings: createDefaultExportSettings('amapa-export'),
  };
}

export function setProjectAspectRatio(
  project: AmapaProject,
  aspectRatioId: string
): AmapaProject {
  const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectRatioId);
  if (!preset) return project;
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    settings: {
      ...project.settings,
      width: preset.width,
      height: preset.height,
      aspectRatio: preset.id,
    },
    exportSettings: {
      ...project.exportSettings,
      width: preset.width,
      height: preset.height,
    },
  };
}

export function setProjectFitMode(
  project: AmapaProject,
  fitMode: CanvasFitMode
): AmapaProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    settings: {
      ...project.settings,
      fitMode,
    },
  };
}

export function getTimelineDuration(project: Pick<AmapaProject, 'clips'>): number {
  if (project.clips.length === 0) return 0;
  let maxEnd = 0;
  for (const clip of project.clips) {
    const end = clip.startTime + clip.duration;
    if (end > maxEnd) {
      maxEnd = end;
    }
  }
  return Number(maxEnd.toFixed(4));
}

export function formatTimecode(seconds: number, fps = 30): string {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalFrames = Math.floor(safeSeconds * fps + 1e-6);
  const frames = totalFrames % fps;
  const totalWholeSeconds = Math.floor(safeSeconds + 1e-6);
  const secs = totalWholeSeconds % 60;
  const mins = Math.floor(totalWholeSeconds / 60) % 60;
  const hours = Math.floor(totalWholeSeconds / 3600);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}.${pad2(frames)}`;
  }
  return `${pad2(mins)}:${pad2(secs)}.${pad2(frames)}`;
}

export function findSnapTime(
  targetTime: number,
  clips: TimelineClip[],
  playheadTime: number,
  excludeClipId?: string,
  thresholdSeconds = 0.2
): { snappedTime: number; didSnap: boolean; snapReference?: number } {
  const candidates: number[] = [0, playheadTime];
  for (const clip of clips) {
    if (clip.id === excludeClipId) continue;
    candidates.push(clip.startTime);
    candidates.push(clip.startTime + clip.duration);
  }

  let closest = targetTime;
  let minDiff = thresholdSeconds;
  let didSnap = false;
  let snapReference: number | undefined;

  for (const pt of candidates) {
    const diff = Math.abs(targetTime - pt);
    if (diff <= minDiff) {
      minDiff = diff;
      closest = pt;
      didSnap = true;
      snapReference = pt;
    }
  }

  return {
    snappedTime: Math.max(0, Number(closest.toFixed(4))),
    didSnap,
    snapReference,
  };
}

export function getTrackEndTime(clips: TimelineClip[], trackId: string): number {
  let maxEnd = 0;
  for (const clip of clips) {
    if (clip.trackId === trackId) {
      const end = clip.startTime + clip.duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  return Number(maxEnd.toFixed(4));
}

export function addClipFromMedia(
  project: AmapaProject,
  media: MediaAsset,
  options?: { trackId?: string; startTime?: number }
): AmapaProject {
  const targetTrackKind: TrackKind = media.kind === 'audio' ? 'audio' : 'video';
  let track = options?.trackId
    ? project.tracks.find((t) => t.id === options.trackId)
    : undefined;

  if (!track || track.locked) {
    track = project.tracks.find((t) => t.kind === targetTrackKind && !t.locked);
  }

  let updatedTracks = project.tracks;
  if (!track) {
    const newTrack: TimelineTrack = {
      id: generateId(`track-${targetTrackKind}`),
      name: `${targetTrackKind === 'audio' ? 'Audio' : 'Video'} ${
        project.tracks.filter((t) => t.kind === targetTrackKind).length + 1
      }`,
      kind: targetTrackKind,
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: project.tracks.length,
    };
    updatedTracks = [...project.tracks, newTrack];
    track = newTrack;
  }

  const startTime =
    options?.startTime !== undefined
      ? Math.max(0, Number(options.startTime.toFixed(4)))
      : getTrackEndTime(project.clips, track.id);

  const clipDuration = Math.max(0.2, media.duration || 5);
  const newClip: TimelineClip = {
    id: generateId('clip'),
    trackId: track.id,
    kind: media.kind,
    mediaId: media.id,
    name: media.name,
    startTime,
    duration: Number(clipDuration.toFixed(4)),
    sourceStart: 0,
    sourceDuration: media.kind === 'image' ? 300 : Number(clipDuration.toFixed(4)),
    playbackSpeed: 1,
    volume: 1,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
    transform: createDefaultTransform(),
    color: createDefaultColor(),
    transition: createDefaultTransition(),
  };

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: updatedTracks,
    clips: [...project.clips, newClip],
  };
}

export function addTextClip(
  project: AmapaProject,
  preset: TitlePreset = TITLE_PRESETS[0],
  startTime?: number,
  duration = 4
): AmapaProject {
  let track = project.tracks.find((t) => t.kind === 'text' && !t.locked);
  let updatedTracks = project.tracks;

  if (!track) {
    track = {
      id: generateId('track-text'),
      name: 'Titles',
      kind: 'text',
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: 0,
    };
    updatedTracks = [track, ...project.tracks.map((t, i) => ({ ...t, order: i + 1 }))];
  }

  const resolvedStart =
    startTime !== undefined
      ? Math.max(0, Number(startTime.toFixed(4)))
      : getTrackEndTime(project.clips, track.id);

  const transform = createDefaultTransform();
  transform.y = preset.defaultY;

  const newClip: TimelineClip = {
    id: generateId('clip-text'),
    trackId: track.id,
    kind: 'text',
    name: preset.style.text,
    startTime: resolvedStart,
    duration: Math.max(0.5, duration),
    sourceStart: 0,
    sourceDuration: 600,
    playbackSpeed: 1,
    volume: 0,
    muted: true,
    fadeIn: 0,
    fadeOut: 0,
    transform,
    color: createDefaultColor(),
    transition: {
      type: 'fade',
      inDuration: 0.3,
      outDuration: 0.3,
    },
    textStyle: { ...preset.style },
  };

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: updatedTracks,
    clips: [...project.clips, newClip],
  };
}

export function moveClip(
  project: AmapaProject,
  clipId: string,
  newStartTime: number,
  newTrackId?: string
): AmapaProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;

  const currentTrack = project.tracks.find((t) => t.id === clip.trackId);
  if (currentTrack?.locked) return project;

  let resolvedTrackId = clip.trackId;
  if (newTrackId && newTrackId !== clip.trackId) {
    const targetTrack = project.tracks.find((t) => t.id === newTrackId);
    if (targetTrack && !targetTrack.locked) {
      const compatible =
        (clip.kind === 'audio' && targetTrack.kind === 'audio') ||
        ((clip.kind === 'video' || clip.kind === 'image') && targetTrack.kind === 'video') ||
        (clip.kind === 'text' && (targetTrack.kind === 'text' || targetTrack.kind === 'video'));
      if (compatible) {
        resolvedTrackId = targetTrack.id;
      }
    }
  }

  const clampedStart = Math.max(0, Number(newStartTime.toFixed(4)));

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: project.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            startTime: clampedStart,
            trackId: resolvedTrackId,
          }
        : c
    ),
  };
}

export const MIN_CLIP_DURATION = 0.1;

export function trimClipStart(
  project: AmapaProject,
  clipId: string,
  newStartTime: number
): AmapaProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;
  const track = project.tracks.find((t) => t.id === clip.trackId);
  if (track?.locked) return project;

  const originalEnd = clip.startTime + clip.duration;
  const maxStart = originalEnd - MIN_CLIP_DURATION;
  const minStartByTimeline = 0;
  const minStartBySource =
    clip.kind === 'video' || clip.kind === 'audio'
      ? clip.startTime - clip.sourceStart / clip.playbackSpeed
      : 0;

  const clampedStart = Math.min(
    maxStart,
    Math.max(minStartByTimeline, minStartBySource, newStartTime)
  );
  const deltaTimeline = clampedStart - clip.startTime;
  const newDuration = originalEnd - clampedStart;
  const newSourceStart =
    clip.kind === 'video' || clip.kind === 'audio'
      ? Math.max(0, clip.sourceStart + deltaTimeline * clip.playbackSpeed)
      : 0;

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: project.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            startTime: Number(clampedStart.toFixed(4)),
            duration: Number(newDuration.toFixed(4)),
            sourceStart: Number(newSourceStart.toFixed(4)),
          }
        : c
    ),
  };
}

export function trimClipEnd(
  project: AmapaProject,
  clipId: string,
  newDuration: number
): AmapaProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;
  const track = project.tracks.find((t) => t.id === clip.trackId);
  if (track?.locked) return project;

  const maxDurationBySource =
    clip.kind === 'video' || clip.kind === 'audio'
      ? (clip.sourceDuration - clip.sourceStart) / clip.playbackSpeed
      : 600;

  const clampedDuration = Math.min(
    Math.max(MIN_CLIP_DURATION, maxDurationBySource),
    Math.max(MIN_CLIP_DURATION, newDuration)
  );

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: project.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            duration: Number(clampedDuration.toFixed(4)),
          }
        : c
    ),
  };
}

export function splitClipAtTime(
  project: AmapaProject,
  clipId: string,
  splitTime: number
): AmapaProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip) return project;
  const track = project.tracks.find((t) => t.id === clip.trackId);
  if (track?.locked) return project;

  const clipEnd = clip.startTime + clip.duration;
  if (
    splitTime <= clip.startTime + MIN_CLIP_DURATION ||
    splitTime >= clipEnd - MIN_CLIP_DURATION
  ) {
    return project;
  }

  const firstDuration = Number((splitTime - clip.startTime).toFixed(4));
  const secondDuration = Number((clipEnd - splitTime).toFixed(4));
  const secondSourceStart =
    clip.kind === 'video' || clip.kind === 'audio'
      ? Number((clip.sourceStart + firstDuration * clip.playbackSpeed).toFixed(4))
      : 0;

  const firstClip: TimelineClip = {
    ...clip,
    duration: firstDuration,
    fadeOut: 0,
    transition: {
      ...clip.transition,
      outDuration: 0,
    },
  };

  const secondClip: TimelineClip = {
    ...clip,
    id: generateId('clip'),
    startTime: Number(splitTime.toFixed(4)),
    duration: secondDuration,
    sourceStart: secondSourceStart,
    fadeIn: 0,
    transform: { ...clip.transform },
    color: { ...clip.color },
    transition: {
      ...clip.transition,
      inDuration: 0,
    },
    textStyle: clip.textStyle ? { ...clip.textStyle } : undefined,
  };

  const nextClips: TimelineClip[] = [];
  for (const c of project.clips) {
    if (c.id === clipId) {
      nextClips.push(firstClip, secondClip);
    } else {
      nextClips.push(c);
    }
  }

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: nextClips,
  };
}

export function deleteClip(
  project: AmapaProject,
  clipId: string,
  options?: { ripple?: boolean }
): AmapaProject {
  const target = project.clips.find((c) => c.id === clipId);
  if (!target) return project;
  const track = project.tracks.find((t) => t.id === target.trackId);
  if (track?.locked) return project;

  const remaining = project.clips.filter((c) => c.id !== clipId);

  if (!options?.ripple) {
    return {
      ...project,
      updatedAt: new Date().toISOString(),
      clips: remaining,
    };
  }

  const gapDuration = target.duration;
  const rippleStart = target.startTime;
  const shifted = remaining.map((c) => {
    if (c.trackId === target.trackId && c.startTime > rippleStart) {
      return {
        ...c,
        startTime: Math.max(0, Number((c.startTime - gapDuration).toFixed(4))),
      };
    }
    return c;
  });

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: shifted,
  };
}

export function duplicateClip(project: AmapaProject, clipId: string): AmapaProject {
  const target = project.clips.find((c) => c.id === clipId);
  if (!target) return project;
  const track = project.tracks.find((t) => t.id === target.trackId);
  if (track?.locked) return project;

  const copy: TimelineClip = {
    ...target,
    id: generateId('clip'),
    startTime: Number((target.startTime + target.duration).toFixed(4)),
    transform: { ...target.transform },
    color: { ...target.color },
    transition: { ...target.transition },
    textStyle: target.textStyle ? { ...target.textStyle } : undefined,
  };

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: [...project.clips, copy],
  };
}

export function detachAudioFromClip(project: AmapaProject, clipId: string): AmapaProject {
  const clip = project.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind !== 'video' || !clip.mediaId) return project;

  let audioTrack = project.tracks.find((t) => t.kind === 'audio' && !t.locked);
  let updatedTracks = project.tracks;
  if (!audioTrack) {
    audioTrack = {
      id: generateId('track-audio'),
      name: 'Audio Desvinculado',
      kind: 'audio',
      muted: false,
      solo: false,
      visible: true,
      locked: false,
      order: project.tracks.length,
    };
    updatedTracks = [...project.tracks, audioTrack];
  }

  const detachedClip: TimelineClip = {
    id: generateId('clip-audio-detached'),
    trackId: audioTrack.id,
    kind: 'audio',
    mediaId: clip.mediaId,
    name: `${clip.name} (Audio)`,
    startTime: clip.startTime,
    duration: clip.duration,
    sourceStart: clip.sourceStart,
    sourceDuration: clip.sourceDuration,
    playbackSpeed: clip.playbackSpeed,
    volume: clip.volume,
    muted: false,
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
    transform: createDefaultTransform(),
    color: createDefaultColor(),
    transition: createDefaultTransition(),
  };

  const updatedClips = project.clips.map((c) =>
    c.id === clipId ? { ...c, muted: true } : c
  );

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: updatedTracks,
    clips: [...updatedClips, detachedClip],
  };
}

export function setClipPlaybackSpeed(
  project: AmapaProject,
  clipId: string,
  speed: number
): AmapaProject {
  const target = project.clips.find((c) => c.id === clipId);
  if (!target) return project;

  const clampedSpeed = Math.min(4, Math.max(0.25, Number(speed.toFixed(2))));
  const sourceSpan = target.duration * target.playbackSpeed;
  const maxAvailableSpan = Math.max(
    MIN_CLIP_DURATION,
    target.sourceDuration - target.sourceStart
  );
  const effectiveSpan = Math.min(sourceSpan, maxAvailableSpan);
  const newDuration = Math.max(
    MIN_CLIP_DURATION,
    Number((effectiveSpan / clampedSpeed).toFixed(4))
  );

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: project.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            playbackSpeed: clampedSpeed,
            duration: newDuration,
          }
        : c
    ),
  };
}

export function updateClip(
  project: AmapaProject,
  clipId: string,
  updater: (clip: TimelineClip) => TimelineClip
): AmapaProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    clips: project.clips.map((c) => (c.id === clipId ? updater(c) : c)),
  };
}

export function addTrack(
  project: AmapaProject,
  kind: TrackKind,
  customName?: string
): AmapaProject {
  const count = project.tracks.filter((t) => t.kind === kind).length + 1;
  const defaultLabel =
    kind === 'video' ? `Video ${count}` : kind === 'audio' ? `Audio ${count}` : `Titles ${count}`;
  const newTrack: TimelineTrack = {
    id: generateId(`track-${kind}`),
    name: customName?.trim() || defaultLabel,
    kind,
    muted: false,
    solo: false,
    visible: true,
    locked: false,
    order: kind === 'audio' ? project.tracks.length : 0,
  };

  const nextTracks =
    kind === 'audio'
      ? [...project.tracks, newTrack]
      : [newTrack, ...project.tracks];

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: nextTracks.map((t, idx) => ({ ...t, order: idx })),
  };
}

export function renameTrack(
  project: AmapaProject,
  trackId: string,
  name: string
): AmapaProject {
  const trimmed = name.trim();
  if (!trimmed) return project;
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, name: trimmed } : t)),
  };
}

export function updateTrack(
  project: AmapaProject,
  trackId: string,
  patch: Partial<Omit<TimelineTrack, 'id' | 'kind'>>
): AmapaProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

export function deleteTrack(project: AmapaProject, trackId: string): AmapaProject {
  if (project.tracks.length <= 1) return project;
  const remainingTracks = project.tracks
    .filter((t) => t.id !== trackId)
    .map((t, idx) => ({ ...t, order: idx }));
  const remainingClips = project.clips.filter((c) => c.trackId !== trackId);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    tracks: remainingTracks,
    clips: remainingClips,
  };
}

/**
 * Returns active visual clips (video, image, text) at timeline time `timeSec`,
 * ordered from bottom layer (drawn first) to top layer (drawn last).
 */
export function getActiveVisualClipsAtTime(
  project: Pick<AmapaProject, 'tracks' | 'clips'>,
  timeSec: number
): TimelineClip[] {
  const visibleTracks = project.tracks
    .filter((t) => t.visible && (t.kind === 'video' || t.kind === 'text'))
    // Higher `order` is lower in the visual stack (drawn first), lower `order` is on top (drawn last)
    .sort((a, b) => b.order - a.order);

  const result: TimelineClip[] = [];
  for (const track of visibleTracks) {
    const trackClips = project.clips
      .filter(
        (c) =>
          c.trackId === track.id &&
          (c.kind === 'video' || c.kind === 'image' || c.kind === 'text') &&
          timeSec >= c.startTime &&
          timeSec < c.startTime + c.duration
      )
      .sort((a, b) => a.startTime - b.startTime);
    result.push(...trackClips);
  }
  return result;
}

/**
 * Returns active audible clips (audio or video) at timeline time `timeSec`,
 * taking into account track mute, track solo, clip mute, and clip volume.
 */
export function getActiveAudioClipsAtTime(
  project: Pick<AmapaProject, 'tracks' | 'clips'>,
  timeSec: number
): Array<{ clip: TimelineClip; effectiveGain: number }> {
  const anySolo = project.tracks.some((t) => t.solo);
  const audibleTrackIds = new Set(
    project.tracks
      .filter((t) => {
        if (anySolo) return t.solo && !t.muted;
        return !t.muted;
      })
      .map((t) => t.id)
  );

  const result: Array<{ clip: TimelineClip; effectiveGain: number }> = [];
  for (const clip of project.clips) {
    if (clip.kind !== 'audio' && clip.kind !== 'video') continue;
    if (clip.muted || clip.volume <= 0) continue;
    if (!audibleTrackIds.has(clip.trackId)) continue;
    if (timeSec < clip.startTime || timeSec >= clip.startTime + clip.duration) continue;

    const elapsed = timeSec - clip.startTime;
    const remaining = clip.startTime + clip.duration - timeSec;
    let envelope = 1;

    if (clip.fadeIn > 0 && elapsed < clip.fadeIn) {
      envelope *= Math.max(0, Math.min(1, elapsed / clip.fadeIn));
    }
    if (clip.fadeOut > 0 && remaining < clip.fadeOut) {
      envelope *= Math.max(0, Math.min(1, remaining / clip.fadeOut));
    }

    result.push({
      clip,
      effectiveGain: Number((clip.volume * envelope).toFixed(4)),
    });
  }

  return result;
}

export function relinkMediaAsset(
  project: AmapaProject,
  mediaId: string,
  newPatch: Partial<MediaAsset>
): AmapaProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    media: project.media.map((m) =>
      m.id === mediaId
        ? {
            ...m,
            ...newPatch,
            status: newPatch.status ?? 'session',
            errorMessage: undefined,
          }
        : m
    ),
  };
}

export function serializeProject(project: AmapaProject): string {
  const cleanMedia: MediaAsset[] = project.media.map((m) => ({
    ...m,
    // Ephemeral blob URLs do not survive across sessions
    objectUrl: undefined,
  }));
  const payload: AmapaProject = {
    ...project,
    schemaVersion: 1,
    media: cleanMedia,
  };
  return JSON.stringify(payload, null, 2);
}

export function deserializeProject(jsonString: string): AmapaProject {
  const parsed = JSON.parse(jsonString) as Partial<AmapaProject>;
  if (!parsed || typeof parsed !== 'object' || parsed.schemaVersion !== 1) {
    throw new Error('Unsupported or corrupted AMAPA project file (expected schemaVersion: 1).');
  }
  if (!Array.isArray(parsed.tracks) || !Array.isArray(parsed.clips) || !Array.isArray(parsed.media)) {
    throw new Error('Invalid project structure: missing tracks, clips, or media array.');
  }

  // Mark media assets without an active objectUrl as needing relink unless hydrated from IndexedDB
  const hydratedMedia: MediaAsset[] = parsed.media.map((m) => ({
    ...m,
    status: m.objectUrl ? m.status : 'missing',
  }));

  return {
    schemaVersion: 1,
    id: parsed.id || generateId('proj'),
    name: parsed.name || 'Imported Project',
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: parsed.updatedAt || new Date().toISOString(),
    settings: parsed.settings || {
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
    },
    folders: parsed.folders || ['All Media', 'Footage', 'Audio', 'Graphics'],
    media: hydratedMedia,
    tracks: parsed.tracks,
    clips: parsed.clips,
    exportSettings: parsed.exportSettings || createDefaultExportSettings(parsed.name || 'amapa-video'),
  };
}

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistoryState<T>(initial: T): HistoryState<T> {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

export function pushHistory<T>(
  history: HistoryState<T>,
  nextState: T,
  maxLimit = 50
): HistoryState<T> {
  if (history.present === nextState) return history;
  const nextPast = [...history.past, history.present];
  if (nextPast.length > maxLimit) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    present: nextState,
    future: [],
  };
}

export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const newPast = history.past.slice(0, -1);
  return {
    past: newPast,
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const newFuture = history.future.slice(1);
  return {
    past: [...history.past, history.present],
    present: next,
    future: newFuture,
  };
}

export type ClipKindFilter = 'all' | ClipKind;
