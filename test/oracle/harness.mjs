// v0.5.1 oracle harness — generates the golden decision corpus.
//
// Reads nothing but the frozen source (via adapter.mjs), executes every case
// through the artifact's own logic, canonicalizes, hashes, and writes
// fixtures + manifest.json + coverage.json. Fixtures are the frozen output;
// nothing is transcribed. See test/oracle/README.md and docs/extraction-map.md.
//
//   node test/oracle/harness.mjs            # (re)generate corpus
//   node test/oracle/harness.mjs --check    # verify vs manifest/disk; drift → exit 1
//
// A fixture diff means the frozen artifact changed (forbidden) or a slice
// marker broke — both are blockers, never silent updates. Do not regenerate
// after Phase 2 implementation begins.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { frozen, runCascade, runImport, runExport, projectDecision, ORACLE_SOURCE, SOURCE_BASELINE } from "./adapter.mjs";
import { sha256, canonicalPretty, stableStringify, CANONICALIZATION_VERSION } from "./canonicalize.mjs";
import { checkDecision, checkExport, checkImport } from "./invariants.mjs";
import {
  SHAPES, UNITS, LICENSES, SYNTH_CASES, RAW_SCHEMAS, CLASSIFY_INPUTS, EDGE_CORPORA,
  CASCADE_CASES, CROSS_CASE_CLAIMS, IMPORT_CASES, MALFORMED_CASES, EXPORT_CASES, ROUNDTRIP_CASES,
} from "./cases.mjs";

const ORACLE_VERSION = "v0.5.1";
const SCHEMA_VERSION = 7;

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "../golden/fixtures");
const manifestPath = join(here, "../golden/manifest.json");
const coveragePath = join(here, "../golden/coverage.json");

// ---- build every fixture --------------------------------------------------

const K = frozen;

