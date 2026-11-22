# Arquitectura Técnica de AMAPA Desktop (Rust + Tauri 2)

AMAPA es un editor de video nativo para Windows construido sobre **Tauri v2** y **Rust**, diseñado para ofrecer máxima velocidad, bajo consumo de recursos y distribución tanto mediante **Instalador NSIS** como en **Versión Portable**.

---

## 1. Estructura de Capas

```text
amapa-editor/
├── src-tauri/                  # Backend Nativo en Rust (Tauri v2)
│   ├── Cargo.toml              # Configuración de crate Rust con LTO y optimización de tamaño
│   ├── tauri.conf.json         # Ventana nativa Windows, permisos y empaquetador NSIS
│   ├── icons/                  # Iconos nativos (.ico, .png, .icns) de AMAPA
│   └── src/
│       ├── main.rs             # Punto de entrada Windows (windows_subsystem = "windows")
│       ├── lib.rs              # Registro de comandos #[tauri::command] y pruebas en Rust
│       ├── sfx_engine.rs       # Sintetizador DSP procedural en Rust (WAV PCM 16-bit 44.1kHz)
│       ├── audio_dsp.rs        # Analizador de picos de forma de onda y codificador WAV multicanal
│       ├── timeline_math.rs    # Cálculo de ajuste magnético (snapping) y timecode en Rust
│       └── storage_engine.rs   # Gestión nativa de proyectos en disco, modo Portable y exportación
└── src/                        # Interfaz y Compositor en Tiempo Real
    ├── engine/
    │   ├── playheadBus.ts      # Bus imperativo de 60-120 FPS sin re-renderizados de React
    │   ├── tauriBridge.ts      # Puente IPC tipado hacia los comandos nativos de Rust
    │   ├── compositor.ts       # Compositor Canvas 2D con animaciones, filtros y PiP
    │   ├── timelineEngine.ts   # Operaciones inmutables de línea de tiempo multipista e historial
    │   ├── exportEngine.ts     # Codificador de video + audio (WebCodecs MP4/WebM y WAV PCM)
    │   └── sfxEngine.ts        # Interfaz de efectos de sonido conectada al motor Rust
    └── components/             # Componentes de interfaz minimalista monocromática
```

---

## 2. Optimizaciones Clave de Rendimiento

1. **Reproducción a 60–120 FPS Desacoplada de React (`playheadBus.ts`)**:
   - Durante la reproducción activa, el reloj maestro avanza en `requestAnimationFrame` y notifica imperativamente al compositor Canvas 2D, al cabezal de la línea de tiempo (`playheadLineRef`), al deslizador (`CustomScrubber`) y al lector de código de tiempo sin disparar re-renderizados del árbol de React en cada fotograma.
2. **Pool de Medios por Instancia de Clip (`clip.id`)**:
   - Cada clip de video y cada clip de audio (incluyendo el audio separado de un video mediante *"Separar Audio"*) mantiene su propia instancia decodificadora. Esto permite reproducir múltiples cortes de un mismo archivo, superposiciones Picture-in-Picture y pistas de audio desvinculadas de manera 100% simultánea y sin bloqueos.
3. **Arrastre y Recorte sin Saturación del Historial**:
   - Al arrastrar o recortar un clip en la línea de tiempo (incluyendo el movimiento vertical entre pistas compatibles), el estado visual se actualiza en vivo a 60 FPS a partir de una instantánea inicial y se registra **un único paso** en la pila de Deshacer (`Ctrl+Z`) al soltar el botón del ratón (`mouseup`).
4. **Modo Portable Automático en Rust (`storage_engine.rs`)**:
   - El binario en Rust detecta si existe el archivo `portable.flag` o la carpeta `AMAPA_Data` junto a `AMAPA.exe`. Si está presente, redirige toda la persistencia de proyectos y autoguardados a `AMAPA_Data/` sin tocar `%APPDATA%` ni el registro de Windows.
