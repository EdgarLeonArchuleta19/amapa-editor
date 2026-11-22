import { invoke } from '@tauri-apps/api/core';

export interface NativeRuntimeInfo {
  engine: string;
  version: string;
  os: string;
  arch: string;
  dataDir: string;
  exportsDir: string;
  isPortable: boolean;
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  clipCount: number;
}

/**
 * Checks whether AMAPA is running inside the native Tauri v2 desktop runtime.
 */
export function isTauriDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ ||
        (window as unknown as Record<string, unknown>).__TAURI__
    )
  );
}

export async function getNativeRuntimeInfo(): Promise<NativeRuntimeInfo | null> {
  if (!isTauriDesktop()) return null;
  try {
    return await invoke<NativeRuntimeInfo>('get_native_runtime_info');
  } catch {
    return null;
  }
}

export async function rustSynthesizeSfx(presetId: string): Promise<Uint8Array | null> {
  if (!isTauriDesktop()) return null;
  try {
    const bytes = await invoke<number[]>('rust_synthesize_sfx', { presetId });
    return new Uint8Array(bytes);
  } catch {
    return null;
  }
}

export async function rustComputeWaveformPeaks(
  samples: Float32Array,
  bucketCount: number
): Promise<number[] | null> {
  if (!isTauriDesktop()) return null;
  try {
    // Downsample before IPC if massive buffer so IPC payload stays tiny
    const maxIpcLen = 16384;
    let payload: number[];
    if (samples.length > maxIpcLen) {
      const step = Math.floor(samples.length / maxIpcLen);
      payload = [];
      for (let i = 0; i < samples.length; i += step) {
        payload.push(samples[i]);
      }
    } else {
      payload = Array.from(samples);
    }
    return await invoke<number[]>('rust_compute_waveform_peaks', {
      samples: payload,
      bucketCount,
    });
  } catch {
    return null;
  }
}

export async function rustSaveProject(params: {
  id: string;
  name: string;
  updatedAt: string;
  clipCount: number;
  projectJson: string;
  isAutosave: boolean;
}): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  try {
    return await invoke<string>('rust_save_project', params);
  } catch {
    return null;
  }
}

export async function rustListSavedProjects(): Promise<SavedProjectMeta[] | null> {
  if (!isTauriDesktop()) return null;
  try {
    return await invoke<SavedProjectMeta[]>('rust_list_saved_projects');
  } catch {
    return null;
  }
}

export async function rustLoadProject(
  id: string,
  isAutosave = false
): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  try {
    return await invoke<string | null>('rust_load_project', { id, isAutosave });
  } catch {
    return null;
  }
}

export async function rustSaveExportedFile(
  filename: string,
  blob: Blob
): Promise<string | null> {
  if (!isTauriDesktop()) return null;
  try {
    const ab = await blob.arrayBuffer();
    const bytes = Array.from(new Uint8Array(ab));
    return await invoke<string>('rust_save_exported_file', { filename, bytes });
  } catch {
    return null;
  }
}

export async function rustRevealInExplorer(path: string): Promise<void> {
  if (!isTauriDesktop()) return;
  try {
    await invoke<void>('rust_reveal_in_explorer', { path });
  } catch {
    // Ignore
  }
}
