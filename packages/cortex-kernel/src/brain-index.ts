/**
 * Explicit normalization/migration for the brain-index.json contract
 * (data/brain-index.schema). The standalone's loader has overlay
 * semantics, in-flight transforms, and non-round-tripping fields; this
 * module reproduces those semantics as a pure, reportable function so
 * nothing is implicit. Migration tests pin every documented behavior.
 */

export interface BrainEdge {
  source: string; target: string; type: string; weight: number; evidence: string;
}

export interface BrainRepo {
  id: string; name?: string; stars?: number; topics?: string[]; language?: string;
  dependencies?: string[]; mentionsRepos?: string[]; enriched?: boolean;
  [k: string]: unknown;
}

export interface MechCalRecord {
  sourceKind: string; targetKind: string;
  [k: string]: unknown;
}

/** Normalized in-memory state (the standalone's state slices, made explicit). */
export interface BrainIndexState {
  /**
   * Mirrors the standalone's `data.githubUser`: replaced wholesale on
   * every load (setData(j)), never validated — any JSON value round-trips,
   * and it is `undefined` when the loaded file lacked the key. An
   * `undefined` value is elided by JSON.stringify on export, producing
   * the 15-key serialized envelope (schema §1).
   */
  githubUser: unknown;
  repos: BrainRepo[];
  edges: BrainEdge[];
  synthesisNodes: unknown[];
  manualLinks: unknown[];
  negatives: unknown[];
  /** In-memory form: id → text (the standalone's map), NOT the exported array form. */
  notes: Record<string, string>;
  preregs: unknown[];
  prizeCandidates: unknown[];
  ledger: unknown[];
  calibration: unknown[];
  /** In-memory form: keyed `${sourceKind}>${targetKind}` (the standalone's map). */
  mechCalibration: Record<string, MechCalRecord>;
}

export const emptyState = (): BrainIndexState => ({
  githubUser: null, repos: [], edges: [], synthesisNodes: [], manualLinks: [],
  negatives: [], notes: {}, preregs: [], prizeCandidates: [], ledger: [],
  calibration: [], mechCalibration: {},
});

/** The 16 keys doExport writes — the v7 envelope, exactly. */
export const V7_KEYS = [
  "schemaVersion", "product", "generatedAt", "githubUser", "repoCount",
  "repos", "edges", "synthesisNodes", "notes", "manualLinks", "negatives",
  "preregs", "prizeCandidates", "ledger", "calibration", "mechCalibration",
] as const;

export const V7_PRODUCT = "OpenSource Cortex v0.5.1 (instantiated contract gate)";

const UBIQUITOUS = ["react", "typescript", "numpy", "requests", "lodash", "express", "jest", "pytest", "eslint", "prettier", "webpack", "vite", "axios", "scipy", "pandas"];
const UBIQ = new Set(UBIQUITOUS);
const fam = (name: unknown): string => (String(name || "").split(/[-_./ ]/)[0] || (name as string) || "").toLowerCase();

/**
 * Deterministic edge derivation, verbatim semantics from the standalone —
 * used by the loader when `edges` is missing or non-array.
 */
export const computeEdges = (list: BrainRepo[] | null | undefined): BrainEdge[] => {
  list = list || [];
  const edges: BrainEdge[] = [];
  const idByName: Record<string, string> = {};
  list.forEach(r => { idByName[String(r.name)] = r.id; });
  list.forEach(a => (a.mentionsRepos || []).forEach(bn => {
    if (idByName[bn] && bn !== a.name) edges.push({ source: a.id, target: idByName[bn], type: "readme-reference", weight: 3, evidence: a.name + "'s README mentions " + bn });
  }));
  const topicMap: Record<string, BrainRepo[]> = {};
  list.forEach(r => (r.topics || []).forEach(t => { (topicMap[t] = topicMap[t] || []).push(r); }));
  Object.entries(topicMap).forEach(([t, g]) => {
    if (g.length < 2) return;
    const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 60);
    const hub = grp[0];
    for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-topic", weight: 1, evidence: "topic: " + t });
  });
  const enr = list.filter(r => r.enriched && (r.dependencies || []).length);
  if (enr.length * (enr.length - 1) / 2 <= 80000) {
    for (let i = 0; i < enr.length; i++) for (let j = i + 1; j < enr.length; j++) {
      const sd = (enr[i].dependencies || []).filter(d => (enr[j].dependencies || []).includes(d) && !UBIQ.has(d));
      if (sd.length >= 2) edges.push({ source: enr[i].id, target: enr[j].id, type: "shared-dependency", weight: sd.length, evidence: "deps: " + sd.slice(0, 5).join(", ") });
    }
  }
  const byFam: Record<string, BrainRepo[]> = {};
  list.forEach(r => { const f = fam(r.name); (byFam[f] = byFam[f] || []).push(r); });
  Object.entries(byFam).forEach(([f, g]) => {
    if (f.length < 2 || g.length < 2 || g.length > 30) return;
    const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const hub = grp[0];
    for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "naming-family", weight: 2, evidence: "naming family: " + f + "-*" });
  });
  const byLang: Record<string, BrainRepo[]> = {};
  list.forEach(r => { if (r.language) (byLang[r.language] = byLang[r.language] || []).push(r); });
  Object.entries(byLang).forEach(([l, g]) => {
    if (g.length < 2 || g.length > 14) return;
    const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0));
    const hub = grp[0];
    for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-language", weight: 1, evidence: "both " + l });
  });
  return edges;
};

