// The governed conversion registry (CONV_RULES) and edge cost, extracted
// verbatim from the frozen source. Rule-array ORDER is significant (it feeds
// the planner's enumeration and tie-breaks) and is preserved exactly. Each
// rule carries only the fields the frozen source gives it — absent `pre`,
// `lossy`, or `lose` are genuinely absent, not defaulted, because their
// presence is observable in the exported bridge.

import { MECH_KINDS, AUTHORITIES, assertDefinitionsIntegrity } from "./types.js";
import { assert, assertUnique } from "./internal/invariants.js";

const freeze = (x) => Object.freeze(x);

/**
 * from-kind → ordered list of { to, op, auth, pre?, lossy?, lose? }.
 * Verbatim from reference/src/cortex-v0.5.1.jsx (CONV_RULES).
 */
export const CONV_RULES = freeze({
  tensor: [
    { to: "distribution", op: "normalize", auth: "cur", pre: "nonneg & normalizable to unit mass", lose: ["scale"] },
    { to: "measurement", op: "observe", auth: "cur", pre: "tensor is an observable quantity" },
    { to: "scalar", op: "reduce", lossy: true, auth: "ax", lose: ["structure"] },
    { to: "dataset", op: "materialize", auth: "ax" },
  ],
  distribution: [
    { to: "tensor", op: "parameterize", auth: "cur", pre: "finite parameterization exists" },
    { to: "scalar", op: "expectation", lossy: true, auth: "ax", lose: ["variance", "higher-moments"] },
    { to: "measurement", op: "sample", auth: "cur", pre: "sampling procedure defined" },
  ],
  scalar: [
    { to: "bound", op: "threshold", auth: "cur", pre: "scalar is a comparable magnitude" },
    { to: "measurement", op: "record", auth: "ax" },
  ],
  measurement: [
    { to: "scalar", op: "aggregate", lossy: true, auth: "ax" },
    { to: "dataset", op: "collect", auth: "ax" },
    { to: "trace", op: "timestamp", auth: "cur", pre: "measurements are ordered" },
  ],
  graph: [
    { to: "subgraph", op: "restrict", lossy: true, auth: "ax", lose: ["global-structure"] },
    { to: "constraint_set", op: "encode-edges", auth: "cur", pre: "edges express constraints" },
    { to: "tensor", op: "adjacency", auth: "ax" },
  ],
  subgraph: [
    { to: "graph", op: "embed", auth: "ax" },
    { to: "program", op: "lower", lossy: true, auth: "cur", pre: "subgraph is executable" },
    { to: "tensor", op: "featurize", lossy: true, auth: "cur", pre: "a feature map is defined", lose: ["topology"] },
  ],
  bound: [
    { to: "certificate", op: "wrap", auth: "cur", pre: "bound is soundly derived" },
    { to: "claim", op: "assert", auth: "cur", pre: "bound supports the claim" },
  ],
  certificate: [
    { to: "claim", op: "assert", auth: "ax" },
    { to: "proof_term", op: "reify", auth: "cur", pre: "certificate is machine-checkable" },
  ],
  proof_term: [
    { to: "certificate", op: "extract", auth: "ax" },
    { to: "claim", op: "conclude", auth: "ax" },
  ],
  constraint_set: [
    { to: "optimization_problem", op: "add-objective", auth: "cur", pre: "an objective is defined" },
    { to: "program", op: "compile", auth: "cur", pre: "constraints are executable" },
  ],
  optimization_problem: [
    { to: "constraint_set", op: "drop-objective", lossy: true, auth: "ax", lose: ["objective"] },
    { to: "program", op: "solve", auth: "cur", pre: "a solver exists" },
    { to: "bound", op: "dual-bound", auth: "cur", pre: "duality gap is bounded" },
  ],
  program: [
    { to: "trace", op: "execute", auth: "cur", pre: "program terminates on the inputs" },
    { to: "certificate", op: "attest", lossy: true, auth: "cur", pre: "execution is independently verifiable" },
  ],
  trace: [
    { to: "dataset", op: "log", auth: "ax" },
    { to: "measurement", op: "probe", auth: "ax" },
  ],
  dataset: [
    { to: "tensor", op: "batch", auth: "ax" },
    { to: "distribution", op: "empirical", auth: "cur", pre: "samples are i.i.d." },
  ],
  policy: [
    { to: "constraint_set", op: "encode", auth: "cur", pre: "policy is expressible as constraints" },
    { to: "program", op: "implement", auth: "cur", pre: "policy is executable" },
  ],
  claim: [
    { to: "constraint_set", op: "formalize", auth: "cur", pre: "claim is fully formalizable (not normative/ambiguous/probabilistic)" },
  ],
});

/** Stable rule identifier: `${from}>${to}:${op}` (as used across the kernel). */
export const ruleId = (from, e) => from + ">" + e.to + ":" + e.op;

/**
 * Conversion-step risk (edgeCost), verbatim:
 *   1 + 2·lossy + (curated ? 1 : 0) + 0.5·|destroyed properties|
 * Authority defaults to "cur" when absent.
 */
export const edgeCost = (e) =>
  1 + (e.lossy ? 2 : 0) + ((e.auth || "cur") === "cur" ? 1 : 0) + ((e.lose || []).length) * 0.5;

/**
 * Validate and return a registry view. Integrity assertions here are
 * fail-closed guards against corruption of the extracted material; they never
 * fire for valid v0.5.1 data and never change valid behavior:
 *   - definitions integrity (kind count/uniqueness, stages, soft map);
 *   - every from-kind and every conversion endpoint is a known mechanism kind;
 *   - every authority tier is known;
 *   - no duplicate rule identifiers.
 */
export const createRegistry = (rules = CONV_RULES) => {
  assertDefinitionsIntegrity();
  const kinds = new Set(MECH_KINDS);
  const auths = new Set(AUTHORITIES);
  const ids = [];
  for (const [from, edges] of Object.entries(rules)) {
    assert(kinds.has(from), `registry: unknown source kind "${from}"`);
    assert(Array.isArray(edges), `registry: rules for "${from}" is not an array`);
    for (const e of edges) {
      assert(e && typeof e === "object", `registry: malformed rule under "${from}"`);
      assert(kinds.has(e.to), `registry: rule ${from}>${e.to} has unknown endpoint "${e.to}"`);
      assert(typeof e.op === "string" && e.op, `registry: rule ${from}>${e.to} has no op`);
      assert(auths.has(e.auth || "cur"), `registry: rule ${ruleId(from, e)} has unknown authority "${e.auth}"`);
      ids.push(ruleId(from, e));
    }
  }
  assertUnique(ids, "registry rule ids");

  return freeze({
    rules,
    ruleId,
    edgeCost,
    /** Ordered conversion rules out of `kind` (empty if none). */
    rulesFrom: (kind) => rules[kind] || [],
    /** All known mechanism kinds. */
    kinds: MECH_KINDS,
  });
};
