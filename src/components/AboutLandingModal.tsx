import React, { useEffect, useState } from 'react';
import { AmapaLogo } from './AmapaLogo';
import { getNativeRuntimeInfo, NativeRuntimeInfo } from '../engine/tauriBridge';
import { X } from 'lucide-react';

interface AboutLandingModalProps {
  onClose: () => void;
}

export const AboutLandingModal: React.FC<AboutLandingModalProps> = ({ onClose }) => {
  const [runtimeInfo, setRuntimeInfo] = useState<NativeRuntimeInfo | null>(null);

  useEffect(() => {
    getNativeRuntimeInfo().then(setRuntimeInfo).catch(() => {});
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="AMAPA Info">
      <div className="modal-card landing-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <AmapaLogo size={24} />
            <h2>AMAPA Desktop (Rust + Tauri 2)</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-body landing-body">
          <section className="hero-banner">
            <h1>Editor de video nativo para Windows en Rust y Tauri 2.</h1>
            <p>
              <strong>AMAPA</strong> es un editor de video nativo, libre y de código abierto
              (licencia MIT) creado por <strong>Edgar León Archuleta</strong>. Ultra liviano,
              acelerado por hardware y sin marcas de agua.
            </p>
            {runtimeInfo && (
              <div style={{ marginTop: '8px', fontSize: '11.5px', opacity: 0.85 }}>
                Motor: <code>{runtimeInfo.engine} v{runtimeInfo.version}</code> • Modo:{' '}
                <strong>{runtimeInfo.isPortable ? 'Portable' : 'Instalado'}</strong>
              </div>
            )}
          </section>

          <div className="landing-grid">
            <div className="info-card">
              <h3>Núcleo Nativo en Rust</h3>
              <p>
                Síntesis de efectos de sonido (SFX), análisis de ondas de audio (DSP), persistencia
                nativa en disco y motor de reproducción a 60-120 FPS sin bloqueos.
              </p>
            </div>

            <div className="info-card">
              <h3>Exportación Directa con Audio</h3>
              <p>
                Elige entre formatos predefinidos (720p, 1080p, 4K, Vertical 9:16, Cuadrado 1:1) y
                guarda directamente tus videos en MP4, WebM o WAV en tu equipo.
              </p>
            </div>
          </div>

          <section className="docs-section">
            <h3>Atajos de teclado</h3>
            <div className="shortcuts-grid">
              <div>
                <kbd>Espacio</kbd> Reproducir / Pausar
              </div>
              <div>
                <kbd>S</kbd> Cortar clip en el cabezal
              </div>
              <div>
                <kbd>D</kbd> Duplicar clip seleccionado
              </div>
              <div>
                <kbd>Supr</kbd> / <kbd>Backspace</kbd> Borrar clip
              </div>
              <div>
                <kbd>Ctrl + Z</kbd> Deshacer
              </div>
              <div>
                <kbd>Ctrl + Y</kbd> Rehacer
              </div>
              <div>
                <kbd>,</kbd> / <kbd>.</kbd> Avanzar / retroceder 1 cuadro
              </div>
              <div>
                <kbd>Inicio</kbd> Ir al segundo 00:00
              </div>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="primary-btn" onClick={onClose}>
            Volver al editor
          </button>
        </div>
      </div>
    </div>
  );
};