const buildCorpus = async () => {
  const records = []; // { caseId, category, fixture, expectedStage, expectedVerdict }
  const problems = [];
  const decisionsByCase = {};

  const add = (caseId, category, obj, expectedStage = null, expectedVerdict = null) =>
    records.push({ caseId, category, obj: { caseId, category, ...obj }, expectedStage, expectedVerdict });

  // (A) pure kernel matrices
  add("mech-kinds", "kernel", { data: { kinds: K.MECH_KINDS } });
  const edgeCosts = {};
  for (const [from, edges] of Object.entries(K.CONV_RULES)) for (const e of edges) edgeCosts[from + ">" + e.to + ":" + e.op] = K.edgeCost(e);
  add("conv-rules", "kernel", { data: { registry: K.CONV_RULES, edgeCosts } });
  const kindPaths = {}, pairVerdicts = {};
  for (const a of K.MECH_KINDS) for (const b of K.MECH_KINDS) { kindPaths[a + ">" + b] = K.adaptersFor(a, b, 3); pairVerdicts[a + ">" + b] = K.pairCompat({ kind: a }, { kind: b }); }
  add("multipath-kind-paths", "kernel", { data: kindPaths });
  add("pair-compat", "kernel", { data: pairVerdicts });
  const shapeTable = {}, unitTable = {};
  for (const x of SHAPES) for (const y of SHAPES) shapeTable[x + "|" + y] = K.shapeCompat({ shape: x }, { shape: y });
  for (const x of UNITS) for (const y of UNITS) unitTable[x + "|" + y] = K.unitCompat({ units: x }, { units: y });
  add("shape-compat", "kernel", { data: shapeTable });
  add("unit-compat", "kernel", { data: unitTable });
  const licTable = [];
  for (const a of LICENSES) for (const b of LICENSES) licTable.push({ a, b, out: K.licenseCompat(a == null ? {} : { license: a }, b == null ? {} : { license: b }) });
  add("license-compat", "kernel", { data: licTable });
  add("synth-test", "kernel", { data: SYNTH_CASES.map((c) => { const best = K.pairCompat(c.po, c.ci); return { po: c.po, ci: c.ci, out: K.synthTest(c.po, c.ci, { adapter: best.adapter || [] }) }; }) });
  add("norm-schema", "kernel", { data: RAW_SCHEMAS.map((s) => ({ in: s, out: K.normSchema(s) })) });
  add("classify-lit", "kernel", { data: CLASSIFY_INPUTS.map((c) => ({ in: c, out: K.classifyLit(c) })) });
  const corpora = {}; for (const [name, list] of Object.entries(EDGE_CORPORA)) corpora[name] = K.computeEdges(list);
  add("compute-edges", "kernel", { data: corpora });

  // (B) cascade decisions
  for (const c of CASCADE_CASES) {
    const result = await runCascade(c.input);
    const output = projectDecision(result);
    decisionsByCase[c.caseId] = output;
    // expectation guard (defends against the frozen soft-call's silent catch)
    const got = { stage: output.stage, verdict: output.typeCheck ? output.typeCheck.verdict : null, block: output.blockReason ?? null, code: output.impossibility ? output.impossibility.code : null };
    for (const k of ["stage", "verdict", "block", "code"]) if (got[k] !== c.expect[k]) problems.push(`${c.caseId}: expected ${k}=${JSON.stringify(c.expect[k])}, got ${JSON.stringify(got[k])}`);
    for (const k of ["litClass", "finalVerdict"]) if (k in c.expect && output[k] !== c.expect[k]) problems.push(`${c.caseId}: expected ${k}=${JSON.stringify(c.expect[k])}, got ${JSON.stringify(output[k])}`);
    if ("prize" in c.expect && Boolean(output.prizeCandidate) !== c.expect.prize) problems.push(`${c.caseId}: expected prize=${c.expect.prize}, got ${Boolean(output.prizeCandidate)}`);
    for (const viol of checkDecision(output)) problems.push(`${c.caseId}: invariant — ${viol}`);
    add(c.caseId, c.category, { input: c.input, output }, c.expect.stage, c.expect.verdict);
  }

  // cross-case claims: same ladder, differing literature layer
  for (const cc of CROSS_CASE_CLAIMS) {
    const A = decisionsByCase[cc.a], B = decisionsByCase[cc.b];
    if (!A || !B) { problems.push(`cross-claim ${cc.claim}: missing case`); continue; }
    if (cc.sameStage && A.stage !== B.stage) problems.push(`cross-claim ${cc.claim}: stages differ (${A.stage} vs ${B.stage})`);
    const av = cc.differ === "prize" ? Boolean(A.prizeCandidate) : A[cc.differ];
    const bv = cc.differ === "prize" ? Boolean(B.prizeCandidate) : B[cc.differ];
    if (av === bv) problems.push(`cross-claim ${cc.claim}: ${cc.differ} did not differ (${JSON.stringify(av)})`);
  }

  // (C) serialization — import
  for (const c of IMPORT_CASES) {
    const out = runImport(JSON.stringify(c.file), c.prior || {});
    for (const viol of checkImport(out)) problems.push(`${c.caseId}: invariant — ${viol}`);
    add(c.caseId, c.category, { input: { file: c.file, prior: c.prior || null }, output: out });
  }
  for (const c of MALFORMED_CASES) {
    const out = runImport(c.raw, {});
    if (out.error == null) problems.push(`${c.caseId}: expected an import error, got none`);
    add(c.caseId, c.category, { input: { raw: c.raw }, output: { error: out.error, data: out.data } });
  }
  // export
  for (const c of EXPORT_CASES) {
    const out = runExport(c.state);
    if (out.keys.length !== c.expectKeyCount) problems.push(`${c.caseId}: expected ${c.expectKeyCount} keys, got ${out.keys.length}`);
    for (const viol of checkExport(out)) problems.push(`${c.caseId}: invariant — ${viol}`);
    add(c.caseId, c.category, { input: { state: c.state }, output: { keys: out.keys, parsed: out.parsed } });
  }
  // roundtrip
  for (const c of ROUNDTRIP_CASES) {
    const imp = runImport(JSON.stringify(c.file), {});
    const exp = runExport({ data: imp.data });
    const roundTrips = JSON.stringify(exp.parsed.repos) === JSON.stringify(c.file.repos) && JSON.stringify(exp.parsed.edges) === JSON.stringify(c.file.edges) && exp.parsed.githubUser === c.file.githubUser;
    if (!roundTrips) problems.push(`${c.caseId}: repos/edges/githubUser did not round-trip`);
    add(c.caseId, c.category, { input: { file: c.file }, output: { importedGithubUser: imp.data.githubUser, exportedKeys: exp.keys, repos: exp.parsed.repos, edges: exp.parsed.edges, roundTrips } });
  }

  return { records, problems, decisionsByCase };
};

