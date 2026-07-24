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

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));

// caseId → () => fixture object (must match the oracle's { caseId, category, ...data } shape)
const PRODUCERS = {
  "mech-kinds": () => ({ caseId: "mech-kinds", category: "kernel", data: { kinds: MECH_KINDS } }),
  "conv-rules": () => {
    const edgeCosts = {};
    for (const [from, edges] of Object.entries(CONV_RULES)) for (const e of edges) edgeCosts[from + ">" + e.to + ":" + e.op] = edgeCost(e);
    return { caseId: "conv-rules", category: "kernel", data: { registry: CONV_RULES, edgeCosts } };
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
