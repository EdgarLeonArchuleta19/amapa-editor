import { AmapaProject, MediaAsset } from '../types/project';
import { deserializeProject, serializeProject } from '../engine/timelineEngine';

const DB_NAME = 'amapa_editor_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_BLOBS = 'media_blobs';
const AUTOSAVE_ID = '__amapa_autosave__';

// In-memory fallback for environments where IndexedDB is unavailable
const memoryProjects = new Map<string, AmapaProject>();
const memoryBlobs = new Map<string, Blob>();

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof globalThis.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveMediaBlobToStorage(mediaId: string, blob: Blob): Promise<boolean> {
  memoryBlobs.set(mediaId, blob);
  const db = await openDatabase();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      store.put(blob, mediaId);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadMediaBlobFromStorage(mediaId: string): Promise<Blob | null> {
  if (memoryBlobs.has(mediaId)) {
    return memoryBlobs.get(mediaId) || null;
  }
  const db = await openDatabase();
  if (!db) return null;

  return new Promise<Blob | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(mediaId);
      req.onsuccess = () => {
        const blob = req.result instanceof Blob ? req.result : null;
        if (blob) memoryBlobs.set(mediaId, blob);
        db.close();
        resolve(blob);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function saveProjectToStorage(
  project: AmapaProject,
  options?: { isAutosave?: boolean }
): Promise<void> {
  const cleanJson = JSON.parse(serializeProject(project)) as AmapaProject;
  const recordId = options?.isAutosave ? AUTOSAVE_ID : project.id;
  const recordToStore: AmapaProject = {
    ...cleanJson,
    id: recordId,
    updatedAt: new Date().toISOString(),
  };

  memoryProjects.set(recordId, recordToStore);

  const db = await openDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      store.put(recordToStore);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function hydrateProjectMediaFromStorage(
  project: AmapaProject
): Promise<{ project: AmapaProject; blobs: Map<string, Blob> }> {
  const blobs = new Map<string, Blob>();
  const hydratedMedia: MediaAsset[] = [];

  for (const asset of project.media) {
    const storedBlob = await loadMediaBlobFromStorage(asset.id);
    if (storedBlob) {
      blobs.set(asset.id, storedBlob);
      const objectUrl = URL.createObjectURL(storedBlob);
      hydratedMedia.push({
        ...asset,
        objectUrl,
        status: 'persisted',
        errorMessage: undefined,
      });
    } else if (asset.objectUrl) {
      hydratedMedia.push({
        ...asset,
        status: asset.status === 'persisted' ? 'persisted' : 'session',
      });
    } else {
      hydratedMedia.push({
        ...asset,
        objectUrl: undefined,
        status: 'missing',
      });
    }
  }

  return {
    project: {
      ...project,
      media: hydratedMedia,
    },
    blobs,
  };
}

export async function loadSavedProjectsList(): Promise<
  Array<{ id: string; name: string; updatedAt: string; clipCount: number }>
> {
  const results = new Map<
    string,
    { id: string; name: string; updatedAt: string; clipCount: number }
  >();

  for (const [id, proj] of memoryProjects.entries()) {
    if (id === AUTOSAVE_ID) continue;
    results.set(id, {
      id: proj.id,
      name: proj.name,
      updatedAt: proj.updatedAt,
      clipCount: proj.clips.length,
    });
  }

  const db = await openDatabase();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const store = tx.objectStore(STORE_PROJECTS);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as AmapaProject[];
          for (const proj of all) {
            if (proj.id === AUTOSAVE_ID) continue;
            results.set(proj.id, {
              id: proj.id,
              name: proj.name,
              updatedAt: proj.updatedAt,
              clipCount: proj.clips?.length || 0,
            });
          }
          db.close();
          resolve();
        };
        req.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  return Array.from(results.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function loadProjectById(
  projectId: string
): Promise<{ project: AmapaProject; blobs: Map<string, Blob> } | null> {
  let rawProject: AmapaProject | null = memoryProjects.get(projectId) || null;

  if (!rawProject) {
    const db = await openDatabase();
    if (db) {
      rawProject = await new Promise<AmapaProject | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_PROJECTS, 'readonly');
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.get(projectId);
          req.onsuccess = () => {
            db.close();
            resolve((req.result as AmapaProject) || null);
          };
          req.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      });
    }
  }

  if (!rawProject) return null;
  const validated = deserializeProject(JSON.stringify(rawProject));
  return hydrateProjectMediaFromStorage(validated);
}

export async function loadAutosavedProject(): Promise<{
  project: AmapaProject;
  blobs: Map<string, Blob>;
} | null> {
  return loadProjectById(AUTOSAVE_ID);
}

export function clearMemoryStorageForTests(): void {
  memoryProjects.clear();
  memoryBlobs.clear();
}
