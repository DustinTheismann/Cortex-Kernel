import test from "node:test";
import assert from "node:assert/strict";
import { compileBridge } from "../src/index.js";
import type { Kind, MechanismSchema, PortSpec } from "../src/index.js";

// The full pipeline is entangled with model calls in the standalone, so it
// has no runnable verbatim slice; these tests pin the pipeline's contract
// case by case (ladder, pruning, obligations, impossibility codes) on top
// of the golden-tested primitives.

const port = (kind: Kind, extra?: Partial<PortSpec>): PortSpec =>
  ({ name: "", kind, shape: "", units: "", semantics: "", ...extra });

const schema = (produces: PortSpec[], consumes: PortSpec[] = [], extra?: Partial<MechanismSchema>): MechanismSchema =>
  ({ consumes, produces, certifies: [], assumptions: [], invariants: [], ...extra });

test("NO_SCHEMA: missing schema fails closed at PROPOSED", () => {
  const r = compileBridge({ schemaA: null, schemaB: schema([port("tensor")]) });
  assert.equal(r.stage, "PROPOSED");
  assert.equal(r.impossibility?.code, "NO_SCHEMA");
  assert.equal(r.typeCheck.pass, false);
  assert.equal(r.typeCheck.verdict, "type_killed");
});

test("NO_SHARED_PORTS: schemas without any output→input pairing", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor")], []),   // A produces, consumes nothing
    schemaB: schema([], []),                 // B neither produces nor consumes
  });
  assert.equal(r.impossibility?.code, "NO_SHARED_PORTS");
  assert.equal(r.stage, "PROPOSED");
});

test("NO_KIND_PATH: pairing exists but no admissible conversion (nothing converts to policy)", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("policy")]),
  });
  assert.equal(r.impossibility?.code, "NO_KIND_PATH");
});

test("exact same-kind bridge with full soft evidence reaches EPISTEMICALLY_SUPPORTED", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor", { semantics: "field" })]),
    schemaB: schema([], [port("tensor", { semantics: "input" })]),
    soft: { invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  assert.equal(r.stage, "EPISTEMICALLY_SUPPORTED");
  assert.equal(r.typeCheck.verdict, "type_valid");
  assert.equal(r.bridge?.adapters.length, 0);
  const po5 = r.obligations.find(o => o.id === "PO-5");
  assert.equal(po5?.status, "PROVED"); // exact path — fully axiomatic
  assert.equal(r.blockReason, null);
});

test("VERIFIED is never produced by the kernel", () => {
  // strongest achievable evidence still stops at EPISTEMICALLY_SUPPORTED
  const r = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("tensor")]),
    soft: { invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  assert.notEqual(r.stage as string, "VERIFIED");
  assert.equal(r.stage, "EPISTEMICALLY_SUPPORTED");
});

test("unresolved curated precondition holds at TYPE_COMPOSABLE / PRECONDITION_UNRESOLVED", () => {
  // scalar → bound is a single curated hop ("threshold")
  const r = compileBridge({
    schemaA: schema([port("scalar")]),
    schemaB: schema([], [port("bound")]),
    soft: { invariantPreserved: "satisfied", metricMeaningful: "satisfied" }, // preconditions absent → UNRESOLVED
  });
  assert.equal(r.stage, "TYPE_COMPOSABLE");
  assert.equal(r.blockReason, "PRECONDITION_UNRESOLVED");
  assert.equal(r.bridge?.ruleInstantiations[0].status, "UNRESOLVED");
});

test("satisfied curated precondition + full soft evidence reaches EPISTEMICALLY_SUPPORTED", () => {
  const r = compileBridge({
    schemaA: schema([port("scalar")]),
    schemaB: schema([], [port("bound")]),
    soft: {
      preconditions: { "scalar>bound:threshold": "satisfied" },
      invariantPreserved: "satisfied", metricMeaningful: "satisfied",
    },
  });
  assert.equal(r.stage, "EPISTEMICALLY_SUPPORTED");
  assert.equal(r.blockReason, null);
});

