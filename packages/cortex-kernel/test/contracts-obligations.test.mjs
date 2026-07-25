import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { instantiateContract, scoreOptions } from "../src/contracts.js";
import { evaluateObligations, synthTest } from "../src/obligations.js";
import { createTracer, NULL_TRACER } from "../src/internal/trace.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fxDir = join(root, "test/golden/fixtures");
const fixture = (id) => JSON.parse(readFileSync(join(fxDir, id + ".json"), "utf8"));

// Reconstruct the model's raw soft judgment from the mapped obligation status
// (inverse of mapSoft over the values our corpus uses).
const invMap = { "CONDITIONALLY-SATISFIED": "satisfied", "UNRESOLVED": "unknown", "REFUTED": "violated" };

// Every pass-case fixture (those with a bridge) must be reproduced field-for-field.
const passFixtures = readdirSync(fxDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => fixture(f.replace(/\.json$/, "")))
  .filter((fx) => fx.output && fx.output.bridge);

test("obligations vector is reproduced for every pass-case", () => {
  assert.ok(passFixtures.length >= 6, "expected several pass-case fixtures");
  for (const fx of passFixtures) {
    const b = fx.output.bridge;
    const po = b.sourcePort, ci = b.targetPort, adapters = b.adapters, inst = b.ruleInstantiations;
    const po3 = fx.output.obligations.find((o) => o.id === "PO-3");
    const po6 = fx.output.obligations.find((o) => o.id === "PO-6");
    const po7 = fx.output.obligations.find((o) => o.id === "PO-7");
    const soft = { invariantPreserved: invMap[po6.status], metricMeaningful: invMap[po7.status], note: po7.detail };
    const O = evaluateObligations({ po, ci, adapters, inst, unit: po3.status.toLowerCase(), soft, srcRepo: {}, dstRepo: {} });
    assert.deepEqual(O, fx.output.obligations, `${fx.caseId}: obligations mismatch`);
  }
});

test("contract instantiation is reproduced for every pass-case", () => {
  for (const fx of passFixtures) {
    const b = fx.output.bridge;
    const preStatus = {};
    for (const x of b.ruleInstantiations) preStatus[x.ruleId] = invMap[x.status];
    assert.deepEqual(instantiateContract(b.adapters, preStatus), b.ruleInstantiations, `${fx.caseId}: instantiation mismatch`);
  }
});

test("scoreOptions prunes refuted paths and keeps a fallback", () => {
  // one option whose only precondition is violated → refuted, still chosen
  const opt = { risk: 2.5, adapters: [{ auth: "cur", pre: "p", op: "normalize", ruleId: "r1" }] };
  const { survivors, chosen } = scoreOptions([opt], { r1: "violated" });
  assert.equal(survivors.length, 0);
  assert.ok(chosen.refuted);
  assert.equal(chosen.o, opt);
});

test("synthTest composes the adapter chain into a skeleton", () => {
  const out = synthTest({ kind: "tensor", semantics: "x" }, { kind: "distribution", semantics: "y" }, { adapter: [{ op: "normalize" }] });
  assert.match(out, /const y = normalize\(x\);/);
  assert.match(out, /tensor→distribution preserves semantics/);
});

test("trace is opt-in and never alters the decision (hash-invariant)", () => {
  const opt = { risk: 3.5, adapters: [{ auth: "cur", pre: "p", op: "normalize", ruleId: "r1" }] };
  const withoutTrace = scoreOptions([opt], { r1: "unknown" }, NULL_TRACER).chosen.inst;
  const tracer = createTracer();
  const withTrace = scoreOptions([opt], { r1: "unknown" }, tracer).chosen.inst;
  assert.deepEqual(withTrace, withoutTrace);
  assert.ok(tracer.entries.length > 0, "tracer should have recorded steps");
});
