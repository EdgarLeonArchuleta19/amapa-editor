import React, { useMemo, useRef, useState } from 'react';
import { AmapaProject, MediaAsset } from '../types/project';
import { TITLE_PRESETS, TitlePreset } from '../engine/timelineEngine';
import { generateSfxFile, previewSfxSound, SFX_PRESETS } from '../engine/sfxEngine';
import { Locale, translate } from '../i18n/translations';
import {
  AlertCircle,
  Film,
  Image as ImageIcon,
  Link2,
  Mic,
  Monitor,
  Music,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
  Type,
  Upload,
  Video,
  Volume2,
} from 'lucide-react';

interface MediaLibraryProps {
  project: AmapaProject;
  locale: Locale;
  importError: string | null;
  onImportFiles: (files: FileList | File[], folder: string) => void;
  onAddMediaToTimeline: (media: MediaAsset) => void;
  onAddTitlePresetToTimeline: (preset: TitlePreset) => void;
  onRemoveMedia: (mediaId: string) => void;
  onRelinkMediaFile: (mediaId: string, file: File) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  project,
  locale,
  importError,
  onImportFiles,
  onAddMediaToTimeline,
  onAddTitlePresetToTimeline,
  onRemoveMedia,
  onRelinkMediaFile,
}) => {
  const t = (key: string) => translate(locale, key);
  const [activeTab, setActiveTab] = useState<'media' | 'record' | 'titles' | 'sfx'>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Recording state
  const [recordingType, setRecordingType] = useState<'voice' | 'screen' | 'camera' | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const [playingSfxId, setPlayingSfxId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const relinkInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const filteredMedia = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return project.media.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [project.media, searchQuery]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files, 'All Media');
    }
  };

  const startRecording = async (type: 'voice' | 'screen' | 'camera') => {
    try {
      let stream: MediaStream;
      if (type === 'voice') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }

      recordingStreamRef.current = stream;
      const chunks: Blob[] = [];
      const mimeType = type === 'voice' ? 'audio/webm' : 'video/webm';
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(chunks, { type: mimeType });
        const prefix =
          type === 'voice'
            ? 'Voz_en_off'
            : type === 'screen'
            ? 'Grabacion_Pantalla'
            : 'Grabacion_Camara';
        const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
        const file = new File([fullBlob], `${prefix}_${timeStr}.webm`, { type: mimeType });
        onImportFiles([file], type === 'voice' ? 'Voz en off' : 'Grabaciones');

        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecordingType(null);
        setRecordingSeconds(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      recorder.start(500);
      setRecordingType(type);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Recording failed or was cancelled:', err);
      setRecordingType(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePreviewSfx = async (presetId: string) => {
    setPlayingSfxId(presetId);
    await previewSfxSound(presetId);
    setTimeout(() => {
      setPlayingSfxId((curr) => (curr === presetId ? null : curr));
    }, 800);
  };

  const handleAddSfxToProject = async (presetId: string) => {
    try {
      const file = await generateSfxFile(presetId);
      onImportFiles([file], 'Efectos de Sonido');
    } catch (err) {
      console.warn('Could not generate SFX file:', err);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const truncateFileName = (name: string, maxLen = 22) => {
    if (name.length <= maxLen) return name;
    const extDot = name.lastIndexOf('.');
    if (extDot > 0 && name.length - extDot <= 6) {
      const ext = name.slice(extDot);
      const base = name.slice(0, extDot);
      return `${base.slice(0, Math.max(4, maxLen - ext.length - 3))}...${ext}`;
    }
    return `${name.slice(0, maxLen - 3)}...`;
  };

  return (
    <aside className="panel media-library-panel" aria-label={t('media.title')}>
      {/* Sleek icon navigation header without text */}
      <div className="panel-tabs icon-panel-tabs">
        <button
          type="button"
          className={`panel-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
          title={locale === 'es' ? 'Archivos de medios' : 'Media files'}
          aria-label={locale === 'es' ? 'Archivos de medios' : 'Media files'}
        >
          <Film size={18} strokeWidth={1.6} />
          {project.media.length > 0 && (
            <span className="tab-count">{project.media.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`panel-tab ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
          title={locale === 'es' ? 'Grabar voz, pantalla o cámara' : 'Record voice, screen or camera'}
          aria-label={locale === 'es' ? 'Grabar voz, pantalla o cámara' : 'Record voice, screen or camera'}
        >
          <Mic size={18} strokeWidth={1.6} />
        </button>

        <button
          type="button"
          className={`panel-tab ${activeTab === 'titles' ? 'active' : ''}`}
          onClick={() => setActiveTab('titles')}
          title={locale === 'es' ? 'Títulos y textos' : 'Titles & text'}
          aria-label={locale === 'es' ? 'Títulos y textos' : 'Titles & text'}
        >
          <Type size={18} strokeWidth={1.6} />
        </button>

        <button
          type="button"
          className={`panel-tab ${activeTab === 'sfx' ? 'active' : ''}`}
          onClick={() => setActiveTab('sfx')}
          title={locale === 'es' ? 'Efectos de sonido libres (SFX)' : 'Sound effects (SFX)'}
          aria-label={locale === 'es' ? 'Efectos de sonido' : 'Sound effects'}
        >
          <Volume2 size={18} strokeWidth={1.6} />
        </button>
      </div>

      {/* Tab 1: Archivos / Media */}
      {activeTab === 'media' && (
        <div
          className={`media-tab-content ${isDraggingOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
        >
          <div className="media-actions-row">
            <button
              type="button"
              className="primary-btn full-width-btn upload-main-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} strokeWidth={1.75} />
              <span>{t('media.importBtn')}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              hidden
              data-testid="media-file-input"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onImportFiles(e.target.files, 'All Media');
                  e.target.value = '';
                }
              }}
            />
          </div>

          {project.media.length > 1 && (
            <div className="search-input-wrap">
              <Search size={13} strokeWidth={1.5} />
              <input
                type="search"
                placeholder={t('media.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('media.searchPlaceholder')}
              />
            </div>
          )}

          {importError && (
            <div className="media-error-banner" role="alert">
              <AlertCircle size={14} strokeWidth={1.5} />
              <span>{importError}</span>
            </div>
          )}

          <div className="media-list">
            {filteredMedia.length === 0 ? (
              <div
                className="media-empty-state"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="empty-icons-trio">
                  <span className="empty-icon-pill">
                    <Film size={15} strokeWidth={1.5} />
                  </span>
                  <span className="empty-icon-pill">
                    <Music size={15} strokeWidth={1.5} />
                  </span>
                  <span className="empty-icon-pill">
                    <ImageIcon size={15} strokeWidth={1.5} />
                  </span>
                </div>
                <strong className="empty-title">
                  {locale === 'es' ? 'Importa tus archivos' : 'Import your files'}
                </strong>
                <p>{t('media.emptyPrompt')}</p>
                <span className="empty-formats-hint">MP4 • WebM • MP3 • WAV • PNG • JPG</span>
              </div>
            ) : (
              filteredMedia.map((asset) => (
                <div
                  key={asset.id}
                  className={`media-card ${asset.status === 'missing' ? 'missing' : ''}`}
                  data-testid={`media-card-${asset.id}`}
                >
                  {/* Clean media thumbnail without overlapping duration pill */}
                  <div className="media-thumb">
                    {asset.thumbnailDataUrl ? (
                      <img src={asset.thumbnailDataUrl} alt={asset.name} />
                    ) : (
                      <div className="media-thumb-fallback">
                        {asset.kind === 'video' && <Film size={18} strokeWidth={1.5} />}
                        {asset.kind === 'audio' && <Music size={18} strokeWidth={1.5} />}
                        {asset.kind === 'image' && <ImageIcon size={18} strokeWidth={1.5} />}
                      </div>
                    )}
                  </div>

                  <div className="media-info">
                    <span className="media-name" title={asset.name}>
                      {truncateFileName(asset.name)}
                    </span>
                    <div className="media-meta-line">
                      <span className="media-type-tag">{asset.kind}</span>
                      {/* Show duration only for video and audio; images have no duration */}
                      {(asset.kind === 'video' || asset.kind === 'audio') && asset.duration > 0 && (
                        <span className="media-meta-duration">
                          {formatSeconds(Math.round(asset.duration))}
                        </span>
                      )}
                      {asset.width && asset.height && (
                        <span className="media-dim-tag">
                          {asset.width}×{asset.height}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="media-card-actions">
                    {asset.status === 'missing' ? (
                      <>
                        <button
                          type="button"
                          className="secondary-btn compact-btn"
                          onClick={() => relinkInputRefs.current[asset.id]?.click()}
                          title={t('media.relink')}
                        >
                          <Link2 size={13} strokeWidth={1.5} />
                        </button>
                        <input
                          ref={(el) => {
                            relinkInputRefs.current[asset.id] = el;
                          }}
                          type="file"
                          accept="video/*,audio/*,image/*"
                          hidden
                          data-testid={`relink-input-${asset.id}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onRelinkMediaFile(asset.id, f);
                          }}
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        className="icon-btn add-clip-btn"
                        onClick={() => onAddMediaToTimeline(asset)}
                        title={t('media.addToTimeline')}
                        aria-label={`${t('media.addToTimeline')} ${asset.name}`}
                      >
                        <Plus size={15} strokeWidth={1.75} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => onRemoveMedia(asset.id)}
                      title={t('media.remove')}
                      aria-label={`${t('media.remove')} ${asset.name}`}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Grabar (Micrófono / Pantalla / Cámara) */}
      {activeTab === 'record' && (
        <div className="record-tab-content">
          <p className="panel-helper-text">
            {locale === 'es'
              ? 'Graba directamente desde tu navegador sin instalar programas:'
              : 'Record directly in your browser without extra software:'}
          </p>

          {recordingType ? (
            <div className="active-recording-card">
              <div className="recording-pulse-header">
                <span className="rec-pulse-dot" />
                <strong className="rec-title">
                  {recordingType === 'voice' && (locale === 'es' ? 'Grabando Voz en Off' : 'Recording Voiceover')}
                  {recordingType === 'screen' && (locale === 'es' ? 'Grabando Pantalla' : 'Recording Screen')}
                  {recordingType === 'camera' && (locale === 'es' ? 'Grabando Cámara' : 'Recording Camera')}
                </strong>
              </div>
              <div className="rec-time-counter">{formatSeconds(recordingSeconds)}</div>
              <button
                type="button"
                className="danger-btn full-width-btn"
                onClick={stopRecording}
              >
                <Square size={14} fill="currentColor" />
                <span>{locale === 'es' ? 'Detener y Guardar' : 'Stop & Save'}</span>
              </button>
            </div>
          ) : (
            <div className="record-options-grid">
              <button
                type="button"
                className="record-option-card"
                onClick={() => startRecording('voice')}
              >
                <div className="record-icon-box">
                  <Mic size={22} strokeWidth={1.6} />
                </div>
                <div className="record-text-box">
                  <strong>{locale === 'es' ? 'Voz en Off (Micrófono)' : 'Voiceover (Mic)'}</strong>
                  <span>{locale === 'es' ? 'Narra o graba comentarios para tu video' : 'Record voice narration'}</span>
                </div>
              </button>

              <button
                type="button"
                className="record-option-card"
                onClick={() => startRecording('screen')}
              >
                <div className="record-icon-box">
                  <Monitor size={22} strokeWidth={1.6} />
                </div>
                <div className="record-text-box">
                  <strong>{locale === 'es' ? 'Grabar Pantalla' : 'Record Screen'}</strong>
                  <span>{locale === 'es' ? 'Captura ventana, pestaña o pantalla completa' : 'Capture screen or tab'}</span>
                </div>
              </button>

              <button
                type="button"
                className="record-option-card"
                onClick={() => startRecording('camera')}
              >
                <div className="record-icon-box">
                  <Video size={22} strokeWidth={1.6} />
                </div>
                <div className="record-text-box">
                  <strong>{locale === 'es' ? 'Grabar Cámara Web' : 'Record Webcam'}</strong>
                  <span>{locale === 'es' ? 'Grábate a ti mismo para tu contenido' : 'Record video from webcam'}</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Texto */}
      {activeTab === 'titles' && (
        <div className="titles-tab-content">
          <p className="panel-helper-text">
            {locale === 'es'
              ? 'Elige un estilo de texto para insertarlo sobre tu video:'
              : 'Choose a text style to place over your video:'}
          </p>
          <div className="title-presets-list">
            {TITLE_PRESETS.map((preset) => (
              <div key={preset.id} className="title-preset-card">
                <div
                  className="title-preset-preview"
                  style={{
                    fontFamily: preset.style.fontFamily,
                    fontWeight: preset.style.fontWeight,
                    fontStyle: preset.style.fontStyle,
                  }}
                >
                  {preset.style.text}
                </div>
                <div className="title-preset-footer">
                  <span>{preset.name}</span>
                  <button
                    type="button"
                    className="secondary-btn compact-btn"
                    onClick={() => onAddTitlePresetToTimeline(preset)}
                    data-testid={`add-title-preset-${preset.id}`}
                  >
                    <Plus size={13} strokeWidth={1.5} />
                    <span>{t('titles.addBtn')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Efectos de Sonido SFX */}
      {activeTab === 'sfx' && (
        <div className="sfx-tab-content">
          <p className="panel-helper-text">
            {locale === 'es'
              ? 'Sonidos esenciales libres de derechos para agregar ritmo a tu edición:'
              : 'Royalty-free essential sound effects for your video pacing:'}
          </p>
          <div className="sfx-presets-list">
            {SFX_PRESETS.map((preset) => (
              <div key={preset.id} className="sfx-card">
                <div className="sfx-left">
                  <button
                    type="button"
                    className={`icon-btn play-sfx-btn ${playingSfxId === preset.id ? 'active' : ''}`}
                    onClick={() => handlePreviewSfx(preset.id)}
                    title={locale === 'es' ? 'Escuchar sonido' : 'Listen sound'}
                  >
                    <Play size={13} fill="currentColor" />
                  </button>
                  <div className="sfx-info">
                    <strong className="sfx-name">{preset.name}</strong>
                    <span className="sfx-desc">{preset.description}</span>
                  </div>
                </div>

                <div className="sfx-right">
                  <span className="sfx-duration">{preset.duration}s</span>
                  <button
                    type="button"
                    className="secondary-btn compact-btn"
                    onClick={() => handleAddSfxToProject(preset.id)}
                    title={locale === 'es' ? 'Importar al proyecto' : 'Import to project'}
                  >
                    <Plus size={13} strokeWidth={1.5} />
                    <span>{locale === 'es' ? 'Añadir' : 'Add'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
