// schemaVersion 7 import/export — the frozen onFile / doExport transforms as
// pure functions. No FileReader, Blob, document, or React: import takes JSON
// text and prior in-memory state and returns the resulting state; export takes
// state and returns the serialized payload. Loader defaults and quirks are
// preserved exactly (repos[] required; edges recomputed when absent; notes and
// mechCalibration transformed; unknown keys accepted on import, dropped on
// export; githubUser elided when undefined → 15 vs 16 keys).
//
// This is NOT the place to "improve" validation — a stricter schema belongs in
// a future versioned loader.

import { BrainIndexError } from "./errors.js";

const PRODUCT = "OpenSource Cortex v0.5.1 (instantiated contract gate)";

const UBIQUITOUS = ["react", "typescript", "numpy", "requests", "lodash", "express", "jest", "pytest", "eslint", "prettier", "webpack", "vite", "axios", "scipy", "pandas"];
const UBIQ = new Set(UBIQUITOUS);
const fam = (name) => (String(name || "").split(/[-_./ ]/)[0] || name || "").toLowerCase();

/** Deterministic edge derivation (computeEdges), verbatim. */
export const computeEdges = (list) => {
  list = list || [];
  const edges = [];
  const idByName = {};
  list.forEach((r) => { idByName[r.name] = r.id; });
  list.forEach((a) => (a.mentionsRepos || []).forEach((bn) => { if (idByName[bn] && bn !== a.name) edges.push({ source: a.id, target: idByName[bn], type: "readme-reference", weight: 3, evidence: a.name + "'s README mentions " + bn }); }));
  const topicMap = {};
  list.forEach((r) => (r.topics || []).forEach((t) => { (topicMap[t] = topicMap[t] || []).push(r); }));
  Object.entries(topicMap).forEach(([t, g]) => { if (g.length < 2) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 60); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-topic", weight: 1, evidence: "topic: " + t }); });
  const enr = list.filter((r) => r.enriched && (r.dependencies || []).length);
  if (enr.length * (enr.length - 1) / 2 <= 80000) for (let i = 0; i < enr.length; i++) for (let j = i + 1; j < enr.length; j++) { const sd = (enr[i].dependencies || []).filter((d) => (enr[j].dependencies || []).includes(d) && !UBIQ.has(d)); if (sd.length >= 2) edges.push({ source: enr[i].id, target: enr[j].id, type: "shared-dependency", weight: sd.length, evidence: "deps: " + sd.slice(0, 5).join(", ") }); }
  const byFam = {};
  list.forEach((r) => { const f = fam(r.name); (byFam[f] = byFam[f] || []).push(r); });
  Object.entries(byFam).forEach(([f, g]) => { if (f.length < 2 || g.length < 2 || g.length > 30) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "naming-family", weight: 2, evidence: "naming family: " + f + "-*" }); });
  const byLang = {};
  list.forEach((r) => { if (r.language) (byLang[r.language] = byLang[r.language] || []).push(r); });
  Object.entries(byLang).forEach(([l, g]) => { if (g.length < 2 || g.length > 14) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-language", weight: 1, evidence: "both " + l }); });
  return edges;
};

/**
 * Import a brain-index JSON string over prior in-memory state (onFile),
 * verbatim. Returns the resulting state slices plus an audit of persisted
 * keys/repos and the loader message. The core data object is REPLACED (not
 * overlaid); optional collections overlay only when present as arrays. On any
 * parse/shape failure, `error` is set and prior state is untouched.
 */
export const importBrainIndex = (jsonText, prior = {}) => {
  const s = {
    data: prior.data, synthNodes: prior.synthNodes, manualLinks: prior.manualLinks,
    negatives: prior.negatives, notes: prior.notes, preregs: prior.preregs,
    candidates: prior.candidates, ledger: prior.ledger, calibration: prior.calibration,
    mechCal: prior.mechCal, error: undefined, ssetKeys: [], persistedRepos: [],
  };
  try {
    const j = JSON.parse(jsonText);
    if (!j || !Array.isArray(j.repos)) throw new BrainIndexError("missing repos[] array");
    j.edges = Array.isArray(j.edges) ? j.edges : computeEdges(j.repos);
    s.data = j; s.error = "";
    if (Array.isArray(j.synthesisNodes)) { s.synthNodes = j.synthesisNodes; j.synthesisNodes.forEach((x) => s.ssetKeys.push(x.id)); }
    if (Array.isArray(j.manualLinks)) { s.manualLinks = j.manualLinks; j.manualLinks.forEach((l) => s.ssetKeys.push(l.id)); }
    if (Array.isArray(j.negatives)) { s.negatives = j.negatives; j.negatives.forEach((nn) => s.ssetKeys.push(nn.id)); }
    if (Array.isArray(j.notes)) { const o = {}; j.notes.forEach((nt) => { if (nt && nt.id) { o[nt.id] = nt.text; s.ssetKeys.push("note:" + nt.id); } }); s.notes = o; }
    if (Array.isArray(j.preregs)) { s.preregs = j.preregs; j.preregs.forEach((p) => s.ssetKeys.push(p.id)); }
    if (Array.isArray(j.prizeCandidates)) { s.candidates = j.prizeCandidates; j.prizeCandidates.forEach((c) => s.ssetKeys.push(c.id)); }
    if (Array.isArray(j.ledger)) s.ledger = j.ledger;
    if (Array.isArray(j.calibration)) { s.calibration = j.calibration; j.calibration.forEach((c) => s.ssetKeys.push(c.id)); }
    if (Array.isArray(j.mechCalibration)) { const mc = {}; j.mechCalibration.forEach((m) => { if (m && m.sourceKind && m.targetKind) { const k = m.sourceKind + ">" + m.targetKind; mc[k] = m; s.ssetKeys.push("mech:" + k); } }); s.mechCal = mc; }
    (j.repos || []).forEach((r) => s.persistedRepos.push(r && r.id));
  } catch (ex) {
    s.error = "Could not parse JSON: " + ex.message;
  }
  s.inputCleared = "";
  return s;
};

/**
 * Export in-memory state to the v7 envelope (doExport), verbatim. The object
 * literal always constructs 16 properties; when githubUser is undefined,
 * JSON.stringify elides it → 15 serialized keys. Unknown fields on the data
 * object are dropped (only the 16 keys are written). Returns { payload,
 * parsed, keys }.
 */
export const exportBrainIndex = (state = {}) => {
  const d = state.data || {};
  const synthNodes = state.synthNodes || [];
  const notes = state.notes || {};
  const manualLinks = state.manualLinks || [];
  const negatives = state.negatives || [];
  const preregs = state.preregs || [];
  const candidates = state.candidates || [];
  const probeLog = state.probeLog || [];
  const calibration = state.calibration || [];
  const mechCal = state.mechCal || {};
  const out = {
    schemaVersion: 7, product: PRODUCT, generatedAt: new Date().toISOString(),
    githubUser: d.githubUser, repoCount: (d.repos || []).length, repos: d.repos, edges: d.edges,
    synthesisNodes: [...synthNodes],
    notes: Object.entries(notes).map(([id, text]) => ({ id, text })),
    manualLinks, negatives, preregs,
    prizeCandidates: [...candidates],
    ledger: probeLog, calibration, mechCalibration: Object.values(mechCal),
  };
  const payload = JSON.stringify(out, null, 2);
  const parsed = JSON.parse(payload);
  return { payload, parsed, keys: Object.keys(parsed) };
};
