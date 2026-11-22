# AMAPA | Editor de Video Nativo para Windows (Rust + Tauri 2)

<p align="center">
  <img src="public/amapa-logo.png" alt="AMAPA Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Editor de video de escritorio nativo para Windows construido en Rust y Tauri 2.</strong><br />
  Ultra liviano • Instalador Profesional y Versión Portable • Sin marcas de agua • 100% Local
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-Native_Engine-black?style=for-the-badge&logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/Tauri-2.0-24C8DB?style=for-the-badge&logo=tauri" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Windows-x64_Nativo-0078D6?style=for-the-badge&logo=windows" alt="Windows x64" />
  <a href="./LICENSE"><img src="https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge" alt="License" /></a>
</p>

---

## 📦 Distribuciones para Windows (Instalador y Portable)

AMAPA se compila como una aplicación nativa de Windows de 64 bits (`x86_64-pc-windows-msvc`) en dos modalidades listas para usar:

1. **Instalador Profesional de Windows (`release/AMAPA-Setup-1.0.0-x64.exe`)**:
   - Instalador nativo NSIS en español e inglés con el icono oficial de AMAPA.
   - Crea accesos directos en el Menú Inicio y Escritorio, e incluye desinstalador limpio.
2. **Versión Portable (`release/AMAPA-Portable/` y `release/AMAPA-Portable-1.0.0-win64.zip`)**:
   - **No requiere instalación ni permisos de administrador.**
   - Ejecuta `AMAPA.exe` directamente desde cualquier carpeta o memoria USB.
   - Gracias al archivo marcador `portable.flag`, todos los proyectos y autoguardados se almacenan dentro de la propia carpeta `AMAPA_Data/` junto al ejecutable.

---

## ⚡ Arquitectura en Rust + Tauri 2 (Alto Rendimiento)

El motor de AMAPA fue reconstruido sobre **Rust** y **Tauri v2** para ofrecer un consumo mínimo de memoria RAM y respuesta instantánea:

- **Síntesis Procedural de Audio y SFX en Rust (`src-tauri/src/sfx_engine.rs`)**:
  - Generación nativa de buffers WAV PCM de 16 bits a 44.1 kHz mediante algoritmos DSP en Rust (osciladores con barrido exponencial, generador Xorshift64 y filtro pasa-banda de variable de estado Chamberlin).
- **Procesamiento Digital de Señales de Audio (`src-tauri/src/audio_dsp.rs`)**:
  - Extracción ultrarrápida de picos de forma de onda (*waveform peaks*) y codificador WAV PCM multicanal en Rust.
- **Motor Matemático de Línea de Tiempo (`src-tauri/src/timeline_math.rs`)**:
  - Cálculo de ajuste magnético (*snapping*) y códigos de tiempo precisos al fotograma (`HH:MM:SS.FF`).
- **Persistencia Nativa en Disco (`src-tauri/src/storage_engine.rs`)**:
  - Guardado directo en sistema de archivos de Windows (`%APPDATA%\AMAPA\projects` o `AMAPA_Data\projects` en modo portable) y exportación directa de videos a `Videos\AMAPA_Exports` con apertura automática en el Explorador de Windows (`explorer.exe /select`).
- **Motor de Reproducción a 60–120 FPS sin Re-renderizados (`src/engine/playheadBus.ts`)**:
  - El bucle de reproducción (`requestAnimationFrame`) actualiza el compositor Canvas 2D, el deslizador personalizado y el cabezal de la línea de tiempo de forma imperativa sin re-renderizar el árbol de componentes en cada fotograma.
  - Pool de decodificadores independientes por clip (`clip.id`), permitiendo reproducir cortes múltiples del mismo video, Picture-in-Picture y pistas de audio separadas simultáneamente sin conflictos.

---

## ✨ Características Principales

### 🎬 Línea de Tiempo Multipista Fluida
- **Arrastre entre pistas y recorte en tiempo real**: Mueve clips horizontalmente o cámbialos de pista verticalmente a 60 FPS, registrando un único paso limpio en el historial de Deshacer (`Ctrl+Z`) al soltar el clic.
- **Corte Inteligente (`S`)**: Corta automáticamente el clip seleccionado o el clip que se encuentre bajo el cabezal de reproducción sin necesidad de seleccionarlo primero.
- **Separación de Audio con 1 Clic**: Extrae el audio de cualquier clip de video a una pista de audio independiente con reproducción sincronizada real.
- **Ajuste Magnético (Snapping)** y **Edición en Cadena (Ripple Mode)**.

### 📐 Formatos y Relaciones de Aspecto
- Presets instantáneos: `16:9` (Horizontal), `9:16` (TikTok / Reels / Shorts), `1:1` (Cuadrado), `3:4`, `4:5` y `21:9`, además de resoluciones personalizadas hasta **4K (3840 × 2160)** y **60 FPS**.
- Modos **Ajustar (Fit)** y **Rellenar (Fill)** en un clic.

### 🎨 Efectos Visuales, Filtros y Animaciones
- **Animaciones de entrada**: *Fade*, *Pop*, *Slide Up* y *Slide Left*.
- **Filtros de Color con 1 Clic**: *Neutro*, *Golden Hour*, *B&W Noir*, *Cyber Cool*, *Vintage 90s* y *Vivid Pop*.
- **Presets Picture-in-Picture (PiP)**: Esquinas y pantalla completa en un clic.
- **Inspector de Propiedades**: Escala, Posición X/Y, Rotación, Volteo H/V, Opacidad, Recorte por bordes, Brillo, Contraste, Saturación, Temperatura, Volumen (0%–200%) y Fundidos de entrada/salida.

### 🚀 Exportación con Video + Audio Integrado
- Exportación acelerada por hardware en **MP4 (H.264 + AAC/Opus)**, **WebM (VP9/VP8 + Opus)** y **Audio WAV (PCM 16-bit)** con mezcla completa de todas las pistas de audio y envolventes de volumen.
- Guardado automático en disco nativo y botón **"Ver en Explorador"** al finalizar.

---

## 🛠️ Compilación desde el Código Fuente

### Requisitos
- **Rust** (`rustc` / `cargo` 1.77.2+ con toolchain `x86_64-pc-windows-msvc`)
- **Node.js** 18+ y **npm**
- **Visual Studio C++ Build Tools** en Windows

### Comandos
```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar suite de pruebas unitarias (Frontend + Motor)
npm test

# 3. Iniciar AMAPA en modo desarrollo nativo (ventana de escritorio Tauri 2)
npm run tauri:dev

# 4. Compilar ejecutable nativo (.exe), Instalador NSIS y Versión Portable
npm run tauri:build
```

---

## ⚖️ Derechos de Autor y Licencia

- **Autor y Titular de Derechos de Autor (Copyright)**: **Edgar León Archuleta** ([@EdgarLeonArchuleta19](https://github.com/EdgarLeonArchuleta19))
- **Licencia**: Publicado como software libre y de código abierto bajo la **[Licencia MIT](./LICENSE)**.

```text
MIT License
Copyright (c) 2026 Edgar León Archuleta
```
