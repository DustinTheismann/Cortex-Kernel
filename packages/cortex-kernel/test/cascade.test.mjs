import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { evaluateCascade } from "../src/index.js";
import { planPortBridges } from "../src/planner.js";
import { normSchema } from "../src/compatibility.js";
import { stableStringify } from "../../../test/oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fxDir = join(root, "test/golden/fixtures");
const CASCADE_CATEGORIES = new Set(["compatibility", "planning", "preconditions", "obligations", "ladder", "literature"]);

const resolveSoft = (schemaA, schemaB, model = {}) => {
  const { options } = planPortBridges(normSchema(schemaA), normSchema(schemaB));
  const preconditions = {};
  options.forEach((o) => o.adapters.forEach((s) => { if (s.auth === "cur" && s.pre) preconditions[s.ruleId] = (model.preOverrides && model.preOverrides[s.ruleId]) || model.pre || "unknown"; }));
  return { preconditions, invariantPreserved: model.invariant || "unknown", metricMeaningful: model.metric || "unknown", note: model.note || "" };
};
const runFixture = (input) => evaluateCascade({ schemaA: input.schemaA, schemaB: input.schemaB, repoA: { id: "repoA" }, repoB: { id: "repoB" }, soft: resolveSoft(input.schemaA, input.schemaB, input.model), litGround: input.litGround, litCount: input.litCount });

const cascadeFixtures = readdirSync(fxDir)
  .map((f) => JSON.parse(readFileSync(join(fxDir, f), "utf8")))
  .filter((fx) => CASCADE_CATEGORIES.has(fx.category));

test("evaluateCascade reproduces every cascade fixture (canonical)", () => {
  assert.ok(cascadeFixtures.length >= 15);
  for (const fx of cascadeFixtures) {
    assert.equal(stableStringify(runFixture(fx.input)), stableStringify(fx.output), `${fx.caseId}: cascade output mismatch`);
  }
});

test("trace mode is hash-invariant across the whole cascade", () => {
  for (const fx of cascadeFixtures) {
    const input = { schemaA: fx.input.schemaA, schemaB: fx.input.schemaB, repoA: { id: "repoA" }, repoB: { id: "repoB" }, soft: resolveSoft(fx.input.schemaA, fx.input.schemaB, fx.input.model), litGround: fx.input.litGround, litCount: fx.input.litCount };
    const plain = evaluateCascade(input);
    const traced = evaluateCascade(input, { trace: true });
    assert.equal(stableStringify(traced.decision), stableStringify(plain), `${fx.caseId}: trace changed the decision`);
    assert.ok(Array.isArray(traced.trace) && traced.trace.length > 0);
  }
});
