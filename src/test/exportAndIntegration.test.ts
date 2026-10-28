import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  addClipFromMedia,
  addTextClip,
  createDefaultProject,
  TITLE_PRESETS,
} from '../engine/timelineEngine';
import {
  encodePCMToWavBlob,
  exportTimelineToBlob,
  validateExportSettings,
} from '../engine/exportEngine';
import {
  createSynthesizedAudioFile,
  createSynthesizedGraphicFile,
  validateMediaFile,
} from '../engine/mediaAnalyzer';
import {
  buildCanvasFilterString,
  computeTransitionState,
  renderCompositeFrame,
} from '../engine/compositor';
import {
  clearMemoryStorageForTests,
  loadProjectById,
  saveProjectToStorage,
} from '../storage/projectStorage';
import { App } from '../App';

describe('Export Validation, Media Processing & End-to-End Workflow', () => {
  it('validates export settings and flags incompatible container/codec combinations', () => {
    let proj = createDefaultProject();
    // Empty timeline is invalid for export
    expect(validateExportSettings(proj).valid).toBe(false);

    proj = addTextClip(proj, TITLE_PRESETS[0], 0, 4);
    const validMp4 = validateExportSettings(proj);
    expect(validMp4.valid).toBe(true);
    expect(validMp4.effectiveDuration).toBe(4);
    expect(validMp4.estimatedSizeMB).toBeGreaterThan(0);

    // Incompatible: MP4 with VP8 video codec
    const badCombo = validateExportSettings(proj, {
      ...proj.exportSettings,
      container: 'mp4',
      videoCodec: 'vp8',
    });
    expect(badCombo.valid).toBe(false);
    expect(badCombo.errors.some((e) => e.includes('not compatible with MP4'))).toBe(true);

    // Odd dimensions warning & even normalization
    const oddDims = validateExportSettings(proj, {
      ...proj.exportSettings,
      width: 1921,
      height: 1079,
    });
    expect(oddDims.valid).toBe(true);
    expect(oddDims.normalizedWidth).toBe(1922);
    expect(oddDims.normalizedHeight).toBe(1080);
    expect(oddDims.warnings.length).toBeGreaterThan(0);
  });

  it('validates media files and rejects empty or unsupported formats', () => {
    const validAudio = createSynthesizedAudioFile('test.wav', 1);
    expect(validateMediaFile(validAudio).valid).toBe(true);
    expect(validateMediaFile(validAudio).kind).toBe('audio');

    const emptyFile = new File([], 'empty.mp4', { type: 'video/mp4' });
    expect(validateMediaFile(emptyFile).valid).toBe(false);

    const unsupportedFile = new File(['abc'], 'malware.exe', {
      type: 'application/x-msdownload',
    });
    expect(validateMediaFile(unsupportedFile).valid).toBe(false);
  });

  it('computes compositor filter strings and transition states accurately', () => {
    const filter = buildCanvasFilterString({
      brightness: 20,
      contrast: -10,
      saturation: 30,
      temperature: 40,
    });
    expect(filter).toContain('brightness(120%)');
    expect(filter).toContain('contrast(90%)');
    expect(filter).toContain('saturate(130%)');
    expect(filter).toContain('sepia(');

    const proj = addTextClip(createDefaultProject(), TITLE_PRESETS[0], 0, 4);
    const clip = proj.clips[0];
    clip.transition = { type: 'fade', inDuration: 1, outDuration: 1 };

    expect(computeTransitionState(clip, 0.5).alphaMultiplier).toBeCloseTo(0.5, 2);
    expect(computeTransitionState(clip, 2.0).alphaMultiplier).toBeCloseTo(1.0, 2);
    expect(computeTransitionState(clip, 3.5).alphaMultiplier).toBeCloseTo(0.5, 2);
  });

  it('encodes valid RIFF WAVE PCM audio files and exports timeline video & audio without watermarks', async () => {
    const left = new Float32Array(4410);
    const right = new Float32Array(4410);
    const wavBlob = encodePCMToWavBlob([left, right], 44100);
    expect(wavBlob.type).toBe('audio/wav');
    expect(wavBlob.size).toBe(44 + 4410 * 2 * 2);

    // Render and export a timeline containing a graphic clip and title overlay
    let proj = createDefaultProject('Render Test');
    const graphicFile = createSynthesizedGraphicFile('card.svg');
    proj.media.push({
      id: 'm1',
      name: graphicFile.name,
      kind: 'image',
      mimeType: graphicFile.type,
      fileSize: graphicFile.size,
      duration: 1,
      width: 1920,
      height: 1080,
      folder: 'All Media',
      status: 'session',
      createdAt: new Date().toISOString(),
    });
    proj = addClipFromMedia(proj, proj.media[0], { startTime: 0 });
    proj.clips[0].duration = 0.5;
    proj = addTextClip(proj, TITLE_PRESETS[0], 0, 0.5);

    const videoResult = await exportTimelineToBlob(proj, {
      settings: {
        ...proj.exportSettings,
        width: 640,
        height: 360,
        fps: 12,
      },
    });
    expect(videoResult.blob.size).toBeGreaterThan(32);
    expect(videoResult.width).toBe(640);
    expect(videoResult.height).toBe(360);
    expect(videoResult.totalFrames).toBe(6);

    // Verify WAV audio export mode as well
    const wavResult = await exportTimelineToBlob(proj, {
      settings: {
        ...proj.exportSettings,
        container: 'wav',
        videoCodec: 'none',
        audioCodec: 'pcm',
      },
    });
    expect(wavResult.mimeType).toBe('audio/wav');
    expect(wavResult.blob.size).toBeGreaterThan(44);
  });

  it('persists and reopens projects via projectStorage', async () => {
    clearMemoryStorageForTests();
    let proj = createDefaultProject('Persisted Documentary');
    proj = addTextClip(proj, TITLE_PRESETS[1], 0, 5);

    await saveProjectToStorage(proj);
    const loaded = await loadProjectById(proj.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.project.name).toBe('Persisted Documentary');
    expect(loaded!.project.clips).toHaveLength(1);
  });

  it('runs a complete end-to-end UI editing and export workflow', async () => {
    clearMemoryStorageForTests();
    render(React.createElement(App));

    // 1. Verify AMAPA brand header
    expect(screen.getByText('AMAPA')).toBeInTheDocument();

    // 2. Import audio & graphic files via file input
    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const sampleAudio = createSynthesizedAudioFile('ambient-chord.wav', 1);
    const sampleGraphic = createSynthesizedGraphicFile('scene.svg');

    fireEvent.change(fileInput, {
      target: { files: [sampleGraphic, sampleAudio] },
    });

    await waitFor(
      () => {
        expect(screen.getAllByText('ambient-chord.wav').length).toBeGreaterThan(0);
      },
      { timeout: 4000 }
    );

    // 3. Render composite preview frame
    const canvas = screen.getByTestId('preview-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    renderCompositeFrame(ctx, createDefaultProject(), 0, 640, 360, new Map());

    // 4. Open Export Modal and run export
    const openExportBtn = screen.getByTestId('open-export-modal-btn');
    fireEvent.click(openExportBtn);

    const startExportBtn = screen.getByTestId('start-export-btn');
    fireEvent.click(startExportBtn);

    await waitFor(
      () => {
        expect(screen.getByTestId('export-complete-card')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(screen.getByTestId('download-export-link')).toBeInTheDocument();
  });
});
