#!/usr/bin/env node
// Packaging guard: from a clean checkout, `npm pack` must ship the ESM source
// (no build step) and the packed artifact must import cleanly with its public
// surface intact.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "kernel-pack-"));
try {
  const out = execFileSync("npm", ["pack", "--pack-destination", work], { cwd: pkgDir, encoding: "utf8" });
  const tarball = join(work, out.trim().split("\n").pop());
  execFileSync("tar", ["-xzf", tarball, "-C", work]);

  const entry = join(work, "package", "src", "index.js");
  assert.ok(existsSync(entry), "packed tarball is missing src/index.js");

  const mod = await import(pathToFileURL(entry).href);
  assert.equal(mod.SCHEMA_VERSION, 7, "packed entry does not export SCHEMA_VERSION === 7");
  assert.equal(typeof mod.BrainIndexError, "function", "packed entry does not export BrainIndexError");

  console.log("pack smoke OK: " + basename(tarball));
} finally {
  rmSync(work, { recursive: true, force: true });
}
