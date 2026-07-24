import test from "node:test";
import assert from "node:assert/strict";
import {
  loadBrainIndex, exportBrainIndex, computeEdges, emptyState,
  BrainIndexError, V7_PRODUCT,
} from "../src/index.js";
import type { BrainIndexState } from "../src/index.js";

// Migration tests for the four-layer contract in data/brain-index.schema.
// Each documented legacy behavior gets a pin.

const repoA = { id: "a", name: "a", topics: ["epistemics"], stars: 4, enriched: true, dependencies: ["ed25519", "scipy"] };
const repoB = { id: "b", name: "b", topics: ["epistemics"], stars: 2, enriched: true, dependencies: ["ed25519", "scipy"], mentionsRepos: ["a"] };

const fullV7 = () => ({
  schemaVersion: 7, product: V7_PRODUCT, generatedAt: "2026-01-01T00:00:00.000Z",
  githubUser: "demo", repoCount: 2,
  repos: [repoA, repoB],
  edges: [{ source: "a", target: "b", type: "manual", weight: 1, evidence: "e" }],
  synthesisNodes: [{ id: "s1" }],
  notes: [{ id: "n1", text: "hello" }],
  manualLinks: [{ id: "m1" }],
  negatives: [{ id: "neg1" }],
  preregs: [{ id: "p1" }],
  prizeCandidates: [{ id: "c1" }],
  ledger: [{ id: "l1" }],
  calibration: [{ id: "cal1" }],
  mechCalibration: [{ sourceKind: "tensor", targetKind: "bound", confirmed: 1, refuted: 0 }],
});

test("layer 2: repos[] is the only hard requirement", () => {
  assert.throws(() => loadBrainIndex({}), BrainIndexError);
  assert.throws(() => loadBrainIndex(null), BrainIndexError);
  assert.throws(() => loadBrainIndex({ repos: "not-an-array" }), BrainIndexError);
  const { state } = loadBrainIndex({ repos: [] });
  assert.deepEqual(state.repos, []);
});

test("layer 2: schemaVersion is not validated — anything loads", () => {
  for (const v of [7, 3, "banana", null, undefined]) {
    const { report } = loadBrainIndex({ repos: [], schemaVersion: v });
    assert.equal(report.schemaVersion, v);
  }
});

test("layer 2: missing or non-array edges are recomputed from repos", () => {
  const { state, report } = loadBrainIndex({ repos: [repoA, repoB] });
  assert.equal(report.recomputedEdges, true);
  assert.deepEqual(state.edges, computeEdges([repoA, repoB]));
  assert.ok(state.edges.some(e => e.type === "readme-reference"));
  const withEdges = loadBrainIndex({ repos: [repoA, repoB], edges: [] });
  assert.equal(withEdges.report.recomputedEdges, false);
  assert.deepEqual(withEdges.state.edges, []);
});

test("layer 3: missing optional arrays leave prior state untouched (overlay)", () => {
  const prior: BrainIndexState = {
    ...emptyState(),
    negatives: [{ id: "old-neg" }],
    notes: { keep: "me" },
    mechCalibration: { "tensor>bound": { sourceKind: "tensor", targetKind: "bound" } },
  };
  const { state, report } = loadBrainIndex({ repos: [repoA] }, prior);
  assert.deepEqual(state.negatives, [{ id: "old-neg" }]);
  assert.deepEqual(state.notes, { keep: "me" });
  assert.ok(state.mechCalibration["tensor>bound"]);
  assert.ok(report.keptFromPrior.includes("negatives"));
  assert.ok(report.keptFromPrior.includes("notes"));
});

test("layer 3: notes transform to a map; ids without entries are dropped", () => {
  const { state } = loadBrainIndex({ repos: [], notes: [{ id: "n1", text: "t1" }, { text: "no-id" }, null] });
  assert.deepEqual(state.notes, { n1: "t1" });
});

test("layer 3: mechCalibration keyed by kind pair; invalid entries counted and dropped", () => {
  const { state, report } = loadBrainIndex({
    repos: [],
    mechCalibration: [
      { sourceKind: "tensor", targetKind: "bound" },
      { sourceKind: "tensor" },              // missing targetKind
      { targetKind: "bound" },               // missing sourceKind
      null,
    ],
  });
  assert.deepEqual(Object.keys(state.mechCalibration), ["tensor>bound"]);
  assert.equal(report.droppedMechCalEntries, 3);
});

