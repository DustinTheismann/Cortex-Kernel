// v0.5.1 oracle harness.
//
// Reads the FROZEN standalone source (reference/src/cortex-v0.5.1.jsx),
// slices the deterministic kernel definitions out of it VERBATIM, and
// executes them to capture canonical decisions. Nothing is transcribed or
// re-implemented: the fixtures are the frozen artifact's own output.
//
// Two capture surfaces:
//   1. Pure kernel functions (kinds, rules, compatibility, multipath
//      search/ranking, property-test skeleton, schema normalization,
//      literature classification, schema-v7 edge derivation) — executed
//      with no stubs at all.
//   2. The verifyCascade CORE (contract instantiation → proof-obligation
//      status → verdict advancement) — sliced verbatim and executed with a
//      single deterministic stub at the model boundary (window.claude), the
//      only nondeterministic dependency inside that region. React state
//      setters are not reached by the sliced region; the sole outside call
//      is the soft-judgment model request, whose reply we supply from each
//      case's `model` policy. This runs the frozen decision logic itself.
//
// Usage:
//   node test/oracle/harness.mjs            # (re)generate fixtures + manifest
//   node test/oracle/harness.mjs --check    # verify fixtures/manifest match; exit 1 on drift
//
// A fixture diff means either the frozen artifact changed (forbidden) or a
// slice marker broke — both are extraction blockers, never silent updates.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, canonicalPretty, stableStringify } from "./canonicalize.mjs";
import {
  SHAPES, UNITS, LICENSES, SYNTH_CASES, RAW_SCHEMAS, CLASSIFY_INPUTS,
  EDGE_CORPORA, COMPILE_CASES,
} from "./cases.mjs";

const SOURCE_BASELINE = "804f767";
const ORACLE_SOURCE = "reference/src/cortex-v0.5.1.jsx";
const SCHEMA_VERSION = 7; // the reference export contract (schemaVersion 7)

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const srcPath = join(root, ORACLE_SOURCE);
const src = readFileSync(srcPath, "utf8");

// ---- verbatim slicing of the frozen source -------------------------------

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

// class-field declarations → const declarations
const kindsDecl = "const " + sliceLine("MECH_KINDS = [");
const rulesDecl = "const " + sliceLine("CONV_RULES = {");
const ubiqDecl = "const " + sliceLine("UBIQUITOUS = [");
// pure helpers used by computeEdges / the compiler / the cascade core
const famDecl = sliceLine("const fam = (name) =>");
const parseCombosDecl = sliceBetween("const parseCombos = (txt) =>", "const runSynth = async");
const compilerBlock = sliceBetween("const edgeCost =", "// ---------- VERIFICATION CASCADE");
const normDecl = sliceLine("const normSchema = (s) =>");
const litDecl = sliceLine("const LIT_KNOWN = ");
const classifyDecl = sliceLine("const classifyLit = (count) =>");
const computeEdgesBlock = sliceBetween("const computeEdges = useCallback", "// ---------- persistence");
// the verifyCascade CORE: contract instantiation → obligations → ladder
const verdictCore = sliceBetween("const portPairsFor = (it) =>", "// 3) preregistered literature probe");

// Build the frozen kernel in an isolated scope. `useCallback` is shimmed to
// the identity so the verbatim `computeEdges = useCallback((list)=>{...},[])`
// evaluates to the plain function; no other React primitive is touched.
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

  // Runs the frozen verifyCascade core over a single prepared item.
  // The only free dependency inside this region is window.claude (the soft
  // judgment call); it is injected. React setters are not reached here.
  async function runVerdictCore(items, byId, windowStub) {
    const window = windowStub;
    ${verdictCore}
    return items;
  }

  return { MECH_KINDS, CONV_RULES, edgeCost, adaptersFor, pairCompat,
           shapeCompat, unitCompat, licenseCompat, licKey, synthTest,
           normSchema, classifyLit, LIT_KNOWN, LIT_EMERGING, computeEdges,
           runVerdictCore };
