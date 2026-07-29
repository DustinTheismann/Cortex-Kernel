#!/usr/bin/env node
// Mutation battery CLI — is the corpus discriminating, not merely agreed with?
//
// Conformance answers "does this implementation match the fixtures". This
// answers "do the fixtures pin the semantics", and those come apart: when
// `compute-edges` first landed it reproduced its hash while four of its rules
// could be violated freely, because the happy-path corpus never reached those
// boundaries. Coverage read 11/41 and was green.
//
// The engine and its outcome taxonomy live in `mutation/battery.mjs`; the rules
// live in `mutation/registry.mjs`. Only `killed_correctly` counts — see
// `conformance/README.md` for why a hash mismatch is not a kill.
//
//   node conformance/mutants.mjs                          # run and write the report
//   node conformance/mutants.mjs --check                  # also require the committed report to be current
//   node conformance/mutants.mjs --subsystem=edge-derivation
//   node conformance/mutants.mjs --list                   # the mutation table only

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MUTATIONS, SUBSYSTEM_SCOPE, CORPUS_INPUTS, unpinnableFindings } from "./mutation/registry.mjs";
import { MECH_KINDS } from "../packages/cortex-kernel/src/types.js";
import { CONV_RULES, edgeCost } from "../packages/cortex-kernel/src/registry.js";
import { runMutant, cargoRunner, summarize, makeWorkDir, cleanup, binaryExists, fileHash, root, SRC, BINARY } from "./mutation/battery.mjs";

const REPORT = join(root, "conformance/MUTATION-REPORT.json");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));

const only = (() => { const a = process.argv.find((x) => x.startsWith("--subsystem=")); return a ? a.slice(12) : null; })();
const selected = MUTATIONS.filter((m) => !only || m.subsystem === only);

if (process.argv.includes("--list")) {
  for (const m of selected) {
    console.log(`${m.id}\n  subsystem  ${m.subsystem}\n  rule       ${m.rule}`);
    console.log(`  pinned by  ${m.expectedKillers.join(", ")}\n  violation  ${m.expectedFailure}\n`);
  }
  process.exit(0);
}
if (only && !selected.length) { console.error(`no mutants declared for subsystem ${only}`); process.exit(2); }
if (!binaryExists()) { console.error("conformance binary not built — run: npm run conformance:build"); process.exit(2); }

const ctx = {
  manifest,
  subsystemScope: SUBSYSTEM_SCOPE,
  corpusInputs: CORPUS_INPUTS,
  source: readFileSync(join(root, SRC), "utf8"),
  baselineBinaryHash: fileHash(BINARY),
  ...cargoRunner,
  workDir: makeWorkDir(),
};

const results = [], problems = [];
try {
  for (const m of selected) {
    const { record, problem } = runMutant(m, ctx);
    results.push(record);
    if (problem) problems.push(problem);
  }
} finally { cleanup(ctx.workDir); }

const report = summarize(selected, results, SUBSYSTEM_SCOPE, only || "all", { registrySha256: fileHash("conformance/mutation/registry.mjs") },
  // Measured now, over the current registry and planner — not asserted from a
  // comment that could outlive the code it describes.
  unpinnableFindings(MECH_KINDS, CONV_RULES, edgeCost, {
    conversionRegistrySha256: fileHash("packages/cortex-kernel/src/registry.js"),
    plannerSha256: fileHash("packages/cortex-kernel/src/planner.js"),
  }));

// Only a full run may write the report; a --subsystem run must not truncate it.
if (!only) writeFileSync(REPORT, JSON.stringify(report, null, 2) + "\n");
if (process.argv.includes("--check")) {
  if (only) problems.push("--check requires a full run: drop --subsystem");
  else {
    const committed = existsSync(REPORT) ? readFileSync(REPORT, "utf8") : null;
    if (committed !== JSON.stringify(report, null, 2) + "\n") problems.push("conformance/MUTATION-REPORT.json is stale — re-run `npm run mutants` and commit it");
  }
}

const ICON = { killed_correctly: "✔" };
console.log(`mutation battery — ${selected.length} semantic mutation(s) over ${report.subsystems.map((s) => s.subsystem).join(", ") || "(none)"}\n`);
for (const r of results) console.log(`  ${ICON[r.outcome] || "✘"} ${r.id.padEnd(26)} ${r.outcome.padEnd(20)} ${r.detail}`);
console.log("");
for (const s of report.subsystems) {
  console.log(`  ${s.subsystem}: ${s.killedMutants}/${s.declaredMutants} killed, ${s.survivingMutants} surviving, ${s.inconclusiveMutants} inconclusive — ${s.mutationStatus}`);
}
for (const u of report.unpinnable) {
  console.log(`  ${u.subsystem}: "${u.rule}" — ${u.claim}`);
  console.log(`      ${u.evidence.measuredMaxIterations} iterations at worst (${u.evidence.worstPair}) across ${u.evidence.orderedPairsTested} ordered pairs; guard is ${u.evidence.guardLimit} (${u.evidence.headroomFactor}x headroom)`);
}
console.log("\nOnly `killed_correctly` counts. A hash mismatch is not a kill; a surviving mutant is a corpus defect.");
if (!only) console.log("report written: conformance/MUTATION-REPORT.json");
for (const p of problems) console.error("\n  " + p);
if (problems.length) process.exit(1);
