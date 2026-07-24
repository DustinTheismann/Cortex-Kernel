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
import { adaptersFor, pairCompat } from "../src/planner.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
// Test inputs are shared with the oracle (they define the cases, not the behavior).
const { SHAPES, UNITS, LICENSES } = await import(join(root, "test/oracle/cases.mjs"));

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
};

const run = () => {
  const strict = process.argv.includes("--strict");
  const matched = [], pending = [], failed = [];
  for (const c of manifest.cases) {
    const produce = PRODUCERS[c.caseId];
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
