// Adapter: headless invocation of the FROZEN v0.5.1 source.
//
// This is the only module that reaches into reference/src/cortex-v0.5.1.jsx.
// It slices the deterministic definitions VERBATIM and executes them behind
// deterministic stubs for the artifact's nondeterministic / browser / React
// couplings. Nothing here is transcribed: every decision is produced by the
// frozen code itself. The couplings that are stubbed (and why direct
// invocation is otherwise impossible) are catalogued in
// docs/oracle-limitations.md.
//
// Three invocation surfaces:
//   frozen        — the pure kernel functions (no stubs at all)
//   runCascade    — verifyCascade steps 2-4 run verbatim: contract
//                   instantiation, obligations, ladder, impossibility, final
//                   verdict, novelty class, prize candidacy. The two model
//                   boundaries are inputs (schemas supplied directly; soft
//                   judgments injected at the single window.claude call).
//   runImport /   — onFile / doExport run verbatim behind stubbed FileReader,
//   runExport       Blob, URL and document, capturing the imported state and
//                   the exported payload.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ORACLE_SOURCE = "reference/src/cortex-v0.5.1.jsx";
export const SOURCE_BASELINE = "804f767";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "../..", ORACLE_SOURCE), "utf8");

const sliceBetween = (startMarker, endMarker) => {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("start marker not found: " + startMarker);
  const e = src.indexOf(endMarker, s);
  if (e < 0) throw new Error("end marker not found: " + endMarker);
  return src.slice(s, e);
};
const sliceLine = (startMarker) => {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("marker not found: " + startMarker);
  return src.slice(s, src.indexOf("\n", s));
};

// class fields → const declarations
const kindsDecl = "const " + sliceLine("MECH_KINDS = [");
const rulesDecl = "const " + sliceLine("CONV_RULES = {");
const ubiqDecl = "const " + sliceLine("UBIQUITOUS = [");
// pure helpers
const famDecl = sliceLine("const fam = (name) =>");
const parseCombosDecl = sliceBetween("const parseCombos = (txt) =>", "const runSynth = async");
const compilerBlock = sliceBetween("const edgeCost =", "// ---------- VERIFICATION CASCADE");
const normDecl = sliceLine("const normSchema = (s) =>");
const litDecl = sliceLine("const LIT_KNOWN = ");
const classifyDecl = sliceLine("const classifyLit = (count) =>");
const computeEdgesBlock = sliceBetween("const computeEdges = useCallback", "// ---------- persistence");
// verifyCascade steps 2-4 (verbatim): compiler → obligations → ladder →
// literature classification → final verdict → prize candidacy
const cascadeCore = sliceBetween("const portPairsFor = (it) =>", "setGap(g => ({ cell, cellName");
// schema-v7 serialization (verbatim)
const onFileDecl = sliceBetween("const onFile = (e) =>", "const exportBrain =");
const doExportDecl = sliceBetween("const doExport = (extraNodes, extraCandidates) =>", "// ---------- synthesis");

