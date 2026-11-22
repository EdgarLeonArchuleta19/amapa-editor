use std::f64::consts::PI;

const SAMPLE_RATE: u32 = 44100;

/// Fast deterministic PRNG (Xorshift64) for procedural noise synthesis in Rust
struct XorShift64 {
    state: u64,
}

impl XorShift64 {
    fn new(seed: u64) -> Self {
        Self {
            state: if seed == 0 { 0x853c49e6748fea9b } else { seed },
        }
    }

    #[inline]
    fn next_f64(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        // Map to [-1.0, 1.0]
        ((x >> 11) as f64) * (1.0 / ((1u64 << 53) as f64)) * 2.0 - 1.0
    }
}

/// Encodes mono f32 samples into a standards-compliant 16-bit PCM WAV byte buffer
pub fn encode_mono_wav(samples: &[f32], sample_rate: u32) -> Vec<u8> {
    let num_samples = samples.len();
    let data_size = (num_samples * 2) as u32;
    let mut buf = Vec::with_capacity(44 + data_size as usize);

    buf.extend_from_slice(b"RIFF");
    buf.extend_from_slice(&(36 + data_size).to_le_bytes());
    buf.extend_from_slice(b"WAVE");
    buf.extend_from_slice(b"fmt ");
    buf.extend_from_slice(&16u32.to_le_bytes()); // Subchunk1Size
    buf.extend_from_slice(&1u16.to_le_bytes()); // AudioFormat = 1 (PCM)
    buf.extend_from_slice(&1u16.to_le_bytes()); // NumChannels = 1
    buf.extend_from_slice(&sample_rate.to_le_bytes());
    buf.extend_from_slice(&(sample_rate * 2).to_le_bytes()); // ByteRate
    buf.extend_from_slice(&2u16.to_le_bytes()); // BlockAlign
    buf.extend_from_slice(&16u16.to_le_bytes()); // BitsPerSample
    buf.extend_from_slice(b"data");
    buf.extend_from_slice(&data_size.to_le_bytes());

    for &s in samples {
        let clamped = s.clamp(-1.0, 1.0);
        let pcm = if clamped < 0.0 {
            (clamped * 32768.0) as i16
        } else {
            (clamped * 32767.0) as i16
        };
        buf.extend_from_slice(&pcm.to_le_bytes());
    }

    buf
}

