import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SKIPPED_NAMES = new Set(["bird-sprites-source.png"]);

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });

  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (SKIPPED_NAMES.has(entry.name)) {
      continue;
    }
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to copy symbolic link: ${path.join(source, entry.name)}`);
    }

    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to);
    } else if (entry.isFile()) {
      await cp(from, to, { force: true });
    }
  }
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await Promise.all([
  cp(path.join(ROOT, "index.html"), path.join(DIST, "index.html")),
  cp(path.join(ROOT, "styles.css"), path.join(DIST, "styles.css")),
  copyTree(path.join(ROOT, "src"), path.join(DIST, "src")),
  copyTree(path.join(ROOT, "public"), DIST),
  writeFile(path.join(DIST, ".nojekyll"), ""),
]);

console.log(`Built static site at ${path.relative(ROOT, DIST)}/`);