test("layer 4: unknown top-level keys are reported and never reach the export", () => {
  const { state, report } = loadBrainIndex({ repos: [], edges: [], futureField: 1, other: "x" });
  assert.deepEqual(report.droppedUnknownKeys.sort(), ["futureField", "other"]);
  const out = exportBrainIndex(state, { generatedAt: "2026-01-01T00:00:00.000Z" });
  assert.ok(!("futureField" in out));
  assert.ok(!("other" in out));
});

test("layer 4: note objects lose extra properties across the round trip", () => {
  const { state } = loadBrainIndex({ repos: [], edges: [], notes: [{ id: "n1", text: "t", extra: "gone" }] });
  const out = exportBrainIndex(state, { generatedAt: "2026-01-01T00:00:00.000Z" }) as { notes: unknown };
  assert.deepEqual(out.notes, [{ id: "n1", text: "t" }]);
});

test("layer 4: product/generatedAt/repoCount regenerated; githubUser round-trips", () => {
  const file = { ...fullV7(), product: "something old", repoCount: 999 };
  const { state } = loadBrainIndex(file);
  const out = exportBrainIndex(state, { generatedAt: "2027-02-02T00:00:00.000Z" }) as Record<string, unknown>;
  assert.equal(out.product, V7_PRODUCT);
  assert.equal(out.generatedAt, "2027-02-02T00:00:00.000Z");
  assert.equal(out.repoCount, 2);
  assert.equal(out.githubUser, "demo");
});

test("layer 3: githubUser is replaced, not overlaid — absent file key clobbers prior", () => {
  const prior: BrainIndexState = { ...emptyState(), githubUser: "previous-user" };
  const { state, report } = loadBrainIndex({ repos: [] }, prior);
  assert.equal(state.githubUser, undefined);
  assert.ok(report.applied.includes("githubUser"));
});

test("layer 2/4: githubUser is not validated — any JSON value round-trips", () => {
  for (const v of [42, null, { nested: true }, ["arr"], false, "demo"]) {
    const { state } = loadBrainIndex({ repos: [], edges: [], githubUser: v });
    const out = exportBrainIndex(state, { generatedAt: "x" }) as Record<string, unknown>;
    assert.deepEqual(out.githubUser, v);
  }
});

test("layer 1: export serializes to 15 keys when githubUser was absent, 16 otherwise", () => {
  const absent = loadBrainIndex({ repos: [], edges: [] }).state;
  const outAbsent = JSON.parse(JSON.stringify(exportBrainIndex(absent, { generatedAt: "x" })));
  assert.equal(Object.keys(outAbsent).length, 15);
  assert.ok(!("githubUser" in outAbsent));

  const present = loadBrainIndex({ repos: [], edges: [], githubUser: null }).state;
  const outPresent = JSON.parse(JSON.stringify(exportBrainIndex(present, { generatedAt: "x" })));
  assert.equal(Object.keys(outPresent).length, 16);
  assert.equal(outPresent.githubUser, null);
});

test("full v7 file round-trips exactly (modulo regenerated metadata)", () => {
  const file = fullV7();
  const { state, report } = loadBrainIndex(file);
  assert.deepEqual(report.keptFromPrior, []);
  assert.equal(report.droppedUnknownKeys.length, 0);
  const out = exportBrainIndex(state, { generatedAt: file.generatedAt }) as Record<string, unknown>;
  assert.deepEqual(out, { ...file });
});

test("layer 4 hazard: overlaid prior state appears in the next export", () => {
  const prior = loadBrainIndex(fullV7()).state;
  const partial = { repos: [repoA], edges: [] };   // no negatives key
  const { state } = loadBrainIndex(partial, prior);
  const out = exportBrainIndex(state, { generatedAt: "x" }) as { negatives: unknown[] };
  assert.deepEqual(out.negatives, [{ id: "neg1" }]); // absent from the loaded file, present in export
});
