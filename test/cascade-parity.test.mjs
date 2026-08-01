#!/usr/bin/env node
// Cascade parity — C1.
//
// The Rust peer reproduces the 17 cascade fixtures: schema-level port planning,
// contract instantiation, the ordered proof-obligation vector, the five-stage
// ladder, and the post-ladder literature layer.
//
// PARITY ONLY. This asserts agreement on the corpus. It makes NO
// mutation-adequacy claim: nothing here shows the cascade fixtures would catch
// a wrong cascade implementation, only that this one is not wrong on them.
// That question belongs to C2/C3 and the mutation battery.
//
// Agreement is checked the way the conformance protocol defines it — the Rust
// payload is canonicalized and hashed, then compared to the manifest hash the
// JavaScript kernel also reproduces. So this is genuinely a cross-language
// claim rather than a Rust-only self-check.
//
//   node --test test/cascade-parity.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "./oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BINARY = join(root, "impl/rust/target/release/cortex-conformance");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));

const CASCADE_CATEGORIES = new Set(["compatibility", "planning", "preconditions", "obligations", "ladder", "literature"]);
const cascadeCases = manifest.cases.filter((c) => CASCADE_CATEGORIES.has(c.category));

const built = existsSync(BINARY);
const run = (args) => JSON.parse(execFileSync(BINARY, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

// C3 added nine boundary cases, each written because a semantic mutation of the
// cascade survived the original seventeen. The Rust peer does not implement them
// yet, so this file states that boundary explicitly rather than quietly
// narrowing what it checks — an undeclared case is pending work, not a pass.
const C3_BOUNDARY_CASES = [
  "count-without-grounding", "dimensionless-unit-pairing", "metric-obligation-ungraded",
  "novel-below-top-stage", "option-cap-saturated", "refuted-option-pruned",
  "refuted-outranks-unresolved", "reverse-direction-bridge", "unresolved-option-outranked",
];

test("the corpus contains 26 cascade fixtures: 17 from C1 plus 9 C3 boundary cases", () => {
  assert.equal(cascadeCases.length, 26, "a different count means the cascade scope moved");
  const ids = new Set(cascadeCases.map((c) => c.caseId));
  assert.deepEqual(C3_BOUNDARY_CASES.filter((id) => !ids.has(id)), []);
});

test("the Rust peer declares every cascade fixture except the pending C3 boundary cases",
  { skip: built ? false : "run: npm run conformance:build" }, () => {
    const declared = new Set(run(["--cases"]));
    const missing = cascadeCases.filter((c) => !declared.has(c.caseId)).map((c) => c.caseId).sort();
    // Exact, not a subset: a C1 case silently dropping out would otherwise hide
    // inside a "some cases are pending" allowance.
    assert.deepEqual(missing, [...C3_BOUNDARY_CASES].sort(),
      "the only undeclared cascade fixtures may be the pending C3 boundary cases");
  });

test("the Rust peer reproduces every cascade fixture it declares", { skip: built ? false : "run: npm run conformance:build" }, () => {
  const declared = new Set(run(["--cases"]));
  const failures = [];
  for (const c of cascadeCases.filter((x) => declared.has(x.caseId))) {
    const payload = run([c.caseId]);
    const fixture = JSON.parse(readFileSync(join(root, "test/golden", c.fixture), "utf8"));
    // The conformance wrapping, verbatim: the verifier re-canonicalizes, so
    // key order and number formatting in the Rust output are irrelevant.
    const wrapped = { caseId: c.caseId, category: c.category, ...(fixture.data !== undefined ? { data: payload } : payload) };
    const got = sha256(wrapped);
    if (got !== c.sha256) failures.push(`${c.caseId}: expected ${c.sha256.slice(0, 16)}…, got ${got.slice(0, 16)}…`);
  }
  assert.deepEqual(failures, [], "cascade parity failures");
});

// The cascade is where absence is most load-bearing: an impossibility case
// carries no bridge, mechClass, mechCompat or blockReason AT ALL, and an
// implementation that emitted them as null would still look plausible while
// hashing differently. Assert the distinction directly rather than trusting
// the hash to have covered it.
test("impossibility cases omit the bridge fields entirely, rather than nulling them",
  { skip: built ? false : "run: npm run conformance:build" }, () => {
    for (const id of ["incompatible", "missing-conversion-rule", "no-schema"]) {
      const { output } = run([id]);
      for (const k of ["bridge", "mechClass", "mechCompat", "blockReason"]) {
        assert.equal(k in output, false, `${id}: ${k} must be ABSENT, not present-and-null`);
      }
      assert.equal(output.stage, "PROPOSED");
      assert.equal(output.typeCheck.verdict, "type_killed");
    }
  });

test("a unit contradiction reaches PATH_FOUND with a null bridge, not an absent one",
  { skip: built ? false : "run: npm run conformance:build" }, () => {
    const { output } = run(["hard-incompatibility"]);
    assert.equal(output.stage, "PATH_FOUND");
    assert.equal(output.impossibility.code, "UNIT_CONTRADICTION");
    // Distinct from the cases above: here a path WAS found, so the bridge key
    // exists and is null. Absent and null are different facts.
    assert.equal("bridge" in output, true);
    assert.equal(output.bridge, null);
  });

test("the literature layer varies without moving the ladder",
  { skip: built ? false : "run: npm run conformance:build" }, () => {
    const cases = ["lit-unexplored", "lit-emerging", "lit-known", "lit-unverified"].map((id) => run([id]).output);
    const stages = new Set(cases.map((o) => o.stage));
    assert.deepEqual([...stages], ["EPISTEMICALLY_SUPPORTED"],
      "novelty class must not move the deterministic ladder");
    assert.deepEqual(cases.map((o) => o.litClass), ["UNEXPLORED", "EMERGING", "KNOWN", "UNVERIFIED"]);
    assert.deepEqual(cases.map((o) => o.finalVerdict), ["PROMISING", "EMERGING", "KNOWN", "UNVERIFIED"]);
    // Prize candidacy is reachable only from UNEXPLORED.
    assert.deepEqual(cases.map((o) => Boolean(o.prizeCandidate)), [true, false, false, false]);
  });