/** What the loader did with each slice — makes the overlay auditable. */
export interface LoadReport {
  applied: string[];                 // slices overwritten from the file
  keptFromPrior: string[];           // slices left untouched (missing/non-array in file)
  recomputedEdges: boolean;
  droppedUnknownKeys: string[];      // accepted by the standalone, dropped on re-export
  droppedMechCalEntries: number;     // entries missing sourceKind/targetKind
  schemaVersion: unknown;            // whatever the file claimed — NOT validated (legacy)
}

export class BrainIndexError extends Error {}

/**
 * Load a brain-index file over prior state, with the standalone's exact
 * semantics: repos[] required; edges recomputed when missing/non-array;
 * every other slice overlaid only when present as an array; notes and
 * mechCalibration transformed to their in-memory map forms (invalid
 * mechCalibration entries silently dropped — here, counted); unknown keys
 * accepted but never entering state; schemaVersion unvalidated.
 */
export const loadBrainIndex = (
  json: unknown,
  prior?: BrainIndexState,
): { state: BrainIndexState; report: LoadReport } => {
  const base = prior ? { ...prior } : emptyState();
  const j = json as Record<string, unknown> | null;
  if (!j || typeof j !== "object" || !Array.isArray((j as Record<string, unknown>).repos)) {
    throw new BrainIndexError("missing repos[] array");
  }
  const report: LoadReport = {
    applied: ["repos"], keptFromPrior: [], recomputedEdges: false,
    droppedUnknownKeys: Object.keys(j).filter(k => !(V7_KEYS as readonly string[]).includes(k)),
    droppedMechCalEntries: 0,
    schemaVersion: (j as Record<string, unknown>).schemaVersion,
  };
  const state: BrainIndexState = { ...base, repos: j.repos as BrainRepo[] };
  // Core data object is replaced, not overlaid (schema §3): githubUser is
  // taken from the file unconditionally — undefined when absent, any JSON
  // value otherwise. Prior state never survives here.
  state.githubUser = j.githubUser;
  report.applied.push("githubUser");

  if (Array.isArray(j.edges)) { state.edges = j.edges as BrainEdge[]; report.applied.push("edges"); }
  else { state.edges = computeEdges(state.repos); report.recomputedEdges = true; }

  const overlayArray = (key: "synthesisNodes" | "manualLinks" | "negatives" | "preregs" | "prizeCandidates" | "ledger" | "calibration") => {
    if (Array.isArray(j[key])) { (state as unknown as Record<string, unknown>)[key] = j[key]; report.applied.push(key); }
    else report.keptFromPrior.push(key);
  };
  overlayArray("synthesisNodes");
  overlayArray("manualLinks");
  overlayArray("negatives");
  if (Array.isArray(j.notes)) {
    const o: Record<string, string> = {};
    (j.notes as Array<{ id?: string; text?: string }>).forEach(nt => { if (nt && nt.id) o[nt.id] = nt.text as string; });
    state.notes = o; report.applied.push("notes");
  } else report.keptFromPrior.push("notes");
  overlayArray("preregs");
  overlayArray("prizeCandidates");
  overlayArray("ledger");
  overlayArray("calibration");
  if (Array.isArray(j.mechCalibration)) {
    const mc: Record<string, MechCalRecord> = {};
    (j.mechCalibration as MechCalRecord[]).forEach(m => {
      if (m && m.sourceKind && m.targetKind) mc[m.sourceKind + ">" + m.targetKind] = m;
      else report.droppedMechCalEntries++;
    });
    state.mechCalibration = mc; report.applied.push("mechCalibration");
  } else report.keptFromPrior.push("mechCalibration");

  return { state, report };
};

/**
 * Produce the v7 envelope from state — the standalone's doExport, minus
 * the browser download. `generatedAt` is injectable for reproducibility.
 * The object literal always constructs 16 properties, but when
 * `state.githubUser` is undefined JSON.stringify elides that key, so the
 * serialized form contains 15 or 16 keys (schema §1).
 */
export const exportBrainIndex = (
  state: BrainIndexState,
  opts?: { generatedAt?: string },
): Record<string, unknown> => ({
  schemaVersion: 7,
  product: V7_PRODUCT,
  generatedAt: opts?.generatedAt ?? new Date().toISOString(),
  githubUser: state.githubUser,
  repoCount: (state.repos || []).length,
  repos: state.repos,
  edges: state.edges,
  synthesisNodes: state.synthesisNodes,
  notes: Object.entries(state.notes).map(([id, text]) => ({ id, text })),
  manualLinks: state.manualLinks,
  negatives: state.negatives,
  preregs: state.preregs,
  prizeCandidates: state.prizeCandidates,
  ledger: state.ledger,
  calibration: state.calibration,
  mechCalibration: Object.values(state.mechCalibration),
});
