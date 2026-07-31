#!/usr/bin/env node
// The conformance gate's own failure modes, negative-tested.
//
// This repository's position is that a claim nobody tried to falsify is not
// evidence, and that applies to the instruments too. The conformance verifier
// certifies implementations; nothing certified the verifier. It reported
// success while verifying nothing for as long as an implementation went
// unbuilt — the run was green, the published report recorded `unbuilt`, and no
// cross-language hash was ever compared.
//
// That mattered beyond a misleading log line. `ledger --release` seals only
// after `npm run verify` passes, and the v0.5.2 release statement asserts
// corroboration by an independent Rust peer. A green gate over an absent peer
// is precisely how a false sentence becomes immutable.
//
// So the gate is driven for real, against a temporary registry, and the
// outcome asserted — the same standard the gate applies to implementations.
//
//   node --test test/conformance-gate.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERIFY = join(root, "conformance/verify.mjs");
const REAL_REGISTRY = join(root, "conformance/implementations.json");

/** Run the gate against a registry, returning { code, stdout, stderr }. */
const runGate = (registryPath) => {
  try {
    const stdout = execFileSync("node", [VERIFY, `--registry=${registryPath}`],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: e.status, stdout: String(e.stdout || ""), stderr: String(e.stderr || "") };
  }
};

const withRegistry = (impls, fn) => {
  const dir = mkdtempSync(join(tmpdir(), "cortex-gate-"));
  const p = join(dir, "implementations.json");
  const real = JSON.parse(readFileSync(REAL_REGISTRY, "utf8"));
  writeFileSync(p, JSON.stringify({ ...real, implementations: impls }, null, 2));
  try { return fn(p); } finally { rmSync(dir, { recursive: true, force: true }); }
};

const realImpl = () => JSON.parse(readFileSync(REAL_REGISTRY, "utf8")).implementations[0];

test("a declared implementation that was not built FAILS the gate", () => {
  const impl = { ...realImpl(), id: "phantom", command: ["./impl/rust/target/release/does-not-exist"] };
  const r = withRegistry([impl], runGate);
  assert.equal(r.code, 1,
    "an unbuilt declared implementation must fail. Warning and exiting 0 lets a green conformance gate coexist with zero cross-language verification");
  assert.match(r.stderr + r.stdout, /binary not built/);
});

// The message has to name the fix, because the failure is most likely to be
// met by someone who does not know this repository builds a Rust peer at all.
test("the unbuilt failure names the build command", () => {
  const impl = { ...realImpl(), id: "phantom", command: ["./impl/rust/target/release/does-not-exist"] };
  const r = withRegistry([impl], runGate);
  assert.match(r.stderr + r.stdout, /cargo build --release/);
});

// The complement: the change must not have made the gate fail for everyone.
// Without this, "always exit 1" would pass the test above.
test("the real, built registry still passes", { skip: existsSync(join(root, "impl/rust/target/release/cortex-conformance")) ? false : "run: npm run conformance:build" }, () => {
  const r = withRegistry([realImpl()], runGate);
  assert.equal(r.code, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /corpus cases reproduced/);
});

// `--registry` exists so this file can drive the gate. If it silently fell back
// to the real registry, every assertion here would be testing the wrong thing
// and would keep passing while proving nothing.
test("--registry actually redirects, rather than silently falling back", () => {
  const dir = mkdtempSync(join(tmpdir(), "cortex-gate-"));
  const p = join(dir, "missing.json");
  try {
    const r = runGate(p);
    assert.notEqual(r.code, 0, "a nonexistent registry must not be silently replaced by the default one");
    assert.match(r.stderr, /missing\.json/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
