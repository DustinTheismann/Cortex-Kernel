// @opensource-cortex/kernel — public API.
//
// Framework-independent extraction of the frozen v0.5.1 semantic kernel.
// Pure ESM: no React, no DOM, no network, no import-time side effects.
//
// The surface is intentionally narrow and grows only as each module reaches
// byte-for-byte parity with the Phase 1 golden corpus. Internal helpers are
// not exported until parity is stable.

export { SCHEMA_VERSION } from "./types.js";
export { KernelError, BrainIndexError, RegistryIntegrityError } from "./errors.js";
export { createRegistry } from "./registry.js";
export { evaluateCompatibility, planBridge } from "./planner.js";
export { instantiateContract } from "./contracts.js";
export { evaluateObligations } from "./obligations.js";
export { evaluateDeterministicCascade } from "./advancement.js";
export { applyLiteratureAssessment, deriveFinalVerdict as deriveVerdict } from "./verdicts.js";

import { normSchema } from "./compatibility.js";
import { evaluateDeterministicCascade } from "./advancement.js";
import { applyLiteratureAssessment } from "./verdicts.js";
import { NULL_TRACER, createTracer } from "./internal/trace.js";

/**
 * The full v0.5.1 decision, composed to preserve the single standalone call
 * path: deterministic cascade (through EPISTEMICALLY_SUPPORTED) + post-ladder
 * literature evaluation. Returns the projected decision. With { trace: true }
 * it returns { decision, trace } instead — trace never changes `decision`.
 */
export const evaluateCascade = (input, { trace = false } = {}) => {
  const tracer = trace ? createTracer("cascade") : NULL_TRACER;
  const schemaA = normSchema(input.schemaA);
  const schemaB = normSchema(input.schemaB);
  const decision = evaluateDeterministicCascade(input, tracer);
  const item = {
    hollow: (input.item && input.item.hollow) || "PLAUSIBLE",
    combination: (input.item && input.item.combination) || "A ⊕ B",
    usesFromA: (input.repoA && input.repoA.id) || "repoA",
    usesFromB: (input.repoB && input.repoB.id) || "repoB",
    sharedMechanism: (input.item && input.item.sharedMechanism) || "shared mechanism",
    hollowCheck: (input.item && input.item.hollowCheck) || null,
    litQuery: (input.item && input.item.litQuery) || "query terms",
    schemaA, schemaB,
  };
  const lit = applyLiteratureAssessment(decision, { litGround: input.litGround, litCount: input.litCount, item, meta: input.meta || {} }, tracer);
  const { prizeCandidate, probeLogEntry, ...litFields } = lit;
  const decisionOut = { ...decision, ...litFields, prizeCandidate, probeLogEntry };
  return trace ? { decision: decisionOut, trace: tracer.entries } : decisionOut;
};
