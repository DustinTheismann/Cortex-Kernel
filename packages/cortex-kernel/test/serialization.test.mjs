import test from "node:test";
import assert from "node:assert/strict";
import { importBrainIndex, exportBrainIndex, computeEdges } from "../src/serialization.js";

test("import requires repos[]; message text matches the frozen loader", () => {
  assert.equal(importBrainIndex(JSON.stringify({ schemaVersion: 7 })).error, "Could not parse JSON: missing repos[] array");
  assert.equal(importBrainIndex('{"repos":"x"}').error, "Could not parse JSON: missing repos[] array");
  assert.match(importBrainIndex("not json").error, /^Could not parse JSON: /);
});

test("import overlays collections and clobbers the core object", () => {
  const prior = { data: { githubUser: "old", repos: [], edges: [] }, negatives: [{ id: "keep" }] };
  const imp = importBrainIndex(JSON.stringify({ repos: [{ id: "r1", name: "r1" }] }), prior);
  assert.equal("githubUser" in imp.data, false);        // core object replaced
  assert.deepEqual(imp.negatives, [{ id: "keep" }]);     // absent collection untouched
  assert.ok(Array.isArray(imp.data.edges));              // edges recomputed
});

test("import transforms notes → map and mechCalibration (dropping invalid)", () => {
  const imp = importBrainIndex(JSON.stringify({
    repos: [], notes: [{ id: "n1", text: "t" }, { text: "no-id" }],
    mechCalibration: [{ sourceKind: "tensor", targetKind: "bound" }, { sourceKind: "x" }],
  }));
  assert.deepEqual(imp.notes, { n1: "t" });
  assert.deepEqual(Object.keys(imp.mechCal), ["tensor>bound"]);
});

test("export: 16 keys, or 15 when githubUser is undefined; unknown fields dropped", () => {
  assert.equal(exportBrainIndex({ data: { githubUser: "u", repos: [{ id: "r1" }], edges: [] } }).keys.length, 16);
  const e15 = exportBrainIndex({ data: { repos: [{ id: "r1" }], edges: [] } });
  assert.equal(e15.keys.length, 15);
  assert.equal(e15.keys.includes("githubUser"), false);
  const dropped = exportBrainIndex({ data: { githubUser: "u", repos: [], edges: [], unknownTopLevel: 1 } });
  assert.equal(dropped.keys.includes("unknownTopLevel"), false);
});

test("computeEdges derives the five edge types by hub topology", () => {
  const edges = computeEdges([
    { id: "a", name: "a", topics: ["t"], stars: 5, mentionsRepos: ["b"] },
    { id: "b", name: "b", topics: ["t"], stars: 1 },
  ]);
  assert.ok(edges.some((e) => e.type === "readme-reference"));
  assert.ok(edges.some((e) => e.type === "shared-topic"));
});
