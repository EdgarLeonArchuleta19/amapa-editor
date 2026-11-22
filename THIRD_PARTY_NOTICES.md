# Avisos de Terceros y Auditoría de Licencias (AMAPA Desktop)

**AMAPA** se distribuye bajo la **[Licencia MIT](./LICENSE)** (`Copyright (c) 2026 Edgar León Archuleta`). Todas las dependencias de Rust y Frontend incluidas en AMAPA utilizan licencias permisivas de código abierto compatibles con redistribución libre.

## 1. Dependencias del Núcleo Nativo en Rust (`src-tauri/Cargo.toml`)

| Crate | Licencia | Propósito |
| :--- | :--- | :--- |
| `tauri` (v2) | MIT / Apache-2.0 | Runtime nativo de ventana de escritorio e IPC para Windows |
| `tauri-build` (v2) | MIT / Apache-2.0 | Generación de recursos e iconos nativos de Windows (`.ico`) |
| `serde` | MIT / Apache-2.0 | Serialización y deserialización de estructuras de proyecto |
| `serde_json` | MIT / Apache-2.0 | Manejo de archivos `.amapa.json` en disco nativo |

## 2. Dependencias de Interfaz y Multiplexación (`package.json`)

| Paquete | Licencia | Propósito |
| :--- | :--- | :--- |
| `@tauri-apps/api` (v2) | MIT / Apache-2.0 | Puente IPC hacia los comandos nativos de Rust (`#[tauri::command]`) |
| `react` / `react-dom` | MIT | Renderizado declarativo de componentes de interfaz |
| `lucide-react` | ISC | Iconografía vectorial minimalista |
| `mp4-muxer` | MIT | Multiplexor de contenedores ISO BMFF / MP4 |
| `webm-muxer` | MIT | Multiplexor de contenedores Matroska / WebM |

## 3. Aviso sobre Códecs Multimedia

AMAPA utiliza el motor nativo en **Rust** (`sfx_engine.rs` y `audio_dsp.rs`) para síntesis y codificación WAV PCM de 16 bits, junto con aceleración por hardware del sistema operativo mediante WebView2 / WebCodecs (`VideoEncoder`, `AudioEncoder`) y `mp4-muxer` / `webm-muxer` (MIT). AMAPA **no** redistribuye binarios propietarios ni bibliotecas con licencia GPL restrictiva.
