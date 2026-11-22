use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedProjectMeta {
    pub id: String,
    pub name: String,
    pub updated_at: String,
    pub clip_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredProjectRecord {
    pub id: String,
    pub name: String,
    pub updated_at: String,
    pub clip_count: usize,
    pub project_json: String,
}

/// Resolves the AMAPA data directory (supports Portable mode next to the executable or %APPDATA%\AMAPA)
pub fn get_amapa_data_dir() -> PathBuf {
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let portable_marker = exe_dir.join("portable.flag");
            let portable_dir = exe_dir.join("AMAPA_Data");
            if portable_marker.exists() || portable_dir.exists() {
                let _ = fs::create_dir_all(&portable_dir);
                return portable_dir;
            }
        }
    }

    let base = env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| env::temp_dir())
        .join("AMAPA");
    let _ = fs::create_dir_all(&base);
    base
}

pub fn get_projects_dir() -> PathBuf {
    let dir = get_amapa_data_dir().join("projects");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn get_exports_dir() -> PathBuf {
    let user_profile = env::var("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| get_amapa_data_dir());
    let videos_dir = user_profile.join("Videos").join("AMAPA_Exports");
    if fs::create_dir_all(&videos_dir).is_ok() {
        return videos_dir;
    }
    let fallback = get_amapa_data_dir().join("exports");
    let _ = fs::create_dir_all(&fallback);
    fallback
}

fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.is_empty() {
        "amapa_file".to_string()
    } else {
        cleaned
    }
}

pub fn save_project_to_disk(
    id: &str,
    name: &str,
    updated_at: &str,
    clip_count: usize,
    project_json: &str,
    is_autosave: bool,
) -> Result<String, String> {
    let record = StoredProjectRecord {
        id: id.to_string(),
        name: name.to_string(),
        updated_at: updated_at.to_string(),
        clip_count,
        project_json: project_json.to_string(),
    };

    let serialized = serde_json::to_string_pretty(&record).map_err(|e| e.to_string())?;
    let file_path = if is_autosave {
        get_amapa_data_dir().join("autosave.amapa.json")
    } else {
        get_projects_dir().join(format!("{}.json", sanitize_filename(id)))
    };

    fs::write(&file_path, serialized).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

pub fn list_saved_projects_from_disk() -> Result<Vec<SavedProjectMeta>, String> {
    let dir = get_projects_dir();
    let mut list = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(record) = serde_json::from_str::<StoredProjectRecord>(&content) {
                        list.push(SavedProjectMeta {
                            id: record.id,
                            name: record.name,
                            updated_at: record.updated_at,
                            clip_count: record.clip_count,
                        });
                    }
                }
            }
        }
    }

    list.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(list)
}

pub fn load_project_from_disk(id: &str, is_autosave: bool) -> Result<Option<String>, String> {
    let file_path = if is_autosave {
        get_amapa_data_dir().join("autosave.amapa.json")
    } else {
        get_projects_dir().join(format!("{}.json", sanitize_filename(id)))
    };

    if !file_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let record: StoredProjectRecord =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(Some(record.project_json))
}

pub fn write_exported_file_to_disk(filename: &str, bytes: &[u8]) -> Result<String, String> {
    let safe_name = sanitize_filename(filename);
    let out_path = get_exports_dir().join(&safe_name);
    fs::write(&out_path, bytes).map_err(|e| e.to_string())?;
    Ok(out_path.to_string_lossy().to_string())
}

pub fn reveal_in_explorer(path_str: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("explorer.exe")
            .arg(format!("/select,{}", path_str))
            .spawn();
    }
    Ok(())
}
