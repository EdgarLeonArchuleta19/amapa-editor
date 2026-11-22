/// Native Rust Audio DSP utilities: waveform peak extraction & multi-channel PCM WAV encoder

/// Computes normalized waveform peaks `[0.05..=1.0]` from raw mono/stereo sample slice
pub fn compute_waveform_peaks(samples: &[f32], bucket_count: usize) -> Vec<f32> {
    let count = bucket_count.max(1);
    if samples.is_empty() {
        return vec![0.15; count];
    }

    let samples_per_bucket = (samples.len() / count).max(1);
    let mut peaks = Vec::with_capacity(count);
    let mut max_peak = 0.01_f32;

    for b in 0..count {
        let start = b * samples_per_bucket;
        let end = ((b + 1) * samples_per_bucket).min(samples.len());
        let mut local_max = 0.0_f32;
        if start < end {
            // Sample stride for very large audio buffers to stay sub-millisecond
            let len = end - start;
            let step = (len / 256).max(1);
            let mut idx = start;
            while idx < end {
                let val = samples[idx].abs();
                if val > local_max {
                    local_max = val;
                }
                idx += step;
            }
        }
        if local_max > max_peak {
            max_peak = local_max;
        }
        peaks.push(local_max);
    }

    peaks
        .into_iter()
        .map(|p| ((p / max_peak).clamp(0.05, 1.0) * 1000.0).round() / 1000.0)
        .collect()
}

/// Encodes planar multi-channel f32 audio into a 16-bit PCM WAV byte buffer in native Rust
pub fn encode_multichannel_wav(channels: &[Vec<f32>], sample_rate: u32) -> Vec<u8> {
    let num_channels = channels.len().max(1) as u16;
    let num_frames = channels.first().map(|c| c.len()).unwrap_or(0);
    let bytes_per_sample = 2u16;
    let block_align = num_channels * bytes_per_sample;
    let byte_rate = sample_rate * (block_align as u32);
    let data_size = (num_frames as u32) * (block_align as u32);

    let mut buf = Vec::with_capacity(44 + data_size as usize);
    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&(36 + data_size).to_le_bytes());
    buf.extend_from_slice(b"WAVE");
    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes());
    buf.extend_from_slice(&1u16.to_le_bytes()); // PCM
    buf.extend_from_slice(&num_channels.to_le_bytes());
    buf.extend_from_slice(&sample_rate.to_le_bytes());
    buf.extend_from_slice(&byte_rate.to_le_bytes());
    buf.extend_from_slice(&block_align.to_le_bytes());
    buf.extend_from_slice(&16u16.to_le_bytes());
    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_size.to_le_bytes());

    for i in 0..num_frames {
        for ch in 0..(num_channels as usize) {
            let sample = channels
                .get(ch)
                .and_then(|c| c.get(i))
                .copied()
                .unwrap_or(0.0)
                .clamp(-1.0, 1.0);
            let pcm = if sample < 0.0 {
                (sample * 32768.0) as i16
            } else {
                (sample * 32767.0) as i16
            };
            buf.extend_from_slice(&pcm.to_le_bytes());
        }
    }

    buf
}
