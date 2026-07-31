// The mutation registry — one entry per semantic boundary the corpus claims
// to pin, in the implementation that claims to reproduce it.
//
// Each entry states, in both prose and executable form, what would be wrong if
// the rule were violated:
//
//   rule             the semantic obligation, in words
//   find/replace     the smallest edit to the Rust peer that violates it
//   expectedKillers  the corpus case(s) that must catch it
//   expectedFailure  a symbolic name for the violation, carried into the report
//   assert           a predicate over the MUTANT'S OWN OUTPUT that detects the
//                    predicted violation — this is what separates a real kill
//                    from an incidental hash change
//
// Adding a subsystem here means declaring what its rules are. A subsystem with
// no entry is reported as `not-assessed`, never as "zero mutants survived".

import { EDGE_CORPORA, EDGE_CORPORA_BOUNDARIES } from "../../test/oracle/cases.mjs";
import { MECH_KINDS } from "../../packages/cortex-kernel/src/types.js";

const MECH_KIND_SET = new Set(MECH_KINDS);

// The 17 cascade fixtures. Declaring them (C1) put nearly every deterministic
// subsystem genuinely upstream of them: the registry supplies the conversion
// topology the cascade plans over, edge cost ranks its options, the
// compatibility predicates feed PO-2/PO-3 and the risk term, schema
// normalization shapes its inputs, and literature classification decides its
// novelty class. So a mutation to any of those legitimately reaches cascade
// output. Declaring that reach is honest; pretending the boundary is narrower
// would make every one of these mutants report killed_incidentally.
const CASCADE = [
  "directly-compatible", "incompatible", "single-conversion-path", "multiple-competing-paths",
  "equal-cost-path-tie", "soft-precondition-satisfied", "soft-precondition-unresolved",
  "soft-precondition-failed", "hard-incompatibility", "missing-conversion-rule", "no-schema",
  "partially-instantiated-obligations", "advancement-through-type-composable",
  "lit-unexplored", "lit-emerging", "lit-known", "lit-unverified",
];

/** Corpus cases each subsystem's mutants may perturb. A mutant that escapes
 *  its scope means the subsystem boundary is not where we think it is. */
export const SUBSYSTEM_SCOPE = {
  "edge-derivation": ["compute-edges", "compute-edges-boundaries"],
  "compatibility": ["shape-compat", "shape-compat-boundaries", "unit-compat", ...CASCADE],
  "license-screening": ["license-compat", ...CASCADE],
  // `synth-test` belongs to another subsystem but is genuinely downstream: the
  // generated property-test skeleton embeds the SELECTED adapter, so a change
  // to path ranking or cost can reach it. Declaring it here is honest about the
  // coupling; individual mutants still narrow below it where they can, and only
  // three of the ten actually reach that far.
  "multipath-planning": ["multipath-kind-paths", "pair-compat", "synth-test", ...CASCADE],
  // Edge cost is shared the same way: published directly by `conv-rules` and
  // consumed by every planner decision.
  "edge-cost": ["conv-rules", "multipath-kind-paths", "pair-compat", "synth-test", ...CASCADE],
  // The conversion topology reaches every planner-derived case, and the kind
  // enumeration reaches everything that iterates or validates a kind. These
  // wide scopes are the honest ones: the propagation is real, and individual
  // mutants narrow below them where they can.
  "registry": ["conv-rules", "multipath-kind-paths", "pair-compat", "synth-test", ...CASCADE],
  "types": ["mech-kinds", "conv-rules", "multipath-kind-paths", "pair-compat", "norm-schema", "synth-test", ...CASCADE],
  "schema-normalization": ["norm-schema", ...CASCADE],
  "literature-classification": ["classify-lit", ...CASCADE],
  "property-test-skeleton": ["synth-test", ...CASCADE],
};

// Rules that no corpus can pin OVER THIS STATE SPACE, recorded rather than
// quietly omitted — unpinned-by-construction and unpinned-by-neglect look
// identical in a coverage number and are not the same finding.
//
// The claim is deliberately bounded. It is NOT "this rule is unreachable"; it
// is "no fixture over the v0.5.1 registry can reach it", measured. A future
// MAJOR registry version with more conversion rules could make the guard bind,
// at which point the measurement below changes and the entry must be revisited.
// So the finding is emitted with its evidence — the exhaustive search it rests
// on, and hashes of the two artifacts that determine the answer.

/** Replays uniform-cost search over the frozen registry, counting iterations. */
const measureSearchIterations = (kinds, rules, edgeCost) => {
  let max = 0, worst = null, pairs = 0;
  for (const from of kinds) for (const to of kinds) {
    pairs++;
    if (from === to) continue;
    const results = []; let pq = [[0, from, []]]; let iters = 0;
    while (pq.length && results.length < 3 && iters < 4000) {
      iters++;
      pq.sort((a, b) => a[0] - b[0]);
      const [c, node, path] = pq.shift();
      if (node === to) { results.push(c); continue; }
      if (path.length > 4) continue;
      for (const e of (rules[node] || [])) pq.push([c + edgeCost(e), e.to, path.concat([e])]);
    }
    if (iters > max) { max = iters; worst = `${from}>${to}`; }
  }
  return { max, worst, pairs };
};

