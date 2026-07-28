#!/usr/bin/env node
// Does the mutation classifier actually classify?
//
// The battery's whole value rests on one claim: that it distinguishes a real
// kill from an incidental one. If the classifier silently degraded to "the
// hash changed", every score in `MUTATION-REPORT.json` would still read 10/10
// and nothing would notice — the exact failure mode the battery exists to
// prevent, reproduced one level up.
//
// So the classifier is itself tested, against synthetic mutants whose correct
// outcome is known by construction. Build and execute are injected, so this
// runs in milliseconds and needs no Rust toolchain: the real cargo runner is
// exercised by the battery proper.
//
//   node --test conformance/mutation/selftest.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runMutant, summarize, root } from "./battery.mjs";

const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
const CASE = "compute-edges-boundaries";
const entry = manifest.cases.find((c) => c.caseId === CASE);
const fixture = JSON.parse(readFileSync(join(root, "test/golden", entry.fixture), "utf8"));
/** The corpus-correct payload: replaying it must reproduce the manifest hash. */
const CORRECT = fixture.data;

const SOURCE = "fn main() { let guard = SITE_PRESENT; }";

/** A mutant harness whose build/execute are scripted rather than real. */
const ctx = (over = {}) => ({
  manifest,
  subsystemScope: { synthetic: [CASE] },
  corpusInputs: {},
  source: SOURCE,
  baselineBinaryHash: "baseline",
  workDir: "/nonexistent",
  build: () => ({ binaryHash: "mutant" }),
  execute: () => CORRECT,
  ...over,
});

const mutant = (over = {}) => ({
  id: "synthetic", subsystem: "synthetic", rule: "a synthetic rule",
  find: "SITE_PRESENT", replace: "SITE_MUTATED",
  expectedKillers: [CASE], expectedFailure: "SYNTHETIC_VIOLATION",
  assert: () => true,
  ...over,
});

// A payload that differs from the corpus. Dropping one corpus key is enough to
// move the hash without any of the registry's assertions becoming true.
const DIVERGENT = (() => { const c = structuredClone(CORRECT); delete c["star-ties"]; return c; })();

test("killed_correctly: the expected fixture diverges and the violation is observable", () => {
  const { record, problem } = runMutant(mutant(), ctx({ execute: () => DIVERGENT }));
  assert.equal(record.outcome, "killed_correctly");
  assert.deepEqual(record.actualKillers, [CASE]);
  assert.equal(problem, null);
});

test("survived: output is corpus-identical, so the corpus never notices", () => {
  const { record, problem } = runMutant(mutant(), ctx());
  assert.equal(record.outcome, "survived");
  assert.match(problem, /CORPUS defect/);
});

test("killed_incidentally: the hash moved but the predicted violation is absent", () => {
  const { record, problem } = runMutant(mutant({ assert: () => false }), ctx({ execute: () => DIVERGENT }));
  assert.equal(record.outcome, "killed_incidentally");
  assert.match(problem, /A hash mismatch is not a kill/);
});

test("killed_incidentally: a crash is not evidence", () => {
  const { record, problem } = runMutant(mutant(), ctx({ execute: () => { throw new Error("segfault"); } }));
  assert.equal(record.outcome, "killed_incidentally");
  assert.match(problem, /crash is not evidence/);
});

test("killed_incidentally: the violation is observable but the pinning case stopped pinning it", () => {
  // Divergence comes from a case outside expectedKillers.
  const { record, problem } = runMutant(
    mutant({ expectedKillers: ["compute-edges"] }),
    ctx({ subsystemScope: { synthetic: [CASE, "compute-edges"] },
      execute: (b, id) => (id === CASE ? DIVERGENT : JSON.parse(readFileSync(join(root, "test/golden/fixtures/compute-edges.json"), "utf8")).data) }));
  assert.equal(record.outcome, "killed_incidentally");
  assert.match(problem, /no longer diverges/);
});

test("killed_incidentally: an assertion that throws is not a kill", () => {
  const { record, problem } = runMutant(
    mutant({ assert: () => { throw new Error("bad predicate"); } }),
    ctx({ execute: () => DIVERGENT }));
  assert.equal(record.outcome, "killed_incidentally");
  assert.match(problem, /assertion threw/);
});

test("invalid_mutant: the mutation site no longer exists", () => {
  const { record, problem } = runMutant(mutant({ find: "SITE_REMOVED_IN_A_REFACTOR" }), ctx());
  assert.equal(record.outcome, "invalid_mutant");
  assert.match(problem, /expired/);
});

test("invalid_mutant: the mutant binary is byte-identical to the baseline", () => {
  const { record, problem } = runMutant(mutant(), ctx({ build: () => ({ binaryHash: "baseline" }) }));
  assert.equal(record.outcome, "invalid_mutant");
  assert.match(problem, /equivalent mutation/);
});

test("not_executed: the mutant does not compile", () => {
  const { record, problem } = runMutant(mutant(), ctx({ build: () => { throw new Error("type error"); } }));
  assert.equal(record.outcome, "not_executed");
  assert.match(problem, /did not compile/);
});

test("not_executed: a pinning fixture has been removed from the corpus", () => {
  const { record, problem } = runMutant(mutant({ expectedKillers: ["a-case-that-was-deleted"] }), ctx());
  assert.equal(record.outcome, "not_executed");
  assert.match(problem, /unprotected, not passing/);
});

test("not_executed: the subsystem declares no corpus scope", () => {
  const { record } = runMutant(mutant({ subsystem: "undeclared" }), ctx());
  assert.equal(record.outcome, "not_executed");
});

test("only killed_correctly qualifies a subsystem", () => {
  const outcomes = ["killed_correctly", "killed_incidentally", "survived", "invalid_mutant", "not_executed"];
  for (const outcome of outcomes) {
    const r = summarize([mutant()], [{ id: "synthetic", outcome }], { synthetic: [CASE] }, "test");
    assert.equal(r.subsystems[0].mutationStatus, outcome === "killed_correctly" ? "qualified" : "unqualified",
      `${outcome} must ${outcome === "killed_correctly" ? "" : "not "}qualify`);
  }
});

test("a subsystem with no declared mutants is never reported as qualified", () => {
  const r = summarize([], [], {}, "test");
  assert.deepEqual(r.subsystems, [], "no mutants means no subsystem row — absence must not render as success");
});
