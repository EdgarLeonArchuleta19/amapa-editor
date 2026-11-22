pub mod audio_dsp;
pub mod sfx_engine;
pub mod storage_engine;
pub mod timeline_math;

use serde::{Deserialize, Serialize};
use storage_engine::SavedProjectMeta;
use timeline_math::SnapResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeRuntimeInfo {
    pub engine: String,
    pub version: String,
    pub os: String,
    pub arch: String,
    pub data_dir: String,
    pub exports_dir: String,
    pub is_portable: bool,
}

#[tauri::command]
fn get_native_runtime_info() -> NativeRuntimeInfo {
    let data_dir = storage_engine::get_amapa_data_dir();
    let exports_dir = storage_engine::get_exports_dir();
    let is_portable = data_dir.to_string_lossy().contains("AMAPA_Data");
    NativeRuntimeInfo {
        engine: "AMAPA Rust + Tauri v2 Native Engine".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        data_dir: data_dir.to_string_lossy().to_string(),
        exports_dir: exports_dir.to_string_lossy().to_string(),
        is_portable,
    }
}

#[tauri::command]
fn rust_synthesize_sfx(preset_id: String) -> Result<Vec<u8>, String> {
    sfx_engine::synthesize_sfx_preset(&preset_id)
}

#[tauri::command]
fn rust_compute_waveform_peaks(samples: Vec<f32>, bucket_count: usize) -> Vec<f32> {
    audio_dsp::compute_waveform_peaks(&samples, bucket_count)
}

#[tauri::command]
fn rust_encode_pcm_wav(channels: Vec<Vec<f32>>, sample_rate: u32) -> Vec<u8> {
    audio_dsp::encode_multichannel_wav(&channels, sample_rate)
}

#[tauri::command]
fn rust_find_snap_time(
    target_time: f64,
    candidates: Vec<f64>,
    threshold_seconds: f64,
) -> SnapResult {
    timeline_math::find_snap_time(target_time, &candidates, threshold_seconds)
}

#[tauri::command]
fn rust_format_timecode(seconds: f64, fps: u32) -> String {
    timeline_math::format_timecode(seconds, fps)
}

#[tauri::command]
fn rust_save_project(
    id: String,
    name: String,
    updated_at: String,
    clip_count: usize,
    project_json: String,
    is_autosave: bool,
) -> Result<String, String> {
    storage_engine::save_project_to_disk(
        &id,
        &name,
        &updated_at,
        clip_count,
        &project_json,
        is_autosave,
    )
}

#[tauri::command]
fn rust_list_saved_projects() -> Result<Vec<SavedProjectMeta>, String> {
    storage_engine::list_saved_projects_from_disk()
}

#[tauri::command]
fn rust_load_project(id: String, is_autosave: bool) -> Result<Option<String>, String> {
    storage_engine::load_project_from_disk(&id, is_autosave)
}

#[tauri::command]
fn rust_save_exported_file(filename: String, bytes: Vec<u8>) -> Result<String, String> {
    storage_engine::write_exported_file_to_disk(&filename, &bytes)
}

#[tauri::command]
fn rust_reveal_in_explorer(path: String) -> Result<(), String> {
    storage_engine::reveal_in_explorer(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_native_runtime_info,
            rust_synthesize_sfx,
            rust_compute_waveform_peaks,
            rust_encode_pcm_wav,
            rust_find_snap_time,
            rust_format_timecode,
            rust_save_project,
            rust_list_saved_projects,
            rust_load_project,
            rust_save_exported_file,
            rust_reveal_in_explorer
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la aplicación nativa AMAPA en Tauri v2");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rust_sfx_synthesizer_produces_valid_riff_wav() {
        for preset in ["pop", "whoosh", "ding", "shutter", "chime"] {
            let wav = sfx_engine::synthesize_sfx_preset(preset).expect("SFX synthesis failed");
            assert!(wav.len() > 44);
            assert_eq!(&wav[0..4], b"RIFF");
            assert_eq!(&wav[8..12], b"WAVE");
        }
    }

    #[test]
    fn test_rust_waveform_peaks_and_snap() {
        let samples: Vec<f32> = (0..1000).map(|i| ((i as f32) * 0.05).sin()).collect();
        let peaks = audio_dsp::compute_waveform_peaks(&samples, 32);
        assert_eq!(peaks.len(), 32);
        assert!(peaks.iter().all(|&p| p >= 0.05 && p <= 1.0));

        let snap = timeline_math::find_snap_time(4.95, &[0.0, 2.5, 5.0, 10.0], 0.15);
        assert!(snap.did_snap);
        assert_eq!(snap.snapped_time, 5.0);
    }

    #[test]
    fn test_rust_timecode_and_multichannel_wav() {
        assert_eq!(timeline_math::format_timecode(0.0, 30), "00:00.00");
        assert_eq!(timeline_math::format_timecode(1.5, 30), "00:01.15");
        assert_eq!(timeline_math::format_timecode(3661.0, 30), "01:01:01.00");

        let ch_l = vec![0.25_f32; 128];
        let ch_r = vec![-0.25_f32; 128];
        let wav = audio_dsp::encode_multichannel_wav(&[ch_l, ch_r], 48000);
        // 44 byte header + 128 frames * 2 channels * 2 bytes = 44 + 512 = 556 bytes
        assert_eq!(wav.len(), 556);
        assert_eq!(&wav[0..4], b"RIFF");
    }
}