export const unpinnableFindings = (kinds, rules, edgeCost, hashes) => {
  const m = measureSearchIterations(kinds, rules, edgeCost);
  return [{
    rule: "the 4000-iteration guard bounds uniform-cost search",
    subsystem: "multipath-planning",
    claim: "unreachable under the frozen v0.5.1 registry and this search state space — NOT universally unreachable",
    reason: "raising the limit is an equivalent mutation for this registry: search terminates far below it on every ordered pair. Reaching the guard would require additional conversion rules, which the frozen artifact forbids.",
    revisitWhen: "a MAJOR registry version adds conversion rules — re-run this measurement, because a denser graph can make the guard bind",
    evidence: {
      guardLimit: 4000,
      orderedPairsTested: m.pairs,
      measuredMaxIterations: m.max,
      worstPair: m.worst,
      headroomFactor: Math.round((4000 / m.max) * 10) / 10,
      method: "exhaustive replay of uniform-cost search over every ordered kind pair, counting queue pops",
      // The two artifacts that determine the answer: change either and the
      // measurement above is no longer the one that was made.
      ...hashes,
    },
  }];
};

/** Corpus inputs, so an assertion can reason about what the output SHOULD have
 *  been rather than only about what it is. */
export const CORPUS_INPUTS = {
  "compute-edges": EDGE_CORPORA,
  "compute-edges-boundaries": EDGE_CORPORA_BOUNDARIES,
};

// ---- compatibility helpers -------------------------------------------------
// shape-compat and unit-compat payloads are flat maps keyed "<a>|<b>" over the
// SHAPES / UNITS matrices, so an assertion can name a cell exactly.

const cell = (out, caseId, a, b) => (out[caseId] || {})[`${a}|${b}`];
/** Every ordered pair in a matrix payload, as [a, b, verdict]. */
const cells = (out, caseId) => Object.entries(out[caseId] || {})
  .map(([k, v]) => [...k.split("|"), v]);
/** license-compat payloads are a list of { a, b, out: { status, detail } }. */
const licRows = (out) => out["license-compat"] || [];
const licKey = (l) => (l == null ? null : String(typeof l === "object" ? (l.spdx_id || l.key || l.name) : l).toLowerCase());
const isCopyleft = (k) => k != null && ["gpl", "agpl", "lgpl"].some((c) => k.includes(c));

const UBIQUITOUS = new Set(["react", "typescript", "numpy", "requests", "lodash", "express",
  "jest", "pytest", "eslint", "prettier", "webpack", "vite", "axios", "scipy", "pandas"]);

// ---- assertion helpers -----------------------------------------------------
// `out` is { caseId → { corpusName → edge[] } }; `inp` mirrors it with inputs.

const allEdges = (out) => Object.values(out).flatMap((corpora) => Object.values(corpora).flat());
const edgesOf = (out, caseId, corpus) => ((out[caseId] || {})[corpus] || []);
const ofType = (out, type) => allEdges(out).filter((e) => e.type === type);
/** A group's members are the hub (every edge's source) plus every target. */
const hubIsTopStarred = (edges, repos) => {
  if (!edges.length) return true;
  const byId = new Map(repos.map((r) => [r.id, r]));
  const hub = byId.get(edges[0].source);
  if (!hub) return true;
  const members = [hub, ...edges.map((e) => byId.get(e.target))].filter(Boolean);
  return (hub.stars || 0) === Math.max(...members.map((r) => r.stars || 0));
};

// ---- planner helpers -------------------------------------------------------
// multipath-kind-paths: { "a>b": [{ path, exact, cost }] }
// pair-compat:          { "a>b": { compatibility, options, adapter, lossy, cost } }
// conv-rules:           { registry: { from: [rule] }, edgeCosts: { ruleId: n } }

const paths = (out) => out["multipath-kind-paths"] || {};
const pairs = (out) => out["pair-compat"] || {};
const allOptionLists = (out) => Object.values(paths(out));
const rulesWithCost = (out) => {
  const d = out["conv-rules"] || {};
  return Object.entries(d.registry || {}).flatMap(([from, rs]) =>
    rs.map((r) => ({ ...r, from, cost: (d.edgeCosts || {})[`${from}>${r.to}:${r.op}`] })));
};

// ---- remaining deterministic helpers ---------------------------------------
const kinds = (out) => (out["mech-kinds"] || {}).kinds || [];
const registryOf = (out) => (out["conv-rules"] || {}).registry || {};
const flatRules = (out) => Object.entries(registryOf(out)).flatMap(([from, rs]) => rs.map((r) => ({ ...r, from })));
const normRows = (out) => out["norm-schema"] || [];
const litRows = (out) => out["classify-lit"] || [];
const synthRows = (out) => out["synth-test"] || [];
const allPorts = (out) => normRows(out).flatMap((r) => [...((r.out || {}).consumes || []), ...((r.out || {}).produces || [])]);

