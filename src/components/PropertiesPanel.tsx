import React, { useState } from 'react';
import {
  CanvasFitMode,
  ClipAnimation,
  TextAlignMode,
  TimelineClip,
  TransitionType,
} from '../types/project';
import {
  COLOR_FILTER_PRESETS,
  createDefaultColor,
  createDefaultTransform,
  PIP_PRESETS,
} from '../engine/timelineEngine';
import { Locale, translate } from '../i18n/translations';
import {
  ChevronDown,
  ChevronRight,
  FlipHorizontal,
  FlipVertical,
  MousePointerClick,
  RotateCcw,
  Volume2,
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedClip: TimelineClip | null;
  locale: Locale;
  onUpdateClip: (clipId: string, updater: (clip: TimelineClip) => TimelineClip) => void;
  onChangeClipSpeed: (clipId: string, speed: number) => void;
  onTrimClipEnd: (clipId: string, newDuration: number) => void;
  onDetachAudio?: (clipId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedClip,
  locale,
  onUpdateClip,
  onChangeClipSpeed,
  onTrimClipEnd,
  onDetachAudio,
}) => {
  const t = (key: string) => translate(locale, key);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!selectedClip) {
    return (
      <aside className="panel properties-panel" aria-label={t('inspector.title')}>
        <div className="panel-header-bar">
          <h3>{t('inspector.title')}</h3>
        </div>
        <div className="inspector-empty">
          <div className="empty-icon-circle">
            <MousePointerClick size={18} strokeWidth={1.5} />
          </div>
          <strong className="empty-title">
            {locale === 'es' ? 'Ningún clip seleccionado' : 'No clip selected'}
          </strong>
          <p>{t('inspector.empty')}</p>
          <div className="quick-tips-box">
            <div className="quick-tip-row">
              <span>{locale === 'es' ? 'Reproducir' : 'Play'}</span>
              <kbd>Espacio</kbd>
            </div>
            <div className="quick-tip-row">
              <span>{locale === 'es' ? 'Cortar clip' : 'Split clip'}</span>
              <kbd>S</kbd>
            </div>
            <div className="quick-tip-row">
              <span>{locale === 'es' ? 'Borrar clip' : 'Delete clip'}</span>
              <kbd>Supr</kbd>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const isVisual =
    selectedClip.kind === 'video' ||
    selectedClip.kind === 'image' ||
    selectedClip.kind === 'text';
  const isAudioCapable = selectedClip.kind === 'video' || selectedClip.kind === 'audio';
  const isText = selectedClip.kind === 'text';

  return (
    <aside className="panel properties-panel" aria-label={t('inspector.title')}>
      <div className="panel-header-bar">
        <div className="inspector-clip-header">
          <span className="clip-kind-badge">{selectedClip.kind.toUpperCase()}</span>
          <strong className="inspector-clip-name" title={selectedClip.name}>
            {selectedClip.name}
          </strong>
        </div>
        {selectedClip.kind === 'video' && onDetachAudio && (
          <button
            type="button"
            className="secondary-btn compact-btn"
            onClick={() => onDetachAudio(selectedClip.id)}
            title={locale === 'es' ? 'Separar audio a una pista independiente' : 'Detach audio to track'}
          >
            <Volume2 size={13} strokeWidth={1.6} />
            <span>{locale === 'es' ? 'Separar audio' : 'Detach audio'}</span>
          </button>
        )}
      </div>

      <div className="inspector-body">
        <div className="inspector-group">
          {isText && selectedClip.textStyle && (
            <div className="inspector-section-card">
              <span className="card-section-title">
                {locale === 'es' ? 'Contenido de texto' : 'Text content'}
              </span>
              <div className="form-field">
                <textarea
                  id="title-text-input"
                  rows={2}
                  value={selectedClip.textStyle.text}
                  placeholder={locale === 'es' ? 'Escribe tu texto...' : 'Enter text...'}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      name: e.target.value || 'Title',
                      textStyle: c.textStyle
                        ? { ...c.textStyle, text: e.target.value }
                        : undefined,
                    }))
                  }
                />
              </div>

              <div className="control-row-grid">
                <div className="form-field">
                  <label htmlFor="title-font-size">
                    {locale === 'es' ? 'Tamaño' : 'Size'}
                  </label>
                  <input
                    id="title-font-size"
                    type="number"
                    min={16}
                    max={200}
                    value={selectedClip.textStyle.fontSize}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        textStyle: c.textStyle
                          ? { ...c.textStyle, fontSize: Number(e.target.value) || 48 }
                          : undefined,
                      }))
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="title-color">Color</label>
                  <input
                    id="title-color"
                    type="color"
                    value={selectedClip.textStyle.color}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, (c) => ({
                        ...c,
                        textStyle: c.textStyle
                          ? { ...c.textStyle, color: e.target.value }
                          : undefined,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {isVisual && (
            <div className="inspector-section-card">
              <span className="card-section-title">
                {locale === 'es' ? 'Apariencia' : 'Appearance'}
              </span>
              <div className="slider-field">
                <div className="slider-label">
                  <span>{locale === 'es' ? 'Tamaño (Escala)' : 'Size (Scale)'}</span>
                  <strong>{Math.round(selectedClip.transform.scale * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={selectedClip.transform.scale}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      transform: { ...c.transform, scale: Number(e.target.value) },
                    }))
                  }
                  aria-label="Scale"
                />
              </div>

              <div className="slider-field">
                <div className="slider-label">
                  <span>{locale === 'es' ? 'Opacidad' : 'Opacity'}</span>
                  <strong>{Math.round(selectedClip.transform.opacity * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={selectedClip.transform.opacity}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      transform: { ...c.transform, opacity: Number(e.target.value) },
                    }))
                  }
                  aria-label="Opacity"
                />
              </div>

              <div className="form-field" style={{ marginTop: '8px' }}>
                <label className="form-label">
                  {locale === 'es' ? 'Encuadre al formato' : 'Frame fitting'}
                </label>
                <select
                  className="form-select"
                  value={selectedClip.fitMode || 'auto'}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      fitMode: val === 'auto' ? undefined : (val as CanvasFitMode),
                    }));
                  }}
                  aria-label="Frame fitting"
                >
                  <option value="auto">
                    {locale === 'es' ? 'Automático (del proyecto)' : 'Auto (project default)'}
                  </option>
                  <option value="fit">
                    {locale === 'es' ? 'Ajustar (completo con barras)' : 'Fit (contain with bars)'}
                  </option>
                  <option value="fill">
                    {locale === 'es' ? 'Rellenar (recortar bordes)' : 'Fill (crop to frame)'}
                  </option>
                </select>
              </div>

              <div className="form-field" style={{ marginTop: '8px' }}>
                <label className="form-label">
                  {locale === 'es' ? 'Animación de entrada' : 'Entry animation'}
                </label>
                <select
                  className="form-select"
                  value={selectedClip.animation || 'none'}
                  onChange={(e) => {
                    const anim = e.target.value as ClipAnimation;
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      animation: anim === 'none' ? undefined : anim,
                    }));
                  }}
                  aria-label="Entry animation"
                >
                  <option value="none">{locale === 'es' ? 'Ninguna' : 'None'}</option>
                  <option value="fade">{locale === 'es' ? 'Fundido suave (Fade in)' : 'Fade in'}</option>
                  <option value="pop">{locale === 'es' ? 'Zoom Pop (Rebote)' : 'Pop in'}</option>
                  <option value="slide-up">{locale === 'es' ? 'Deslizar desde abajo' : 'Slide up'}</option>
                  <option value="slide-left">{locale === 'es' ? 'Deslizar desde el lado' : 'Slide left'}</option>
                </select>
              </div>
            </div>
          )}

          {isAudioCapable && (
            <div className="inspector-section-card">
              <span className="card-section-title">
                {locale === 'es' ? 'Audio y ritmo' : 'Audio & speed'}
              </span>
              <div className="slider-field">
                <div className="slider-label">
                  <span>{locale === 'es' ? 'Volumen' : 'Volume'}</span>
                  <strong>
                    {selectedClip.muted ? '0%' : `${Math.round(selectedClip.volume * 100)}%`}
                  </strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={selectedClip.muted ? 0 : selectedClip.volume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      muted: val === 0,
                      volume: val,
                    }));
                  }}
                  aria-label="Clip Volume"
                />
              </div>

              <div className="slider-field">
                <div className="slider-label">
                  <span>{locale === 'es' ? 'Velocidad' : 'Speed'}</span>
                  <strong>{selectedClip.playbackSpeed}×</strong>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.25}
                  value={selectedClip.playbackSpeed}
                  onChange={(e) =>
                    onChangeClipSpeed(selectedClip.id, Number(e.target.value))
                  }
                  aria-label="Clip Playback Speed"
                />
              </div>
            </div>
          )}

          <div className="inspector-section-card">
            <span className="card-section-title">
              {locale === 'es' ? 'Tiempo en línea' : 'Timing'}
            </span>
            <div className="control-row-grid">
              <div className="form-field">
                <label htmlFor="clip-start">
                  {locale === 'es' ? 'Inicio (s)' : 'Start (s)'}
                </label>
                <input
                  id="clip-start"
                  type="number"
                  step={0.1}
                  min={0}
                  value={selectedClip.startTime}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, (c) => ({
                      ...c,
                      startTime: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor="clip-duration">
                  {locale === 'es' ? 'Duración (s)' : 'Duration (s)'}
                </label>
                <input
                  id="clip-duration"
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={selectedClip.duration}
                  onChange={(e) =>
                    onTrimClipEnd(
                      selectedClip.id,
                      Math.max(0.1, Number(e.target.value) || 0.5)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? (
              <ChevronDown size={14} strokeWidth={1.5} />
            ) : (
              <ChevronRight size={14} strokeWidth={1.5} />
            )}
            <span>{t('inspector.advancedToggle')}</span>
          </button>

          {showAdvanced && (
            <div className="advanced-controls-stack">
              {isVisual && (
                <>
                  <div className="inspector-section-card">
                    <span className="card-section-title">
                      {locale === 'es' ? 'Posición y giro' : 'Position & rotation'}
                    </span>

                    <div className="pip-presets-group" style={{ marginBottom: '10px' }}>
                      <span className="form-sublabel">
                        {locale === 'es' ? 'Picture-in-Picture (Reacción rápida):' : 'Picture-in-Picture (PiP):'}
                      </span>
                      <div className="pip-buttons-row">
                        {PIP_PRESETS.map((pip) => (
                          <button
                            key={pip.id}
                            type="button"
                            className="secondary-btn compact-btn"
                            onClick={() =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  scale: pip.scale,
                                  x: pip.x,
                                  y: pip.y,
                                },
                              }))
                            }
                          >
                            {pip.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="control-row-grid">
                      <div className="form-field">
                        <label htmlFor="pos-x">X (%)</label>
                        <input
                          id="pos-x"
                          type="number"
                          min={-100}
                          max={100}
                          value={selectedClip.transform.x}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              transform: { ...c.transform, x: Number(e.target.value) || 0 },
                            }))
                          }
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="pos-y">Y (%)</label>
                        <input
                          id="pos-y"
                          type="number"
                          min={-100}
                          max={100}
                          value={selectedClip.transform.y}
                          onChange={(e) =>
                            onUpdateClip(selectedClip.id, (c) => ({
                              ...c,
                              transform: { ...c.transform, y: Number(e.target.value) || 0 },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="slider-field">
                      <div className="slider-label">
                        <span>{locale === 'es' ? 'Rotación' : 'Rotation'}</span>
                        <strong>{selectedClip.transform.rotation}°</strong>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={selectedClip.transform.rotation}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            transform: { ...c.transform, rotation: Number(e.target.value) },
                          }))
                        }
                        aria-label="Rotation"
                      />
                    </div>

                    <div className="flip-buttons-row">
                      <button
                        type="button"
                        className={`secondary-btn ${
                          selectedClip.transform.flipH ? 'active-toggle' : ''
                        }`}
                        onClick={() =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            transform: { ...c.transform, flipH: !c.transform.flipH },
                          }))
                        }
                      >
                        <FlipHorizontal size={13} strokeWidth={1.5} /> Flip H
                      </button>
                      <button
                        type="button"
                        className={`secondary-btn ${
                          selectedClip.transform.flipV ? 'active-toggle' : ''
                        }`}
                        onClick={() =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            transform: { ...c.transform, flipV: !c.transform.flipV },
                          }))
                        }
                      >
                        <FlipVertical size={13} strokeWidth={1.5} /> Flip V
                      </button>
                    </div>
                  </div>

                  {!isText && (
                    <div className="inspector-section-card">
                      <span className="card-section-title">
                        {locale === 'es' ? 'Recorte de bordes (%)' : 'Crop edges (%)'}
                      </span>
                      <div className="control-row-grid">
                        <div className="form-field">
                          <label htmlFor="crop-t">Top</label>
                          <input
                            id="crop-t"
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClip.transform.cropTop}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  cropTop: Math.max(
                                    0,
                                    Math.min(45, Number(e.target.value) || 0)
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="crop-b">Bottom</label>
                          <input
                            id="crop-b"
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClip.transform.cropBottom}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  cropBottom: Math.max(
                                    0,
                                    Math.min(45, Number(e.target.value) || 0)
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="crop-l">Left</label>
                          <input
                            id="crop-l"
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClip.transform.cropLeft}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  cropLeft: Math.max(
                                    0,
                                    Math.min(45, Number(e.target.value) || 0)
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="crop-r">Right</label>
                          <input
                            id="crop-r"
                            type="number"
                            min={0}
                            max={45}
                            value={selectedClip.transform.cropRight}
                            onChange={(e) =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                transform: {
                                  ...c.transform,
                                  cropRight: Math.max(
                                    0,
                                    Math.min(45, Number(e.target.value) || 0)
                                  ),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="inspector-section-card">
                    <span className="card-section-title">Color & Transición</span>

                    <div className="color-presets-group" style={{ marginBottom: '10px' }}>
                      <span className="form-sublabel">
                        {locale === 'es' ? 'Filtros rápidos con 1 clic:' : 'Quick Color Filters:'}
                      </span>
                      <div className="color-presets-row">
                        {COLOR_FILTER_PRESETS.map((filter) => (
                          <button
                            key={filter.id}
                            type="button"
                            className="secondary-btn compact-btn"
                            onClick={() =>
                              onUpdateClip(selectedClip.id, (c) => ({
                                ...c,
                                color: { ...filter.color },
                              }))
                            }
                          >
                            {filter.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="slider-field">
                      <div className="slider-label">
                        <span>{locale === 'es' ? 'Brillo' : 'Brightness'}</span>
                        <strong>{selectedClip.color.brightness}</strong>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedClip.color.brightness}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            color: { ...c.color, brightness: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>
                    <div className="slider-field">
                      <div className="slider-label">
                        <span>{locale === 'es' ? 'Contraste' : 'Contrast'}</span>
                        <strong>{selectedClip.color.contrast}</strong>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedClip.color.contrast}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            color: { ...c.color, contrast: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>
                    <div className="slider-field">
                      <div className="slider-label">
                        <span>{locale === 'es' ? 'Saturación' : 'Saturation'}</span>
                        <strong>{selectedClip.color.saturation}</strong>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={selectedClip.color.saturation}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            color: { ...c.color, saturation: Number(e.target.value) },
                          }))
                        }
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="trans-type">
                        {locale === 'es' ? 'Efecto de transición' : 'Transition'}
                      </label>
                      <select
                        id="trans-type"
                        value={selectedClip.transition.type}
                        onChange={(e) => {
                          const type = e.target.value as TransitionType;
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            transition: {
                              type,
                              inDuration: type === 'none' ? 0 : c.transition.inDuration || 0.4,
                              outDuration: type === 'none' ? 0 : c.transition.outDuration || 0.4,
                            },
                          }));
                        }}
                      >
                        <option value="none">{locale === 'es' ? 'Corte directo' : 'None'}</option>
                        <option value="fade">{locale === 'es' ? 'Fundido' : 'Fade'}</option>
                        <option value="crossfade">
                          {locale === 'es' ? 'Fundido cruzado' : 'Crossfade'}
                        </option>
                        <option value="wipe-left">
                          {locale === 'es' ? 'Barrido' : 'Wipe'}
                        </option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {isText && selectedClip.textStyle && (
                <div className="inspector-section-card">
                  <span className="card-section-title">
                    {locale === 'es' ? 'Tipografía y alineación' : 'Typography'}
                  </span>
                  <div className="control-row-grid">
                    <div className="form-field">
                      <label htmlFor="title-font-family">
                        {locale === 'es' ? 'Fuente' : 'Font'}
                      </label>
                      <select
                        id="title-font-family"
                        value={selectedClip.textStyle.fontFamily}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            textStyle: c.textStyle
                              ? { ...c.textStyle, fontFamily: e.target.value }
                              : undefined,
                          }))
                        }
                      >
                        <option value="Inter, system-ui, sans-serif">Sans</option>
                        <option value="Georgia, serif">Serif</option>
                        <option value="'Courier New', monospace">Mono</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="title-align">
                        {locale === 'es' ? 'Alinear' : 'Align'}
                      </label>
                      <select
                        id="title-align"
                        value={selectedClip.textStyle.align}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            textStyle: c.textStyle
                              ? { ...c.textStyle, align: e.target.value as TextAlignMode }
                              : undefined,
                          }))
                        }
                      >
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {isAudioCapable && (
                <div className="inspector-section-card">
                  <span className="card-section-title">
                    {locale === 'es' ? 'Fundido de audio (s)' : 'Audio fade (s)'}
                  </span>
                  <div className="control-row-grid">
                    <div className="form-field">
                      <label htmlFor="audio-fade-in">Entrada</label>
                      <input
                        id="audio-fade-in"
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={selectedClip.fadeIn}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            fadeIn: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="audio-fade-out">Salida</label>
                      <input
                        id="audio-fade-out"
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={selectedClip.fadeOut}
                        onChange={(e) =>
                          onUpdateClip(selectedClip.id, (c) => ({
                            ...c,
                            fadeOut: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="secondary-btn full-width-btn"
                onClick={() =>
                  onUpdateClip(selectedClip.id, (c) => ({
                    ...c,
                    transform: createDefaultTransform(),
                    color: createDefaultColor(),
                  }))
                }
              >
                <RotateCcw size={13} strokeWidth={1.5} />
                <span>{locale === 'es' ? 'Restablecer valores' : 'Reset values'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
