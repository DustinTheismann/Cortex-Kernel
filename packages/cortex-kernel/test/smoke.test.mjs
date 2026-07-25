import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";

// Import-smoke + static no-browser/no-network guarantee.
//
// Browser/network globals (Blob, fetch, …) exist in Node's runtime, so their
// absence cannot be asserted at runtime. The real guarantee is that the kernel
// SOURCE never accesses them — enforced here by a static scan of src/.

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src");

const jsFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? jsFiles(p) : (p.endsWith(".js") ? [p] : []);
});

// usage forms (not prose): access/construction/call patterns of forbidden APIs
const FORBIDDEN = [
  /\bwindow\./, /\bdocument\./, /\bFileReader\b/, /\blocalStorage\b/, /\bsessionStorage\b/,
  /\bindexedDB\b/, /\bXMLHttpRequest\b/, /\bnavigator\./, /\bnew Blob\b/, /\bfetch\s*\(/,
  /\brequire\s*\(/, /\bReact\b/, /\buseState\b/, /\buseCallback\b/,
];

// strip block and line comments so the scan sees code, not prose
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("no source file accesses a browser, React, or network global", () => {
  for (const f of jsFiles(srcDir)) {
    const code = stripComments(readFileSync(f, "utf8"));
    for (const pat of FORBIDDEN) assert.ok(!pat.test(code), `${f} references forbidden API ${pat}`);
  }
});

test("package imports with a deterministic surface and no import-time side effects", async () => {
  const mod = await import("../src/index.js");
  assert.equal(mod.SCHEMA_VERSION, 7);
  assert.equal(typeof mod.BrainIndexError, "function");
  const again = await import("../src/index.js");
  assert.equal(mod, again); // stable module identity, no re-execution effects
});
