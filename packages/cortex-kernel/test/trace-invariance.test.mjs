import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { evaluateCascade } from "../src/index.js";
import { planPortBridges } from "../src/planner.js";
import { normSchema } from "../src/compatibility.js";
import { sha256 } from "../../../test/oracle/canonicalize.mjs";

// Differential proof of the hard constraint: enabling the explainability
// trace must NEVER change the canonical decision hash. Checked over every
// cascade fixture — the trace is emitted, but decision hashes are identical.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fxDir = join(root, "test/golden/fixtures");
const CASCADE = new Set(["compatibility", "planning", "preconditions", "obligations", "ladder", "literature"]);

const resolveSoft = (a, b, model = {}) => {
  const { options } = planPortBridges(normSchema(a), normSchema(b));
  const pre = {};
  options.forEach((o) => o.adapters.forEach((s) => { if (s.auth === "cur" && s.pre) pre[s.ruleId] = (model.preOverrides && model.preOverrides[s.ruleId]) || model.pre || "unknown"; }));
  return { preconditions: pre, invariantPreserved: model.invariant || "unknown", metricMeaningful: model.metric || "unknown", note: model.note || "" };
};

const fixtures = readdirSync(fxDir).map((f) => JSON.parse(readFileSync(join(fxDir, f), "utf8"))).filter((fx) => CASCADE.has(fx.category));

test("trace on/off yields an identical canonical decision hash for every case", () => {
  for (const fx of fixtures) {
    const input = { schemaA: fx.input.schemaA, schemaB: fx.input.schemaB, repoA: { id: "repoA" }, repoB: { id: "repoB" }, soft: resolveSoft(fx.input.schemaA, fx.input.schemaB, fx.input.model), litGround: fx.input.litGround, litCount: fx.input.litCount };
    const plain = evaluateCascade(input);
    const traced = evaluateCascade(input, { trace: true });
    assert.equal(sha256(traced.decision), sha256(plain), `${fx.caseId}: trace changed the decision hash`);
    assert.equal(sha256(plain), sha256(fx.output), `${fx.caseId}: decision does not match the oracle`);
    assert.ok(traced.trace.length > 0, `${fx.caseId}: trace was empty`);
  }
});
