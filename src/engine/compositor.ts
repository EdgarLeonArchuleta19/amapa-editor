import {
  AmapaProject,
  CanvasFitMode,
  ClipColorAdjustments,
  TimelineClip,
} from '../types/project';
import { getActiveVisualClipsAtTime } from './timelineEngine';

export type VisualSourceElement =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap;

export function buildCanvasFilterString(color: ClipColorAdjustments): string {
  const b = Math.max(0, 100 + color.brightness);
  const c = Math.max(0, 100 + color.contrast);
  const s = Math.max(0, 100 + color.saturation);
  const parts: string[] = [];

  if (b !== 100) parts.push(`brightness(${b}%)`);
  if (c !== 100) parts.push(`contrast(${c}%)`);
  if (s !== 100) parts.push(`saturate(${s}%)`);
  if (color.temperature > 0) {
    const sepiaAmt = Math.min(45, Math.round(color.temperature * 0.35));
    parts.push(`sepia(${sepiaAmt}%)`);
  } else if (color.temperature < 0) {
    const hueRotate = Math.round((color.temperature / 100) * 25);
    parts.push(`hue-rotate(${hueRotate}deg)`);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

export interface TransitionRenderState {
  alphaMultiplier: number;
  wipeProgress: number | null; // 0..1 when wipe-left transition is active
}

export function computeTransitionState(
  clip: TimelineClip,
  timelineTime: number
): TransitionRenderState {
  const elapsed = Math.max(0, timelineTime - clip.startTime);
  const remaining = Math.max(0, clip.startTime + clip.duration - timelineTime);
  const { type, inDuration, outDuration } = clip.transition;

  let alphaMultiplier = 1;
  let wipeProgress: number | null = null;

  if (type === 'fade' || type === 'crossfade') {
    if (inDuration > 0 && elapsed < inDuration) {
      alphaMultiplier *= Math.max(0, Math.min(1, elapsed / inDuration));
    }
    if (outDuration > 0 && remaining < outDuration) {
      alphaMultiplier *= Math.max(0, Math.min(1, remaining / outDuration));
    }
  } else if (type === 'wipe-left') {
    if (inDuration > 0 && elapsed < inDuration) {
      wipeProgress = Math.max(0, Math.min(1, elapsed / inDuration));
    } else if (outDuration > 0 && remaining < outDuration) {
      wipeProgress = Math.max(0, Math.min(1, remaining / outDuration));
    }
  }

  return {
    alphaMultiplier: Number(alphaMultiplier.toFixed(4)),
    wipeProgress,
  };
}

function getSourceDimensions(source: VisualSourceElement): { width: number; height: number } {
  if ('videoWidth' in source && source.videoWidth > 0) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if ('naturalWidth' in source && source.naturalWidth > 0) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width || 1920, height: source.height || 1080 };
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full.slice(0, 6), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function renderClipToCanvasContext(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  timelineTime: number,
  canvasWidth: number,
  canvasHeight: number,
  source?: VisualSourceElement,
  projectFitMode: CanvasFitMode = 'fit'
): void {
  const { transform, color } = clip;
  const { alphaMultiplier, wipeProgress } = computeTransitionState(clip, timelineTime);

  // Compute entry animation state if configured
  const clipElapsed = timelineTime - clip.startTime;
  const animDuration = 0.45;
  let animScale = 1;
  let animOffsetX = 0;
  let animOffsetY = 0;
  let animAlpha = 1;

  if (clip.animation && clip.animation !== 'none' && clipElapsed >= 0 && clipElapsed < animDuration) {
    const progress = Math.min(1, clipElapsed / animDuration);
    const eased = 1 - Math.pow(1 - progress, 3);

    if (clip.animation === 'fade') {
      animAlpha = eased;
    } else if (clip.animation === 'pop') {
      animScale = 0.4 + 0.6 * eased;
      animAlpha = Math.min(1, eased * 1.5);
    } else if (clip.animation === 'slide-up') {
      animOffsetY = (1 - eased) * (canvasHeight * 0.25);
      animAlpha = eased;
    } else if (clip.animation === 'slide-left') {
      animOffsetX = (1 - eased) * (canvasWidth * 0.25);
      animAlpha = eased;
    }
  }

  const effectiveAlpha = Math.max(0, Math.min(1, transform.opacity * alphaMultiplier * animAlpha));
  if (effectiveAlpha <= 0.001) return;

  ctx.save();

  if (wipeProgress !== null) {
    ctx.beginPath();
    ctx.rect(0, 0, canvasWidth * wipeProgress, canvasHeight);
    ctx.clip();
  }

  ctx.globalAlpha = effectiveAlpha;
  const filterStr = buildCanvasFilterString(color);
  if ('filter' in ctx) {
    ctx.filter = filterStr;
  }

  const centerX = canvasWidth / 2 + (transform.x / 100) * canvasWidth + animOffsetX;
  const centerY = canvasHeight / 2 + (transform.y / 100) * canvasHeight + animOffsetY;

  ctx.translate(centerX, centerY);
  if (transform.rotation !== 0) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }
  const scaleX = transform.scale * animScale * (transform.flipH ? -1 : 1);
  const scaleY = transform.scale * animScale * (transform.flipV ? -1 : 1);
  ctx.scale(scaleX, scaleY);

  if (clip.kind === 'text' && clip.textStyle) {
    renderTextClipContent(ctx, clip, canvasWidth, canvasHeight);
  } else if (source) {
    const { width: srcW, height: srcH } = getSourceDimensions(source);
    if (srcW > 0 && srcH > 0) {
      // Calculate fit vs fill (contain vs cover/crop)
      const mode = clip.fitMode || projectFitMode;
      const fitScale =
        mode === 'fill'
          ? Math.max(canvasWidth / srcW, canvasHeight / srcH)
          : Math.min(canvasWidth / srcW, canvasHeight / srcH);
      const drawW = srcW * fitScale;
      const drawH = srcH * fitScale;

      const cropL = Math.max(0, Math.min(0.45, transform.cropLeft / 100));
      const cropR = Math.max(0, Math.min(0.45, transform.cropRight / 100));
      const cropT = Math.max(0, Math.min(0.45, transform.cropTop / 100));
      const cropB = Math.max(0, Math.min(0.45, transform.cropBottom / 100));

      const sx = srcW * cropL;
      const sy = srcH * cropT;
      const sw = Math.max(1, srcW * (1 - cropL - cropR));
      const sh = Math.max(1, srcH * (1 - cropT - cropB));

      const dx = -drawW / 2 + drawW * cropL;
      const dy = -drawH / 2 + drawH * cropT;
      const dw = drawW * (1 - cropL - cropR);
      const dh = drawH * (1 - cropT - cropB);

      ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);

      // Apply subtle warm/cool color temperature tint overlay
      if (color.temperature !== 0) {
        const tintAlpha = Math.min(0.22, Math.abs(color.temperature) / 450);
        ctx.fillStyle =
          color.temperature > 0
            ? `rgba(255, 148, 46, ${tintAlpha})`
            : `rgba(56, 152, 255, ${tintAlpha})`;
        ctx.fillRect(dx, dy, dw, dh);
      }
    }
  }

  ctx.restore();
}

