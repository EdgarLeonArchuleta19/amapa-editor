import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Folder, Sliders } from 'lucide-react';
import {
  AmapaProject,
  ExportSettings,
  MediaAsset,
  ProjectSettings,
  TimelineClip,
  TimelineTrack,
  TrackKind,
} from './types/project';
import {
  addClipFromMedia,
  addTextClip,
  addTrack,
  createDefaultProject,
  createHistoryState,
  deleteClip,
  deleteTrack,
  deserializeProject,
  detachAudioFromClip,
  duplicateClip,
  generateId,
  getTimelineDuration,
  moveClip,
  pushHistory,
  redoHistory,
  relinkMediaAsset,
  renameTrack,
  serializeProject,
  setClipPlaybackSpeed,
  setProjectAspectRatio,
  setProjectFitMode,
  splitClipAtTime,
  TitlePreset,
  trimClipEnd,
  trimClipStart,
  undoHistory,
  updateClip,
  updateTrack,
} from './engine/timelineEngine';
import { analyzeMediaFile } from './engine/mediaAnalyzer';
import {
  loadAutosavedProject,
  loadProjectById,
  saveMediaBlobToStorage,
  saveProjectToStorage,
} from './storage/projectStorage';
import { Locale } from './i18n/translations';
import { TopBar } from './components/TopBar';
import { MediaLibrary } from './components/MediaLibrary';
import { PreviewPlayer } from './components/PreviewPlayer';
import { PropertiesPanel } from './components/PropertiesPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { ExportModal } from './components/ExportModal';
import { AboutLandingModal } from './components/AboutLandingModal';
import { ProjectsModal } from './components/ProjectsModal';

