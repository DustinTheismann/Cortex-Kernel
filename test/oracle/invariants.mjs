// Semantic invariants — behavioral claims that must hold for every frozen
// decision, independent of the exact hash. The differential comparator uses
// these as its "semantic invariant diff" layer: two decisions can differ
// field-by-field yet a broken extraction usually also violates one of these,
// which is far more legible than a raw hash mismatch.
//
// These describe the frozen artifact's behavior; they never redefine it. If
// the frozen source and an invariant ever disagree, the frozen source wins
// and the invariant is the bug.

export const LADDER = ["PROPOSED", "PATH_FOUND", "TYPE_COMPOSABLE", "CONTRACT_ADMISSIBLE", "EPISTEMICALLY_SUPPORTED", "VERIFIED"];
export const IMPOSSIBILITY_CODES = ["NO_SCHEMA", "NO_SHARED_PORTS", "NO_KIND_PATH", "UNIT_CONTRADICTION", "PRECONDITION_UNSATISFIED"];
export const LIT_CLASSES = ["UNEXPLORED", "EMERGING", "KNOWN", "UNVERIFIED", "OFF", "SKIPPED"];
export const OBLIGATION_STATUSES = ["PROVED", "CONDITIONALLY-SATISFIED", "UNRESOLVED", "REFUTED"];

const has = (o, k) => o && typeof o === "object" && k in o && o[k] != null;

/** Returns a list of invariant violations for a projected cascade decision. */
export const checkDecision = (d) => {
  const v = [];
  if (!LADDER.includes(d.stage)) v.push(`stage "${d.stage}" not on the ladder`);

  const pass = d.typeCheck ? d.typeCheck.pass : undefined;
  if (has(d, "impossibility") && pass !== false) v.push("impossibility present but typeCheck.pass is not false");
  if (pass === false && !has(d, "impossibility")) v.push("typeCheck.pass false but no impossibility recorded");

  // ladder ↔ block/bridge coupling for structurally composable bridges
  if (pass === true) {
    if (!d.bridge) v.push("typeCheck.pass true but no bridge");
    if (d.stage === "EPISTEMICALLY_SUPPORTED") {
      if (d.blockReason != null) v.push("EPISTEMICALLY_SUPPORTED but blockReason is set");
    } else if (d.blockReason == null) {
      v.push(`${d.stage} (not fully supported) but blockReason is null`);
    }
  } else if (pass === false) {
    if (d.bridge) v.push("typeCheck.pass false but a bridge was produced");
  }

  // proof-obligation vector: PO-1 always PROVED on a found path; ids ordered
  const O = (d.bridge && d.bridge.proofObligations) || d.obligations || [];
  if (O.length) {
    if (O[0].id !== "PO-1" || O[0].status !== "PROVED") v.push("PO-1 is not PROVED first");
    for (const o of O) if (!OBLIGATION_STATUSES.includes(o.status)) v.push(`obligation ${o.id} has unknown status ${o.status}`);
    const majors = O.map((o) => Number(String(o.id).slice(3).split(".")[0])).filter((n) => !Number.isNaN(n));
    for (let i = 1; i < majors.length; i++) if (majors[i] < majors[i - 1]) v.push("obligation ids are out of order");
  }

  // multipath ranking is risk-ascending and pruning is bounded
  if (Array.isArray(d.options)) {
    for (let i = 1; i < d.options.length; i++) if (d.options[i].risk < d.options[i - 1].risk) v.push("options not risk-ascending");
  }
  if (d.mechCompat) {
    if (d.mechCompat.prunedPaths > d.mechCompat.consideredPaths) v.push("prunedPaths exceeds consideredPaths");
  }

  // literature layer, when present, is consistent with the ladder
  if (has(d, "litClass")) {
    if (!LIT_CLASSES.includes(d.litClass)) v.push(`litClass ${d.litClass} unknown`);
    if (d.prizeCandidate) {
      if (d.stage !== "EPISTEMICALLY_SUPPORTED") v.push("prize candidate but stage is not EPISTEMICALLY_SUPPORTED");
      if (d.litClass !== "UNEXPLORED") v.push("prize candidate but litClass is not UNEXPLORED");
    }
    if (d.litClass === "UNEXPLORED" && d.mechanismGrounded && d.finalVerdict !== "PROMISING") v.push("UNEXPLORED+grounded but finalVerdict is not PROMISING");
  }
  return v;
};

/** Invariants for a doExport result. */
export const checkExport = (e) => {
  const v = [];
  const n = e.keys.length;
  if (n !== 15 && n !== 16) v.push(`export produced ${n} keys (expected 15 or 16)`);
  if (e.keys.includes("githubUser") && n !== 16) v.push("githubUser present but not 16 keys");
  if (!e.keys.includes("githubUser") && n !== 15) v.push("githubUser absent but not 15 keys");
  const REQUIRED = ["schemaVersion", "product", "generatedAt", "repoCount", "repos", "edges", "synthesisNodes", "notes", "manualLinks", "negatives", "preregs", "prizeCandidates", "ledger", "calibration", "mechCalibration"];
  for (const k of REQUIRED) if (!e.keys.includes(k)) v.push(`export missing required key ${k}`);
  return v;
};

/** Invariants for an onFile import result. */
export const checkImport = (imp) => {
  const v = [];
  if (imp.error == null && (!imp.data || !Array.isArray(imp.data.repos))) v.push("successful import but data.repos is not an array");
  if (imp.error == null && imp.data && !Array.isArray(imp.data.edges)) v.push("successful import but edges were not populated");
  return v;
};
