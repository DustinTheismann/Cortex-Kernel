import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MECH_KINDS, CONV_RULES, edgeCost, adaptersFor, pairCompat,
  shapeCompat, unitCompat, licenseCompat, synthTest, normSchema, classifyLit,
} from "../src/index.js";
import type { Kind, PortSpec } from "../src/index.js";

// dist/test/golden.test.js → fixtures live in the source tree
const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../test/golden/fixtures");
const load = (name: string) => JSON.parse(readFileSync(join(fixtures, name), "utf8"));

const port = (kind: string, extra?: Partial<PortSpec>): PortSpec =>
  ({ name: "", kind: kind as Kind, shape: "", units: "", semantics: "", ...extra });

test("every ordered kind pair: multipath results match the frozen artifact", () => {
  const golden = load("kind-paths.json");
  for (const a of MECH_KINDS) for (const b of MECH_KINDS) {
    assert.deepEqual(adaptersFor(a, b, 3), golden[a + ">" + b], a + ">" + b);
  }
});

test("every ordered kind pair: pairCompat verdicts match", () => {
  const golden = load("pair-compat.json");
  for (const a of MECH_KINDS) for (const b of MECH_KINDS) {
    assert.deepEqual(pairCompat(port(a), port(b)), golden[a + ">" + b], a + ">" + b);
  }
});

test("edge costs match for every registry edge", () => {
  const golden = load("edge-costs.json");
  let n = 0;
  for (const [from, edges] of Object.entries(CONV_RULES)) {
    for (const e of edges) {
      assert.equal(edgeCost(e), golden[from + ">" + e.to + ":" + e.op]);
      n++;
    }
  }
  assert.equal(n, Object.keys(golden).length, "registry edge count drifted");
});

test("shape compatibility table matches", () => {
  const golden = load("shape-compat.json");
  for (const key of Object.keys(golden)) {
    const [x, y] = key.split("|");
    assert.equal(shapeCompat(port("tensor", { shape: x }), port("tensor", { shape: y })), golden[key], key);
  }
});

test("unit compatibility table matches", () => {
  const golden = load("unit-compat.json");
  for (const key of Object.keys(golden)) {
    const [x, y] = key.split("|");
    assert.equal(unitCompat(port("tensor", { units: x }), port("tensor", { units: y })), golden[key], key);
  }
});

test("license screening matches on all combos", () => {
  for (const c of load("license-compat.json")) {
    assert.deepEqual(
      licenseCompat(c.a == null ? {} : { license: c.a }, c.b == null ? {} : { license: c.b }),
      c.out,
    );
  }
});

test("property-test skeletons are byte-identical", () => {
  for (const c of load("synth-test.json")) {
    const best = pairCompat(port(c.po.kind, c.po), port(c.ci.kind, c.ci));
    assert.deepEqual((best.adapter || []).map(s => s.op), c.adapters);
    assert.equal(synthTest({ ...port(c.po.kind), ...c.po }, { ...port(c.ci.kind), ...c.ci }, best.adapter || []), c.out);
  }
});

test("schema normalization matches on edge cases", () => {
  for (const c of load("norm-schema.json")) {
    assert.deepEqual(normSchema(c.in), c.out);
  }
});

test("literature classification matches on boundaries", () => {
  for (const c of load("classify-lit.json")) {
    assert.equal(classifyLit(c.in), c.out);
  }
});
