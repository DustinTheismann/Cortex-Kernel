/**
 * Types of the frozen v0.5.1 semantic kernel.
 *
 * These mirror the standalone's runtime shapes exactly; where the backend
 * handoff spec names a richer abstraction (FormalPort, TypedState), the
 * standalone's narrower shape is kept — widening happens in later backend
 * work, never silently here.
 */

export type Kind =
  | "tensor" | "scalar" | "distribution" | "graph" | "subgraph" | "bound"
  | "certificate" | "proof_term" | "constraint_set" | "optimization_problem"
  | "program" | "trace" | "dataset" | "policy" | "claim" | "measurement";

/** 'ax' = axiomatic (structurally always valid); 'cur' = curated (valid only under precondition). */
export type Authority = "ax" | "cur";

/** One edge of the governed conversion registry, as shipped in v0.5.1. */
export interface ConvRuleEdge {
  to: Kind;
  op: string;
  auth?: Authority;   // absent = "cur" at cost time; v0.5.1 ships explicit values
  pre?: string;
  lossy?: boolean;
  lose?: string[];
}

/** One instantiated conversion step on a planned path. */
export interface AdapterStep {
  from: Kind;
  to: Kind;
  op: string;
  ruleId: string;     // `${from}>${to}:${op}` — stable across the corpus
  lossy: boolean;
  auth: Authority;
  pre: string;
  lose: string[];
}

export interface KindPath {
  path: AdapterStep[];
  exact: boolean;
  cost: number;
}

export type Compatibility = "exact" | "convertible" | "incompatible";

export interface PairCompat {
  compatibility: Compatibility;
  options: KindPath[];
  adapter: AdapterStep[] | null;
  lossy: boolean;
  cost: number;
}

/** A typed mechanism port (the standalone's port shape). */
export interface PortSpec {
  name: string;
  kind: Kind;
  shape: string;      // "" when unspecified
  units: string;      // "" when unspecified
  semantics: string;
}

export interface MechanismSchema {
  consumes: PortSpec[];
  produces: PortSpec[];
  certifies: string[];
  assumptions: string[];
  invariants: string[];
}

export type Direction = "A→B" | "B→A";

export interface PortPair {
  dir: Direction;
  sourceOutput: PortSpec;
  targetInput: PortSpec;
  compatibility?: Compatibility;
}

export type TriState = "proved" | "unresolved" | "refuted";

export type ObligationStatus =
  | "PROVED" | "REFUTED" | "CONDITIONALLY-SATISFIED" | "UNRESOLVED";

/** Raw soft-judgment vocabulary as the standalone's model reply uses it. */
export type SoftStatusRaw = "satisfied" | "conditional" | "violated" | "unknown";

/**
 * Model-assisted evidence for one bridge, supplied by the caller.
 * In the standalone this comes from a single blind model call; the kernel
 * treats it as data. Absent entries map to UNRESOLVED (fail-closed).
 */
export interface SoftEvidence {
  preconditions?: Record<string, SoftStatusRaw | undefined>; // by ruleId
  invariantPreserved?: SoftStatusRaw;
  metricMeaningful?: SoftStatusRaw;
  note?: string;
}

export interface RuleInstantiation {
  ruleId: string;
  op: string;
  pre: string;
  status: ObligationStatus;
}

export interface ProofObligation {
  id: string;
  name: string;
  method: "deterministic" | "model-assisted";
  status: ObligationStatus;
  detail: string;
}

export type Stage =
  | "PROPOSED" | "PATH_FOUND" | "TYPE_COMPOSABLE"
  | "CONTRACT_ADMISSIBLE" | "EPISTEMICALLY_SUPPORTED" | "VERIFIED";

export type ImpossibilityCode =
  | "NO_SCHEMA" | "NO_SHARED_PORTS" | "NO_KIND_PATH" | "UNIT_CONTRADICTION";

export type BlockReason =
  | "PRECONDITION_UNSATISFIED" | "PRECONDITION_UNRESOLVED"
  | "INVARIANT_VIOLATION" | "POSTCONDITION_INSUFFICIENT" | "EVIDENCE_PENDING";

export interface Impossibility {
  code: ImpossibilityCode;
  from: Kind | null;
  to: Kind | null;
  detail: string;
}

export interface BridgeOption {
  dir: Direction;
  sourceOutput: PortSpec;
  targetInput: PortSpec;
  exact: boolean;
  adapters: AdapterStep[];
  staticRisk: number;
  risk: number;
  unit: TriState;
}

export interface Bridge {
  sourcePort: PortSpec;
  targetPort: PortSpec;
  dir: Direction;
  adapters: AdapterStep[];
  riskCost: number;
  ruleInstantiations: RuleInstantiation[];
  requiredAssumptions: string[];
  preservedInvariants: string[];
  destroyedProperties: string[];
  executableTest: string;
  proofObligations: ProofObligation[];
}

export interface MechCompat {
  matchedPorts: Array<{
    dir: Direction;
    sourceOutput: PortSpec;
    targetInput: PortSpec;
    compatibility: "exact" | "convertible";
    adapter: AdapterStep[];
    lossy: boolean;
  }>;
  sharedFormalObject: boolean;
  verdict: "type_valid" | "conversion_required" | "type_killed" | null;
  consideredPaths: number;
  prunedPaths: number;
}

export interface TypeCheck {
  pass: boolean;
  verdict: "type_valid" | "conversion_required" | "type_killed";
  stage?: Stage;
  sharedObject: string | null;
  reason: string;
}

/** Minimal repo metadata the kernel reads (license screening only). */
export interface RepoMeta {
  license?: string | { spdx_id?: string; key?: string; name?: string } | null;
  [k: string]: unknown;
}

/** Full deterministic compilation result for one candidate bridge. */
export interface CompiledBridge {
  stage: Stage;
  obligations: ProofObligation[];
  mechClass: { sourceKind: Kind; targetKind: Kind } | null;
  mechCompat: MechCompat | null;
  bridge: Bridge | null;
  impossibility: Impossibility | null;
  blockReason: BlockReason | null;
  typeCheck: TypeCheck;
  options: BridgeOption[];
  candidatePairs: PortPair[];
}

export type LitClass = "UNVERIFIED" | "KNOWN" | "EMERGING" | "UNEXPLORED";
