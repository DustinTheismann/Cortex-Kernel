#!/usr/bin/env node
// Epistemic frontier map — what remains unverified, as data.
//
// Ordinary coverage reports what passed. This reports the negative space: the
// surface of behavior that is NOT mechanically verified, why, with what
// confidence, and what would close it. The deficit is meant to shrink across
// releases; publishing it is what keeps "we verified it" from drifting into
// "we verified the parts that were easy to verify".
//
//   node scripts/frontier-map.mjs           # regenerate docs/frontier-map.json
//   node scripts/frontier-map.mjs --check   # fail if the deficit grew

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "docs/frontier-map.json");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const manifest = readJson("test/golden/manifest.json");
const coverage = readJson("test/golden/coverage.json");

const flatten = (o, prefix = "") => Object.entries(o).flatMap(([k, v]) =>
  typeof v === "object" && v !== null ? flatten(v, prefix + k + ".") : [[prefix + k, v]]);
const claims = flatten(coverage);

// Confidence vocabulary, matching docs/oracle-limitations.md:
//   high   — frozen code runs verbatim, only deterministic stubs injected
//   medium — frozen code runs behind non-trivial instrumentation
//   none   — not captured; documented only
const BLOCKERS = (manifest.blockers || []).map((b) => {
  const confidence = /verbatim/i.test(b.boundary || "") ? "high"
    : /not captured|documented only/i.test(b.boundary || "") ? "none" : "medium";
  return {
    area: b.area,
    sourceLines: b.sourceLines,
    reason: b.reason,
    instrumentation: b.boundary,
    confidence,
    // What would move this from unverified to verified?
    closureCondition: confidence === "none"
      ? "Requires an execution harness for the coupled subsystem, or acceptance that it is out of scope for behavioral capture."
      : "Requires eliminating the injected boundary — i.e. a deterministic replacement for the nondeterministic dependency.",
  };
});

const weight = { none: 1.0, medium: 0.5, high: 0.15 };
const deficit = BLOCKERS.reduce((acc, b) => acc + weight[b.confidence], 0);

const map = {
  artifact: "epistemic-frontier-map",
  generatedFrom: { manifest: "test/golden/manifest.json", coverage: "test/golden/coverage.json", narrative: "docs/oracle-limitations.md" },
  verified: {
    fixtures: manifest.cases.length,
    behavioralClaims: claims.length,
    claimsEvidenced: claims.filter(([, v]) => v === true).length,
    note: "Finitely many points, plus seeded differential sampling and one independent implementation. Not a proof over the input space.",
  },
  unverified: {
    blockers: BLOCKERS,
    deficitScore: Number(deficit.toFixed(2)),
    deficitScale: "Sum over blockers of a confidence weight (none 1.0, medium 0.5, high 0.15). Lower is better; 0 means nothing is left uncaptured.",
  },
  openObligations: [
    {
      id: "SO-8",
      statement: "No mechanized refinement proof exists that the extraction and the frozen reference denote the same function.",
      tractability: "The deterministic core is finite-state (16 kinds, a fixed rule set, bounded path depth) and is tractable to verify exhaustively or in a proof assistant.",
      closureCondition: "Exhaustive symbolic execution over the schema space, or a machine-checked refinement proof.",
    },
  ],
  honestStatement: "This file exists so the boundary of what is verified is visible and shrinking, rather than implicit and assumed.",
};

if (process.argv.includes("--check")) {
  if (!existsSync(OUT)) { console.error("frontier-map --check: no map at docs/frontier-map.json"); process.exit(1); }
  const prev = JSON.parse(readFileSync(OUT, "utf8"));
  const before = prev.unverified.deficitScore;
  if (map.unverified.deficitScore > before) {
    console.error(`frontier-map FAILED: the unverified surface grew (${before} → ${map.unverified.deficitScore}).`);
    console.error("New unverified behavior must be justified and the map regenerated deliberately.");
    process.exit(1);
  }
  console.log(`frontier-map OK: deficit ${map.unverified.deficitScore} (was ${before}), ${map.unverified.blockers.length} blockers, ${map.verified.fixtures} fixtures verified`);
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify(map, null, 2) + "\n");
console.log(`frontier map written: docs/frontier-map.json — deficit ${map.unverified.deficitScore} across ${BLOCKERS.length} blockers`);
for (const b of BLOCKERS) console.log(`  ${b.confidence.padEnd(6)} ${b.area}`);
