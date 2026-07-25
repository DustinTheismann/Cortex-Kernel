// Immutable v0.5.1 definitions — the declarative material, extracted verbatim
// from the frozen source (reference/src/cortex-v0.5.1.jsx). Ordering is
// significant (mechanism kinds, ladder stages) and is preserved exactly. These
// are frozen so a stray mutation cannot silently fork the kernel.

import { assertCount, assertUnique, assertSubset } from "./internal/invariants.js";

const freeze = (x) => Object.freeze(x);

/** The frozen export/import contract version (schemaVersion 7). */
export const SCHEMA_VERSION = 7;

/** The 16 mechanism kinds, in frozen order (MECH_KINDS). */
export const MECH_KINDS = freeze([
  "tensor", "scalar", "distribution", "graph", "subgraph", "bound", "certificate",
  "proof_term", "constraint_set", "optimization_problem", "program", "trace",
  "dataset", "policy", "claim", "measurement",
]);

/** The five-stage epistemic ladder plus the backend-only VERIFIED terminus. */
export const STAGES = freeze([
  "PROPOSED", "PATH_FOUND", "TYPE_COMPOSABLE", "CONTRACT_ADMISSIBLE", "EPISTEMICALLY_SUPPORTED", "VERIFIED",
]);

/** Proof-obligation status vocabulary (fail-closed order of strength). */
export const OBLIGATION_STATUSES = freeze(["PROVED", "CONDITIONALLY-SATISFIED", "UNRESOLVED", "REFUTED"]);

/** Structural compatibility verdicts from pairCompat. */
export const COMPATIBILITY = freeze(["exact", "convertible", "incompatible"]);

/** mechCompat / typeCheck verdicts. */
export const MECH_VERDICTS = freeze(["type_valid", "conversion_required", "type_killed"]);

/** Why a structurally-composable bridge has not reached EPISTEMICALLY_SUPPORTED. */
export const BLOCK_REASONS = freeze([
  "PRECONDITION_UNSATISFIED", "PRECONDITION_UNRESOLVED", "INVARIANT_VIOLATION", "POSTCONDITION_INSUFFICIENT", "EVIDENCE_PENDING",
]);

/** Machine-readable impossibility codes. */
export const IMPOSSIBILITY_CODES = freeze([
  "NO_SCHEMA", "NO_SHARED_PORTS", "NO_KIND_PATH", "UNIT_CONTRADICTION", "PRECONDITION_UNSATISFIED",
]);

/** Literature novelty classes (classifyLit) plus the off/skipped sentinels. */
export const LIT_CLASSES = freeze(["UNEXPLORED", "EMERGING", "KNOWN", "UNVERIFIED", "OFF", "SKIPPED"]);

/** Literature count thresholds (LIT_KNOWN, LIT_EMERGING). */
export const LIT_KNOWN = 300;
export const LIT_EMERGING = 25;

/** Soft-judgment vocabulary → obligation status (mapSoft), fail-closed. */
export const SOFT_STATUS_MAP = freeze({
  satisfied: "CONDITIONALLY-SATISFIED",
  conditional: "CONDITIONALLY-SATISFIED",
  violated: "REFUTED",
  unknown: "UNRESOLVED",
});

/** Conversion-rule authority tiers. */
export const AUTHORITIES = freeze(["ax", "cur"]);

/**
 * Fail-closed integrity of the declarative definitions. Never fires for valid
 * v0.5.1 data, so it never alters valid behavior. Called by createRegistry and
 * the integrity tests — not at import (imports stay side-effect-free).
 */
export const assertDefinitionsIntegrity = () => {
  assertCount(MECH_KINDS, 16, "MECH_KINDS");
  assertUnique(MECH_KINDS, "MECH_KINDS");
  for (const k of MECH_KINDS) if (typeof k !== "string" || !k) throw new Error("MECH_KINDS: non-string kind");
  assertCount(STAGES, 6, "STAGES");
  assertUnique(STAGES, "STAGES");
  assertUnique(OBLIGATION_STATUSES, "OBLIGATION_STATUSES");
  assertSubset(Object.values(SOFT_STATUS_MAP), OBLIGATION_STATUSES, "SOFT_STATUS_MAP values");
};
