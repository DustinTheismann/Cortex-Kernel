// Representative oracle inputs.
//
// Two families:
//   (A) Kernel matrices — exhaustive or boundary sweeps over the pure,
//       cleanly sliceable functions (kinds, rules, compatibility, multipath
//       search/ranking, property-test skeleton, schema normalization,
//       literature classification, schema-v7 edge derivation).
//   (B) Compile cases — driven through the FROZEN verifyCascade core to
//       capture contract instantiation, proof-obligation status, and verdict
//       advancement. Each fixes the two model boundaries (schema extraction
//       is supplied directly as schemaA/schemaB; soft judgments are supplied
//       via `model`) so the captured decision is deterministic.
//
// A MechanismSchema port is { name, kind, shape, units, semantics }.
// `model.pre` sets the status returned for EVERY curated precondition asked
// ("satisfied"|"conditional"|"violated"|"unknown"); `model.preOverrides`
// overrides specific ruleIds; `model.invariant` / `model.metric` set the two
// remaining soft judgments. Absent → "unknown".

// ---- (A) kernel matrices --------------------------------------------------

// Shape/unit value grids: wildcards, casing, dimensionless, and contradiction.
export const SHAPES = ["", "[batch,d]", "[BATCH,D]", "DAG", "dag", "scalar", "[n]", "any", "unspecified", "3x3", "*"];
export const UNITS = ["", "probability", "Probability", "dimensionless", "logits", "L2-radius", "seconds"];

// License screening: strings, SPDX objects, key/name objects, copyleft pairs.
export const LICENSES = [
  null, "MIT", "mit", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "Apache-2.0",
  { spdx_id: "GPL-3.0" }, { key: "agpl-3.0" }, { name: "MIT License" },
];

// Property-test skeleton over exact, single-hop, and no-path pairs.
export const SYNTH_CASES = [
  { po: { kind: "tensor", semantics: "certified radius" }, ci: { kind: "tensor", semantics: "input field" } },
  { po: { kind: "tensor", name: "T" }, ci: { kind: "bound", name: "B" } },
  { po: { kind: "graph" }, ci: { kind: "claim" } },
];

// normSchema edge cases: non-objects, bad kinds, unspecified sentinels, overflow.
export const RAW_SCHEMAS = [
  null, 42, "x", [], {},
  { consumes: "nope", produces: [{ name: "p", kind: "tensor", shape: "unspecified", units: "unspecified", semantics: "s" }] },
  { produces: [{ kind: "not-a-kind" }, { kind: "bound", shape: "[n]", units: "L2" }, {}, { kind: "trace" }, { kind: "scalar" }], assumptions: [1, "two"], invariants: null },
  { consumes: [{ name: "a", kind: "tensor", shape: "[b,d]", units: "logits", semantics: "x" }, { kind: "z1" }, { kind: "z2" }, { kind: "z3" }, { kind: "z4" }], certifies: ["c1", 2], invariants: ["i"] },
];

// Literature classification boundaries around EMERGING (25) and KNOWN (300).
export const CLASSIFY_INPUTS = [null, 0, 24, 25, 26, 299, 300, 301, 5000];

// schema-v7 edge derivation corpora, each exercising specific edge types.
export const EDGE_CORPORA = {
  "readme-and-topic": [
    { id: "r1", name: "alpha", topics: ["opt"], stars: 10, mentionsRepos: ["beta"] },
    { id: "r2", name: "beta", topics: ["opt"], stars: 5 },
    { id: "r3", name: "gamma", topics: ["opt"], stars: 2 },
  ],
  "shared-dependency": [
    { id: "d1", name: "one", enriched: true, dependencies: ["ed25519", "blake3", "numpy"] },
    { id: "d2", name: "two", enriched: true, dependencies: ["ed25519", "blake3", "react"] },
    { id: "d3", name: "three", enriched: true, dependencies: ["ed25519"] },
  ],
  "naming-family-and-language": [
    { id: "f1", name: "core-engine", language: "Rust", stars: 9 },
    { id: "f2", name: "core-cli", language: "Rust", stars: 4 },
    { id: "f3", name: "core-docs", language: "Python", stars: 1 },
    { id: "f4", name: "unrelated", language: "Rust", stars: 7 },
  ],
  "empty": [],
};

// ---- (B) compile cases (frozen verifyCascade core) ------------------------

const port = (kind, extra = {}) => ({ name: kind[0], kind, shape: "unspecified", units: "unspecified", semantics: kind + " mechanism", ...extra });
const schema = (produces = [], consumes = []) => ({ produces, consumes, certifies: [], assumptions: ["assumption-x"], invariants: ["invariant-y"] });

