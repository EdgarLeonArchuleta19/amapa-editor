import { describe, expect, it } from 'vitest';
import {
  addClipFromMedia,
  addTextClip,
  addTrack,
  createDefaultProject,
  createHistoryState,
  deleteClip,
  deleteTrack,
  deserializeProject,
  duplicateClip,
  findSnapTime,
  formatTimecode,
  getActiveAudioClipsAtTime,
  getActiveVisualClipsAtTime,
  getTimelineDuration,
  moveClip,
  pushHistory,
  redoHistory,
  relinkMediaAsset,
  renameTrack,
  serializeProject,
  setClipPlaybackSpeed,
  splitClipAtTime,
  TITLE_PRESETS,
  trimClipEnd,
  trimClipStart,
  undoHistory,
  updateTrack,
} from '../engine/timelineEngine';
import { MediaAsset } from '../types/project';

function makeSampleVideoAsset(id = 'media-v1', duration = 10): MediaAsset {
  return {
    id,
    name: 'sample.mp4',
    kind: 'video',
    mimeType: 'video/mp4',
    fileSize: 1024 * 500,
    duration,
    width: 1920,
    height: 1080,
    folder: 'All Media',
    status: 'persisted',
    objectUrl: 'blob:sample-v1',
    createdAt: new Date().toISOString(),
  };
}

function makeSampleAudioAsset(id = 'media-a1', duration = 8): MediaAsset {
  return {
    id,
    name: 'music.wav',
    kind: 'audio',
    mimeType: 'audio/wav',
    fileSize: 1024 * 200,
    duration,
    width: 0,
    height: 0,
    folder: 'Audio',
    status: 'persisted',
    objectUrl: 'blob:sample-a1',
    createdAt: new Date().toISOString(),
  };
}

