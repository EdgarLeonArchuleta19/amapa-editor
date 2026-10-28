# AMAPA | Editor de Video Web

<p align="center">
  <img src="public/amapa-logo.png" alt="AMAPA Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Editor de video profesional, libre y de código abierto que se ejecuta 100% en tu navegador.</strong><br />
  Sin marcas de agua • Sin suscripciones • Privacidad total • Acelerado por hardware
</p>

<p align="center">
  <a href="https://edgarleonarchuleta19.github.io/amapa-editor/"><img src="https://img.shields.io/badge/Demo_en_Vivo-GitHub_Pages-black?style=for-the-badge&logo=github" alt="Live Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/Licencia-Atribuci%C3%B3n--NoComercial-black?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-purple?style=for-the-badge&logo=vite" alt="Vite" />
</p>

---

## 🌟 Probar en Vivo (GitHub Pages)

👉 **[https://edgarleonarchuleta19.github.io/amapa-editor/](https://edgarleonarchuleta19.github.io/amapa-editor/)**

No requiere instalación, registros ni subir archivos a ningún servidor. Todo el procesamiento ocurre de forma local en tu computadora o dispositivo móvil.

---

## 🎯 Filosofía del Proyecto

1. **100% Local y Privado**: Tus videos, audios e imágenes nunca salen de tu dispositivo. La decodificación, composición en lienzo Canvas 2D, mezcla de audio y renderizado se ejecutan directamente en la memoria del navegador.
2. **Sin Marcas de Agua ni Límites Artificiales**: Todo el conjunto de funciones, resoluciones (hasta 4K) y formatos es completamente libre.
3. **Estética Minimalista y Profesional**: Interfaz monocromática, limpia y sin distracciones, diseñada para maximizar el área de trabajo y el enfoque creativo.
4. **Respeto al Sistema**: Adaptabilidad automática a modo oscuro y modo claro con deslizadores y barras de desplazamiento totalmente personalizados.

---

## ✨ Características Principales

### 🎬 Línea de Tiempo Multipista
- **Multipistas simultáneas**: Capas de video, texto/títulos y audio independientes.
- **Edición no destructiva**: Corte en el cabezal (`S`), duplicación (`D`), recorte por extremos, eliminación y reordenamiento.
- **Separación de Audio con 1 Clic**: Extrae al instante la pista de audio de cualquier clip de video hacia una pista de audio independiente.
- **Ajuste Magnético (Snapping)**: Alineación precisa entre bordes de clips y cabezal de reproducción.
- **Historial Determinista**: Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`).
- **Zoom Dinámico Adaptable**: Visualización fluida de la regla de tiempo sin recortes forzados.

### 📐 Formatos y Relaciones de Aspecto
- **Selector de formato directo**: 
  - `16:9` Horizontal (YouTube, TV, Cine)
  - `9:16` Vertical (TikTok, Instagram Reels, YouTube Shorts)
  - `1:1` Cuadrado (Instagram Feed)
  - `3:4` y `4:5` Retrato
  - `21:9` Ultra panorámico
- **2 Modos de Encuadre**:
  - **Ajustar (Fit)**: Acomoda el video íntegro dentro del marco con barras protectoras.
  - **Rellenar (Fill)**: Recorta y expande el video para cubrir el formato al 100% sin bandas negras.

### 🎙️ Grabación en Vivo Integrada
- **Voz en off**: Graba tu micrófono directamente mientras previsualizas tu proyecto.
- **Grabación de Pantalla**: Captura tu escritorio, ventanas o pestañas de navegación con un clic.
- **Cámara Web**: Graba directamente con tu cámara web para blogs o comentarios.

### 🔊 Sintetizador de Efectos de Sonido (SFX)
- Motor de audio procedural basado en la **Web Audio API** (sin dependencias externas ni descargas pesadas).
- Efectos listos para usar libres de derechos: **Pop**, **Whoosh**, **Ding**, **Shutter de Cámara** y **Chime**.
- Preescucha en tiempo real e inserción directa en la línea de tiempo.

### 🎨 Efectos, Transiciones y Animaciones
- **Animaciones de entrada**: *Fade in*, *Pop (zoom-in)*, *Slide Up* y *Slide Left* con curvas suaves *cubic ease-out*.
- **Filtros de Color con 1 Clic**: *Golden Hour* (cálido), *B&W Noir* (blanco y negro contrastado), *Cyber Cool* (tonos fríos), *Vintage 90s* (desaturado nostálgico) y *Vivid Pop* (saturación vibrante).
- **Presets de Picture-in-Picture (PiP)**: Posicionamiento instantáneo en esquinas (Superior-Derecha, Inferior-Derecha, Inferior-Izquierda, Superior-Izquierda, Pantalla Completa).
- **Ajustes de Clip**: Opacidad, tamaño/escala, rotación, recorte lateral, volteo horizontal/vertical y velocidad de reproducción (0.25× a 2×).

### 🎛️ Reproductor y Deslizador Pro
- **Deslizador Scrubber Pro**: Desarrollado a medida sin usar el deslizador genérico del navegador. Incluye barra de progreso de acento, cabezal estilizado, línea guía y globo con código de tiempo flotante al pasar el ratón.
- **Controles Equilibrados**: Botón Play/Pausa rigurosamente centrado, flanqueado por salto por cuadros e inicio/fin.
- **Scrollbars Modernos**: Barras de desplazamiento estilizadas y delgadas en toda la interfaz.
- **Captura de Fotograma**: Descarga cualquier cuadro exacto en PNG con un clic.

### 💾 Almacenamiento y Portabilidad
- **IndexedDB Local**: Guarda proyectos y medios en la base de datos interna de tu navegador sin necesidad de internet.
- **Formato `.amapa.json`**: Exporta e importa proyectos completos portables para respaldarlos o editarlos en otro equipo.
- **Recuperación Automática de Sesión**: Si cierras la pestaña por error, AMAPA te permite restaurar tu sesión con un clic.

### 🚀 Motor de Exportación de Alto Rendimiento
- **WebCodecs (Aceleración por Hardware)**:
  - Contenedor **MP4** con códec de video **H.264 (AVC)** y audio AAC/Opus.
  - Contenedor **WebM** con códecs **VP9**, **VP8** o **AV1**.
- **MediaRecorder Fallback**: Compatibilidad en navegadores donde WebCodecs no esté disponible.
- **Audio WAV**: Exportación directa de la mezcla de audio sin comprimir.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| <kbd>Espacio</kbd> | Reproducir / Pausar video |
| <kbd>S</kbd> | Cortar clip en la posición del cabezal |
| <kbd>D</kbd> | Duplicar clip seleccionado |
| <kbd>Supr</kbd> / <kbd>Backspace</kbd> | Eliminar clip seleccionado |
| <kbd>Ctrl + Z</kbd> | Deshacer última acción |
| <kbd>Ctrl + Y</kbd> | Rehacer acción |
| <kbd>,</kbd> / <kbd>.</kbd> | Retroceder / Avanzar 1 fotograma |
| <kbd>Inicio</kbd> | Ir al segundo 00:00 (inicio) |
| <kbd>Fin</kbd> | Ir al final del proyecto |

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador**: [Vite 6](https://vitejs.dev/)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **APIs Web Modernas**:
  - [WebCodecs API](https://w3c.github.io/webcodecs/) (Codificación y decodificación por GPU)
  - [Canvas API](https://developer.mozilla.org/es/docs/Web/API/Canvas_API) (Composición de cuadros en tiempo real)
  - [Web Audio API](https://developer.mozilla.org/es/docs/Web/API/Web_Audio_API) (Mezcla y síntesis procedural de sonido)
  - [IndexedDB](https://developer.mozilla.org/es/docs/Web/API/IndexedDB_API) (Persistencia local en el navegador)
  - [MediaStream Recording API](https://developer.mozilla.org/es/docs/Web/API/MediaStream_Recording_API) (Grabación de voz, pantalla y cámara)
- **Multiplexores**: [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) y [webm-muxer](https://github.com/Vanilagy/webm-muxer)

---

## 💻 Instalación y Desarrollo Local

Si deseas clonar el proyecto y ejecutarlo en tu entorno local:

```bash
# 1. Clonar el repositorio
git clone https://github.com/EdgarLeonArchuleta19/amapa-editor.git

# 2. Entrar al directorio
cd amapa-editor

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Ejecutar suite de pruebas unitarias
npm test

# 6. Compilar paquete para producción
npm run build
```

---

## ⚖️ Derechos de Autor y Licencia (Uso No Comercial)

Este proyecto está protegido bajo una **[Licencia de Uso No Comercial con Atribución Obligatoria](./LICENSE)** (*Copyright © 2026 Edgar León Archuleta*).

- **✅ Autoría y Atribución Obligatoria:** La propiedad intelectual del código fuente pertenece al 100% a **Edgar León Archuleta (@EdgarLeonArchuleta19)**. Cualquier estudio, referencia o bifurcación (*fork*) debe mantener de forma visible el aviso de copyright y dar crédito explícito al autor original.
- **🚫 Prohibido el Uso Comercial:** Queda **estrictamente prohibido** vender, sublicenciar, comercializar o explotar este editor o su código fuente con fines de lucro o empresariales sin autorización previa y por escrito del autor.

---

<p align="center">
  Creado con dedicación por <strong><a href="https://github.com/EdgarLeonArchuleta19">Edgar León Archuleta</a></strong>
</p>