export const App: React.FC = () => {
  const [history, setHistory] = useState(() =>
    createHistoryState<AmapaProject>(createDefaultProject('Proyecto sin título'))
  );
  const project = history.present;

  const [mediaBlobs, setMediaBlobs] = useState<Map<string, Blob>>(() => new Map());
  const [playheadTime, setPlayheadTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [rippleMode, setRippleMode] = useState<boolean>(false);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [locale, setLocale] = useState<Locale>('es');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('amapa_theme') as 'dark' | 'light' | null;
      if (saved === 'dark' || saved === 'light') return saved;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches
      ) {
        return 'light';
      }
    } catch {}
    return 'dark';
  });

  // Listen to OS/system theme changes if user hasn't explicitly locked a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      try {
        const explicit = localStorage.getItem('amapa_theme');
        if (!explicit) {
          setTheme(e.matches ? 'light' : 'dark');
        }
      } catch {}
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const [importError, setImportError] = useState<string | null>(null);
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);
  const [recoverableProject, setRecoverableProject] = useState<{
    project: AmapaProject;
    blobs: Map<string, Blob>;
  } | null>(null);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showProjectsModal, setShowProjectsModal] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'media' | 'properties'>('editor');

  const commitProject = useCallback((nextProject: AmapaProject) => {
    setHistory((prev) => pushHistory(prev, nextProject));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadAutosavedProject()
      .then((res) => {
        if (res && res.project.clips.length > 0) {
          setRecoverableProject(res);
        }
      })
      .catch(() => {});
  }, []);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveProjectToStorage(project, { isAutosave: true }).catch(() => {});
    }, 800);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [project]);

  const selectedClip = useMemo(
    () => project.clips.find((c) => c.id === selectedClipId) || null,
    [project.clips, selectedClipId]
  );

  const handleImportFiles = useCallback(
    async (fileList: FileList | File[], folder = 'All Media') => {
      setImportError(null);
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const addedAssets: MediaAsset[] = [];
      for (const file of files) {
        try {
          const asset = await analyzeMediaFile(file, folder);
          const persisted = await saveMediaBlobToStorage(asset.id, file);
          asset.status = persisted ? 'persisted' : 'session';
          setMediaBlobs((prev) => {
            const next = new Map(prev);
            next.set(asset.id, file);
            return next;
          });
          addedAssets.push(asset);
        } catch (err) {
          setImportError(err instanceof Error ? err.message : String(err));
        }
      }

      if (addedAssets.length > 0) {
        setHistory((prev) => {
          let updated: AmapaProject = {
            ...prev.present,
            updatedAt: new Date().toISOString(),
            media: [...prev.present.media, ...addedAssets],
          };
          if (prev.present.clips.length === 0) {
            updated = addClipFromMedia(updated, addedAssets[0]);
          }
          return pushHistory(prev, updated);
        });
      }
    },
    []
  );

  const handleAddMediaToTimeline = useCallback((media: MediaAsset) => {
    setHistory((prev) => {
      const next = addClipFromMedia(prev.present, media);
      const newestClip = next.clips[next.clips.length - 1];
      if (newestClip) setSelectedClipId(newestClip.id);
      return pushHistory(prev, next);
    });
  }, []);

  const handleAddTitlePresetToTimeline = useCallback(
    (preset: TitlePreset) => {
      setHistory((prev) => {
        const next = addTextClip(prev.present, preset, playheadTime, 4);
        const newestClip = next.clips[next.clips.length - 1];
        if (newestClip) setSelectedClipId(newestClip.id);
        return pushHistory(prev, next);
      });
    },
    [playheadTime]
  );

  const handleRemoveMedia = useCallback((mediaId: string) => {
    setHistory((prev) => {
      const next: AmapaProject = {
        ...prev.present,
        updatedAt: new Date().toISOString(),
        media: prev.present.media.filter((m) => m.id !== mediaId),
        clips: prev.present.clips.filter((c) => c.mediaId !== mediaId),
      };
      return pushHistory(prev, next);
    });
  }, []);

  const handleRelinkMediaFile = useCallback(async (mediaId: string, file: File) => {
    setImportError(null);
    try {
      const analyzed = await analyzeMediaFile(file);
      const persisted = await saveMediaBlobToStorage(mediaId, file);
      setMediaBlobs((prev) => {
        const next = new Map(prev);
        next.set(mediaId, file);
        return next;
      });
      setHistory((prev) =>
        pushHistory(
          prev,
          relinkMediaAsset(prev.present, mediaId, {
            name: file.name,
            fileSize: file.size,
            mimeType: file.type || analyzed.mimeType,
            duration: analyzed.duration,
            width: analyzed.width,
            height: analyzed.height,
            thumbnailDataUrl: analyzed.thumbnailDataUrl,
            waveformPeaks: analyzed.waveformPeaks,
            objectUrl: analyzed.objectUrl,
            status: persisted ? 'persisted' : 'session',
          })
        )
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleSplitSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    setHistory((prev) =>
      pushHistory(prev, splitClipAtTime(prev.present, selectedClipId, playheadTime))
    );
  }, [selectedClipId, playheadTime]);

  const handleDuplicateSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    setHistory((prev) => pushHistory(prev, duplicateClip(prev.present, selectedClipId)));
  }, [selectedClipId]);

  const handleDetachAudio = useCallback((clipId: string) => {
    setHistory((prev) => pushHistory(prev, detachAudioFromClip(prev.present, clipId)));
  }, []);

  const handleDeleteSelectedClip = useCallback(() => {
    if (!selectedClipId) return;
    setHistory((prev) =>
      pushHistory(prev, deleteClip(prev.present, selectedClipId, { ripple: rippleMode }))
    );
    setSelectedClipId(null);
  }, [selectedClipId, rippleMode]);

  const handleSaveProject = useCallback(async () => {
    await saveProjectToStorage(project);
    setLastSavedMessage(locale === 'es' ? 'Guardado' : 'Saved');
    setTimeout(() => setLastSavedMessage(null), 2500);
  }, [project, locale]);

  const handleExportProjectJson = useCallback(() => {
    const json = serializeProject(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = project.name.toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'project';
    a.href = url;
    a.download = `${safeName}.amapa.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const handleImportProjectJsonFile = useCallback(async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const loaded = deserializeProject(text);
      setHistory(createHistoryState(loaded));
      setPlayheadTime(0);
      setSelectedClipId(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    document.title = 'AMAPA | Editor de Video';
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          setHistory((prev) => redoHistory(prev));
        } else {
          setHistory((prev) => undoHistory(prev));
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        setHistory((prev) => redoHistory(prev));
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitSelectedClip();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleDuplicateSelectedClip();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelectedClip();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setPlayheadTime(0);
      } else if (e.key === ',') {
        e.preventDefault();
        const step = 1 / (project.settings.fps || 30);
        setPlayheadTime((t) => Math.max(0, Number((t - step).toFixed(4))));
      } else if (e.key === '.') {
        e.preventDefault();
        const step = 1 / (project.settings.fps || 30);
        const maxDur = getTimelineDuration(project);
        setPlayheadTime((t) => Math.min(maxDur, Number((t + step).toFixed(4))));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleSplitSelectedClip,
    handleDuplicateSelectedClip,
    handleDeleteSelectedClip,
    project,
  ]);

  const handleChangeAspectRatio = useCallback((ratioId: string) => {
    setHistory((prev) => pushHistory(prev, setProjectAspectRatio(prev.present, ratioId)));
  }, []);

  const handleToggleFitMode = useCallback(() => {
    setHistory((prev) => {
      const current = prev.present.settings.fitMode || 'fit';
      const nextMode = current === 'fit' ? 'fill' : 'fit';
      return pushHistory(prev, setProjectFitMode(prev.present, nextMode));
    });
  }, []);

  return (
    <div className="amapa-app">
      <TopBar
        project={project}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        locale={locale}
        theme={theme}
        lastSavedMessage={lastSavedMessage}
        onRenameProject={(name) =>
          commitProject({ ...project, name, updatedAt: new Date().toISOString() })
        }
        onUndo={() => setHistory((prev) => undoHistory(prev))}
        onRedo={() => setHistory((prev) => redoHistory(prev))}
        onSaveProject={handleSaveProject}
        onOpenProjectsModal={() => setShowProjectsModal(true)}
        onOpenExportModal={() => {
          setIsPlaying(false);
          setShowExportModal(true);
        }}
        onOpenAboutModal={() => setShowAboutModal(true)}
        onToggleLocale={() => setLocale((l) => (l === 'en' ? 'es' : 'en'))}
        onToggleTheme={() =>
          setTheme((t) => {
            const next = t === 'dark' ? 'light' : 'dark';
            try {
              localStorage.setItem('amapa_theme', next);
            } catch {}
            return next;
          })
        }
        onChangeAspectRatio={handleChangeAspectRatio}
        onToggleFitMode={handleToggleFitMode}
      />

      {recoverableProject && project.clips.length === 0 && (
        <div className="recovery-banner" role="region" aria-label="Session Recovery">
          <span>
            {locale === 'es' ? 'Sesión anterior encontrada:' : 'Recovered session:'}{' '}
            <strong>{recoverableProject.project.name}</strong>
          </span>
          <div className="recovery-actions">
            <button
              type="button"
              className="primary-btn compact-btn"
              onClick={() => {
                setHistory(createHistoryState(recoverableProject.project));
                setMediaBlobs(recoverableProject.blobs);
                setRecoverableProject(null);
              }}
            >
              {locale === 'es' ? 'Continuar' : 'Restore'}
            </button>
            <button
              type="button"
              className="secondary-btn compact-btn"
              onClick={() => setRecoverableProject(null)}
            >
              {locale === 'es' ? 'Descartar' : 'Dismiss'}
            </button>
          </div>
        </div>
      )}

      <main className={`workspace-grid mobile-active-${mobileTab}`}>
        <MediaLibrary
          project={project}
          locale={locale}
          importError={importError}
          onImportFiles={handleImportFiles}
          onAddMediaToTimeline={handleAddMediaToTimeline}
          onAddTitlePresetToTimeline={handleAddTitlePresetToTimeline}
          onRemoveMedia={handleRemoveMedia}
          onRelinkMediaFile={handleRelinkMediaFile}
        />

        <PreviewPlayer
          project={project}
          playheadTime={playheadTime}
          isPlaying={isPlaying}
          locale={locale}
          onSeek={(t) => setPlayheadTime(t)}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onStopPlayback={() => setIsPlaying(false)}
        />

        <PropertiesPanel
          selectedClip={selectedClip}
          locale={locale}
          onUpdateClip={(clipId: string, updater: (c: TimelineClip) => TimelineClip) =>
            commitProject(updateClip(project, clipId, updater))
          }
          onChangeClipSpeed={(clipId: string, speed: number) =>
            commitProject(setClipPlaybackSpeed(project, clipId, speed))
          }
          onTrimClipEnd={(clipId: string, newDuration: number) =>
            commitProject(trimClipEnd(project, clipId, newDuration))
          }
          onDetachAudio={handleDetachAudio}
        />

        <TimelinePanel
          project={project}
          playheadTime={playheadTime}
          selectedClipId={selectedClipId}
          rippleMode={rippleMode}
          snapEnabled={snapEnabled}
          locale={locale}
          onSelectClip={setSelectedClipId}
          onSeek={setPlayheadTime}
          onMoveClip={(clipId, newStart, newTrackId) =>
            commitProject(moveClip(project, clipId, newStart, newTrackId))
          }
          onTrimClipStart={(clipId, newStart) =>
            commitProject(trimClipStart(project, clipId, newStart))
          }
          onTrimClipEnd={(clipId, newDuration) =>
            commitProject(trimClipEnd(project, clipId, newDuration))
          }
          onSplitSelectedClip={handleSplitSelectedClip}
          onDuplicateSelectedClip={handleDuplicateSelectedClip}
          onDeleteSelectedClip={handleDeleteSelectedClip}
          onDetachAudio={handleDetachAudio}
          onToggleRipple={() => setRippleMode((r) => !r)}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          onAddTrack={(kind: TrackKind) => commitProject(addTrack(project, kind))}
          onRenameTrack={(trackId: string, name: string) =>
            commitProject(renameTrack(project, trackId, name))
          }
          onUpdateTrack={(
            trackId: string,
            patch: Partial<Omit<TimelineTrack, 'id' | 'kind'>>
          ) => commitProject(updateTrack(project, trackId, patch))}
          onDeleteTrack={(trackId: string) => commitProject(deleteTrack(project, trackId))}
        />
      </main>

      {/* Mobile touch navigation bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-btn ${mobileTab === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          <Film size={18} strokeWidth={1.6} />
          <span>{locale === 'es' ? 'Editor' : 'Editor'}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${mobileTab === 'media' ? 'active' : ''}`}
          onClick={() => setMobileTab('media')}
        >
          <Folder size={18} strokeWidth={1.6} />
          <span>{locale === 'es' ? 'Biblioteca' : 'Media'}</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${mobileTab === 'properties' ? 'active' : ''}`}
          onClick={() => setMobileTab('properties')}
        >
          <Sliders size={18} strokeWidth={1.6} />
          <span>{locale === 'es' ? 'Ajustes' : 'Inspect'}</span>
        </button>
      </nav>

      {showExportModal && (
        <ExportModal
          project={project}
          mediaBlobs={mediaBlobs}
          locale={locale}
          onUpdateExportSettings={(exportSettings: ExportSettings) =>
            commitProject({ ...project, exportSettings })
          }
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showAboutModal && <AboutLandingModal onClose={() => setShowAboutModal(false)} />}

      {showProjectsModal && (
        <ProjectsModal
          currentProject={project}
          onNewProject={(name) => {
            setHistory(createHistoryState(createDefaultProject(name)));
            setMediaBlobs(new Map());
            setPlayheadTime(0);
            setSelectedClipId(null);
          }}
          onSaveAsProject={async (name) => {
            const copy: AmapaProject = {
              ...project,
              id: generateId('proj'),
              name,
              updatedAt: new Date().toISOString(),
            };
            commitProject(copy);
            await saveProjectToStorage(copy);
            setLastSavedMessage(locale === 'es' ? 'Guardado' : 'Saved');
          }}
          onOpenProjectById={async (id) => {
            const loaded = await loadProjectById(id);
            if (loaded) {
              setHistory(createHistoryState(loaded.project));
              setMediaBlobs(loaded.blobs);
              setPlayheadTime(0);
              setSelectedClipId(null);
            }
          }}
          onUpdateProjectSettings={(settings: ProjectSettings) =>
            commitProject({ ...project, settings })
          }
          onExportProjectJson={handleExportProjectJson}
          onImportProjectJsonFile={handleImportProjectJsonFile}
          onClose={() => setShowProjectsModal(false)}
        />
      )}
    </div>
  );
};