`);
const K = factory();

// ---- deterministic stub for the soft-judgment model boundary -------------

// The frozen soft call sends a prompt whose final line is JSON.stringify(inp),
// where inp = [{ ix, producerOutput, consumerInput, preconditions:[{id,text}] }].
// We answer each asked precondition with the case policy, plus invariant/metric.
const makeModelStub = (model) => ({
  claude: {
    complete: async ({ messages }) => {
      const content = String(messages[0].content);
      const lines = content.split("\n");
      let inp = null;
      for (let i = lines.length - 1; i >= 0 && !inp; i--) {
        const t = lines[i].trim();
        if (t.startsWith("[")) { try { const p = JSON.parse(t); if (Array.isArray(p)) inp = p; } catch (_) { /* keep scanning */ } }
      }
      inp = inp || [];
      const statusFor = (id) => (model.preOverrides && model.preOverrides[id]) || model.pre || "unknown";
      const reply = inp.map((e) => ({
        ix: e.ix,
        preconditions: Object.fromEntries((e.preconditions || []).map((p) => [p.id, statusFor(p.id)])),
        invariantPreserved: model.invariant || "unknown",
        metricMeaningful: model.metric || "unknown",
        note: model.note || "",
      }));
      return JSON.stringify(reply);
    },
  },
});

// ---- run one compile case through the frozen core ------------------------

const runCompileCase = async (c) => {
  // Mirror line 855: schemas enter the compiler as normSchema() output.
  const item = {
    schemaA: K.normSchema(c.schemaA),
    schemaB: K.normSchema(c.schemaB),
    _ridA: "repoA",
    _ridB: "repoB",
  };
  const byId = {
    repoA: { id: "repoA", ...(c.repoA || {}) },
    repoB: { id: "repoB", ...(c.repoB || {}) },
  };
  await K.runVerdictCore([item], byId, makeModelStub(c.model || {}));
  return item;
};

const projectDecision = (it) => ({
  stage: it.stage ?? null,
  typeCheck: it.typeCheck ?? null,
  blockReason: it.blockReason ?? null,
  impossibility: it.impossibility ?? null,
  mechClass: it.mechClass ?? null,
  mechCompat: it.mechCompat ?? null,
  bridge: it.bridge ?? null,
  obligations: it.obligations ?? null,
  options: it._options ?? null,
});

// Guard against the frozen soft call's silent `catch(e){}`: if the stub reply
// were malformed, every precondition would fall back to UNRESOLVED and the
// captured stage would be wrong. Assert the intended decision was reached.
const assertExpectation = (c, out) => {
  const e = c.expect;
  if (!e) return;
  const got = {
    stage: out.stage,
    pass: out.typeCheck ? out.typeCheck.pass : null,
    verdict: out.typeCheck ? out.typeCheck.verdict : null,
    blockReason: out.blockReason,
    code: out.impossibility ? out.impossibility.code : null,
  };
  for (const k of Object.keys(e)) {
    if (got[k] !== e[k]) {
      throw new Error(`compile case ${c.caseId}: expected ${k}=${JSON.stringify(e[k])}, got ${JSON.stringify(got[k])}`);
    }
  }
};

// ---- assemble all fixtures ------------------------------------------------

const buildFixtures = async () => {
  const fx = []; // { caseId, data }

  // (A) pure kernel matrices
  fx.push({ caseId: "mech-kinds", data: { kinds: K.MECH_KINDS } });

  const edgeCosts = {};
  for (const [from, edges] of Object.entries(K.CONV_RULES))
    for (const e of edges) edgeCosts[from + ">" + e.to + ":" + e.op] = K.edgeCost(e);
  fx.push({ caseId: "conv-rules", data: { registry: K.CONV_RULES, edgeCosts } });

  const kindPaths = {};
  const pairVerdicts = {};
  for (const a of K.MECH_KINDS) for (const b of K.MECH_KINDS) {
    kindPaths[a + ">" + b] = K.adaptersFor(a, b, 3);
    pairVerdicts[a + ">" + b] = K.pairCompat({ kind: a }, { kind: b });
  }
  fx.push({ caseId: "multipath-kind-paths", data: kindPaths });
  fx.push({ caseId: "pair-compat", data: pairVerdicts });

  const shapeTable = {}, unitTable = {};
  for (const x of SHAPES) for (const y of SHAPES) shapeTable[x + "|" + y] = K.shapeCompat({ shape: x }, { shape: y });
  for (const x of UNITS) for (const y of UNITS) unitTable[x + "|" + y] = K.unitCompat({ units: x }, { units: y });
  fx.push({ caseId: "shape-compat", data: shapeTable });
  fx.push({ caseId: "unit-compat", data: unitTable });

  const licTable = [];
  for (const a of LICENSES) for (const b of LICENSES)
    licTable.push({ a, b, out: K.licenseCompat(a == null ? {} : { license: a }, b == null ? {} : { license: b }) });
  fx.push({ caseId: "license-compat", data: licTable });

  fx.push({
    caseId: "synth-test",
    data: SYNTH_CASES.map((c) => {
      const best = K.pairCompat(c.po, c.ci);
      return { po: c.po, ci: c.ci, adapters: (best.adapter || []).map((s) => s.op), out: K.synthTest(c.po, c.ci, { adapter: best.adapter || [] }) };
    }),
  });

  fx.push({ caseId: "norm-schema", data: RAW_SCHEMAS.map((s) => ({ in: s, out: K.normSchema(s) })) });
  fx.push({ caseId: "classify-lit", data: CLASSIFY_INPUTS.map((c) => ({ in: c, out: K.classifyLit(c) })) });

  const corpora = {};
  for (const [name, list] of Object.entries(EDGE_CORPORA)) corpora[name] = K.computeEdges(list);
  fx.push({ caseId: "compute-edges", data: corpora });

  // (B) verdict-engine cases (frozen verifyCascade core)
  for (const c of COMPILE_CASES) {
    const it = await runCompileCase(c);
    const out = projectDecision(it);
    assertExpectation(c, out);
    fx.push({ caseId: "compile-" + c.caseId, data: { input: { schemaA: c.schemaA, schemaB: c.schemaB, model: c.model || {} }, output: out } });
  }

  return fx;
};

// The extraction blockers: logic that cannot be captured verbatim from the
// frozen source because it is intrinsically nondeterministic or DOM/React
// coupled. Recorded explicitly per the extraction contract.
const BLOCKERS = [
  {
    area: "model-schema-extraction",
    sourceLines: "839-855 (verifyCascade step 1)",
    reason: "Typed mechanism schemas are inferred by window.claude.complete — nondeterministic model output; cannot be a golden oracle.",
    boundary: "Captured instead at its output: schemas are supplied directly as the compiler input (schemaA/schemaB) in every compile-* case.",
  },
  {
    area: "soft-obligation-judgments",
    sourceLines: "872-881 (verifyCascade step 2 model call)",
    reason: "Per-edge precondition statuses and invariant/metric judgments are model-supplied — nondeterministic in situ.",
    boundary: "Injected deterministically at the model boundary (window.claude stub driven by each case's `model` policy); the surrounding contract-instantiation/PO/ladder logic runs verbatim from the frozen source.",
  },
  {
    area: "literature-probe",
    sourceLines: "926-943 (verifyCascade step 3)",
    reason: "openAlexCount performs a live OpenAlex network request; litEstimateViaModel falls back to the model; entries carry wall-clock timestamps and uid() ids.",
    boundary: "Not captured in Phase 1 — network + nondeterministic. classifyLit boundaries (the pure classifier) ARE captured separately.",
  },
  {
    area: "prize-candidate-export",
    sourceLines: "944-957 (verifyCascade step 4)",
    reason: "setCandidates/setPreregs/setProbeLog/doExport mutate React state and trigger a browser download; uid() and timestamps throughout.",
    boundary: "Not captured — UI-coupled and nondeterministic.",
  },
  {
    area: "schema-v7-import-export-envelope",
    sourceLines: "711-733 (onFile), 751-757 (doExport)",
    reason: "onFile/doExport depend on FileReader, Blob, document.createElement, setData, sset and React state — DOM/React coupled.",
    boundary: "The pure edge-derivation (computeEdges) IS captured. The deterministic envelope transforms (notes array↔map, mechCalibration keying + silent drop, unknown-key drop on re-export, 15-vs-16-key serialization) are enumerated in data/brain-index.schema and require a stubbed-execution harness in a later phase.",
  },
];

// ---- write / check --------------------------------------------------------

const fixturesDir = join(here, "../golden/fixtures");
const manifestPath = join(here, "../golden/manifest.json");

const manifestFor = (fx) => ({
  sourceBaseline: SOURCE_BASELINE,
  oracleSource: ORACLE_SOURCE,
  schemaVersion: SCHEMA_VERSION,
  note: "sha256 is over the canonical encoding (test/oracle/canonicalize.mjs) of each fixture file. Array order is significant and preserved; only timestamps and uid()-minted ids are stripped.",
  cases: fx.map((f) => ({
    caseId: f.caseId,
    oracleSource: ORACLE_SOURCE,
    sourceBaseline: SOURCE_BASELINE,
    schemaVersion: SCHEMA_VERSION,
    sha256: sha256({ caseId: f.caseId, ...f.data }),
    fixture: "fixtures/" + f.caseId + ".json",
  })),
  blockers: BLOCKERS,
});

const generate = async () => {
  const fx = await buildFixtures();
  mkdirSync(fixturesDir, { recursive: true });
  for (const f of fx) writeFileSync(join(fixturesDir, f.caseId + ".json"), canonicalPretty({ caseId: f.caseId, ...f.data }));
  writeFileSync(manifestPath, JSON.stringify(manifestFor(fx), null, 2) + "\n");
  console.log(`oracle: wrote ${fx.length} fixtures + manifest (${fixturesDir})`);
};

const check = async () => {
  const fx = await buildFixtures();
  const expected = manifestFor(fx);
  const problems = [];

  if (!existsSync(manifestPath)) { console.error("check: manifest.json missing"); process.exit(1); }
  const onDisk = JSON.parse(readFileSync(manifestPath, "utf8"));
  const diskById = new Map((onDisk.cases || []).map((c) => [c.caseId, c]));

  for (const c of expected.cases) {
    const d = diskById.get(c.caseId);
    if (!d) { problems.push(`missing manifest entry: ${c.caseId}`); continue; }
    if (d.sha256 !== c.sha256) problems.push(`hash drift: ${c.caseId}\n  manifest ${d.sha256}\n  frozen   ${c.sha256}`);
    const fpath = join(here, "../golden", c.fixture);
    if (!existsSync(fpath)) { problems.push(`missing fixture file: ${c.fixture}`); continue; }
    const fileHash = sha256(JSON.parse(readFileSync(fpath, "utf8")));
    if (fileHash !== c.sha256) problems.push(`fixture file drift: ${c.fixture}`);
  }
  for (const id of diskById.keys())
    if (!expected.cases.find((c) => c.caseId === id)) problems.push(`stale manifest entry: ${id}`);

  // determinism self-check: two independent builds must hash identically
  const fx2 = await buildFixtures();
  for (let i = 0; i < fx.length; i++) {
    const a = stableStringify({ caseId: fx[i].caseId, ...fx[i].data });
    const b = stableStringify({ caseId: fx2[i].caseId, ...fx2[i].data });
    if (a !== b) problems.push(`nondeterministic output: ${fx[i].caseId}`);
  }

  if (problems.length) { console.error("check FAILED:\n" + problems.join("\n")); process.exit(1); }
  console.log(`check OK: ${expected.cases.length} cases match manifest and disk; output is deterministic`);
};

const mode = process.argv[2];
if (mode === "--check") await check();
else await generate();