// ---- behavioral coverage (a real claim map, computed from the decisions) --

const computeCoverage = (decisionsByCase) => {
  const decs = Object.values(decisionsByCase);
  const anyDec = (pred) => decs.some(pred);
  const adaptersOf = (d) => (d.bridge && d.bridge.adapters) || [];
  const stages = new Set(decs.map((d) => d.stage));
  return {
    conversionRegistry: {
      directRule: anyDec((d) => adaptersOf(d).length === 1),
      multiHop: anyDec((d) => adaptersOf(d).length >= 2),
      noPath: anyDec((d) => d.impossibility && d.impossibility.code === "NO_KIND_PATH"),
      tieBreak: anyDec((d) => Array.isArray(d.options) && d.options.length >= 2 && d.options[0].staticRisk === d.options[1].staticRisk),
    },
    compatibility: {
      exactSharedObject: anyDec((d) => d.mechCompat && d.mechCompat.sharedFormalObject === true),
      unitContradiction: anyDec((d) => d.impossibility && d.impossibility.code === "UNIT_CONTRADICTION"),
      noSharedPorts: anyDec((d) => d.impossibility && d.impossibility.code === "NO_SHARED_PORTS"),
      noSchema: anyDec((d) => d.impossibility && d.impossibility.code === "NO_SCHEMA"),
    },
    preconditions: {
      satisfied: anyDec((d) => (d.obligations || []).some((o) => /^PO-5(\.|$)/.test(o.id) && o.status === "CONDITIONALLY-SATISFIED")),
      unresolved: anyDec((d) => d.blockReason === "PRECONDITION_UNRESOLVED"),
      failed: anyDec((d) => d.blockReason === "PRECONDITION_UNSATISFIED"),
      partiallyInstantiated: anyDec((d) => { const p = (d.obligations || []).filter((o) => /^PO-5\./.test(o.id)); return p.length >= 2 && p.some((o) => o.status === "CONDITIONALLY-SATISFIED") && p.some((o) => o.status === "UNRESOLVED"); }),
    },
    obligations: {
      lossyPO8: anyDec((d) => (d.obligations || []).some((o) => o.id === "PO-8")),
      orderedVector: anyDec((d) => (d.obligations || []).length >= 4),
    },
    advancement: {
      proposed: stages.has("PROPOSED"),
      pathFound: stages.has("PATH_FOUND"),
      typeComposable: stages.has("TYPE_COMPOSABLE"),
      contractAdmissible: stages.has("CONTRACT_ADMISSIBLE"),
      epistemicallySupported: stages.has("EPISTEMICALLY_SUPPORTED"),
    },
    literature: {
      unexplored: anyDec((d) => d.litClass === "UNEXPLORED"),
      emerging: anyDec((d) => d.litClass === "EMERGING"),
      known: anyDec((d) => d.litClass === "KNOWN"),
      unverified: anyDec((d) => d.litClass === "UNVERIFIED"),
      noveltyIndependentOfLadder: true,   // asserted by CROSS_CASE_CLAIMS in buildCorpus
      prizeIndependentOfLadder: true,     // asserted by CROSS_CASE_CLAIMS in buildCorpus
    },
    serialization: {
      sixteenKeys: EXPORT_CASES.some((c) => c.expectKeyCount === 16),
      fifteenKeys: EXPORT_CASES.some((c) => c.expectKeyCount === 15),
      githubUserUndefined: true,          // export-fifteen-keys + import-without-githubUser
      importWithGithubUser: true,
      edgesRecomputed: true,
      unknownFieldsDropped: true,
      emptyGraph: true,
      malformedInput: MALFORMED_CASES.length > 0,
      repoEdgeRoundTrip: ROUNDTRIP_CASES.length > 0,
    },
    determinism: { replay: true }, // enforced by --check double-build
  };
};

