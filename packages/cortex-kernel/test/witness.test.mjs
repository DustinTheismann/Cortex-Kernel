import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { buildWitness, verifyWitness, REJECTION } from "../src/witness.js";
import { evaluateCascade } from "../src/index.js";
import { planPortBridges } from "../src/planner.js";
import { normSchema } from "../src/compatibility.js";
import { sha256 } from "../../../test/oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fxDir = join(root, "test/golden/fixtures");
const CASCADE = new Set(["compatibility", "planning", "preconditions", "obligations", "ladder", "literature"]);
const fixtures = readdirSync(fxDir).map((f) => JSON.parse(readFileSync(join(fxDir, f), "utf8"))).filter((fx) => CASCADE.has(fx.category));

test("every golden decision yields a witness that verifies against the registry", () => {
  assert.ok(fixtures.length >= 15);
  for (const fx of fixtures) {
    const w = buildWitness(fx.output);
    const { valid, violations } = verifyWitness(w);
    assert.ok(valid, `${fx.caseId}: witness rejected — ${violations.join("; ")}`);
  }
});

test("witness records the chain, assumptions, unresolved obligations and a falsifier", () => {
  const fx = fixtures.find((f) => f.caseId === "soft-precondition-unresolved");
  const w = buildWitness(fx.output);
  assert.deepEqual(w.selected.chain, ["tensor>distribution:normalize"]);
  assert.equal(w.conclusion.stage, "TYPE_COMPOSABLE");
  assert.equal(w.conclusion.blockReason, "PRECONDITION_UNRESOLVED");
  assert.deepEqual(w.assumptions.instantiatedPreconditions.map((x) => x.status), ["UNRESOLVED"]);
  assert.ok(w.unresolved.some((o) => o.id === "PO-5.1"));
  assert.equal(w.falsifier.kind, "RESOLVE_OBLIGATION");
  assert.ok(w.rejectedAlternates.length >= 1, "competing paths should be recorded as rejected with a cause");
  for (const r of w.rejectedAlternates) assert.ok(Object.values(REJECTION).includes(r.cause));
});

test("impossibility decisions carry a falsifier naming what would unlock them", () => {
  const noPath = fixtures.find((f) => f.caseId === "missing-conversion-rule");
  const w = buildWitness(noPath.output);
  assert.equal(w.selected, null);
  assert.equal(w.conclusion.impossibilityCode, "NO_KIND_PATH");
  assert.equal(w.falsifier.kind, "MISSING_RULE");
  assert.ok(verifyWitness(w).valid);
});

test("the checker rejects a forged chain, a broken chain, and a mis-stated stage", () => {
  const fx = fixtures.find((f) => f.caseId === "soft-precondition-unresolved");

  const forged = buildWitness(fx.output);
  forged.selected.chain = ["tensor>certificate:teleport"];
  assert.equal(verifyWitness(forged).valid, false, "unknown ruleId must be rejected");

  const broken = buildWitness(fx.output);
  broken.selected.targetKind = "policy"; // chain no longer terminates where claimed
  assert.equal(verifyWitness(broken).valid, false, "non-terminating chain must be rejected");

  const misstated = buildWitness(fx.output);
  misstated.conclusion.stage = "EPISTEMICALLY_SUPPORTED"; // obligations say otherwise
  const r = verifyWitness(misstated);
  assert.equal(r.valid, false, "stage must be re-derivable from the obligation vector");
  assert.ok(r.violations.some((v) => /not re-derivable/.test(v)));

  const understated = buildWitness(fx.output);
  understated.assumptions.instantiatedPreconditions = []; // hide a precondition
  assert.equal(verifyWitness(understated).valid, false, "hidden curated precondition must be rejected");
});

test("building a witness never changes the canonical decision hash", () => {
  const resolveSoft = (a, b, model = {}) => {
    const { options } = planPortBridges(normSchema(a), normSchema(b));
    const pre = {};
    options.forEach((o) => o.adapters.forEach((s) => { if (s.auth === "cur" && s.pre) pre[s.ruleId] = (model.preOverrides && model.preOverrides[s.ruleId]) || model.pre || "unknown"; }));
    return { preconditions: pre, invariantPreserved: model.invariant || "unknown", metricMeaningful: model.metric || "unknown", note: model.note || "" };
  };
  for (const fx of fixtures) {
    const input = { schemaA: fx.input.schemaA, schemaB: fx.input.schemaB, repoA: { id: "repoA" }, repoB: { id: "repoB" }, soft: resolveSoft(fx.input.schemaA, fx.input.schemaB, fx.input.model), litGround: fx.input.litGround, litCount: fx.input.litCount };
    const d = evaluateCascade(input);
    const before = sha256(d);
    buildWitness(d);
    assert.equal(sha256(d), before, `${fx.caseId}: witness construction mutated the decision`);
    assert.equal(sha256(d), sha256(fx.output), `${fx.caseId}: decision drifted from the oracle`);
  }
});
