import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const readText = (relativePath) => readFile(path.join(ROOT, relativePath), "utf8");

test("page has a restrictive CSP and only local executable assets", async () => {
  const html = await readText("index.html");
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /object-src 'none'/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
});

test("self-hosted responses deny framing even though meta CSP cannot", async () => {
  const [nginx, server] = await Promise.all([readText("nginx.conf"), readText("scripts/serve.mjs")]);
  assert.match(nginx, /frame-ancestors 'none'/);
  assert.match(nginx, /X-Frame-Options "DENY"/);
  assert.match(server, /frame-ancestors 'none'/);
  assert.match(server, /X-Frame-Options/);
});

test("project intentionally has no runtime or development dependencies", async () => {
  const packageJson = JSON.parse(await readText("package.json"));
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
});

test("common secret files and source artwork are excluded from git", async () => {
  const gitignore = await readText(".gitignore");
  for (const pattern of [".env", "*.key", "*.pem", "credentials*.json", "bird-sprites-source.png"]) {
    assert.ok(gitignore.includes(pattern), `missing ignore rule: ${pattern}`);
  }
});

test("client code does not use persistent browser storage or dynamic evaluation", async () => {
  const app = await readText("src/app.js");
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(app, /\beval\s*\(|new\s+Function\s*\(/);
});