const factory = new Function(`
  "use strict";
  const useCallback = (fn) => fn;
  ${kindsDecl}
  ${rulesDecl}
  ${ubiqDecl}
  const UBIQ = new Set(UBIQUITOUS);
  ${famDecl}
  ${parseCombosDecl}
  ${litDecl}
  ${classifyDecl}
  ${compilerBlock}
  ${normDecl}
  ${computeEdgesBlock}

  const frozen = { MECH_KINDS, CONV_RULES, edgeCost, adaptersFor, pairCompat,
                   shapeCompat, unitCompat, licenseCompat, licKey, synthTest,
                   normSchema, classifyLit, LIT_KNOWN, LIT_EMERGING, computeEdges };

  // Deterministic reply for the single soft-judgment model call. The frozen
  // prompt's final line is JSON.stringify(inp); we answer every asked
  // precondition per the case policy, plus invariant/metric judgments.
  const makeModelStub = (model) => ({
    claude: { complete: async ({ messages }) => {
      const content = String(messages[0].content);
      const lines = content.split("\\n");
      let inp = null;
      for (let i = lines.length - 1; i >= 0 && !inp; i--) {
        const t = lines[i].trim();
        if (t.startsWith("[")) { try { const p = JSON.parse(t); if (Array.isArray(p)) inp = p; } catch (_) {} }
      }
      inp = inp || [];
      const statusFor = (id) => (model.preOverrides && model.preOverrides[id]) || model.pre || "unknown";
      return JSON.stringify(inp.map((e) => ({
        ix: e.ix,
        preconditions: Object.fromEntries((e.preconditions || []).map((p) => [p.id, statusFor(p.id)])),
        invariantPreserved: model.invariant || "unknown",
        metricMeaningful: model.metric || "unknown",
        note: model.note || "",
      })));
    } },
  });

  // Run verifyCascade steps 2-4 over one prepared item, verbatim.
  async function runCascade(input) {
    const cellName = input.cellName || "cellA×cellB";
    const density = input.density || 0;
    const cell = input.cell || null;
    const litGround = !!input.litGround;
    const litCount = (input.litCount === undefined) ? null : input.litCount;
    const repoA = input.repoA || { id: "repoA" };
    const repoB = input.repoB || { id: "repoB" };
    const byId = { [repoA.id]: repoA, [repoB.id]: repoB };
    const window = makeModelStub(input.model || {});
    let __uid = 0; const uid = () => "u" + (++__uid);
    const openAlexCount = async () => ({ count: litCount, top: [] });
    const litEstimateViaModel = async () => ({ count: litCount, modelEstimated: true });
    const litBlockedRef = { current: false };
    const setGap = () => {}, setPreregs = () => {}, sset = () => {}, doExport = () => {}, recordMechOutcomes = () => {};
    const setTimeout = () => {};
    const capt = { candidate: null, probeLog: null };
    const setCandidates = (fn) => { const a = fn([]); capt.candidate = a.length ? a[a.length - 1] : null; };
    const setProbeLog = (fn) => { const a = fn([]); capt.probeLog = a.length ? a[a.length - 1] : null; };
    const fields = input.item || {};
    const item = {
      schemaA: normSchema(input.schemaA),
      schemaB: normSchema(input.schemaB),
      _ridA: repoA.id, _ridB: repoB.id,
      combination: fields.combination || "A ⊕ B",
      usesFromA: repoA.id, usesFromB: repoB.id,
      sharedMechanism: fields.sharedMechanism || "shared mechanism",
      verdict: fields.hollow || "PLAUSIBLE",
      hollowCheck: fields.hollowCheck || null,
      litQuery: fields.litQuery || "query terms",
    };
    const items = [item];
    ${cascadeCore}
    return { item, candidate: capt.candidate, probeLog: capt.probeLog };
  }

  // Run onFile verbatim behind a stubbed FileReader; capture imported state.
  function runImport(jsonText, prior) {
    prior = prior || {};
    const captured = {
      data: (prior.data === undefined ? undefined : prior.data),
      synthNodes: prior.synthNodes, manualLinks: prior.manualLinks, negatives: prior.negatives,
      notes: prior.notes, preregs: prior.preregs, candidates: prior.candidates,
      ledger: prior.ledger, calibration: prior.calibration, mechCal: prior.mechCal,
      error: undefined, ssetKeys: [], persistedRepos: [],
    };
    const setData = (v) => { captured.data = v; };
    const setErr = (v) => { captured.error = v; };
    const setSel = () => {}, setCombo = () => {}, setExpanded = () => {}, setSynth = () => {}, setShowSynth = () => {}, setEdgeInfo = () => {};
    const setSynthNodes = (v) => { captured.synthNodes = v; };
    const setManualLinks = (v) => { captured.manualLinks = v; };
    const setNegatives = (v) => { captured.negatives = v; };
    const setNotes = (v) => { captured.notes = v; };
    const setPreregs = (v) => { captured.preregs = v; };
    const setCandidates = (v) => { captured.candidates = v; };
    const setProbeLog = (v) => { captured.ledger = v; };
    const setCalibration = (v) => { captured.calibration = v; };
    const setMechCal = (v) => { captured.mechCal = v; };
    const sset = (k) => { captured.ssetKeys.push(k); };
    const persistRepo = (r) => { captured.persistedRepos.push(r && r.id); };
    const nodeMapRef = { current: null }, centeredRef = { current: false }, firstPrizeRef = { current: false };
    const FileReader = class { readAsText() { this.result = jsonText; if (this.onload) this.onload(); } };
    const e = { target: { files: [{}], value: "keep" } };
    ${onFileDecl}
    onFile(e);
    captured.inputCleared = e.target.value;
    return captured;
  }

  // Run doExport verbatim behind stubbed Blob/URL/document; capture payload.
  function runExport(state) {
    state = state || {};
    const data = state.data || {};
    const dataRef = { current: state.dataRef === undefined ? data : state.dataRef };
    const synthNodes = state.synthNodes || [];
    const notes = state.notes || {};
    const manualLinks = state.manualLinks || [];
    const negatives = state.negatives || [];
    const preregs = state.preregs || [];
    const candidates = state.candidates || [];
    const probeLog = state.probeLog || [];
    const calibration = state.calibration || [];
    const mechCal = state.mechCal || {};
    let __payload = null;
    const Blob = class { constructor(parts) { __payload = parts.join(""); } };
    const URL = { createObjectURL: () => "blob:stub", revokeObjectURL: () => {} };
    const document = { createElement: () => ({ href: "", download: "", click() {}, remove() {} }), body: { appendChild() {} } };
    const setTimeout = () => {};
    ${doExportDecl}
    doExport([]);
    return { payload: __payload, parsed: JSON.parse(__payload), keys: Object.keys(JSON.parse(__payload)) };
  }

  return { frozen, runCascade, runImport, runExport };
`);

const built = factory();
export const frozen = built.frozen;
export const runCascade = built.runCascade;
export const runImport = built.runImport;
export const runExport = built.runExport;

// Project the decision-bearing fields of a cascade item, preserving the
// absent/null/undefined distinction (never coerce absent → null). `options`
// exposes the frozen internal multipath ranking (it._options).
const DECISION_FIELDS = [
  "stage", "typeCheck", "blockReason", "impossibility", "mechClass", "mechCompat",
  "bridge", "obligations", "mechanismGrounded", "litClass", "litCount", "litNote",
  "modelEstimated", "finalVerdict", "verifications", "preregId",
];
export const projectDecision = (result) => {
  const it = result.item;
  const out = {};
  for (const k of DECISION_FIELDS) if (k in it) out[k] = it[k];
  if ("_options" in it) out.options = it._options;
  if (result.candidate !== undefined) out.prizeCandidate = result.candidate;
  if (result.probeLog !== undefined) out.probeLogEntry = result.probeLog;
  return out;
};
