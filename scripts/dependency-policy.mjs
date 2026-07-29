#!/usr/bin/env node
// Dependency policy — enforced, not documented.
//
// The repository claims a dependency-free runtime: the JavaScript kernel ships
// no dependencies and the Rust conformance implementation links only the
// standard library. A lock file RECORDS the resolved graph; it does not stop
// anyone adding `serde = "1"` and committing the updated lock alongside it.
// This turns the claim into an invariant CI can fail on.
//
//   node scripts/dependency-policy.mjs
//
// Policy:
//   - packages/cortex-kernel: zero runtime dependencies (devDependencies also
//     forbidden — the test suite uses node:test only).
//   - impl/rust: exactly one package in the lock graph, itself.
//   - the repo root: no dependencies of any kind.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];
const checks = [];

const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

// ---- npm packages ---------------------------------------------------------

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

for (const pkgPath of ["package.json", "packages/cortex-kernel/package.json"]) {
  if (!existsSync(join(root, pkgPath))) continue;
  const pkg = readJson(pkgPath);
  const found = [];
  for (const f of DEP_FIELDS) {
    const names = Object.keys(pkg[f] || {});
    if (names.length) found.push(`${f}: ${names.join(", ")}`);
  }
  if (found.length) violations.push(`${pkgPath} declares dependencies — policy is zero:\n      ${found.join("\n      ")}`);
  else checks.push(`${pkgPath}: no dependencies of any kind`);
}

// A lock file at the root of a zero-dependency package is a signal that
// something was installed; node_modules presence is not itself a violation
// (npm creates it for workspaces/bins) but a non-trivial lock is.
for (const lock of ["package-lock.json", "packages/cortex-kernel/package-lock.json"]) {
  if (!existsSync(join(root, lock))) continue;
  const l = readJson(lock);
  const pkgs = Object.keys(l.packages || {}).filter((k) => k !== "" && !k.startsWith("node_modules/.package-lock"));
  if (pkgs.length) violations.push(`${lock} resolves ${pkgs.length} package(s); policy is zero: ${pkgs.slice(0, 8).join(", ")}`);
  else checks.push(`${lock}: resolves no packages`);
}

// ---- Rust -----------------------------------------------------------------

const cargoLock = "impl/rust/Cargo.lock";
if (existsSync(join(root, cargoLock))) {
  const text = readFileSync(join(root, cargoLock), "utf8");
  const names = [...text.matchAll(/^name = "(.+)"$/gm)].map((m) => m[1]);
  const foreign = names.filter((n) => n !== "cortex-conformance");
  if (foreign.length) violations.push(`${cargoLock} contains non-local crates — policy is standard library only: ${foreign.join(", ")}`);
  else checks.push(`${cargoLock}: only cortex-conformance itself (${names.length} package)`);

  const toml = readFileSync(join(root, "impl/rust/Cargo.toml"), "utf8");
  const depSection = toml.split(/^\[dependencies\]$/m)[1];
  const declared = depSection ? depSection.split(/^\[/m)[0].split("\n").filter((l) => /^\s*[A-Za-z0-9_-]+\s*=/.test(l)) : [];
  if (declared.length) violations.push(`impl/rust/Cargo.toml declares dependencies: ${declared.map((s) => s.trim()).join(", ")}`);
  else checks.push("impl/rust/Cargo.toml: [dependencies] is empty");
}

// ---- report ---------------------------------------------------------------

console.log("dependency policy — dependency-free runtime, enforced\n");
for (const c of checks) console.log(`  ✔ ${c}`);
if (violations.length) {
  console.error("\ndependency policy FAILED:");
  for (const v of violations) console.error(`  ✘ ${v}`);
  console.error("\nAdding a dependency is a deliberate governance decision: update this policy in the same commit, or do not add it.");
  process.exit(1);
}
console.log("\n  No dependency may enter without changing this policy in the same commit.");
