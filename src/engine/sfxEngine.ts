export interface SfxPreset {
  id: string;
  name: string;
  duration: number;
  description: string;
  category: string;
}

export const SFX_PRESETS: SfxPreset[] = [
  {
    id: 'pop',
    name: 'Pop Alegre',
    duration: 0.15,
    description: 'Efecto burbuja ideal para apariciones de texto o elementos',
    category: 'Impactos',
  },
  {
    id: 'whoosh',
    name: 'Whoosh Transición',
    duration: 0.35,
    description: 'Barrido de aire dinámico para cortes o transiciones',
    category: 'Transiciones',
  },
  {
    id: 'ding',
    name: 'Campana Ding',
    duration: 0.8,
    description: 'Tono brillante armónico de acierto o notificación',
    category: 'Campanas',
  },
  {
    id: 'camera',
    name: 'Obturador Cámara',
    duration: 0.18,
    description: 'Clic mecánico de foto o captura de pantalla',
    category: 'Foley',
  },
  {
    id: 'chime',
    name: 'Éxito / Chime',
    duration: 0.65,
    description: 'Arpegio ascendente positivo y limpio',
    category: 'Melódico',
  },
];

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function synthesizeSfxBuffer(presetId: string): Promise<AudioBuffer> {
  const sampleRate = 44100;
  const preset = SFX_PRESETS.find((p) => p.id === presetId) || SFX_PRESETS[0];
  const duration = preset.duration;
  const totalSamples = Math.ceil(sampleRate * duration);

  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);

  if (presetId === 'pop') {
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, 0);
    osc.frequency.exponentialRampToValueAtTime(750, duration * 0.4);
    osc.frequency.exponentialRampToValueAtTime(300, duration);

    gain.gain.setValueAtTime(0, 0);
    gain.gain.linearRampToValueAtTime(0.85, 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else if (presetId === 'whoosh') {
    // White noise with swept bandpass filter
    const noiseBuffer = offlineCtx.createBuffer(1, totalSamples, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < totalSamples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = offlineCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(250, 0);
    filter.frequency.exponentialRampToValueAtTime(2200, duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, duration);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0.001, 0);
    gain.gain.exponentialRampToValueAtTime(0.9, duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(offlineCtx.destination);
    noiseSource.start(0);
    noiseSource.stop(duration);
  } else if (presetId === 'ding') {
    // Rich bell chime with harmonics
    const fundamental = 1320; // E6
    const freqs = [fundamental, fundamental * 2.05, fundamental * 3.1];
    const amps = [0.65, 0.25, 0.1];

    freqs.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, 0);

      gain.gain.setValueAtTime(amps[idx], 0);
      gain.gain.exponentialRampToValueAtTime(0.001, duration);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  } else if (presetId === 'camera') {
    // Two quick mechanical clicks
    const osc = offlineCtx.createOscillator();
    const gain = offlineCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, 0);
    osc.frequency.exponentialRampToValueAtTime(300, 0.05);

    gain.gain.setValueAtTime(0.7, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, 0.06);
    gain.gain.setValueAtTime(0.85, 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(offlineCtx.destination);
    osc.start(0);
    osc.stop(duration);
  } else {
    // Chime: 4 notes arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const noteDur = duration / notes.length;

    notes.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, 0);

      const startTime = idx * noteDur * 0.75;
      gain.gain.setValueAtTime(0, 0);
      gain.gain.setValueAtTime(0.65, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(startTime);
      osc.stop(duration);
    });
  }

  return await offlineCtx.startRendering();
}

export async function generateSfxFile(presetId: string): Promise<File> {
  const preset = SFX_PRESETS.find((p) => p.id === presetId) || SFX_PRESETS[0];
  const buffer = await synthesizeSfxBuffer(presetId);
  const blob = audioBufferToWavBlob(buffer);
  return new File([blob], `${preset.name}.wav`, { type: 'audio/wav' });
}

let previewAudioCtx: AudioContext | null = null;
export async function previewSfxSound(presetId: string): Promise<void> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!previewAudioCtx) {
      previewAudioCtx = new AudioCtx();
    }
    if (previewAudioCtx.state === 'suspended') {
      await previewAudioCtx.resume();
    }

    const buffer = await synthesizeSfxBuffer(presetId);
    const source = previewAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(previewAudioCtx.destination);
    source.start(0);
  } catch (err) {
    console.warn('Could not preview SFX audio:', err);
  }
}