test("violated precondition on every path → PRECONDITION_UNSATISFIED, refuted path still reported", () => {
  const r = compileBridge({
    schemaA: schema([port("scalar")]),
    schemaB: schema([], [port("bound")]),
    soft: { preconditions: { "scalar>bound:threshold": "violated" } },
  });
  assert.equal(r.stage, "TYPE_COMPOSABLE");
  assert.equal(r.blockReason, "PRECONDITION_UNSATISFIED");
  assert.ok(r.mechCompat && r.mechCompat.prunedPaths >= 1);
});

test("refuted low-risk path is pruned in favor of a clean survivor", () => {
  // tensor → dataset: direct axiomatic "materialize" (cost 1) plus longer
  // curated alternatives. Refute nothing → direct path wins. Then refute
  // the direct path's... it is axiomatic (no precondition), so instead use
  // tensor → measurement: direct curated "observe" vs longer paths.
  const clean = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("measurement")]),
    soft: { preconditions: { "tensor>measurement:observe": "satisfied" }, invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  assert.equal(clean.bridge?.adapters.map(s => s.op).join(">"), "observe");
  const refuted = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("measurement")]),
    soft: { preconditions: { "tensor>measurement:observe": "violated" }, invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  // the direct curated hop is refuted → a survivor path (if any in top-3) is chosen
  assert.notEqual(refuted.bridge?.adapters.map(s => s.op).join(">"), "observe");
  assert.ok(refuted.mechCompat!.prunedPaths >= 1);
  assert.ok(refuted.mechCompat!.consideredPaths > refuted.mechCompat!.prunedPaths);
});

test("unit contradiction kills the bridge at PATH_FOUND with UNIT_CONTRADICTION", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor", { units: "seconds" })]),
    schemaB: schema([], [port("tensor", { units: "logits" })]),
    soft: { invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  assert.equal(r.stage, "PATH_FOUND");
  assert.equal(r.impossibility?.code, "UNIT_CONTRADICTION");
  assert.equal(r.bridge, null);
  assert.equal(r.typeCheck.pass, false);
});

test("lossy path adds PO-8 and destroyed properties", () => {
  // graph → subgraph is a single lossy axiomatic hop destroying global-structure
  const r = compileBridge({
    schemaA: schema([port("graph")]),
    schemaB: schema([], [port("subgraph")]),
    soft: { invariantPreserved: "satisfied", metricMeaningful: "satisfied" },
  });
  const po8 = r.obligations.find(o => o.id === "PO-8");
  assert.ok(po8, "PO-8 present on lossy path");
  assert.equal(po8!.status, "CONDITIONALLY-SATISFIED");
  assert.deepEqual(r.bridge?.destroyedProperties, ["global-structure"]);
});

test("REFUTED invariant blocks with INVARIANT_VIOLATION", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("tensor")]),
    soft: { invariantPreserved: "violated", metricMeaningful: "satisfied" },
  });
  assert.equal(r.stage, "CONTRACT_ADMISSIBLE");
  assert.equal(r.blockReason, "INVARIANT_VIOLATION");
});

test("missing soft evidence fails closed to EVIDENCE_PENDING at CONTRACT_ADMISSIBLE", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("tensor")]),
  });
  assert.equal(r.stage, "CONTRACT_ADMISSIBLE");
  assert.equal(r.blockReason, "EVIDENCE_PENDING");
  const po6 = r.obligations.find(o => o.id === "PO-6");
  assert.equal(po6?.status, "UNRESOLVED");
});

test("license screening: PROVED metadata is downgraded to CONDITIONALLY-SATISFIED", () => {
  const r = compileBridge({
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("tensor")]),
    repoA: { license: "MIT" }, repoB: { license: "Apache-2.0" },
  });
  const po4 = r.obligations.find(o => o.id === "PO-4");
  assert.equal(po4?.status, "CONDITIONALLY-SATISFIED");
  assert.match(po4!.detail, /metadata screen only/);
});

test("requiredAssumptions/preservedInvariants come from source/target schema by direction", () => {
  const a = schema([port("tensor")], [], { assumptions: ["A-assume"], invariants: ["A-inv"] });
  const b = schema([], [port("tensor")], { assumptions: ["B-assume"], invariants: ["B-inv"] });
  const r = compileBridge({ schemaA: a, schemaB: b });
  assert.equal(r.bridge?.dir, "A→B");
  assert.deepEqual(r.bridge?.requiredAssumptions, ["A-assume"]);
  assert.deepEqual(r.bridge?.preservedInvariants, ["B-inv"]);
});
