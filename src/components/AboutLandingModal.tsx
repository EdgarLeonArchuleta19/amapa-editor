import React from 'react';
import { AmapaLogo } from './AmapaLogo';
import { X } from 'lucide-react';

interface AboutLandingModalProps {
  onClose: () => void;
}

export const AboutLandingModal: React.FC<AboutLandingModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="AMAPA Info">
      <div className="modal-card landing-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <AmapaLogo size={24} />
            <h2>AMAPA</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <div className="modal-body landing-body">
          <section className="hero-banner">
            <h1>Edición de video directa en el navegador. Sin marcas de agua.</h1>
            <p>
              <strong>AMAPA</strong> es un editor de video libre y de código abierto (licencia MIT).
              Todo el procesamiento ocurre localmente en tu navegador, sin subir tus archivos a
              ningún servidor ni pedirte cuentas.
            </p>
          </section>

          <div className="landing-grid">
            <div className="info-card">
              <h3>100% Local y Privado</h3>
              <p>
                Tus videos, audios e imágenes se procesan en tu equipo mediante WebCodecs y Canvas.
                Tus proyectos se guardan localmente en el navegador o como archivo{' '}
                <code>.amapa.json</code>.
              </p>
            </div>

            <div className="info-card">
              <h3>Exportación Libre</h3>
              <p>
                Elige entre formatos predefinidos (720p, 1080p, 4K, Vertical 9:16, Cuadrado 1:1) o
                configura resolución, cuadros por segundo y códecs en MP4, WebM o WAV.
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
