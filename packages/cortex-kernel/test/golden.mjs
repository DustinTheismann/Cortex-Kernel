// kernel:golden — the parity gate.
//
// Reproduces Phase 1 golden fixtures from the EXTRACTED kernel and compares
// each against the oracle's manifest hash, using the same canonicalization.
// Producers are added as modules reach parity; unimplemented cases are
// reported as pending (never silently skipped). When every manifest case has a
// producer and all hashes match, Phase 2 parity is complete.
//
//   node test/golden.mjs            # summary (matched / pending / FAILED)
//   node test/golden.mjs --check    # exit 1 on any mismatch (missing producers allowed until parity)
//   node test/golden.mjs --strict   # additionally require every case to have a producer

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import { sha256 } from "../../../test/oracle/canonicalize.mjs";

import { MECH_KINDS } from "../src/types.js";
import { CONV_RULES, edgeCost } from "../src/registry.js";
import { shapeCompat, unitCompat, licenseCompat } from "../src/compatibility.js";
import { adaptersFor, pairCompat, planPortBridges } from "../src/planner.js";
import { synthTest } from "../src/obligations.js";
import { normSchema } from "../src/compatibility.js";
import { classifyLit } from "../src/verdicts.js";
import { evaluateCascade } from "../src/index.js";
import { computeEdges, importBrainIndex, exportBrainIndex } from "../src/serialization.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
// Test inputs are shared with the oracle (they define the cases, not the behavior).
const { SHAPES, UNITS, LICENSES, SYNTH_CASES, CLASSIFY_INPUTS, RAW_SCHEMAS, EDGE_CORPORA } = await import(join(root, "test/oracle/cases.mjs"));
const fixtureInput = (caseId) => JSON.parse(readFileSync(join(root, "test/golden/fixtures", caseId + ".json"), "utf8")).input;

// Cascade categories run the full evaluateCascade over the fixture's input.
// The `model` policy is resolved into per-ruleId soft evidence exactly as the
// frozen soft-judgment call was answered (over the planned top-3 options).
const CASCADE_CATEGORIES = new Set(["compatibility", "planning", "preconditions", "obligations", "ladder", "literature"]);
const resolveSoft = (schemaA, schemaB, model = {}) => {
  const { options } = planPortBridges(normSchema(schemaA), normSchema(schemaB));
  const preconditions = {};
  options.forEach((o) => o.adapters.forEach((s) => { if (s.auth === "cur" && s.pre) preconditions[s.ruleId] = (model.preOverrides && model.preOverrides[s.ruleId]) || model.pre || "unknown"; }));
  return { preconditions, invariantPreserved: model.invariant || "unknown", metricMeaningful: model.metric || "unknown", note: model.note || "" };
};
const cascadeProduce = (caseId, category) => {
  const input = fixtureInput(caseId);
  const soft = resolveSoft(input.schemaA, input.schemaB, input.model);
  const output = evaluateCascade({ schemaA: input.schemaA, schemaB: input.schemaB, repoA: { id: "repoA" }, repoB: { id: "repoB" }, soft, litGround: input.litGround, litCount: input.litCount });
  return { caseId, category, input, output };
};

// Serialization producers reproduce the oracle harness's per-family output shapes.
const serializationProduce = (caseId, category) => {
  const input = fixtureInput(caseId);
  if (caseId.startsWith("export-")) {
    const out = exportBrainIndex(input.state);
    return { caseId, category, input, output: { keys: out.keys, parsed: out.parsed } };
  }
  if (caseId.startsWith("roundtrip-")) {
    const imp = importBrainIndex(JSON.stringify(input.file), {});
    const exp = exportBrainIndex({ data: imp.data });
    const roundTrips = JSON.stringify(exp.parsed.repos) === JSON.stringify(input.file.repos) && JSON.stringify(exp.parsed.edges) === JSON.stringify(input.file.edges) && exp.parsed.githubUser === input.file.githubUser;
    return { caseId, category, input, output: { importedGithubUser: imp.data.githubUser, exportedKeys: exp.keys, repos: exp.parsed.repos, edges: exp.parsed.edges, roundTrips } };
  }
  // import-*
  const out = importBrainIndex(JSON.stringify(input.file), input.prior || {});
  return { caseId, category, input, output: out };
};
const malformedProduce = (caseId, category) => {
  const input = fixtureInput(caseId);
  const out = importBrainIndex(input.raw, {});
  return { caseId, category, input, output: { error: out.error, data: out.data } };
};

