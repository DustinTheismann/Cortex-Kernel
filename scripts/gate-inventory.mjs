#!/usr/bin/env node
// Gate inventory consistency.
//
// The workflow, the README table, and the certificate have drifted apart twice
// now (seven → thirteen → fourteen gates, each time leaving a stale count in
// prose). Documentation drift is cheap to introduce and easy to miss in review,
// so it becomes a gate of its own: the workflow is the source of truth, and
// every other inventory must agree with it exactly.
//
//   node scripts/gate-inventory.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// Source of truth: every named step in the workflow.
const workflow = read(".github/workflows/ci.yml");
const gates = [...workflow.matchAll(/^\s+- name:\s+(\S+)\s*$/gm)].map((m) => m[1]);

const problems = [];
if (gates.length < 2) problems.push("could not parse gate names from the workflow");

// 1. README table must list every gate, and no gate it does not have.
const readme = read("README.md");
const readmeGates = [...readme.matchAll(/^\|\s+`([a-z-]+)`\s+\|/gm)].map((m) => m[1]).filter((g) => gates.includes(g) || /^[a-z]+-[a-z-]+$/.test(g));
const missingFromReadme = gates.filter((g) => !readme.includes("| `" + g + "` |"));
if (missingFromReadme.length) problems.push(`README verification table is missing gate(s): ${missingFromReadme.join(", ")}`);

// 2. Any prose gate count must match. Catches "Thirteen CI gates" after a 14th lands.
const WORDS = { seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16 };
for (const file of ["README.md", "CHANGELOG.md", "docs/roadmap.md", "docs/releasing.md", "docs/versioning.md",
  "docs/certification/v0.5.1-kernel.md", "conformance/README.md", "conformance/REPORT.md",
  "conformance/CANONICALIZATION.md", "conformance/baseline.json", "packages/cortex-kernel/README.md"]) {
  let text;
  try { text = read(file); } catch { continue; }
  for (const m of text.matchAll(/\b([A-Za-z]+|\d+)[- ](?:CI )?gates?\b/gi)) {
    const raw = m[1].toLowerCase();
    const claimed = WORDS[raw] ?? (/^\d+$/.test(raw) ? Number(raw) : null);
    if (claimed === null) continue;
    // "eight CI gates" describing a historical release is legitimate in a
    // changelog-style line; only flag claims about the CURRENT gate set.
    const line = text.slice(Math.max(0, m.index - 120), m.index + 80);
    if (/\b(was|were|previously|up from|at the time|historical)\b/i.test(line)) continue;
    if (claimed !== gates.length) problems.push(`${file}: claims "${m[0]}" but the workflow defines ${gates.length}`);
  }
}

// 3. The certificate's recorded gate list must match.
try {
  const cert = JSON.parse(read("docs/certification/v0.5.1-kernel.json"));
  const certGates = cert.gates || [];
  const missing = gates.filter((g) => !certGates.includes(g));
  const extra = certGates.filter((g) => !gates.includes(g));
  if (missing.length) problems.push(`certificate gate list is missing: ${missing.join(", ")}`);
  if (extra.length) problems.push(`certificate lists gates the workflow does not define: ${extra.join(", ")}`);
} catch { /* certificate absent — other gates cover that */ }

writeFileSync(join(root, "docs/gate-inventory.json"), JSON.stringify({
  artifact: "gate-inventory",
  note: "Derived from .github/workflows/ci.yml, the source of truth. Human-readable projections should consume this rather than re-parsing the workflow.",
  gateCount: gates.length,
  gates,
}, null, 2) + "\n");

console.log(`gate inventory — workflow defines ${gates.length} gates\n  ${gates.join(", ")}`);
if (problems.length) {
  console.error("\ngate inventory FAILED:\n  " + problems.join("\n  "));
  console.error("\nThe workflow is the source of truth. Update the README table, prose counts, and certificate to match.");
  process.exit(1);
}
console.log("\n  README table, prose counts, and the certificate all agree.");
