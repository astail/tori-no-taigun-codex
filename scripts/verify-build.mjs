import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/audio-engine.js",
  "src/game-engine.js",
  "assets/images/bird-sprites.png",
  "assets/audio/flock-parade.wav",
  "assets/audio/bird-call.wav",
  ".nojekyll",
];

for (const relativePath of requiredFiles) {
  const fileStats = await stat(path.join(DIST, relativePath));
  if (!fileStats.isFile()) {
    throw new Error(`Build output is missing a regular file: ${relativePath}`);
  }
}

const html = await readFile(path.join(DIST, "index.html"), "utf8");
if (!html.includes("Content-Security-Policy")) {
  throw new Error("Built HTML is missing its Content Security Policy.");
}
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
  throw new Error("Inline script found in built HTML.");
}

console.log(`Verified ${requiredFiles.length} required build files and security invariants.`);