// caseId → () => fixture object (must match the oracle's { caseId, category, ...data } shape)
const PRODUCERS = {
  "mech-kinds": () => ({ caseId: "mech-kinds", category: "kernel", data: { kinds: MECH_KINDS } }),
  "conv-rules": () => {
    const edgeCosts = {};
    for (const [from, edges] of Object.entries(CONV_RULES)) for (const e of edges) edgeCosts[from + ">" + e.to + ":" + e.op] = edgeCost(e);
    return { caseId: "conv-rules", category: "kernel", data: { registry: CONV_RULES, edgeCosts } };
  },
  "shape-compat": () => {
    const t = {};
    for (const x of SHAPES) for (const y of SHAPES) t[x + "|" + y] = shapeCompat({ shape: x }, { shape: y });
    return { caseId: "shape-compat", category: "kernel", data: t };
  },
  "unit-compat": () => {
    const t = {};
    for (const x of UNITS) for (const y of UNITS) t[x + "|" + y] = unitCompat({ units: x }, { units: y });
    return { caseId: "unit-compat", category: "kernel", data: t };
  },
  "license-compat": () => {
    const t = [];
    for (const a of LICENSES) for (const b of LICENSES) t.push({ a, b, out: licenseCompat(a == null ? {} : { license: a }, b == null ? {} : { license: b }) });
    return { caseId: "license-compat", category: "kernel", data: t };
  },
  "multipath-kind-paths": () => {
    const t = {};
    for (const a of MECH_KINDS) for (const b of MECH_KINDS) t[a + ">" + b] = adaptersFor(a, b, 3);
    return { caseId: "multipath-kind-paths", category: "kernel", data: t };
  },
  "pair-compat": () => {
    const t = {};
    for (const a of MECH_KINDS) for (const b of MECH_KINDS) t[a + ">" + b] = pairCompat({ kind: a }, { kind: b });
    return { caseId: "pair-compat", category: "kernel", data: t };
  },
  "synth-test": () => ({
    caseId: "synth-test", category: "kernel",
    data: SYNTH_CASES.map((c) => {
      const best = pairCompat(c.po, c.ci);
      return { po: c.po, ci: c.ci, out: synthTest(c.po, c.ci, { adapter: best.adapter || [] }) };
    }),
  }),
  "classify-lit": () => ({ caseId: "classify-lit", category: "kernel", data: CLASSIFY_INPUTS.map((c) => ({ in: c, out: classifyLit(c) })) }),
  "norm-schema": () => ({ caseId: "norm-schema", category: "kernel", data: RAW_SCHEMAS.map((s) => ({ in: s, out: normSchema(s) })) }),
  "compute-edges": () => {
    const corpora = {};
    for (const [name, list] of Object.entries(EDGE_CORPORA)) corpora[name] = computeEdges(list);
    return { caseId: "compute-edges", category: "kernel", data: corpora };
  },
};

const run = () => {
  const strict = process.argv.includes("--strict");
  const matched = [], pending = [], failed = [];
  for (const c of manifest.cases) {
    let produce = PRODUCERS[c.caseId];
    if (!produce && CASCADE_CATEGORIES.has(c.category)) produce = () => cascadeProduce(c.caseId, c.category);
    if (!produce && c.category === "serialization") produce = () => serializationProduce(c.caseId, c.category);
    if (!produce && c.category === "malformed") produce = () => malformedProduce(c.caseId, c.category);
    if (!produce) { pending.push(c.caseId); continue; }
    const got = sha256(produce());
    if (got === c.sha256) matched.push(c.caseId);
    else failed.push({ caseId: c.caseId, expected: c.sha256, got });
  }

  console.log(`kernel:golden — matched ${matched.length}, pending ${pending.length}, failed ${failed.length} (of ${manifest.cases.length})`);
  if (pending.length) console.log("  pending: " + pending.join(", "));
  for (const f of failed) console.error(`  FAILED ${f.caseId}\n    expected ${f.expected}\n    got      ${f.got}`);

  const bad = failed.length > 0 || (strict && pending.length > 0);
  if (bad) process.exit(1);
};

run();
