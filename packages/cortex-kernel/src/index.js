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

// Extracted in subsequent commits (parity-gated), matching the target surface:
//   instantiateContract, evaluateObligations, evaluateCascade,
//   applyLiteratureAssessment, deriveVerdict, importBrainIndex, exportBrainIndex
