import React, { useEffect, useState } from 'react';
import { AmapaProject, ProjectSettings } from '../types/project';
import { loadSavedProjectsList } from '../storage/projectStorage';
import { Check, Download, FolderOpen, Plus, Save, Settings, Upload, X } from 'lucide-react';

const RESOLUTION_PRESETS = [
  { label: '1080p Full HD (1920 × 1080 - 16:9)', width: 1920, height: 1080 },
  { label: '720p HD (1280 × 720 - 16:9)', width: 1280, height: 720 },
  { label: '4K Ultra HD (3840 × 2160 - 16:9)', width: 3840, height: 2160 },
  { label: '2K QHD (2560 × 1440 - 16:9)', width: 2560, height: 1440 },
  { label: 'Vertical TikTok / Reels (1080 × 1920 - 9:16)', width: 1080, height: 1920 },
  { label: 'Vertical HD (720 × 1280 - 9:16)', width: 720, height: 1280 },
  { label: 'Cuadrado Instagram (1080 × 1080 - 1:1)', width: 1080, height: 1080 },
  { label: 'Vertical Retrato (1080 × 1440 - 3:4)', width: 1080, height: 1440 },
  { label: 'Retrato Instagram (1080 × 1350 - 4:5)', width: 1080, height: 1350 },
];