export const MUTATIONS = [
  // ---- registry: conversion topology --------------------------------------
  {
    id: "registry-drop-a-rule",
    subsystem: "registry",
    rule: "the conversion registry contains exactly the frozen rule set — a missing edge silently removes reachability",
    find: 'r("dataset", "materialize", AX, None, None, None),',
    replace: "",
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "CONVERSION_RULE_MISSING",
    assert: (out) => !flatRules(out).some((r) => r.from === "tensor" && r.to === "dataset" && r.op === "materialize"),
  },
  {
    id: "registry-alter-endpoint",
    subsystem: "registry",
    rule: "each rule's target kind is part of the contract — retargeting rewires the graph without changing its size",
    find: 'r("measurement", "observe", CUR, Some("tensor is an observable quantity"), None, None),',
    replace: 'r("policy", "observe", CUR, Some("tensor is an observable quantity"), None, None),',
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "RULE_ENDPOINT_RETARGETED",
    assert: (out) => flatRules(out).some((r) => r.from === "tensor" && r.op === "observe" && r.to !== "measurement"),
  },
  {
    id: "registry-reorder-rules",
    subsystem: "registry",
    rule: "rule order within a source kind is observable — it feeds enumeration order and every tie-break",
    find: `r("distribution", "normalize", CUR, Some("nonneg & normalizable to unit mass"), None, Some(&["scale"])),
            r("measurement", "observe", CUR, Some("tensor is an observable quantity"), None, None),`,
    replace: `r("measurement", "observe", CUR, Some("tensor is an observable quantity"), None, None),
            r("distribution", "normalize", CUR, Some("nonneg & normalizable to unit mass"), None, Some(&["scale"])),`,
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules"],
    expectedFailure: "RULE_ORDER_CHANGED",
    assert: (out) => ((registryOf(out).tensor || [])[0] || {}).to !== "distribution",
  },
  {
    id: "registry-shadow-duplicate-rule",
    subsystem: "registry",
    rule: "no source kind carries a duplicate rule — a shadowed edge inflates enumeration and can win a tie it should not contest",
    find: 'r("dataset", "materialize", AX, None, None, None),\n        ]),',
    replace: 'r("dataset", "materialize", AX, None, None, None),\n            r("dataset", "materialize", AX, None, None, None),\n        ]),',
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths"],
    expectedFailure: "DUPLICATE_RULE_SHADOWED",
    assert: (out) => {
      const ids = flatRules(out).map((r) => `${r.from}>${r.to}:${r.op}`);
      return new Set(ids).size !== ids.length;
    },
  },
  {
    id: "registry-flip-authority",
    subsystem: "registry",
    rule: "each rule's authority class is part of the contract — an axiomatic rule is not a curated one",
    find: 'r("scalar", "reduce", AX, None, Some(true), Some(&["structure"])),',
    replace: 'r("scalar", "reduce", CUR, None, Some(true), Some(&["structure"])),',
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "RULE_AUTHORITY_RECLASSIFIED",
    assert: (out) => flatRules(out).some((r) => r.from === "tensor" && r.op === "reduce" && (r.auth || "cur") !== "ax"),
  },

  // ---- types: the kind enumeration ----------------------------------------
  {
    id: "types-drop-a-kind",
    subsystem: "types",
    rule: "the mechanism kind set is exactly sixteen members — dropping one removes it from every matrix and from schema validation",
    // The array is fixed-size, so the length annotation moves with the member.
    find: '[&str; 16] = [\n    "tensor", "scalar", "distribution", "graph", "subgraph", "bound", "certificate",\n    "proof_term", "constraint_set", "optimization_problem", "program", "trace",\n    "dataset", "policy", "claim", "measurement",\n];',
    replace: '[&str; 15] = [\n    "tensor", "scalar", "distribution", "graph", "subgraph", "bound", "certificate",\n    "proof_term", "constraint_set", "optimization_problem", "program", "trace",\n    "dataset", "policy", "claim",\n];',
    expectedOccurrences: 1,
    expectedKillers: ["mech-kinds", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "KIND_MISSING_FROM_ENUMERATION",
    assert: (out) => kinds(out).length !== 16,
  },
  {
    id: "types-reorder-kinds",
    subsystem: "types",
    // Only `mech-kinds` can pin this. The planner matrices are OBJECTS keyed
    // "a>b", and canonicalization sorts keys by design — so reordering the
    // enumeration is invisible to them. Order is observable only where the
    // corpus emits an array. The battery reported this rather than letting the
    // wider expectedKillers stand as an unearned claim.
    rule: "kind order is observable — it fixes the enumeration and every array the corpus emits from it",
    find: '"tensor", "scalar", "distribution", "graph", "subgraph", "bound", "certificate",',
    replace: '"scalar", "tensor", "distribution", "graph", "subgraph", "bound", "certificate",',
    expectedOccurrences: 1,
    scope: ["mech-kinds"],
    expectedKillers: ["mech-kinds"],
    expectedFailure: "KIND_ORDER_CHANGED",
    assert: (out) => kinds(out)[0] !== "tensor",
  },
  {
    id: "types-rename-a-kind",
    subsystem: "types",
    rule: "kind spelling is the wire contract — `proof_term` is not `proofTerm`",
    find: '"proof_term", "constraint_set", "optimization_problem", "program", "trace",',
    replace: '"proofTerm", "constraint_set", "optimization_problem", "program", "trace",',
    expectedOccurrences: 1,
    expectedKillers: ["mech-kinds", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "KIND_RESPELLED",
    assert: (out) => !kinds(out).includes("proof_term"),
  },

  // ---- schema normalization -----------------------------------------------
  {
    id: "norm-widen-port-cap",
    subsystem: "schema-normalization",
    rule: "each port list is truncated to four entries",
    // Anchored to normSchema's port loop: the cascade code introduced further
    // `.take(4)` sites, so the bare fragment no longer isolates this boundary.
    find: "J::A(items.iter().take(4).map(|p| {",
    replace: "J::A(items.iter().take(5).map(|p| {",
    expectedOccurrences: 1,
    expectedKillers: ["norm-schema"],
    expectedFailure: "PORT_CAP_WIDENED",
    assert: (out) => normRows(out).some((r) => (((r.out || {}).consumes || []).length > 4 || ((r.out || {}).produces || []).length > 4)),
  },
  {
    id: "norm-unknown-kind-default",
    subsystem: "schema-normalization",
    rule: "an unrecognised kind fails CLOSED to `claim`, never to the value supplied",
    find: 'Some(k) if MECH_KINDS.contains(&k) => k,\n                _ => "claim",',
    replace: 'Some(k) if MECH_KINDS.contains(&k) => k,\n                Some(k) => k,\n                _ => "claim",',
    expectedOccurrences: 1,
    expectedKillers: ["norm-schema"],
    expectedFailure: "UNKNOWN_KIND_PASSED_THROUGH",
    assert: (out) => allPorts(out).some((p) => p.kind && !MECH_KIND_SET.has(p.kind)),
  },
  {
    id: "norm-keep-unspecified",
    subsystem: "schema-normalization",
    rule: "the literal `unspecified` collapses to the empty string — it is absence, not a value",
    find: 'Some(x) if !x.is_empty() && x != "unspecified" => x.to_string(),',
    replace: "Some(x) if !x.is_empty() => x.to_string(),",
    expectedOccurrences: 1,
    expectedKillers: ["norm-schema"],
    expectedFailure: "UNSPECIFIED_RETAINED_AS_VALUE",
    assert: (out) => allPorts(out).some((p) => p.shape === "unspecified" || p.units === "unspecified"),
  },
  {
    id: "norm-accept-non-object",
    subsystem: "schema-normalization",
    rule: "a non-object schema normalizes to null — arrays are accepted only because JavaScript calls them objects",
    find: "if !is_objectish { return J::Null; }",
    replace: "if false { return J::Null; }",
    expectedOccurrences: 1,
    expectedKillers: ["norm-schema"],
    expectedFailure: "NON_OBJECT_SCHEMA_NORMALIZED",
    assert: (out) => normRows(out).some((r) => (r.in === null || typeof r.in !== "object") && r.out !== null),
  },

  // ---- literature classification ------------------------------------------
  {
    id: "lit-known-threshold",
    subsystem: "literature-classification",
    rule: "a count is KNOWN only ABOVE 300 — 300 itself is EMERGING",
    find: "Some(c) if c > LIT_KNOWN => \"KNOWN\",",
    replace: "Some(c) if c >= LIT_KNOWN => \"KNOWN\",",
    expectedOccurrences: 1,
    expectedKillers: ["classify-lit"],
    expectedFailure: "KNOWN_BOUNDARY_INCLUSIVE",
    assert: (out) => litRows(out).some((r) => r.in === 300 && r.out !== "EMERGING"),
  },
  {
    id: "lit-emerging-threshold",
    subsystem: "literature-classification",
    rule: "a count is EMERGING at 25 and above — the lower boundary is inclusive",
    find: "Some(c) if c >= LIT_EMERGING => \"EMERGING\",",
    replace: "Some(c) if c > LIT_EMERGING => \"EMERGING\",",
    expectedOccurrences: 1,
    expectedKillers: ["classify-lit"],
    expectedFailure: "EMERGING_BOUNDARY_EXCLUSIVE",
    assert: (out) => litRows(out).some((r) => r.in === 25 && r.out !== "EMERGING"),
  },
  {
    id: "lit-absent-count",
    subsystem: "literature-classification",
    rule: "an absent count is UNVERIFIED — never UNEXPLORED, which would assert the literature was checked and found empty",
    find: 'None => "UNVERIFIED",',
    replace: 'None => "UNEXPLORED",',
    expectedOccurrences: 1,
    expectedKillers: ["classify-lit"],
    expectedFailure: "ABSENT_COUNT_REPORTED_AS_SEARCHED",
    assert: (out) => litRows(out).some((r) => r.in === null && r.out !== "UNVERIFIED"),
  },

  // ---- property-test skeleton ---------------------------------------------
  {
    id: "synth-drop-adapter-composition",
    subsystem: "property-test-skeleton",
    rule: "the generated harness composes the SELECTED adapter's operations around the sample",
    find: "for s in adapter { expr = format!(\"{}({})\", s.op, expr); }",
    replace: "for _s in adapter { }",
    expectedOccurrences: 1,
    expectedKillers: ["synth-test"],
    expectedFailure: "ADAPTER_NOT_COMPOSED_INTO_HARNESS",
    assert: (out) => synthRows(out).some((r) => /const y = x;/.test(r.out)),
  },
  {
    id: "synth-alter-template",
    subsystem: "property-test-skeleton",
    rule: "the harness text is observable output, not a comment — its wording is part of the contract",
    // The deterministic surface and the cascade share one template site, so the
    // scope is every declared case that emits a harness. The four cascade cases
    // omitted here reach no adapter chain and emit no synthTest at all; they are
    // the controls that must stay reproducing.
    scope: ["synth-test", "directly-compatible", "single-conversion-path", "multiple-competing-paths",
      "equal-cost-path-tie", "soft-precondition-satisfied", "soft-precondition-unresolved",
      "soft-precondition-failed", "partially-instantiated-obligations", "advancement-through-type-composable",
      "lit-unexplored", "lit-emerging", "lit-known", "lit-unverified"],
    find: "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\\nproperty(",
    replace: "// generated property-test harness\\nproperty(",
    expectedOccurrences: 1,
    expectedKillers: ["synth-test"],
    expectedFailure: "HARNESS_TEMPLATE_ALTERED",
    assert: (out) => synthRows(out).some((r) => !/RunPack for a real backend/.test(r.out)),
  },

  // ---- planner: multipath search ------------------------------------------
  {
    id: "planner-descending-cost-order",
    subsystem: "multipath-planning",
    rule: "retained paths are ordered by ascending cumulative risk — the cheapest is selected",
    find: "pq.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());",
    replace: "pq.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());",
    expectedOccurrences: 1,
    expectedKillers: ["multipath-kind-paths", "pair-compat"],
    expectedFailure: "PATHS_NOT_RISK_ASCENDING",
    assert: (out) => allOptionLists(out).some((o) => o.some((x, i) => i > 0 && x.cost < o[i - 1].cost)),
  },
  {
    id: "planner-unstable-tie-order",
    subsystem: "multipath-planning",
    rule: "equal-cost candidates keep insertion order — the sort must be stable",
    find: "pq.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());",
    replace: "pq.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap().then(b.1.cmp(&a.1)));",
    expectedOccurrences: 1,
    expectedKillers: ["multipath-kind-paths", "pair-compat"],
    expectedFailure: "TIED_PATHS_REORDERED",
    // 24 pairs return equal-cost options; breaking the tie by node name changes
    // which of them is selected, so the chosen adapter's first rule moves.
    assert: (out, inp, ref) => Object.entries(pairs(out)).some(([k, v]) => {
      const r = (ref["pair-compat"] || {})[k];
      return r && r.adapter && v.adapter && v.cost === r.cost
        && JSON.stringify(v.adapter) !== JSON.stringify(r.adapter);
    }),
  },
  {
    id: "planner-widen-depth-cap",
    subsystem: "multipath-planning",
    scope: ["multipath-kind-paths", "pair-compat"],
    rule: "search abandons a partial path once it exceeds four steps",
    find: "if path.len() > 4 { continue; }",
    replace: "if path.len() > 5 { continue; }",
    expectedOccurrences: 1,
    expectedKillers: ["multipath-kind-paths", "pair-compat"],
    expectedFailure: "PATH_LONGER_THAN_DEPTH_CAP_RETAINED",
    // Goal acceptance precedes the cap, so cap=4 admits length-5 paths and no
    // more. A length-6 path can only exist if the cap itself moved.
    assert: (out) => allOptionLists(out).some((o) => o.some((x) => x.path.length > 5)),
  },
  {
    id: "planner-cap-before-goal",
    subsystem: "multipath-planning",
    rule: "a node is accepted as the goal BEFORE the depth cap is applied, so a five-step path is reachable",
    find: "if node == to { results.push(PathResult { path, exact: false, cost: c }); continue; }\n        if path.len() > 4 { continue; }",
    replace: "if path.len() > 4 { continue; }\n        if node == to { results.push(PathResult { path, exact: false, cost: c }); continue; }",
    expectedOccurrences: 1,
    expectedKillers: ["multipath-kind-paths", "pair-compat"],
    expectedFailure: "FIVE_STEP_PATHS_ELIMINATED",
    // 124 length-5 paths exist in the corpus; reordering the two tests removes
    // every one of them.
    assert: (out) => !allOptionLists(out).some((o) => o.some((x) => x.path.length === 5)),
  },
  {
    id: "planner-retain-four-paths",
    subsystem: "multipath-planning",
    rule: "search retains the top three lowest-risk paths, not more",
    find: "let rs = adapters_for(&rules, a, b, 3);",
    replace: "let rs = adapters_for(&rules, a, b, 4);",
    expectedOccurrences: 1,
    scope: ["multipath-kind-paths"],
    expectedKillers: ["multipath-kind-paths"],
    expectedFailure: "MORE_THAN_THREE_PATHS_RETAINED",
    // 124 pairs have a fourth viable path, so the cap genuinely binds.
    assert: (out) => allOptionLists(out).some((o) => o.length > 3),
  },
  {
    id: "planner-impossibility-not-preserved",
    subsystem: "multipath-planning",
    scope: ["pair-compat"],
    rule: "a pair with no path is `incompatible` with sentinel cost 99 — impossibility is retained as data",
    find: '("adapter", J::Null), ("lossy", J::B(false)), ("cost", J::N(99.0)),',
    replace: '("adapter", J::Null), ("lossy", J::B(false)), ("cost", J::N(0.0)),',
    expectedOccurrences: 1,
    expectedKillers: ["pair-compat"],
    expectedFailure: "IMPOSSIBILITY_SENTINEL_LOST",
    // 56 of the 240 ordered pairs are structurally impossible.
    assert: (out) => Object.values(pairs(out)).some((v) => v.compatibility === "incompatible" && v.cost !== 99),
  },
  {
    id: "planner-goal-marked-exact",
    subsystem: "multipath-planning",
    rule: "only the identity pair is `exact`; a converted pair is `convertible`",
    find: "if node == to { results.push(PathResult { path, exact: false, cost: c }); continue; }",
    replace: "if node == to { results.push(PathResult { path, exact: true, cost: c }); continue; }",
    expectedOccurrences: 1,
    expectedKillers: ["multipath-kind-paths", "pair-compat"],
    expectedFailure: "CONVERTED_PAIR_REPORTED_EXACT",
    assert: (out) => Object.values(pairs(out)).some((v) => v.compatibility === "exact" && (v.adapter || []).length > 0),
  },

  // ---- edge cost -----------------------------------------------------------
  {
    id: "cost-remove-lossy-penalty",
    subsystem: "edge-cost",
    rule: "a lossy conversion costs two more than a lossless one",
    find: "1.0 + if e.lossy.unwrap_or(false) { 2.0 } else { 0.0 }",
    replace: "1.0 + if e.lossy.unwrap_or(false) { 0.0 } else { 0.0 }",
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "LOSSY_PENALTY_REMOVED",
    assert: (out) => rulesWithCost(out).some((r) => r.lossy && r.cost < 3),
  },
  {
    id: "cost-remove-curated-penalty",
    subsystem: "edge-cost",
    rule: "a curated rule costs one more than an axiomatic one — authority is priced",
    find: 'if e.auth.unwrap_or("cur") == "cur" { 1.0 } else { 0.0 }',
    replace: 'if e.auth.unwrap_or("cur") == "cur" { 0.0 } else { 0.0 }',
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "CURATED_AUTHORITY_UNPRICED",
    assert: (out) => rulesWithCost(out).some((r) => (r.auth || "cur") === "cur" && !r.lossy
      && r.cost === 1 + 0.5 * ((r.lose || []).length)),
  },
  {
    id: "cost-remove-destroyed-penalty",
    subsystem: "edge-cost",
    rule: "each destroyed property adds half a unit of risk",
    find: "(e.lose.map(|l| l.len()).unwrap_or(0) as f64) * 0.5",
    replace: "(e.lose.map(|l| l.len()).unwrap_or(0) as f64) * 0.0",
    expectedOccurrences: 1,
    expectedKillers: ["conv-rules", "multipath-kind-paths", "pair-compat"],
    expectedFailure: "DESTROYED_PROPERTIES_UNPRICED",
    assert: (out) => rulesWithCost(out).some((r) => (r.lose || []).length > 0
      && r.cost === 1 + (r.lossy ? 2 : 0) + ((r.auth || "cur") === "cur" ? 1 : 0)),
  },

  // ---- compatibility: shape ------------------------------------------------
  {
    id: "shape-fail-open-on-absent",
    subsystem: "compatibility",
    rule: "an absent shape is unresolved — never proved. The predicate fails closed",
    find: 'fn shape_compat(a: &str, b: &str) -> &\'static str {\n    if a.is_empty() || b.is_empty() { return "unresolved"; }',
    replace: 'fn shape_compat(a: &str, b: &str) -> &\'static str {\n    if a.is_empty() || b.is_empty() { return "proved"; }',
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat"],
    expectedFailure: "ABSENT_SHAPE_PROVED",
    assert: (out) => cells(out, "shape-compat").some(([a, b, v]) => (a === "" || b === "") && v === "proved"),
  },
  {
    id: "shape-invert-predicate",
    subsystem: "compatibility",
    rule: "matching or wildcard shapes are proved; anything else is unresolved",
    find: 'if x == y || wild(&x) || wild(&y) { "proved" } else { "unresolved" }',
    replace: 'if x == y || wild(&x) || wild(&y) { "unresolved" } else { "proved" }',
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat"],
    expectedFailure: "SHAPE_VERDICT_INVERTED",
    assert: (out) => cell(out, "shape-compat", "scalar", "scalar") !== "proved",
  },
  {
    id: "shape-require-both-wildcards",
    subsystem: "compatibility",
    rule: "a wildcard on EITHER side is enough to prove shape compatibility",
    find: "if x == y || wild(&x) || wild(&y)",
    replace: "if x == y || (wild(&x) && wild(&y))",
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat"],
    expectedFailure: "ONE_SIDED_WILDCARD_REJECTED",
    // "any" is a wildcard, "3x3" is not: the pair must still be proved.
    assert: (out) => cell(out, "shape-compat", "any", "3x3") !== "proved",
  },
  {
    id: "shape-drop-batch-wildcard-token",
    subsystem: "compatibility",
    scope: ["shape-compat"],
    rule: "`batch` is one of the underspecified shape tokens that count as a wildcard",
    find: 'for p in ["any", "var", "dynamic", "batch", "unspecified"]',
    replace: 'for p in ["any", "var", "dynamic", "unspecified"]',
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat"],
    expectedFailure: "BATCH_NO_LONGER_WILDCARD",
    assert: (out) => cell(out, "shape-compat", "[batch,d]", "3x3") !== "proved",
  },
  {
    id: "shape-n-ignores-word-boundary",
    subsystem: "compatibility",
    scope: ["shape-compat-boundaries"],
    rule: "a standalone `n` is a wildcard; an `n` inside a longer word is not",
    find: "let before_ok = i == 0 || !is_word(chars[i - 1]);",
    replace: "let before_ok = true;",
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat-boundaries"],
    expectedFailure: "EMBEDDED_N_TREATED_AS_WILDCARD",
    // "3n" ends in `n` preceded by a digit: the trailing edge is a boundary but the
    // leading one is not, so only the BEFORE half of the rule can reject it.
    assert: (out) => cell(out, "shape-compat-boundaries", "3n", "3x3") === "proved",
  },

  {
    id: "shape-drop-question-wildcard",
    subsystem: "compatibility",
    scope: ["shape-compat-boundaries"],
    rule: "`?` is a wildcard character, exactly as `*` is",
    find: "if l.contains('*') || l.contains('?') { return true; }",
    replace: "if l.contains('*') { return true; }",
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat-boundaries"],
    expectedFailure: "QUESTION_MARK_NOT_A_WILDCARD",
    assert: (out) => cell(out, "shape-compat-boundaries", "?", "3x3") !== "proved",
  },
  {
    id: "shape-drop-trim",
    subsystem: "compatibility",
    scope: ["shape-compat-boundaries"],
    rule: "surrounding whitespace is trimmed before shapes are compared",
    find: "let x = a.trim().to_lowercase();\n    let y = b.trim().to_lowercase();\n    if x == y || wild",
    replace: "let x = a.to_lowercase();\n    let y = b.to_lowercase();\n    if x == y || wild",
    expectedOccurrences: 1,
    expectedKillers: ["shape-compat-boundaries"],
    expectedFailure: "UNTRIMMED_SHAPE_NOT_MATCHED",
    assert: (out) => cell(out, "shape-compat-boundaries", " dag ", "dag") !== "proved",
  },

  // ---- compatibility: units ------------------------------------------------
  {
    id: "unit-fail-open-on-absent",
    subsystem: "compatibility",
    rule: "an absent unit is unresolved — never proved",
    find: 'fn unit_compat(a: &str, b: &str) -> &\'static str {\n    if a.is_empty() || b.is_empty() { return "unresolved"; }',
    replace: 'fn unit_compat(a: &str, b: &str) -> &\'static str {\n    if a.is_empty() || b.is_empty() { return "proved"; }',
    expectedOccurrences: 1,
    expectedKillers: ["unit-compat"],
    expectedFailure: "ABSENT_UNIT_PROVED",
    assert: (out) => cells(out, "unit-compat").some(([a, b, v]) => (a === "" || b === "") && v === "proved"),
  },
  {
    id: "unit-drop-contradiction",
    subsystem: "compatibility",
    // `hard-incompatibility` is the cascade fixture whose entire subject is a
    // unit contradiction, so this rule governs it too: perturbing it is the
    // mutation working, not leaking. The other 28 declared cases stay controls.
    scope: ["unit-compat", "hard-incompatibility"],
    rule: "two different, non-dimensionless units are REFUTED — a contradiction, not merely unproven",
    find: 'if x == "dimensionless" || y == "dimensionless" { return "unresolved"; }\n    "refuted"',
    replace: 'if x == "dimensionless" || y == "dimensionless" { return "unresolved"; }\n    "unresolved"',
    expectedOccurrences: 1,
    expectedKillers: ["unit-compat"],
    expectedFailure: "UNIT_CONTRADICTION_DOWNGRADED",
    assert: (out) => !cells(out, "unit-compat").some(([, , v]) => v === "refuted"),
  },
  {
    id: "unit-dimensionless-proves",
    subsystem: "compatibility",
    scope: ["unit-compat"],
    rule: "dimensionless against a real unit is unresolved, not proved — it carries no dimensional claim",
    find: 'if x == "dimensionless" || y == "dimensionless" { return "unresolved"; }',
    replace: 'if x == "dimensionless" || y == "dimensionless" { return "proved"; }',
    expectedOccurrences: 1,
    expectedKillers: ["unit-compat"],
    expectedFailure: "DIMENSIONLESS_TREATED_AS_MATCH",
    assert: (out) => cell(out, "unit-compat", "dimensionless", "logits") === "proved",
  },
  {
    id: "unit-case-sensitive",
    subsystem: "compatibility",
    scope: ["unit-compat"],
    rule: "unit comparison is case-insensitive: `Probability` and `probability` are the same unit",
    find: 'let y = b.trim().to_lowercase();\n    if x == y { return "proved"; }',
    replace: 'let y = b.trim().to_string();\n    if x == y { return "proved"; }',
    expectedOccurrences: 1,
    expectedKillers: ["unit-compat"],
    expectedFailure: "UNIT_CASE_DISTINGUISHED",
    assert: (out) => cell(out, "unit-compat", "probability", "Probability") !== "proved",
  },

  // ---- license screening ---------------------------------------------------
  {
    id: "license-fail-open-on-absent",
    subsystem: "license-screening",
    rule: "absent license metadata is UNRESOLVED — screening never proves what it cannot see",
    find: '_ => obj(vec![\n            ("status", J::s("UNRESOLVED")),',
    replace: '_ => obj(vec![\n            ("status", J::s("PROVED")),',
    expectedOccurrences: 1,
    expectedKillers: ["license-compat"],
    expectedFailure: "ABSENT_LICENSE_PROVED",
    assert: (out) => licRows(out).some((r) => (licKey(r.a) === null || licKey(r.b) === null) && r.out.status === "PROVED"),
  },
  {
    id: "license-flag-identical-copyleft",
    subsystem: "license-screening",
    rule: "only DISTINCT copyleft licenses need review; the same licence on both sides combines freely",
    find: "if copyleft(x) && copyleft(y) && x != y",
    replace: "if copyleft(x) && copyleft(y)",
    expectedOccurrences: 1,
    expectedKillers: ["license-compat"],
    expectedFailure: "IDENTICAL_COPYLEFT_FLAGGED",
    assert: (out) => licRows(out).some((r) => licKey(r.a) && licKey(r.a) === licKey(r.b)
      && isCopyleft(licKey(r.a)) && r.out.status !== "PROVED"),
  },
  {
    id: "license-copyleft-exact-match",
    subsystem: "license-screening",
    rule: "copyleft is detected by SUBSTRING, so `gpl-3.0` and `agpl-3.0` are both copyleft",
    find: '["gpl", "agpl", "lgpl"].iter().any(|c| s.contains(c))',
    replace: '["gpl", "agpl", "lgpl"].iter().any(|c| s == *c)',
    expectedOccurrences: 1,
    expectedKillers: ["license-compat"],
    expectedFailure: "VERSIONED_COPYLEFT_UNDETECTED",
    assert: (out) => licRows(out).some((r) => isCopyleft(licKey(r.a)) && isCopyleft(licKey(r.b))
      && licKey(r.a) !== licKey(r.b) && r.out.status === "PROVED"),
  },

  // ---- edge derivation -----------------------------------------------------
  {
    id: "disable-ubiquitous-filter",
    subsystem: "edge-derivation",
    rule: "shared-dependency ignores dependencies too common to carry signal",
    find: " && !UBIQUITOUS.contains(&d.as_str())",
    replace: "",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "UBIQUITOUS_DEPENDENCY_COUNTED_AS_SHARED",
    assert: (out) => ofType(out, "shared-dependency")
      .some((e) => e.evidence.replace(/^deps: /, "").split(", ").some((d) => UBIQUITOUS.has(d))),
  },
  {
    id: "permit-self-edges",
    subsystem: "edge-derivation",
    rule: "readme-reference never links a repository to itself by name",
    find: "if *bn != a.name {",
    replace: "if true {",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "SELF_EDGE_EMITTED",
    assert: (out) => allEdges(out).some((e) => e.source === e.target),
  },
  {
    id: "ascending-star-order",
    subsystem: "edge-derivation",
    rule: "a group hub is its highest-starred member",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "a.stars.partial_cmp(&b.stars).unwrap()",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges", "compute-edges-boundaries"],
    expectedFailure: "GROUP_HUB_IS_NOT_TOP_STARRED",
    assert: (out, inp) => Object.entries(out).some(([caseId, corpora]) =>
      Object.entries(corpora).some(([name, edges]) => {
        const repos = (inp[caseId] || {})[name];
        return repos ? ["shared-topic", "naming-family", "shared-language"]
          .some((t) => !hubIsTopStarred(edges.filter((e) => e.type === t), repos)) : false;
      })),
  },
  {
    id: "unstable-tie-ordering",
    subsystem: "edge-derivation",
    rule: "equal-star members keep corpus order — the sort must be stable",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "b.stars.partial_cmp(&a.stars).unwrap().then(b.id.cmp(&a.id))",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "TIED_MEMBERS_REORDERED",
    // z1/z2/z3 all hold 5 stars, so the hub must be z1 — first in corpus order.
    assert: (out) => {
      const e = edgesOf(out, "compute-edges-boundaries", "star-ties");
      return e.length > 0 && e[0].source !== "z1";
    },
  },
  {
    id: "widen-language-bound",
    subsystem: "edge-derivation",
    rule: "shared-language is a weak signal, so groups above 14 members are skipped entirely",
    find: "g.len() > 14",
    replace: "g.len() > 15",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "OVERSIZED_LANGUAGE_GROUP_LINKED",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "language-group-over-bound").length > 0,
  },
  {
    id: "widen-family-bound",
    subsystem: "edge-derivation",
    rule: "naming-family groups above 30 members are skipped entirely",
    find: "g.len() > 30",
    replace: "g.len() > 31",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "OVERSIZED_FAMILY_GROUP_LINKED",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "family-group-over-bound").length > 0,
  },
  {
    id: "lower-shared-dep-floor",
    subsystem: "edge-derivation",
    rule: "shared-dependency requires at least two shared non-ubiquitous dependencies",
    find: "sd.len() >= 2",
    replace: "sd.len() >= 1",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges", "compute-edges-boundaries"],
    expectedFailure: "SINGLE_SHARED_DEPENDENCY_ACCEPTED",
    assert: (out) => ofType(out, "shared-dependency").some((e) => e.weight < 2),
  },
  {
    id: "drop-family-length-guard",
    subsystem: "edge-derivation",
    rule: "a family token shorter than two characters forms no family",
    find: "f.chars().count() < 2",
    replace: "f.chars().count() < 1",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "SINGLE_CHARACTER_FAMILY_LINKED",
    assert: (out) => ofType(out, "naming-family")
      .some((e) => (e.evidence.match(/^naming family: (.*)-\*$/) || [, ""])[1].length < 2),
  },
  {
    id: "raise-topic-hub-cap",
    subsystem: "edge-derivation",
    rule: "a shared-topic group is truncated to its top 60 members — 61 members yield 59 edges",
    find: ".take(60)",
    replace: ".take(61)",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "TOPIC_GROUP_EXCEEDS_HUB_CAP",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "topic-hub-cap").length > 59,
  },
  {
    id: "dedup-on-wrong-key",
    subsystem: "edge-derivation",
    rule: "the name→id index is keyed by name, and a later repository wins",
    find: "find(|(n, _)| *n == r.name.as_str())",
    replace: "find(|(n, _)| *n == r.id.as_str())",
    expectedOccurrences: 1,
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "NAME_INDEX_RESOLVED_TO_WRONG_REPOSITORY",
    // dup-a and dup-b are both named "same"; dup-c mentions "same", so exactly
    // one edge must result and it must target dup-b, the later one.
    assert: (out) => {
      const e = edgesOf(out, "compute-edges-boundaries", "duplicate-names");
      return e.length !== 1 || e[0].target !== "dup-b";
    },
  },
];