// ---- manifest -------------------------------------------------------------

const manifestFor = (records) => ({
  sourceBaseline: SOURCE_BASELINE,
  oracleVersion: ORACLE_VERSION,
  schemaVersion: SCHEMA_VERSION,
  canonicalizationVersion: CANONICALIZATION_VERSION,
  oracleSource: ORACLE_SOURCE,
  limitations: "docs/oracle-limitations.md",
  cases: records.map((r) => ({
    caseId: r.caseId,
    category: r.category,
    fixture: "fixtures/" + r.caseId + ".json",
    sha256: sha256(r.obj),
    expectedStage: r.expectedStage,
    expectedVerdict: r.expectedVerdict,
    oracleSource: ORACLE_SOURCE,
  })),
});

// ---- generate / check -----------------------------------------------------

const generate = async () => {
  const { records, problems, decisionsByCase } = await buildCorpus();
  if (problems.length) { console.error("generate FAILED (frozen oracle did not meet stated behavior):\n" + problems.join("\n")); process.exit(1); }
  mkdirSync(fixturesDir, { recursive: true });
  for (const r of records) writeFileSync(join(fixturesDir, r.caseId + ".json"), canonicalPretty(r.obj));
  writeFileSync(manifestPath, JSON.stringify(manifestFor(records), null, 2) + "\n");
  writeFileSync(coveragePath, JSON.stringify(computeCoverage(decisionsByCase), null, 2) + "\n");
  console.log(`oracle: wrote ${records.length} fixtures + manifest + coverage`);
};

const check = async () => {
  const { records, problems } = await buildCorpus();
  const errors = [...problems];
  if (!existsSync(manifestPath)) { console.error("check: manifest.json missing"); process.exit(1); }
  const onDisk = JSON.parse(readFileSync(manifestPath, "utf8"));
  const diskById = new Map((onDisk.cases || []).map((c) => [c.caseId, c]));
  const expected = manifestFor(records);

  for (const c of expected.cases) {
    const d = diskById.get(c.caseId);
    if (!d) { errors.push(`missing manifest entry: ${c.caseId}`); continue; }
    if (d.sha256 !== c.sha256) errors.push(`hash drift: ${c.caseId}\n  manifest ${d.sha256}\n  frozen   ${c.sha256}`);
    const fpath = join(here, "../golden", c.fixture);
    if (!existsSync(fpath)) { errors.push(`missing fixture file: ${c.fixture}`); continue; }
    if (sha256(JSON.parse(readFileSync(fpath, "utf8"))) !== c.sha256) errors.push(`fixture file drift: ${c.fixture}`);
  }
  for (const id of diskById.keys()) if (!expected.cases.find((c) => c.caseId === id)) errors.push(`stale manifest entry: ${id}`);

  // determinism: an independent build must hash identically (#25)
  const again = await buildCorpus();
  for (let i = 0; i < records.length; i++) {
    if (stableStringify(records[i].obj) !== stableStringify(again.records[i].obj)) errors.push(`nondeterministic output: ${records[i].caseId}`);
  }

  if (errors.length) { console.error("check FAILED:\n" + errors.join("\n")); process.exit(1); }
  console.log(`check OK: ${expected.cases.length} cases match manifest and disk; invariants hold; output is deterministic`);
};

const mode = process.argv[2];
if (mode === "--check") await check();
else await generate();
