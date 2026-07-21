export * from "./types.js";
export { MECH_KINDS, CONV_RULES, edgeCost, STAGE_RANK, authorityOf } from "./rules.js";
export { adaptersFor, pairCompat } from "./search.js";
export {
  shapeCompat, unitCompat, licenseCompat, licKey, normSchema, portPairsFor,
  classifyLit, LIT_KNOWN, LIT_EMERGING,
} from "./ports.js";
export type { LicenseCompat } from "./ports.js";
export { synthTest } from "./harness.js";
export { compileBridge, mapSoft } from "./compile.js";
export type { CompileInput } from "./compile.js";
export {
  loadBrainIndex, exportBrainIndex, computeEdges, emptyState,
  BrainIndexError, V7_KEYS, V7_PRODUCT,
} from "./brain-index.js";
export type {
  BrainIndexState, BrainRepo, BrainEdge, MechCalRecord, LoadReport,
} from "./brain-index.js";