describe('Timeline Engine — Core Math & Editing Operations', () => {
  it('formats timecode accurately at 30fps', () => {
    expect(formatTimecode(0, 30)).toBe('00:00.00');
    expect(formatTimecode(1.5, 30)).toBe('00:01.15');
    expect(formatTimecode(65.1, 30)).toBe('01:05.03');
    expect(formatTimecode(3661, 30)).toBe('01:01:01.00');
  });

  it('places clips on compatible tracks and calculates total timeline duration', () => {
    let proj = createDefaultProject('Test Project');
    expect(getTimelineDuration(proj)).toBe(0);

    const videoAsset = makeSampleVideoAsset('v1', 10);
    const audioAsset = makeSampleAudioAsset('a1', 14.5);

    proj = addClipFromMedia(proj, videoAsset);
    expect(proj.clips).toHaveLength(1);
    expect(getTimelineDuration(proj)).toBe(10);

    proj = addClipFromMedia(proj, audioAsset);
    expect(proj.clips).toHaveLength(2);
    expect(getTimelineDuration(proj)).toBe(14.5);
  });

  it('trims clip start and end within source bounds', () => {
    let proj = createDefaultProject();
    const asset = makeSampleVideoAsset('v1', 10);
    proj = addClipFromMedia(proj, asset);
    const clipId = proj.clips[0].id;

    // Trim 2 seconds off the start
    proj = trimClipStart(proj, clipId, 2);
    expect(proj.clips[0].startTime).toBe(2);
    expect(proj.clips[0].duration).toBe(8);
    expect(proj.clips[0].sourceStart).toBe(2);

    // Trim end to 5 seconds duration
    proj = trimClipEnd(proj, clipId, 5);
    expect(proj.clips[0].duration).toBe(5);

    // Attempting to extend beyond remaining source duration (10 - 2 = 8s max) clamps at 8s
    proj = trimClipEnd(proj, clipId, 25);
    expect(proj.clips[0].duration).toBe(8);
  });

  it('splits a clip at the playhead into two contiguous clips with accurate source offsets', () => {
    let proj = createDefaultProject();
    const asset = makeSampleVideoAsset('v1', 10);
    proj = addClipFromMedia(proj, asset);
    const originalId = proj.clips[0].id;

    proj = splitClipAtTime(proj, originalId, 4);
    expect(proj.clips).toHaveLength(2);

    const [first, second] = proj.clips;
    expect(first.startTime).toBe(0);
    expect(first.duration).toBe(4);
    expect(first.sourceStart).toBe(0);

    expect(second.startTime).toBe(4);
    expect(second.duration).toBe(6);
    expect(second.sourceStart).toBe(4);
  });

  it('supports ripple delete and non-ripple delete', () => {
    let proj = createDefaultProject();
    const asset1 = makeSampleVideoAsset('v1', 4);
    const asset2 = makeSampleVideoAsset('v2', 6);
    proj = addClipFromMedia(proj, asset1, { trackId: 'track-video-1' });
    proj = addClipFromMedia(proj, asset2, { trackId: 'track-video-1' });

    expect(proj.clips[0].startTime).toBe(0);
    expect(proj.clips[1].startTime).toBe(4);

    // Ripple delete first clip -> second clip shifts to 0
    const rippled = deleteClip(proj, proj.clips[0].id, { ripple: true });
    expect(rippled.clips).toHaveLength(1);
    expect(rippled.clips[0].startTime).toBe(0);

    // Standard delete first clip -> second clip stays at 4
    const nonRippled = deleteClip(proj, proj.clips[0].id, { ripple: false });
    expect(nonRippled.clips).toHaveLength(1);
    expect(nonRippled.clips[0].startTime).toBe(4);
  });

  it('duplicates clips and adjusts playback speed proportionally', () => {
    let proj = createDefaultProject();
    proj = addClipFromMedia(proj, makeSampleVideoAsset('v1', 8));
    const clipId = proj.clips[0].id;

    proj = setClipPlaybackSpeed(proj, clipId, 2);
    expect(proj.clips[0].playbackSpeed).toBe(2);
    expect(proj.clips[0].duration).toBe(4);

    proj = duplicateClip(proj, clipId);
    expect(proj.clips).toHaveLength(2);
    expect(proj.clips[1].startTime).toBe(4);
    expect(proj.clips[1].duration).toBe(4);
  });

  it('snaps clip movement to playhead and neighboring clip boundaries', () => {
    let proj = createDefaultProject();
    proj = addClipFromMedia(proj, makeSampleVideoAsset('v1', 5));
    const snapNearEnd = findSnapTime(5.12, proj.clips, 12, undefined, 0.25);
    expect(snapNearEnd.didSnap).toBe(true);
    expect(snapNearEnd.snappedTime).toBe(5);

    const snapNearPlayhead = findSnapTime(11.9, proj.clips, 12, undefined, 0.25);
    expect(snapNearPlayhead.didSnap).toBe(true);
    expect(snapNearPlayhead.snappedTime).toBe(12);
  });

  it('manages track creation, renaming, locking, visibility, mute, solo, and deletion', () => {
    let proj = createDefaultProject();
    const initialCount = proj.tracks.length;

    proj = addTrack(proj, 'video', 'B-Roll Track');
    expect(proj.tracks).toHaveLength(initialCount + 1);
    const addedTrack = proj.tracks.find((t) => t.name === 'B-Roll Track')!;
    expect(addedTrack).toBeDefined();

    proj = renameTrack(proj, addedTrack.id, 'Renamed B-Roll');
    expect(proj.tracks.find((t) => t.id === addedTrack.id)?.name).toBe('Renamed B-Roll');

    // Lock track -> moving clips on locked track is prevented
    proj = addClipFromMedia(proj, makeSampleVideoAsset('v1', 5), {
      trackId: addedTrack.id,
      startTime: 0,
    });
    const clipOnTrack = proj.clips[0];
    proj = updateTrack(proj, addedTrack.id, { locked: true });
    const attemptedMove = moveClip(proj, clipOnTrack.id, 10);
    expect(attemptedMove.clips[0].startTime).toBe(0);

    // Delete track removes its clips
    proj = deleteTrack(proj, addedTrack.id);
    expect(proj.tracks.find((t) => t.id === addedTrack.id)).toBeUndefined();
    expect(proj.clips).toHaveLength(0);
  });

  it('resolves active visual and audio clips respecting layer order, solo, mute, and fades', () => {
    let proj = createDefaultProject();
    proj = addClipFromMedia(proj, makeSampleVideoAsset('v1', 6), {
      trackId: 'track-video-1',
      startTime: 0,
    });
    proj = addTextClip(proj, TITLE_PRESETS[0], 1, 3);

    // At t = 2s, both video-1 (bottom) and text-1 (top) are active
    const visualsAt2 = getActiveVisualClipsAtTime(proj, 2);
    expect(visualsAt2).toHaveLength(2);
    expect(visualsAt2[0].kind).toBe('video');
    expect(visualsAt2[1].kind).toBe('text');

    // Hide text track -> only video clip remains visible
    proj = updateTrack(proj, 'track-text-1', { visible: false });
    expect(getActiveVisualClipsAtTime(proj, 2)).toHaveLength(1);

    // Audio fade-in calculation
    proj.clips[0] = {
      ...proj.clips[0],
      fadeIn: 2,
      volume: 1,
    };
    const audioAt1 = getActiveAudioClipsAtTime(proj, 1);
    expect(audioAt1).toHaveLength(1);
    expect(audioAt1[0].effectiveGain).toBeCloseTo(0.5, 2);
  });

  it('supports undo and redo history transitions', () => {
    const p0 = createDefaultProject('Step 0');
    let history = createHistoryState(p0);

    const p1 = addTextClip(p0, TITLE_PRESETS[0], 0, 4);
    history = pushHistory(history, p1);
    expect(history.present.clips).toHaveLength(1);

    history = undoHistory(history);
    expect(history.present.clips).toHaveLength(0);

    history = redoHistory(history);
    expect(history.present.clips).toHaveLength(1);
  });

  it('serializes, deserializes, detects missing media, and relinks media assets', () => {
    let proj = createDefaultProject('Saved Project');
    const asset = makeSampleVideoAsset('media-xyz', 7);
    proj.media.push(asset);
    proj = addClipFromMedia(proj, asset);

    const serialized = serializeProject(proj);
    const restored = deserializeProject(serialized);

    expect(restored.name).toBe('Saved Project');
    expect(restored.clips).toHaveLength(1);
    // Ephemeral objectUrl was stripped on serialize, so status becomes 'missing' until hydrated or relinked
    expect(restored.media[0].status).toBe('missing');

    const relinked = relinkMediaAsset(restored, 'media-xyz', {
      objectUrl: 'blob:relinked-url',
      status: 'persisted',
    });
    expect(relinked.media[0].status).toBe('persisted');
    expect(relinked.media[0].objectUrl).toBe('blob:relinked-url');
  });
});