export const COMPILE_CASES = [
  {
    // exact same-kind port pair → type_valid, PO-1 "≡", PO-5 axiomatic.
    caseId: "exact-shared-object",
    schemaA: schema([port("tensor", { semantics: "certified L2 radius" })]),
    schemaB: schema([], [port("tensor", { semantics: "input field" })]),
    model: { invariant: "unknown", metric: "unknown" },
    expect: { stage: "CONTRACT_ADMISSIBLE", pass: true, verdict: "type_valid", blockReason: "EVIDENCE_PENDING", code: null },
  },
  {
    // single axiomatic hop (tensor→dataset:materialize) → no curated precondition.
    caseId: "axiomatic-path",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("dataset")]),
    model: { invariant: "unknown", metric: "unknown" },
    expect: { stage: "CONTRACT_ADMISSIBLE", pass: true, verdict: "conversion_required", blockReason: "EVIDENCE_PENDING", code: null },
  },
  {
    // curated precondition left UNRESOLVED holds the bridge at TYPE_COMPOSABLE.
    caseId: "unresolved-precondition",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("distribution")]),
    model: { pre: "unknown", invariant: "unknown", metric: "unknown" },
    expect: { stage: "TYPE_COMPOSABLE", pass: true, verdict: "conversion_required", blockReason: "PRECONDITION_UNRESOLVED", code: null },
  },
  {
    // curated precondition REFUTED → path pruned, blockReason PRECONDITION_UNSATISFIED.
    caseId: "refuted-precondition",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("distribution")]),
    model: { pre: "violated", invariant: "unknown", metric: "unknown" },
    expect: { stage: "TYPE_COMPOSABLE", pass: true, verdict: "conversion_required", blockReason: "PRECONDITION_UNSATISFIED", code: null },
  },
  {
    // precondition satisfied but soft evidence pending → CONTRACT_ADMISSIBLE.
    caseId: "contract-admissible",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("distribution")]),
    model: { pre: "satisfied", invariant: "unknown", metric: "unknown" },
    expect: { stage: "CONTRACT_ADMISSIBLE", pass: true, verdict: "conversion_required", blockReason: "EVIDENCE_PENDING", code: null },
  },
  {
    // all obligations satisfied → EPISTEMICALLY_SUPPORTED, blockReason null.
    caseId: "epistemically-supported",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("distribution")]),
    model: { pre: "satisfied", invariant: "satisfied", metric: "satisfied" },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", pass: true, verdict: "conversion_required", blockReason: null, code: null },
  },
  {
    // exact kind path but contradictory units → PATH_FOUND, UNIT_CONTRADICTION.
    caseId: "unit-contradiction",
    schemaA: schema([port("tensor", { units: "probability" })]),
    schemaB: schema([], [port("tensor", { units: "seconds" })]),
    model: { invariant: "unknown", metric: "unknown" },
    expect: { stage: "PATH_FOUND", pass: false, verdict: "type_killed", blockReason: null, code: "UNIT_CONTRADICTION" },
  },
  {
    // lossy axiomatic hop (tensor→scalar:reduce) → PO-8, destroyedProperties.
    caseId: "lossy-path",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("scalar")]),
    model: { invariant: "unknown", metric: "unknown" },
    expect: { stage: "CONTRACT_ADMISSIBLE", pass: true, verdict: "conversion_required", blockReason: "EVIDENCE_PENDING", code: null },
  },
  {
    // ports exist but no admissible conversion (policy has no inbound rule) → NO_KIND_PATH.
    caseId: "no-kind-path",
    schemaA: schema([port("tensor")]),
    schemaB: schema([], [port("policy")]),
    model: {},
    expect: { stage: "PROPOSED", pass: false, verdict: "type_killed", blockReason: null, code: "NO_KIND_PATH" },
  },
  {
    // no output→input pairing between the mechanisms → NO_SHARED_PORTS.
    caseId: "no-shared-ports",
    schemaA: schema([], [port("tensor")]),
    schemaB: schema([], [port("tensor")]),
    model: {},
    expect: { stage: "PROPOSED", pass: false, verdict: "type_killed", blockReason: null, code: "NO_SHARED_PORTS" },
  },
  {
    // a mechanism schema is unavailable → NO_SCHEMA, fail-closed.
    caseId: "no-schema",
    schemaA: schema([port("tensor")]),
    schemaB: null,
    model: {},
    expect: { stage: "PROPOSED", pass: false, verdict: "type_killed", blockReason: null, code: "NO_SCHEMA" },
  },
];
