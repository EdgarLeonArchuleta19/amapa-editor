import React, { useEffect, useRef, useState } from 'react';
import {
  AmapaProject,
  AudioCodecId,
  ExportContainer,
  ExportSettings,
  VideoCodecId,
} from '../types/project';
import { EXPORT_PRESETS, getTimelineDuration } from '../engine/timelineEngine';
import {
  BrowserCodecCapabilities,
  ExportProgressUpdate,
  ExportResult,
  exportTimelineToBlob,
  probeExportCapabilities,
  validateExportSettings,
} from '../engine/exportEngine';
import { Locale, translate } from '../i18n/translations';
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  X,
} from 'lucide-react';

interface ExportModalProps {
  project: AmapaProject;
  mediaBlobs: Map<string, Blob>;
  locale: Locale;
  onUpdateExportSettings: (settings: ExportSettings) => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  project,
  mediaBlobs,
  locale,
  onUpdateExportSettings,
  onClose,
}) => {
  const t = (key: string) => translate(locale, key);
  const settings = project.exportSettings;
  const timelineDuration = getTimelineDuration(project);

  const [capabilities, setCapabilities] = useState<BrowserCodecCapabilities | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgressUpdate | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    probeExportCapabilities().then(setCapabilities).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const validation = validateExportSettings(project, settings);

  const handleSelectPreset = (presetId: string) => {
    const preset = EXPORT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onUpdateExportSettings({
      ...settings,
      presetId: preset.id,
      container: preset.container,
      videoCodec: preset.videoCodec,
      audioCodec: preset.audioCodec,
      width: preset.width,
      height: preset.height,
      fps: preset.fps,
      videoBitrateMbps: preset.videoBitrateMbps,
      audioBitrateKbps: preset.audioBitrateKbps,
    });
  };

  const handleContainerChange = (container: ExportContainer) => {
    let videoCodec: VideoCodecId = settings.videoCodec;
    let audioCodec: AudioCodecId = settings.audioCodec;

    if (container === 'mp4') {
      videoCodec = 'avc1.42001f';
      audioCodec = 'mp4a.40.2';
    } else if (container === 'webm') {
      videoCodec = 'vp09.00.10.08';
      audioCodec = 'opus';
    } else if (container === 'wav') {
      videoCodec = 'none';
      audioCodec = 'pcm';
    }

    onUpdateExportSettings({
      ...settings,
      presetId: 'custom',
      container,
      videoCodec,
      audioCodec,
    });
  };

  const handleStartExport = async () => {
    setExportError(null);
    setExportResult(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExporting(true);

    try {
      const result = await exportTimelineToBlob(project, {
        settings,
        mediaBlobs,
        signal: controller.signal,
        onProgress: (upd) => setProgress(upd),
      });
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setExportResult(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setExportError(locale === 'es' ? 'Exportación cancelada.' : 'Export cancelled.');
      } else {
        setExportError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsExporting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t('export.modalTitle')}>
      <div className="modal-card export-modal">
        <div className="modal-header">
          <h2>{t('export.modalTitle')}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t('export.closeBtn')}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="export-mode-tabs">
          <button
            type="button"
            className={`mode-tab ${settings.mode === 'simple' ? 'active' : ''}`}
            onClick={() => onUpdateExportSettings({ ...settings, mode: 'simple' })}
          >
            {t('export.simpleMode')}
          </button>
          <button
            type="button"
            className={`mode-tab ${settings.mode === 'advanced' ? 'active' : ''}`}
            onClick={() => onUpdateExportSettings({ ...settings, mode: 'advanced' })}
          >
            {t('export.advancedMode')}
          </button>
        </div>

        <div className="modal-body">
          {settings.mode === 'simple' ? (
            <div className="presets-grid">
              {EXPORT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-card ${settings.presetId === preset.id ? 'selected' : ''}`}
                  onClick={() => handleSelectPreset(preset.id)}
                >
                  <div className="preset-card-title">{t(preset.labelKey)}</div>
                  <div className="preset-card-desc">{t(preset.descriptionKey)}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="advanced-export-grid">
              <div className="form-field">
                <label htmlFor="export-filename">
                  {locale === 'es' ? 'Nombre del archivo' : 'Filename'}
                </label>
                <input
                  id="export-filename"
                  type="text"
                  value={settings.filename}
                  onChange={(e) =>
                    onUpdateExportSettings({ ...settings, filename: e.target.value })
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="export-container">
                  {locale === 'es' ? 'Formato contenedor' : 'Container'}
                </label>
                <select
                  id="export-container"
                  value={settings.container}
                  onChange={(e) => handleContainerChange(e.target.value as ExportContainer)}
                >
                  <option value="mp4">MP4 (.mp4)</option>
                  <option value="webm">WebM (.webm)</option>
                  <option value="wav">WAV Audio (.wav)</option>
                </select>
              </div>

              {settings.container !== 'wav' && (
                <>
                  <div className="form-field">
                    <label htmlFor="export-vcodec">Video Codec</label>
                    <select
                      id="export-vcodec"
                      value={settings.videoCodec}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          videoCodec: e.target.value as VideoCodecId,
                        })
                      }
                    >
                      <option value="avc1.42001f">H.264 / AVC</option>
                      <option value="vp09.00.10.08">VP9</option>
                      <option value="vp8">VP8</option>
                      <option value="av01.0.04M.08">AV1</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="export-acodec">Audio Codec</label>
                    <select
                      id="export-acodec"
                      value={settings.audioCodec}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          audioCodec: e.target.value as AudioCodecId,
                        })
                      }
                    >
                      <option value="mp4a.40.2">AAC</option>
                      <option value="opus">Opus</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="export-width">
                      {locale === 'es' ? 'Ancho (px)' : 'Width (px)'}
                    </label>
                    <input
                      id="export-width"
                      type="number"
                      min={128}
                      max={3840}
                      step={2}
                      value={settings.width}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          width: Number(e.target.value) || 1920,
                        })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="export-height">
                      {locale === 'es' ? 'Alto (px)' : 'Height (px)'}
                    </label>
                    <input
                      id="export-height"
                      type="number"
                      min={128}
                      max={3840}
                      step={2}
                      value={settings.height}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          height: Number(e.target.value) || 1080,
                        })
                      }
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="export-fps">FPS</label>
                    <select
                      id="export-fps"
                      value={settings.fps}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          fps: Number(e.target.value),
                        })
                      }
                    >
                      <option value={24}>24 fps</option>
                      <option value={25}>25 fps</option>
                      <option value={30}>30 fps</option>
                      <option value={60}>60 fps</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="export-vbitrate">Bitrate (Mbps)</label>
                    <input
                      id="export-vbitrate"
                      type="number"
                      min={0.5}
                      max={80}
                      step={0.5}
                      value={settings.videoBitrateMbps}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          presetId: 'custom',
                          videoBitrateMbps: Number(e.target.value) || 8,
                        })
                      }
                    />
                  </div>
                </>
              )}

              <div className="form-field full-span">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.useCustomRange}
                    onChange={(e) =>
                      onUpdateExportSettings({
                        ...settings,
                        useCustomRange: e.target.checked,
                        rangeEnd: settings.rangeEnd || timelineDuration,
                      })
                    }
                  />
                  <span>
                    {locale === 'es' ? 'Exportar rango específico (s)' : 'Custom range (s)'}
                  </span>
                </label>
                {settings.useCustomRange && (
                  <div className="range-inputs">
                    <input
                      type="number"
                      min={0}
                      max={timelineDuration}
                      step={0.1}
                      value={settings.rangeStart}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          rangeStart: Number(e.target.value),
                        })
                      }
                      aria-label="Range start seconds"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      min={0}
                      max={timelineDuration}
                      step={0.1}
                      value={settings.rangeEnd}
                      onChange={(e) =>
                        onUpdateExportSettings({
                          ...settings,
                          rangeEnd: Number(e.target.value),
                        })
                      }
                      aria-label="Range end seconds"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="export-summary-bar">
            <div>
              {settings.container === 'wav'
                ? `WAV (${settings.sampleRate} Hz)`
                : `${validation.normalizedWidth}×${validation.normalizedHeight} • ${settings.fps} fps • ${settings.container.toUpperCase()}`}{' '}
              • {validation.effectiveDuration.toFixed(1)}s • ~{validation.estimatedSizeMB} MB
            </div>
            {capabilities && (
              <div className="capability-line">
                {capabilities.hasWebCodecsVideo ? 'WebCodecs' : 'MediaRecorder / Muxer'}
              </div>
            )}
          </div>

          {validation.errors.length > 0 && (
            <div className="alert-box error" role="alert">
              <AlertCircle size={15} strokeWidth={1.5} />
              <div>
                {validation.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="alert-box warning">
              <AlertCircle size={15} strokeWidth={1.5} />
              <div>
                {validation.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}

          {isExporting && progress && (
            <div className="export-progress-card">
              <div className="progress-header">
                <Loader2 size={15} strokeWidth={1.5} className="spin-icon" />
                <span>{progress.message}</span>
                <strong>{progress.percent}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(2, progress.percent)}%` }}
                />
              </div>
            </div>
          )}

          {exportError && (
            <div className="alert-box error" role="alert">
              <AlertCircle size={15} strokeWidth={1.5} />
              <span>{exportError}</span>
            </div>
          )}

          {exportResult && downloadUrl && (
            <div className="export-result-card" data-testid="export-complete-card">
              <div className="result-header">
                <Check size={16} strokeWidth={1.75} />
                <div>
                  <strong>{exportResult.filename}</strong> (
                  {(exportResult.sizeBytes / 1024).toFixed(1)} KB)
                </div>
              </div>
              <div className="result-actions">
                <a
                  href={downloadUrl}
                  download={exportResult.filename}
                  className="primary-btn download-link-btn"
                  data-testid="download-export-link"
                >
                  <Download size={14} strokeWidth={1.5} />
                  <span>{t('export.downloadBtn')}</span>
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            {t('export.closeBtn')}
          </button>
          {isExporting ? (
            <button type="button" className="danger-btn" onClick={handleCancelExport}>
              {t('export.cancelBtn')}
            </button>
          ) : (
            <button
              type="button"
              className="primary-btn"
              disabled={!validation.valid}
              onClick={handleStartExport}
              data-testid="start-export-btn"
            >
              {t('export.startBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