function renderTextClipContent(
  ctx: CanvasRenderingContext2D,
  clip: TimelineClip,
  canvasWidth: number,
  canvasHeight: number
): void {
  const style = clip.textStyle;
  if (!style || !style.text) return;

  const scaleFactor = canvasHeight / 1080;
  const fontSizePx = Math.max(12, Math.round(style.fontSize * scaleFactor));
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontSizePx}px ${style.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = style.align;

  const lines = style.text.split('\n');
  const lineHeight = Math.round(fontSizePx * 1.28);
  const totalHeight = lines.length * lineHeight;

  let maxLineWidth = 0;
  for (const line of lines) {
    const measured = ctx.measureText(line).width;
    if (measured > maxLineWidth) maxLineWidth = measured;
  }

  const padX = Math.round(28 * scaleFactor);
  const padY = Math.round(16 * scaleFactor);
  const boxW = Math.min(canvasWidth * 0.92, Math.max(maxLineWidth + padX * 2, 120 * scaleFactor));
  const boxH = totalHeight + padY * 2;

  if (style.backgroundOpacity > 0.01) {
    ctx.fillStyle = hexToRgba(style.backgroundColor, style.backgroundOpacity);
    const radius = Math.round(10 * scaleFactor);
    const bx = -boxW / 2;
    const by = -boxH / 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, boxW, boxH, radius);
    } else {
      ctx.rect(bx, by, boxW, boxH);
    }
    ctx.fill();
  }

  const anchorX =
    style.align === 'left'
      ? -boxW / 2 + padX
      : style.align === 'right'
      ? boxW / 2 - padX
      : 0;

  const startY = -totalHeight / 2 + lineHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    if (style.outlineWidth > 0) {
      ctx.strokeStyle = style.outlineColor;
      ctx.lineWidth = Math.max(1, style.outlineWidth * scaleFactor);
      ctx.lineJoin = 'round';
      ctx.strokeText(lines[i], anchorX, y);
    }
    ctx.fillStyle = style.color;
    ctx.fillText(lines[i], anchorX, y);
  }
}

export function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  project: Pick<AmapaProject, 'settings' | 'tracks' | 'clips'>,
  timelineTime: number,
  canvasWidth: number,
  canvasHeight: number,
  sourcesByMediaId: Map<string, VisualSourceElement>
): void {
  ctx.save();
  ctx.fillStyle = project.settings.backgroundColor || '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  const activeClips = getActiveVisualClipsAtTime(project, timelineTime);
  const fitMode = project.settings.fitMode || 'fit';
  for (const clip of activeClips) {
    const source = clip.mediaId ? sourcesByMediaId.get(clip.mediaId) : undefined;
    renderClipToCanvasContext(
      ctx,
      clip,
      timelineTime,
      canvasWidth,
      canvasHeight,
      source,
      fitMode
    );
  }
}
