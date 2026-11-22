use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapResult {
    pub snapped_time: f64,
    pub did_snap: bool,
    pub snap_reference: Option<f64>,
}

/// Computes magnetic snap position on the timeline in native Rust
pub fn find_snap_time(
    target_time: f64,
    candidates: &[f64],
    threshold_seconds: f64,
) -> SnapResult {
    let mut closest = target_time;
    let mut min_diff = threshold_seconds;
    let mut did_snap = false;
    let mut snap_reference = None;

    for &pt in candidates {
        let diff = (target_time - pt).abs();
        if diff <= min_diff {
            min_diff = diff;
            closest = pt;
            did_snap = true;
            snap_reference = Some(pt);
        }
    }

    let rounded = ((closest.max(0.0)) * 10000.0).round() / 10000.0;
    SnapResult {
        snapped_time: rounded,
        did_snap,
        snap_reference,
    }
}

/// Formats seconds into `MM:SS.FF` or `HH:MM:SS.FF` frame-accurate timecode in Rust
pub fn format_timecode(seconds: f64, fps: u32) -> String {
    let safe_fps = fps.max(1);
    let safe_sec = if seconds.is_finite() && seconds > 0.0 {
        seconds
    } else {
        0.0
    };
    let total_frames = ((safe_sec * (safe_fps as f64)) + 1e-6).floor() as u64;
    let frames = total_frames % (safe_fps as u64);
    let total_whole_sec = (safe_sec + 1e-6).floor() as u64;
    let secs = total_whole_sec % 60;
    let mins = (total_whole_sec / 60) % 60;
    let hours = total_whole_sec / 3600;

    if hours > 0 {
        format!("{:02}:{:02}:{:02}.{:02}", hours, mins, secs, frames)
    } else {
        format!("{:02}:{:02}.{:02}", mins, secs, frames)
    }
}