interface ProjectsModalProps {
  currentProject: AmapaProject;
  onNewProject: (name: string) => void;
  onSaveAsProject: (name: string) => void;
  onOpenProjectById: (id: string) => void;
  onUpdateProjectSettings: (settings: ProjectSettings) => void;
  onExportProjectJson: () => void;
  onImportProjectJsonFile: (file: File) => void;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  currentProject,
  onNewProject,
  onSaveAsProject,
  onOpenProjectById,
  onUpdateProjectSettings,
  onExportProjectJson,
  onImportProjectJsonFile,
  onClose,
}) => {
  const [savedList, setSavedList] = useState<
    Array<{ id: string; name: string; updatedAt: string; clipCount: number }>
  >([]);
  const [newProjectName, setNewProjectName] = useState('Mi Video AMAPA');
  const [saveAsName, setSaveAsName] = useState(`${currentProject.name} (Copia)`);
  const [settingsForm, setSettingsForm] = useState<ProjectSettings>(currentProject.settings);
  const [appliedFeedback, setAppliedFeedback] = useState(false);

  const matchedPreset = RESOLUTION_PRESETS.find(
    (p) => p.width === settingsForm.width && p.height === settingsForm.height
  );
  const [customMode, setCustomMode] = useState(!matchedPreset);

  const selectedPresetValue = customMode || !matchedPreset
    ? 'custom'
    : `${settingsForm.width}x${settingsForm.height}`;

  const getAspectRatioLabel = (w: number, h: number) => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(w, h);
    const rw = w / divisor;
    const rh = h / divisor;
    if (rw === 16 && rh === 9) return '16:9';
    if (rw === 9 && rh === 16) return '9:16';
    if (rw === 1 && rh === 1) return '1:1';
    if (rw === 4 && rh === 3) return '4:3';
    if (rw === 3 && rh === 4) return '3:4';
    if (rw === 4 && rh === 5) return '4:5';
    if (rw === 21 && rh === 9) return '21:9';
    return `${rw}:${rh}`;
  };

  const handleResolutionSelect = (val: string) => {
    if (val === 'custom') {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      const [w, h] = val.split('x').map(Number);
      if (w && h) {
        setSettingsForm((prev) => ({
          ...prev,
          width: w,
          height: h,
        }));
      }
    }
  };

  useEffect(() => {
    loadSavedProjectsList().then(setSavedList).catch(() => {});
  }, [currentProject]);

  const handleApplySettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProjectSettings(settingsForm);
    setAppliedFeedback(true);
    setTimeout(() => {
      setAppliedFeedback(false);
    }, 2000);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Proyectos y Ajustes">
      <div className="modal-card projects-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <FolderOpen size={19} className="accent-icon" />
            <h2>Proyectos y Ajustes del Lienzo</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="projects-sections-grid">
            {/* Box 1: Create or Save */}
            <div className="project-box">
              <h3>
                <Plus size={16} /> Crear o Guardar Proyecto
              </h3>
              <div className="inline-input-row">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nombre de nuevo proyecto..."
                  aria-label="Nombre de nuevo proyecto"
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    onNewProject(newProjectName.trim() || 'Nuevo Proyecto');
                    onClose();
                  }}
                >
                  Nuevo
                </button>
              </div>

              <div className="inline-input-row">
                <input
                  type="text"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  placeholder="Nombre de copia..."
                  aria-label="Nombre para Guardar Como"
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    onSaveAsProject(saveAsName.trim() || `${currentProject.name} Copia`);
                    onClose();
                  }}
                >
                  <Save size={14} /> Guardar Como
                </button>
              </div>

              <div className="portable-json-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={onExportProjectJson}
                >
                  <Download size={15} /> Exportar <code>.amapa.json</code>
                </button>

                <label className="secondary-btn file-label-btn">
                  <Upload size={15} /> Importar <code>.amapa.json</code>
                  <input
                    type="file"
                    accept=".json,.amapa.json,application/json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        onImportProjectJsonFile(f);
                        onClose();
                      }
                    }}
                  />
                </label>
              </div>
              <p className="storage-note">
                El almacenamiento local de tu navegador guarda tus proyectos de forma privada. Descarga un archivo <code>.amapa.json</code> para conservarlo permanentemente o compartirlo.
              </p>
            </div>

            {/* Box 2: Canvas and Resolution Settings */}
            <form className="project-box project-canvas-settings-box" onSubmit={handleApplySettings}>
              <div className="project-box-header">
                <h3>
                  <Settings size={16} /> Ajustes del Lienzo (Canvas)
                </h3>
                <span className="current-res-badge">
                  {settingsForm.width} × {settingsForm.height} ({getAspectRatioLabel(settingsForm.width, settingsForm.height)})
                </span>
              </div>

              <div className="settings-fields-stack">
                <div className="form-field full-width">
                  <label htmlFor="proj-res-select">Resolución de Video / Formato</label>
                  <select
                    id="proj-res-select"
                    className="proj-res-select"
                    value={selectedPresetValue}
                    onChange={(e) => handleResolutionSelect(e.target.value)}
                  >
                    {RESOLUTION_PRESETS.map((p) => (
                      <option key={`${p.width}x${p.height}`} value={`${p.width}x${p.height}`}>
                        {p.label}
                      </option>
                    ))}
                    <option value="custom">Personalizado (Custom)...</option>
                  </select>
                </div>

                {customMode && (
                  <div className="settings-mini-grid">
                    <div className="form-field">
                      <label htmlFor="proj-w">Ancho (px)</label>
                      <input
                        id="proj-w"
                        type="number"
                        min={128}
                        max={3840}
                        step={2}
                        value={settingsForm.width}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            width: Number(e.target.value) || 1920,
                          })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="proj-h">Alto (px)</label>
                      <input
                        id="proj-h"
                        type="number"
                        min={128}
                        max={3840}
                        step={2}
                        value={settingsForm.height}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            height: Number(e.target.value) || 1080,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="proj-fps">Velocidad de fotogramas (FPS)</label>
                  <select
                    id="proj-fps"
                    value={settingsForm.fps}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        fps: Number(e.target.value) || 30,
                      })
                    }
                  >
                    <option value={24}>24 fps (Cinematográfico)</option>
                    <option value={25}>25 fps (PAL)</option>
                    <option value={30}>30 fps (Estándar Web)</option>
                    <option value={60}>60 fps (Fluido)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className={`primary-btn full-width-btn ${appliedFeedback ? 'success-feedback-btn' : ''}`}
                style={{ marginTop: '12px' }}
              >
                {appliedFeedback ? (
                  <>
                    <Check size={15} /> ¡Ajustes Aplicados!
                  </>
                ) : (
                  'Aplicar Ajustes del Lienzo'
                )}
              </button>
            </form>
          </div>

          <div className="saved-projects-section">
            <h3>Proyectos Guardados en Navegador (IndexedDB)</h3>
            {savedList.length === 0 ? (
              <div className="empty-saved">
                No hay proyectos guardados aún. Haz clic en <strong>Guardar</strong> en la barra superior para almacenar en este navegador.
              </div>
            ) : (
              <div className="saved-projects-list">
                {savedList.map((item) => (
                  <div key={item.id} className="saved-project-row">
                    <div className="saved-project-info">
                      <strong className="saved-project-name">{item.name}</strong>
                      <span className="saved-meta">
                        {item.clipCount} clip(s) • Actualizado {new Date(item.updatedAt).toLocaleDateString()} {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="secondary-btn compact-btn"
                      onClick={() => {
                        onOpenProjectById(item.id);
                        onClose();
                      }}
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
