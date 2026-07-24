// Representative oracle inputs — the golden decision corpus.
//
// Covers the 25 required behavioral scenarios plus exhaustive/boundary
// sweeps over the pure kernel. Each case fixes the frozen source's two model
// boundaries as inputs: mechanism schemas are supplied directly, and soft
// judgments are injected via `model` (pre / preOverrides / invariant / metric).
//
// Kinds are chosen so the frozen planner yields the intended structure:
//   tensor→distribution : curated precondition (normalize), 3 competing paths
//   tensor→dataset      : single axiomatic hop
//   distribution→dataset: equal-cost tie (parameterize→materialize | sample→collect)
//   tensor→certificate  : two curated preconditions (threshold, wrap)
//   tensor→policy       : no admissible path (policy has no inbound rule)

const port = (kind, extra = {}) => ({ name: kind[0], kind, shape: "unspecified", units: "unspecified", semantics: kind + " mechanism", ...extra });
const schema = (produces = [], consumes = []) => ({ produces, consumes, certifies: [], assumptions: ["assumption-x"], invariants: ["invariant-y"] });
const allSat = { pre: "satisfied", invariant: "satisfied", metric: "satisfied" };
const evidencePending = { pre: "satisfied", invariant: "unknown", metric: "unknown" };

// ---- (A) pure kernel matrices --------------------------------------------

export const SHAPES = ["", "[batch,d]", "[BATCH,D]", "DAG", "dag", "scalar", "[n]", "any", "unspecified", "3x3", "*"];
export const UNITS = ["", "probability", "Probability", "dimensionless", "logits", "L2-radius", "seconds"];
export const LICENSES = [
  null, "MIT", "mit", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "Apache-2.0",
  { spdx_id: "GPL-3.0" }, { key: "agpl-3.0" }, { name: "MIT License" },
];
export const SYNTH_CASES = [
  { po: { kind: "tensor", semantics: "certified radius" }, ci: { kind: "tensor", semantics: "input field" } },
  { po: { kind: "tensor", name: "T" }, ci: { kind: "bound", name: "B" } },
  { po: { kind: "graph" }, ci: { kind: "claim" } },
];
export const RAW_SCHEMAS = [
  null, 42, "x", [], {},
  { consumes: "nope", produces: [{ name: "p", kind: "tensor", shape: "unspecified", units: "unspecified", semantics: "s" }] },
  { produces: [{ kind: "not-a-kind" }, { kind: "bound", shape: "[n]", units: "L2" }, {}, { kind: "trace" }, { kind: "scalar" }], assumptions: [1, "two"], invariants: null },
];
export const CLASSIFY_INPUTS = [null, 0, 24, 25, 26, 299, 300, 301, 5000];
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

// ---- (B) cascade cases (frozen verifyCascade steps 2-4) ------------------
// expect: { stage, verdict, block, code } — asserted by the harness so the
// frozen soft call's silent catch cannot yield a wrong fixture unnoticed.

