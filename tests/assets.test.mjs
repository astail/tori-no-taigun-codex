import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");

async function readWav(relativePath) {
  const data = await readFile(path.join(ROOT, relativePath));
  assert.equal(data.toString("ascii", 0, 4), "RIFF");
  assert.equal(data.toString("ascii", 8, 12), "WAVE");
  assert.equal(data.readUInt16LE(20), 1, "audio must use uncompressed PCM");
  assert.equal(data.readUInt16LE(22), 1, "audio must be mono");
  assert.equal(data.readUInt16LE(34), 16, "audio must be 16-bit");
  const sampleRate = data.readUInt32LE(24);
  const byteRate = data.readUInt32LE(28);
  const dataSize = data.readUInt32LE(40);
  return { data, sampleRate, duration: dataSize / byteRate };
}

test("original BGM is a valid approximately one-minute WAV", async () => {
  const wav = await readWav("public/assets/audio/flock-parade.wav");
  assert.equal(wav.sampleRate, 22_050);
  assert.ok(wav.duration >= 60 && wav.duration <= 70);
  assert.ok(wav.data.length < 3_500_000, "BGM should remain lightweight enough for Pages");
});

test("bird call SE is a valid short WAV", async () => {
  const wav = await readWav("public/assets/audio/bird-call.wav");
  assert.ok(wav.duration >= 2.3 && wav.duration <= 2.5);
  assert.ok(wav.data.length < 150_000);
});

test("reviewed sprite sheet is a transparent 1536x1024 PNG", async () => {
  const image = await readFile(path.join(ROOT, "public/assets/images/bird-sprites.png"));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
  assert.equal(image[25], 6, "PNG must use RGBA color type");
});
