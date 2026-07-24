import type { Authority, ConvRuleEdge, Kind } from "./types.js";

/**
 * The frozen v0.5.1 registry. Values are verbatim from the standalone's
 * class fields (reference/src/cortex-v0.5.1.jsx); any edit here is a
 * kernel-version change, not a refactor.
 */

export const MECH_KINDS: readonly Kind[] = [
  "tensor", "scalar", "distribution", "graph", "subgraph", "bound",
  "certificate", "proof_term", "constraint_set", "optimization_problem",
  "program", "trace", "dataset", "policy", "claim", "measurement",
];

export const CONV_RULES: Readonly<Record<Kind, ConvRuleEdge[]>> = {
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
};

/**
 * Risk cost of one conversion edge:
 * base 1, +2 if lossy, +1 if curated, +0.5 per destroyed property.
 */
export const edgeCost = (e: ConvRuleEdge): number =>
  1 + (e.lossy ? 2 : 0) + ((e.auth || "cur") === "cur" ? 1 : 0) + ((e.lose || []).length) * 0.5;

export const STAGE_RANK: Readonly<Record<string, number>> = {
  PROPOSED: 0, PATH_FOUND: 1, TYPE_COMPOSABLE: 2,
  CONTRACT_ADMISSIBLE: 3, EPISTEMICALLY_SUPPORTED: 4, VERIFIED: 5,
};

export const authorityOf = (e: ConvRuleEdge): Authority => e.auth || "cur";