export const CASCADE_CASES = [
  { caseId: "directly-compatible", category: "compatibility",
    input: { schemaA: schema([port("tensor", { semantics: "certified L2 radius" })]), schemaB: schema([], [port("tensor", { semantics: "input field" })]), model: allSat },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "type_valid", block: null, code: null } },

  { caseId: "incompatible", category: "compatibility",
    input: { schemaA: schema([], [port("tensor")]), schemaB: schema([], [port("tensor")]), model: {} },
    expect: { stage: "PROPOSED", verdict: "type_killed", block: null, code: "NO_SHARED_PORTS" } },

  { caseId: "single-conversion-path", category: "planning",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("dataset")]), model: evidencePending },
    expect: { stage: "CONTRACT_ADMISSIBLE", verdict: "conversion_required", block: "EVIDENCE_PENDING", code: null } },

  { caseId: "multiple-competing-paths", category: "planning",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: evidencePending },
    expect: { stage: "CONTRACT_ADMISSIBLE", verdict: "conversion_required", block: "EVIDENCE_PENDING", code: null } },

  { caseId: "equal-cost-path-tie", category: "planning",
    input: { schemaA: schema([port("distribution")]), schemaB: schema([], [port("dataset")]), model: evidencePending },
    expect: { stage: "CONTRACT_ADMISSIBLE", verdict: "conversion_required", block: "EVIDENCE_PENDING", code: null } },

  { caseId: "soft-precondition-satisfied", category: "preconditions",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: evidencePending },
    expect: { stage: "CONTRACT_ADMISSIBLE", verdict: "conversion_required", block: "EVIDENCE_PENDING", code: null } },

  { caseId: "soft-precondition-unresolved", category: "preconditions",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: { pre: "unknown", invariant: "unknown", metric: "unknown" } },
    expect: { stage: "TYPE_COMPOSABLE", verdict: "conversion_required", block: "PRECONDITION_UNRESOLVED", code: null } },

  { caseId: "soft-precondition-failed", category: "preconditions",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: { pre: "violated", invariant: "unknown", metric: "unknown" } },
    expect: { stage: "TYPE_COMPOSABLE", verdict: "conversion_required", block: "PRECONDITION_UNSATISFIED", code: null } },

  { caseId: "hard-incompatibility", category: "compatibility",
    input: { schemaA: schema([port("tensor", { units: "probability" })]), schemaB: schema([], [port("tensor", { units: "seconds" })]), model: {} },
    expect: { stage: "PATH_FOUND", verdict: "type_killed", block: null, code: "UNIT_CONTRADICTION" } },

  { caseId: "missing-conversion-rule", category: "compatibility",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("policy")]), model: {} },
    expect: { stage: "PROPOSED", verdict: "type_killed", block: null, code: "NO_KIND_PATH" } },

  { caseId: "no-schema", category: "compatibility",
    input: { schemaA: schema([port("tensor")]), schemaB: null, model: {} },
    expect: { stage: "PROPOSED", verdict: "type_killed", block: null, code: "NO_SCHEMA" } },

  // two curated preconditions (threshold, wrap): one satisfied, one unresolved
  { caseId: "partially-instantiated-obligations", category: "obligations",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("certificate")]),
             model: { preOverrides: { "scalar>bound:threshold": "satisfied", "bound>certificate:wrap": "unknown" }, invariant: "unknown", metric: "unknown" } },
    expect: { stage: "TYPE_COMPOSABLE", verdict: "conversion_required", block: "PRECONDITION_UNRESOLVED", code: null } },

  { caseId: "advancement-through-type-composable", category: "ladder",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: allSat },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "conversion_required", block: null, code: null } },

  // literature layer — same ladder stage, varying novelty class & prize
  { caseId: "lit-unexplored", category: "literature",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: allSat, litGround: true, litCount: 10 },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "conversion_required", block: null, code: null, litClass: "UNEXPLORED", finalVerdict: "PROMISING", prize: true } },

  { caseId: "lit-emerging", category: "literature",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: allSat, litGround: true, litCount: 100 },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "conversion_required", block: null, code: null, litClass: "EMERGING", finalVerdict: "EMERGING", prize: false } },

  { caseId: "lit-known", category: "literature",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: allSat, litGround: true, litCount: 5000 },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "conversion_required", block: null, code: null, litClass: "KNOWN", finalVerdict: "KNOWN", prize: false } },

  { caseId: "lit-unverified", category: "literature",
    input: { schemaA: schema([port("tensor")]), schemaB: schema([], [port("distribution")]), model: allSat, litGround: true, litCount: null },
    expect: { stage: "EPISTEMICALLY_SUPPORTED", verdict: "conversion_required", block: null, code: null, litClass: "UNVERIFIED", finalVerdict: "UNVERIFIED", prize: false } },
];

// Cross-case behavioral claims (checked by the harness): identical ladder
// outcome, differing literature layer — proves #15/#16 independence.
export const CROSS_CASE_CLAIMS = [
  { claim: "novelty-class-changes-without-ladder-change", a: "lit-unexplored", b: "lit-known", sameStage: true, differ: "finalVerdict" },
  { claim: "prize-candidacy-changes-without-ladder-change", a: "lit-unexplored", b: "lit-emerging", sameStage: true, differ: "prize" },
];