/// Synthesizes royalty-free procedural SFX in native Rust and returns a WAV byte vector
pub fn synthesize_sfx_preset(preset_id: &str) -> Result<Vec<u8>, String> {
    let sr = SAMPLE_RATE as f64;
    let samples: Vec<f32> = match preset_id {
        "pop" => {
            let duration = 0.25;
            let len = (duration * sr) as usize;
            let mut out = Vec::with_capacity(len);
            let mut phase = 0.0_f64;
            for i in 0..len {
                let t = (i as f64) / sr;
                // Pitch envelope: 140Hz -> 420Hz at 0.04s -> 80Hz at 0.18s
                let freq = if t < 0.04 {
                    140.0 + (420.0 - 140.0) * (t / 0.04)
                } else if t < 0.18 {
                    let p = (t - 0.04) / 0.14;
                    420.0 * (80.0_f64 / 420.0).powf(p)
                } else {
                    80.0
                };
                // Gain envelope
                let gain = if t < 0.01 {
                    0.01 + (0.65 - 0.01) * (t / 0.01)
                } else {
                    0.65 * (0.001_f64 / 0.65).powf((t - 0.01) / (duration - 0.01))
                };
                phase += 2.0 * PI * freq / sr;
                out.push((phase.sin() * gain) as f32);
            }
            out
        }
        "whoosh" => {
            let duration = 0.55;
            let len = (duration * sr) as usize;
            let mut out = Vec::with_capacity(len);
            let mut rng = XorShift64::new(0xA4A9A_2026);
            let mut bp_low = 0.0_f64;
            let mut bp_band = 0.0_f64;
            for i in 0..len {
                let t = (i as f64) / sr;
                let cutoff = if t < 0.22 {
                    180.0 * (1200.0_f64 / 180.0).powf(t / 0.22)
                } else {
                    1200.0 * (140.0_f64 / 1200.0).powf((t - 0.22) / (duration - 0.22))
                };
                let gain = if t < 0.20 {
                    0.01 + (0.55 - 0.01) * (t / 0.20)
                } else {
                    0.55 * (0.001_f64 / 0.55).powf((t - 0.20) / (duration - 0.20))
                };
                // Chamberlin state-variable bandpass filter
                let f = 2.0 * (PI * cutoff / sr).sin();
                let q = 0.45;
                let white = rng.next_f64();
                bp_low += f * bp_band;
                let high = white - bp_low - q * bp_band;
                bp_band += f * high;
                out.push((bp_band * gain * 1.35) as f32);
            }
            out
        }
        "ding" => {
            let duration = 0.90;
            let len = (duration * sr) as usize;
            let mut out = Vec::with_capacity(len);
            for i in 0..len {
                let t = (i as f64) / sr;
                let g1 = if t < 0.008 {
                    0.5 * (t / 0.008)
                } else {
                    0.5 * (0.001_f64 / 0.5).powf((t - 0.008) / (duration - 0.008))
                };
                let g2 = if t < 0.008 {
                    0.2 * (t / 0.008)
                } else if t < 0.45 {
                    0.2 * (0.001_f64 / 0.2).powf((t - 0.008) / (0.45 - 0.008))
                } else {
                    0.0
                };
                let s1 = (2.0 * PI * 1046.5 * t).sin() * g1;
                let s2 = (2.0 * PI * 2093.0 * t).sin() * g2;
                out.push((s1 + s2) as f32);
            }
            out
        }
        "shutter" | "camera" => {
            let duration = 0.28;
            let len = (duration * sr) as usize;
            let mut out = Vec::with_capacity(len);
            let mut rng = XorShift64::new(0x58077E2);
            let mut prev = 0.0_f64;
            for i in 0..len {
                let t = (i as f64) / sr;
                let white = rng.next_f64();
                // Simple 1-pole highpass
                let hp = white - prev * 0.85;
                prev = white;
                let mut env = 0.0;
                if t < 0.045 {
                    env = 0.65 * (-t * 95.0).exp();
                } else if t >= 0.075 && t < 0.135 {
                    let dt = t - 0.075;
                    env = 0.50 * (-dt * 85.0).exp();
                }
                out.push((hp * env) as f32);
            }
            out
        }
        "chime" => {
            let duration = 0.85;
            let len = (duration * sr) as usize;
            let mut out = vec![0.0_f32; len];
            let notes = [523.25_f64, 659.25, 783.99, 1046.50];
            for (idx, &freq) in notes.iter().enumerate() {
                let start_t = (idx as f64) * 0.065;
                let end_t = (start_t + 0.45).min(duration);
                let start_idx = (start_t * sr) as usize;
                let end_idx = (end_t * sr) as usize;
                for i in start_idx..end_idx.min(len) {
                    let local_t = (i as f64) / sr - start_t;
                    let note_dur = end_t - start_t;
                    let gain = if local_t < 0.01 {
                        0.28 * (local_t / 0.01)
                    } else {
                        0.28 * (0.001_f64 / 0.28).powf((local_t - 0.01) / (note_dur - 0.01))
                    };
                    // Triangle-like warm wave (fundamental + 3rd harmonic)
                    let phase = 2.0 * PI * freq * local_t;
                    let wave = phase.sin() + 0.15 * (3.0 * phase).sin();
                    out[i] = (out[i] + (wave * gain) as f32).clamp(-1.0, 1.0);
                }
            }
            out
        }
        other => return Err(format!("Preset SFX desconocido: {}", other)),
    };

    Ok(encode_mono_wav(&samples, SAMPLE_RATE))
}
