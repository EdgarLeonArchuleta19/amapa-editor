export type MediaKind = 'video' | 'audio' | 'image';

export type MediaPersistenceStatus =
  | 'importing'
  | 'session'
  | 'persisted'
  | 'missing'
  | 'error';

export interface MediaAsset {
  id: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  fileSize: number;
  duration: number; // in seconds (for images, default display duration e.g. 5s)
  width: number;
  height: number;
  folder: string;
  status: MediaPersistenceStatus;
  errorMessage?: string;
  thumbnailDataUrl?: string;
  waveformPeaks?: number[];
  objectUrl?: string;
  createdAt: string;
}

export interface ClipTransform {
  x: number; // normalized offset (-100 to 100%)
  y: number; // normalized offset (-100 to 100%)
  scale: number; // 0.1 to 4.0 (1 = 100%)
  rotation: number; // -180 to 180 degrees
  flipH: boolean;
  flipV: boolean;
  opacity: number; // 0 to 1
  cropTop: number; // 0 to 45%
  cropRight: number; // 0 to 45%
  cropBottom: number; // 0 to 45%
  cropLeft: number; // 0 to 45%
}

export interface ClipColorAdjustments {
  brightness: number; // -100 to 100 (0 = default)
  contrast: number; // -100 to 100 (0 = default)
  saturation: number; // -100 to 100 (0 = default)
  temperature: number; // -100 (cool) to 100 (warm) (0 = default)
}

export type TransitionType = 'none' | 'fade' | 'crossfade' | 'wipe-left';

export interface ClipTransition {
  type: TransitionType;
  inDuration: number; // seconds
  outDuration: number; // seconds
}

export type TextAlignMode = 'left' | 'center' | 'right';

export interface TextOverlayStyle {
  text: string;
  fontFamily: string;
  fontSize: number; // px relative to 1080p height
  fontWeight: 'normal' | 'bold' | '800';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor: string;
  backgroundOpacity: number; // 0 to 1
  outlineColor: string;
  outlineWidth: number; // 0 to 12 px
  align: TextAlignMode;
  presetId?: string;
}

export type ClipKind = 'video' | 'audio' | 'image' | 'text';

export type CanvasFitMode = 'fit' | 'fill';

export type ClipAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'slide-left';

export interface TimelineClip {
  id: string;
  trackId: string;
  kind: ClipKind;
  mediaId?: string;
  name: string;
  startTime: number; // timeline position in seconds
  duration: number; // timeline duration in seconds
  sourceStart: number; // offset inside source asset in seconds
  sourceDuration: number; // max source duration in seconds
  playbackSpeed: number; // 0.25 to 4.0
  volume: number; // 0 to 2.0 (1.0 = 100%)
  muted: boolean;
  fadeIn: number; // audio fade in seconds
  fadeOut: number; // audio fade out seconds
  fitMode?: CanvasFitMode;
  animation?: ClipAnimation;
  transform: ClipTransform;
  color: ClipColorAdjustments;
  transition: ClipTransition;
  textStyle?: TextOverlayStyle;
}

export type TrackKind = 'video' | 'audio' | 'text';

export interface TimelineTrack {
  id: string;
  name: string;
  kind: TrackKind;
  muted: boolean;
  solo: boolean;
  visible: boolean;
  locked: boolean;
  order: number;
}

export type ExportContainer = 'mp4' | 'webm' | 'wav';
export type VideoCodecId =
  | 'avc1.42001f'
  | 'vp09.00.10.08'
  | 'vp8'
  | 'av01.0.04M.08'
  | 'none';
export type AudioCodecId = 'mp4a.40.2' | 'opus' | 'pcm';

export interface ExportPreset {
  id: string;
  labelKey: string;
  descriptionKey: string;
  width: number;
  height: number;
  fps: number;
  container: ExportContainer;
  videoCodec: VideoCodecId;
  audioCodec: AudioCodecId;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
}

export interface ExportSettings {
  mode: 'simple' | 'advanced';
  presetId: string;
  container: ExportContainer;
  videoCodec: VideoCodecId;
  audioCodec: AudioCodecId;
  width: number;
  height: number;
  fps: number;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
  sampleRate: 44100 | 48000;
  channels: 1 | 2;
  filename: string;
  useCustomRange: boolean;
  rangeStart: number;
  rangeEnd: number;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  aspectRatio?: string;
  fitMode?: CanvasFitMode;
}

export interface AmapaProject {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  folders: string[];
  media: MediaAsset[];
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  exportSettings: ExportSettings;
}