// ---- (C) serialization cases (frozen onFile / doExport) ------------------

const repo = (id, extra = {}) => ({ id, name: id, description: "", topics: [], language: null, stars: 0, updatedAt: "2026-01-01T00:00:00Z", defaultBranch: "main", dependencies: [], readme: "", fileTree: [], signalFiles: {}, mentionsRepos: [], enriched: false, ...extra });
const edge = (source, target) => ({ source, target, type: "manual", weight: 1, evidence: "e" });

export const IMPORT_CASES = [
  { caseId: "import-with-githubUser", category: "serialization",
    file: { schemaVersion: 7, githubUser: "octocat", repos: [repo("r1"), repo("r2")], edges: [edge("r1", "r2")],
            notes: [{ id: "n1", text: "hello" }, { text: "no-id-dropped" }],
            mechCalibration: [{ sourceKind: "tensor", targetKind: "bound", confirmed: 1 }, { sourceKind: "x-only" }],
            synthesisNodes: [{ id: "s1" }], manualLinks: [{ id: "m1" }], negatives: [{ id: "neg1" }],
            preregs: [{ id: "p1" }], prizeCandidates: [{ id: "c1" }], ledger: [{ cellName: "x" }], calibration: [{ id: "cal1" }] } },

  { caseId: "import-without-githubUser", category: "serialization",
    prior: { data: { githubUser: "previous-user", repos: [repo("old")], edges: [] } },
    file: { schemaVersion: 7, repos: [repo("r1")] } },

  { caseId: "import-repo-edge-roundtrip-edges-present", category: "serialization",
    file: { schemaVersion: 7, githubUser: "u", repos: [repo("r1"), repo("r2")], edges: [edge("r1", "r2")] } },

  { caseId: "import-edges-recomputed-when-absent", category: "serialization",
    file: { schemaVersion: 7, repos: [repo("a", { topics: ["t"], stars: 5 }), repo("b", { topics: ["t"], stars: 1, mentionsRepos: ["a"] })] } },

  { caseId: "import-unknown-extra-fields", category: "serialization",
    file: { schemaVersion: 7, repos: [repo("r1")], futureField: 1, extra: { nested: true }, weirdArray: [1, 2] } },

  { caseId: "import-empty-graph", category: "serialization",
    file: { schemaVersion: 7, repos: [] } },
];

export const MALFORMED_CASES = [
  { caseId: "malformed-missing-repos", category: "malformed", raw: JSON.stringify({ schemaVersion: 7 }) },
  { caseId: "malformed-repos-not-array", category: "malformed", raw: JSON.stringify({ repos: "nope" }) },
  { caseId: "malformed-not-json", category: "malformed", raw: "this is not json {" },
];

export const EXPORT_CASES = [
  { caseId: "export-sixteen-keys", category: "serialization", expectKeyCount: 16,
    state: { data: { githubUser: "octocat", repos: [repo("r1")], edges: [edge("r1", "r1")] },
             notes: { n1: "hello" }, negatives: [{ id: "neg1" }], candidates: [{ id: "c1" }],
             mechCal: { "tensor>bound": { sourceKind: "tensor", targetKind: "bound" } } } },

  { caseId: "export-fifteen-keys-githubUser-undefined", category: "serialization", expectKeyCount: 15,
    state: { data: { repos: [repo("r1")], edges: [] } } }, // githubUser undefined → elided

  { caseId: "export-drops-unknown-fields", category: "serialization", expectKeyCount: 16,
    state: { data: { githubUser: "u", repos: [repo("r1")], edges: [], unknownTopLevel: "should-not-appear", another: 42 } } },
];

// import → export, asserting repos/edges survive the round trip
export const ROUNDTRIP_CASES = [
  { caseId: "roundtrip-repo-edge", category: "serialization",
    file: { schemaVersion: 7, githubUser: "octocat", repos: [repo("r1"), repo("r2")], edges: [edge("r1", "r2")] } },
];
