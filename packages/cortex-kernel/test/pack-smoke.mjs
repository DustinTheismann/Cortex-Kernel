#!/usr/bin/env node
// Packaging guard: from a clean checkout, `npm pack` must produce a
// tarball that contains the built library and is importable. Without the
// prepack build the tarball ships only package.json and README.md.
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

  const entry = join(work, "package", "dist", "src", "index.js");
  assert.ok(existsSync(entry), "packed tarball is missing dist/src/index.js — prepack build did not run");

  const mod = await import(pathToFileURL(entry).href);
  for (const fn of ["loadBrainIndex", "exportBrainIndex", "computeEdges"]) {
    assert.equal(typeof mod[fn], "function", "packed entry does not export " + fn);
  }
  const { state } = mod.loadBrainIndex({ repos: [], edges: [] });
  const serialized = JSON.parse(JSON.stringify(mod.exportBrainIndex(state, { generatedAt: "x" })));
  assert.equal(Object.keys(serialized).length, 15);

  console.log("pack smoke OK: " + basename(tarball));
} finally {
  rmSync(work, { recursive: true, force: true });
}
