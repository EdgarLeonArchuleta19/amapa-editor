import React from 'react';
import { AmapaProject } from '../types/project';
import { ASPECT_RATIO_PRESETS } from '../engine/timelineEngine';
import { Locale, translate } from '../i18n/translations';
import { AmapaLogo } from './AmapaLogo';
import {
  ArrowUpRight,
  Folder,
  HelpCircle,
  Maximize2,
  Minimize2,
  Moon,
  Redo2,
  Save,
  Sun,
  Undo2,
} from 'lucide-react';

interface TopBarProps {
  project: AmapaProject;
  canUndo: boolean;
  canRedo: boolean;
  locale: Locale;
  theme: 'dark' | 'light';
  lastSavedMessage: string | null;
  onRenameProject: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveProject: () => void;
  onOpenProjectsModal: () => void;
  onOpenExportModal: () => void;
  onOpenAboutModal: () => void;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
  onChangeAspectRatio: (ratioId: string) => void;
  onToggleFitMode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  project,
  canUndo,
  canRedo,
  locale,
  theme,
  lastSavedMessage,
  onRenameProject,
  onUndo,
  onRedo,
  onSaveProject,
  onOpenProjectsModal,
  onOpenExportModal,
  onOpenAboutModal,
  onToggleLocale,
  onToggleTheme,
  onChangeAspectRatio,
  onToggleFitMode,
}) => {
  const t = (key: string) => translate(locale, key);
  const currentRatio = project.settings.aspectRatio || '16:9';
  const currentFitMode = project.settings.fitMode || 'fit';

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <div className="brand-title" title={t('app.tagline')}>
          <AmapaLogo size={26} />
          <span className="brand-text">AMAPA</span>
        </div>

        <span className="topbar-sep">/</span>

        <input
          type="text"
          className="project-name-input"
          value={project.name}
          onChange={(e) => onRenameProject(e.target.value)}
          aria-label="Project Name"
        />

        {lastSavedMessage && (
          <span className="autosave-pill" aria-live="polite">
            {lastSavedMessage}
          </span>
        )}
      </div>

      <div className="topbar-center">
        {/* Format & Aspect Ratio control */}
        <div className="topbar-format-group">
          <select
            className="topbar-format-select"
            value={currentRatio}
            onChange={(e) => onChangeAspectRatio(e.target.value)}
            title={locale === 'es' ? 'Formato de corte del video' : 'Video aspect ratio'}
            aria-label={locale === 'es' ? 'Formato de corte del video' : 'Video aspect ratio'}
          >
            {ASPECT_RATIO_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} — {preset.descriptionKey}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={`toolbar-btn compact-btn ${currentFitMode === 'fill' ? 'active-toggle' : ''}`}
            onClick={onToggleFitMode}
            title={
              currentFitMode === 'fill'
                ? locale === 'es'
                  ? 'Modo Rellenar: el video se recorta al formato sin bandas negras (clic para cambiar a Ajustar)'
                  : 'Fill mode: video fills frame and is cropped without bars (click for Fit)'
                : locale === 'es'
                ? 'Modo Ajustar: acomoda el video completo dentro del formato con bandas (clic para cambiar a Rellenar)'
                : 'Fit mode: full video fits inside frame with letterbox (click for Fill)'
            }
          >
            {currentFitMode === 'fill' ? (
              <>
                <Maximize2 size={13} strokeWidth={1.6} />
                <span>{locale === 'es' ? 'Rellenar' : 'Fill'}</span>
              </>
            ) : (
              <>
                <Minimize2 size={13} strokeWidth={1.6} />
                <span>{locale === 'es' ? 'Ajustar' : 'Fit'}</span>
              </>
            )}
          </button>
        </div>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="icon-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title={`${t('nav.undo')} (Ctrl+Z)`}
          aria-label={t('nav.undo')}
        >
          <Undo2 size={15} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title={`${t('nav.redo')} (Ctrl+Y)`}
          aria-label={t('nav.redo')}
        >
          <Redo2 size={15} strokeWidth={1.5} />
        </button>

        <div className="toolbar-divider" />

        <button
          type="button"
          className="toolbar-btn"
          onClick={onOpenProjectsModal}
          title={t('nav.openProject')}
        >
          <Folder size={14} strokeWidth={1.5} />
          <span>{t('nav.openProject')}</span>
        </button>

        <button
          type="button"
          className="toolbar-btn"
          onClick={onSaveProject}
          title={t('nav.saveProject')}
        >
          <Save size={14} strokeWidth={1.5} />
          <span>{t('nav.saveProject')}</span>
        </button>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleLocale}
          title={t('nav.language')}
          aria-label={t('nav.language')}
        >
          <span className="lang-code">{locale.toUpperCase()}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          title={t('nav.theme')}
          aria-label={t('nav.theme')}
        >
          {theme === 'dark' ? (
            <Sun size={15} strokeWidth={1.5} />
          ) : (
            <Moon size={15} strokeWidth={1.5} />
          )}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onOpenAboutModal}
          title={t('nav.about')}
          aria-label={t('nav.about')}
        >
          <HelpCircle size={15} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          className="primary-btn export-cta-btn"
          onClick={onOpenExportModal}
          data-testid="open-export-modal-btn"
        >
          <span>{t('nav.exportVideo')}</span>
          <ArrowUpRight size={14} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
};
