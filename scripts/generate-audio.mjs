import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "public", "assets", "audio");
const SAMPLE_RATE = 22_050;
const BPM = 100;
const BEAT_SECONDS = 60 / BPM;
const BGM_DURATION_SECONDS = 66;

const noteFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

function envelope(time, duration, attack = 0.012, release = 0.12) {
  const attackLevel = Math.min(1, time / attack);
  const releaseLevel = Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(attackLevel, releaseLevel));
}

function addTone(buffer, startSeconds, duration, frequency, amplitude, options = {}) {
  const start = Math.max(0, Math.floor(startSeconds * SAMPLE_RATE));
  const end = Math.min(buffer.length, Math.floor((startSeconds + duration) * SAMPLE_RATE));
  const wave = options.wave ?? "sine";
  const attack = options.attack ?? 0.008;
  const release = options.release ?? Math.min(0.12, duration * 0.45);
  const vibrato = options.vibrato ?? 0;
  const vibratoRate = options.vibratoRate ?? 5;

  for (let index = start; index < end; index += 1) {
    const time = (index - start) / SAMPLE_RATE;
    const phase = 2 * Math.PI * frequency * time + vibrato * Math.sin(2 * Math.PI * vibratoRate * time);
    let sample;

    if (wave === "triangle") {
      sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else if (wave === "square-soft") {
      sample = Math.tanh(2.2 * Math.sin(phase));
    } else {
      sample = Math.sin(phase);
    }

    buffer[index] += sample * amplitude * envelope(time, duration, attack, release);
  }
}

function addPluck(buffer, start, midi, amplitude = 0.13, duration = 0.28) {
  const frequency = noteFrequency(midi);
  addTone(buffer, start, duration, frequency, amplitude, {
    wave: "triangle",
    attack: 0.004,
    release: duration * 0.72,
  });
  addTone(buffer, start, duration * 0.72, frequency * 2, amplitude * 0.28, {
    attack: 0.002,
    release: duration * 0.65,
  });
}

function addKick(buffer, start, amplitude = 0.3) {
  const duration = 0.16;
  const first = Math.floor(start * SAMPLE_RATE);
  const last = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  let phase = 0;

  for (let index = first; index < last; index += 1) {
    const time = (index - first) / SAMPLE_RATE;
    const frequency = 112 * Math.exp(-time * 15) + 40;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    buffer[index] += Math.sin(phase) * amplitude * Math.exp(-time * 24);
  }
}

function addNoiseHit(buffer, start, duration, amplitude, seed, brightness = 1) {
  const first = Math.floor(start * SAMPLE_RATE);
  const last = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  let state = seed >>> 0;
  let previous = 0;

  for (let index = first; index < last; index += 1) {
    state = (1664525 * state + 1013904223) >>> 0;
    const white = (state / 0xffffffff) * 2 - 1;
    const highPassed = white - previous * (0.72 / brightness);
    previous = white;
    const time = (index - first) / SAMPLE_RATE;
    buffer[index] += highPassed * amplitude * Math.exp((-7 * time) / duration);
  }
}

function addChord(buffer, start, midiNotes, duration, amplitude) {
  for (const midi of midiNotes) {
    addTone(buffer, start, duration, noteFrequency(midi), amplitude / midiNotes.length, {
      wave: "triangle",
      attack: 0.08,
      release: 0.38,
      vibrato: 0.008,
      vibratoRate: 4.2,
    });
  }
}

function synthesizeBgm() {
  const buffer = new Float32Array(SAMPLE_RATE * BGM_DURATION_SECONDS);
  const chordProgression = [
    { chord: [62, 66, 69], bass: 38 },
    { chord: [59, 62, 66], bass: 35 },
    { chord: [55, 59, 62], bass: 43 },
    { chord: [57, 61, 64], bass: 45 },
  ];
  const melodyPatterns = [
    [74, 76, 78, 81, 78, 76, 74, 69],
    [71, 74, 78, 79, 78, 74, 71, 69],
    [67, 71, 74, 79, 76, 74, 71, 67],
    [69, 73, 76, 81, 78, 76, 73, 69],
  ];
  const totalBeats = Math.floor(BGM_DURATION_SECONDS / BEAT_SECONDS);

  for (let beat = 0; beat < totalBeats; beat += 1) {
    const start = beat * BEAT_SECONDS;
    const beatInBar = beat % 4;
    const bar = Math.floor(beat / 4);
    const progressionIndex = bar % chordProgression.length;
    const section = Math.floor(bar / 4);
    const energy = section >= 5 && section <= 11 ? 1.08 : section >= 12 ? 0.92 : 0.78;

    addKick(buffer, start, beatInBar === 0 ? 0.33 * energy : 0.22 * energy);
    if (beatInBar === 1 || beatInBar === 3) {
      addNoiseHit(buffer, start, 0.13, 0.095 * energy, 5000 + beat * 31, 0.7);
    }
    addNoiseHit(buffer, start, 0.055, 0.025 * energy, 9000 + beat * 47, 1.5);
    addNoiseHit(buffer, start + BEAT_SECONDS / 2, 0.04, 0.018 * energy, 12000 + beat * 61, 1.8);

    if (beatInBar === 0) {
      const current = chordProgression[progressionIndex];
      addChord(buffer, start, current.chord, BEAT_SECONDS * 3.85, 0.15 * energy);
    }

    const currentChord = chordProgression[progressionIndex];
    addTone(buffer, start, BEAT_SECONDS * 0.72, noteFrequency(currentChord.bass), 0.13 * energy, {
      wave: "triangle",
      attack: 0.008,
      release: 0.2,
    });

    const pattern = melodyPatterns[(progressionIndex + Math.floor(section / 2)) % melodyPatterns.length];
    const melodyIndex = (beatInBar * 2) % pattern.length;
    if (beat >= 4 && (section < 4 || beat % 2 === 0 || section >= 8)) {
      addPluck(buffer, start + 0.015, pattern[melodyIndex], 0.095 * energy, 0.25);
      addPluck(buffer, start + BEAT_SECONDS / 2 + 0.015, pattern[melodyIndex + 1], 0.075 * energy, 0.2);
    }
  }

  // A distinct two-bar closing phrase and soft final chord.
  const endingStart = 60;
  [74, 76, 78, 81, 86, 83, 81, 78].forEach((midi, index) => {
    addPluck(buffer, endingStart + index * (BEAT_SECONDS / 2), midi, 0.12, 0.32);
  });
  addChord(buffer, 64.2, [50, 54, 57, 62], 1.65, 0.25);
  addTone(buffer, 64.2, 1.7, noteFrequency(38), 0.14, { wave: "triangle", release: 1.15 });

  return buffer;
}

function addBirdChirp(buffer, start, duration, startFrequency, endFrequency, amplitude) {
  const first = Math.floor(start * SAMPLE_RATE);
  const last = Math.min(buffer.length, Math.floor((start + duration) * SAMPLE_RATE));
  let phase = 0;

  for (let index = first; index < last; index += 1) {
    const time = (index - first) / SAMPLE_RATE;
    const progress = time / duration;
    const curved = progress * progress * (3 - 2 * progress);
    const frequency = startFrequency + (endFrequency - startFrequency) * curved;
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    const flutter = 0.8 + 0.2 * Math.sin(2 * Math.PI * 18 * time);
    const body = Math.sin(phase) + 0.28 * Math.sin(phase * 2.01) + 0.1 * Math.sin(phase * 3.03);
    buffer[index] += body * amplitude * flutter * envelope(time, duration, 0.012, 0.08);
  }
}

function synthesizeBirdCall() {
  const duration = 2.4;
  const buffer = new Float32Array(Math.ceil(duration * SAMPLE_RATE));

  // 「ピー / ピャコ / ピャッコ / ビャー！ / ビャー！！」を5つの音型で表現。
  addBirdChirp(buffer, 0.02, 0.32, 1_180, 1_360, 0.22);
  addBirdChirp(buffer, 0.42, 0.16, 1_420, 930, 0.2);
  addBirdChirp(buffer, 0.62, 0.18, 1_080, 1_300, 0.18);
  addBirdChirp(buffer, 0.92, 0.13, 1_500, 1_020, 0.21);
  addBirdChirp(buffer, 1.08, 0.2, 1_150, 1_380, 0.2);
  addBirdChirp(buffer, 1.38, 0.36, 920, 1_230, 0.24);
  addBirdChirp(buffer, 1.84, 0.5, 860, 1_420, 0.28);

  return buffer;
}

function normalize(buffer, peakTarget = 0.92) {
  let peak = 0;
  for (const sample of buffer) {
    peak = Math.max(peak, Math.abs(sample));
  }
  const scale = peak > 0 ? peakTarget / peak : 1;
  return Float32Array.from(buffer, (sample) => Math.tanh(sample * scale * 1.05) / Math.tanh(1.05));
}

function encodePcm16Wav(samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  wav.writeUInt16LE(bytesPerSample, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    wav.writeInt16LE(Math.round(sample < 0 ? sample * 32768 : sample * 32767), 44 + index * 2);
  }

  return wav;
}

await mkdir(OUTPUT_DIR, { recursive: true });
const bgm = encodePcm16Wav(normalize(synthesizeBgm(), 0.86));
const birdCall = encodePcm16Wav(normalize(synthesizeBirdCall(), 0.9));
await Promise.all([
  writeFile(path.join(OUTPUT_DIR, "flock-parade.wav"), bgm),
  writeFile(path.join(OUTPUT_DIR, "bird-call.wav"), birdCall),
]);

console.log(`Generated ${path.relative(ROOT, OUTPUT_DIR)}/flock-parade.wav (${BGM_DURATION_SECONDS}s)`);
console.log(`Generated ${path.relative(ROOT, OUTPUT_DIR)}/bird-call.wav (2.4s)`);
