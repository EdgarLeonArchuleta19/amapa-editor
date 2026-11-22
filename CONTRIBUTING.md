# Guía de Contribución a AMAPA Desktop (Rust + Tauri 2)

¡Gracias por tu interés en contribuir a **AMAPA**! Nuestro objetivo es ofrecer un editor de video nativo para Windows que sea ultra liviano, sin marcas de agua, 100% local y de código abierto.

## Principios Fundamentales

1. **Sin Marcas de Agua ni Muros de Pago:** Nunca agregues marcas de agua, límites artificiales de duración o resolución, ni registros obligatorios.
2. **Rendimiento Nativo Primero:** Las tareas intensivas (síntesis de audio, DSP, persistencia en disco y cálculos matemáticos) se ejecutan en el núcleo de **Rust (`src-tauri/src/`)**, mientras que la reproducción corre a 60–120 FPS mediante el bus imperativo (`src/engine/playheadBus.ts`) sin re-renderizar React en cada fotograma.
3. **100% Local y Privado:** Todos los archivos multimedia y proyectos permanecen en el equipo del usuario (con soporte tanto para modo instalado en `%APPDATA%\AMAPA` como modo portable en `AMAPA_Data/`).
4. **Controles Honestos:** Todo botón, filtro, animación o códec visible en la interfaz debe tener implementación real tanto en la vista previa como en el archivo exportado.

## Flujo de Desarrollo

```bash
# 1. Instalar dependencias de Node
npm install

# 2. Ejecutar pruebas unitarias de Frontend y Motor (Vitest)
npm test

# 3. Ejecutar pruebas unitarias del núcleo en Rust (Cargo)
cargo test --manifest-path src-tauri/Cargo.toml

# 4. Iniciar ventana nativa de escritorio en modo desarrollo (Tauri v2)
npm run tauri:dev

# 5. Compilar ejecutable de producción (.exe) e instalador NSIS
npm run tauri:build
```

## Lista de Verificación para Pull Requests

- [ ] `npm test` pasa todas las pruebas unitarias y de integración.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` pasa todas las pruebas nativas en Rust.
- [ ] `npm run build` compila sin errores de TypeScript (`tsc -b`).
- [ ] Se mantiene la estética minimalista monocromática (modo oscuro y modo claro) y la accesibilidad (`aria-label`, atajos de teclado).
