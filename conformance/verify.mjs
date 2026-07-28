#!/usr/bin/env node
// Conformance verifier — certifies ANY implementation against the corpus.
//
// This is the inversion made operational: the corpus is the specification, and
// implementations (including the JavaScript one) are peers that either
// reproduce its hashes or do not. The verifier knows nothing about any
// implementation's internals; it speaks only the conformance protocol.
//
// Protocol (see conformance/README.md):
//   <impl> --cases        → JSON array of case ids the implementation supports
//   <impl> <case-id>      → JSON payload for that case on stdout
//
// The verifier wraps the payload as { caseId, category, ...data }, canonicalizes
// it with the shared canonicalizer, hashes it, and compares to the manifest.
// Key order and number formatting in the implementation's output are therefore
// irrelevant — only values matter, which is what makes the contract portable.
//
//   node conformance/verify.mjs                 # verify every registered implementation
//   node conformance/verify.mjs --impl=rust     # just one

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { sha256 } from "../test/oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(root, "conformance/implementations.json"), "utf8"));
const baseline = JSON.parse(readFileSync(join(root, "conformance/baseline.json"), "utf8"));

const byCase = new Map(manifest.cases.map((c) => [c.caseId, c]));

const fileHash = (p) => createHash("sha256").update(readFileSync(join(root, p))).digest("hex");

// Which semantic areas each corpus case exercises. Makes a low fixture count
// legible: 8/41 that includes the whole planner surface is not the same as 8/41
// scattered across trivia.
const SEMANTIC_AREAS = {
  "mech-kinds": ["types"],
  "conv-rules": ["registry", "edge-cost"],
  "multipath-kind-paths": ["registry", "multipath-planning", "path-enumeration", "ranking", "tie-breaking", "depth-cap", "impossibility"],
  "pair-compat": ["registry", "multipath-planning", "ranking", "selected-path-ordering", "impossibility"],
  "shape-compat": ["compatibility"],
  "unit-compat": ["compatibility"],
  "license-compat": ["compatibility", "license-screening"],
  "classify-lit": ["literature-classification"],
  "synth-test": ["property-test-skeleton"],
  "norm-schema": ["schema-normalization"],
  "compute-edges": ["edge-derivation"],
  "compute-edges-boundaries": ["edge-derivation", "group-size-bounds", "tie-breaking"],
};
// Cascade categories carry `cascade-`-prefixed area names. They previously
// reused `compatibility` and `multipath-planning`, which made those areas mean
// two different things — the deterministic predicate/planner surface, and the
// cascade stage built on top of it. The collision let `subsystemsComplete`
// claim a subsystem the implementation had only half-covered, and the claim was
// invisible until the subsystem table below started reporting fixture status.
const areasFor = (caseId, category) => SEMANTIC_AREAS[caseId] || {
  compatibility: ["cascade-compatibility", "cascade"], planning: ["cascade-planning", "ranking", "cascade"],
  preconditions: ["contract-instantiation", "obligations", "cascade"], obligations: ["obligations", "cascade"],
  ladder: ["stage-advancement", "cascade"], literature: ["literature-assessment", "verdict-derivation", "cascade"],
  serialization: ["serialization", "import-export"], malformed: ["serialization", "error-handling"],
}[category] || ["unclassified"];

// ---- mutation adequacy -----------------------------------------------------
// Matching fixtures and being mutation-qualified are DIFFERENT claims, and the
// report must never let one stand in for the other. A subsystem with no
// declared mutants is `not-assessed`; it does not report zero survivors,
// because "we looked and found none" and "we never looked" are not the same
// epistemic state. A report that no longer binds to the current corpus or
// implementation is `stale`, not `qualified`.
const mutationReport = (() => {
  try { return JSON.parse(readFileSync(join(root, "conformance/MUTATION-REPORT.json"), "utf8")); }
  catch { return null; }
})();
const mutationBinds = mutationReport
  && mutationReport.integrity.manifestSha256 === fileHash("test/golden/manifest.json")
  && mutationReport.integrity.implementationSourceSha256 === fileHash("impl/rust/src/main.rs")
  && mutationReport.scope === "all";

const subsystemReport = (impl, coverageMap) => {
  const declared = ((baseline.implementations[impl.id] || {}).subsystemsComplete) || [];
  const assessed = new Map((mutationReport ? mutationReport.subsystems : []).map((s) => [s.subsystem, s]));
  return declared.map((subsystem) => {
    const rows = coverageMap.filter((r) => r.semanticAreas.includes(subsystem));
    const fixtureStatus = rows.length === 0 ? "no-fixtures"
      : rows.every((r) => r.status === "supported") ? "pass" : "incomplete";
    const m = assessed.get(subsystem);
    if (!m) return { subsystem, fixtureStatus, mutationStatus: "not-assessed" };
    if (!mutationBinds) return { subsystem, fixtureStatus, mutationStatus: "stale", note: "the mutation report does not bind to the current corpus and implementation — re-run npm run mutants" };
    return {
      subsystem, fixtureStatus, mutationStatus: m.mutationStatus,
      declaredMutants: m.declaredMutants, killedMutants: m.killedMutants,
      survivingMutants: m.survivingMutants, inconclusiveMutants: m.inconclusiveMutants,
    };
  });
};

const runImpl = (impl, args) => {
  const cmd = impl.command[0];
  const rest = impl.command.slice(1).concat(args);
  return execFileSync(cmd.startsWith(".") ? join(root, cmd) : cmd, rest, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
};

const verifyImplementation = (impl) => {
  const label = `${impl.id} (${impl.language})`;
  const binary = impl.command[0].startsWith(".") ? join(root, impl.command[0]) : impl.command[0];
  if (impl.command[0].startsWith(".") && !existsSync(binary)) {
    return { id: impl.id, status: "unbuilt", message: `${label}: binary not built — run: ${impl.build}` };
  }

  let supported;
  try { supported = JSON.parse(runImpl(impl, ["--cases"])); }
  catch (e) { return { id: impl.id, status: "error", message: `${label}: could not query supported cases — ${e.message}` }; }

  const matched = [], failed = [], unknown = [];
  for (const caseId of supported) {
    const entry = byCase.get(caseId);
    if (!entry) { unknown.push(caseId); continue; }
    let payload;
    try { payload = JSON.parse(runImpl(impl, [caseId])); }
    catch (e) { failed.push({ caseId, reason: "execution/parse failure: " + e.message }); continue; }

    // The corpus fixture shape is { caseId, category, ...data }.
    const fixture = JSON.parse(readFileSync(join(root, "test/golden", entry.fixture), "utf8"));
    const wrapped = { caseId, category: entry.category, ...(fixture.data !== undefined ? { data: payload } : payload) };
    const got = sha256(wrapped);
    if (got === entry.sha256) matched.push(caseId);
    else failed.push({ caseId, reason: `hash mismatch\n      expected ${entry.sha256}\n      got      ${got}` });
  }

  // implemented_not_declared: probe the UNDECLARED cases too. An
  // implementation that can already reproduce a fixture but has not committed
  // to supporting it is hiding coverage from the monotonic baseline.
  const undeclaredPassing = [];
  for (const c of manifest.cases) {
    if (supported.includes(c.caseId)) continue;
    let payload;
    try { payload = JSON.parse(runImpl(impl, [c.caseId])); } catch { continue; } // unsupported: expected
    const fx = JSON.parse(readFileSync(join(root, "test/golden", c.fixture), "utf8"));
    const wrapped = { caseId: c.caseId, category: c.category, ...(fx.data !== undefined ? { data: payload } : payload) };
    if (sha256(wrapped) === c.sha256) undeclaredPassing.push(c.caseId);
  }

  // Monotonicity: declared support may only grow. Dropping a case would
  // otherwise hide a regression behind a still-green 8/8.
  const base = (baseline.implementations[impl.id] || {}).declared || [];
  const dropped = base.filter((c) => !supported.includes(c));
  const authorized = (baseline.implementations[impl.id] || {}).authorizedReduction || [];
  const unauthorizedDrops = dropped.filter((c) => !authorized.includes(c));

  // Per-fixture coverage map with an explicit status taxonomy, so a low count
  // cannot conceal broad coverage and a high count cannot conceal shallow.
  const declaredSet = new Set(supported);
  const failedSet = new Set(failed.map((f) => f.caseId));
  const matchedSet = new Set(matched);
  const coverageMap = manifest.cases.map((c) => ({
    fixture: c.caseId,
    implementation: impl.id,
    status: matchedSet.has(c.caseId) ? "supported"
      : failedSet.has(c.caseId) ? "known_divergence"
        : unauthorizedDrops.includes(c.caseId) ? "regressed_undeclared"
          : undeclaredPassing.includes(c.caseId) ? "implemented_not_declared"
            : declaredSet.has(c.caseId) ? "declared_but_unverifiable" : "not_implemented",
    hashMatch: matchedSet.has(c.caseId),
    semanticAreas: areasFor(c.caseId, c.category),
  }));

  const coveredAreas = [...new Set(coverageMap.filter((r) => r.hashMatch).flatMap((r) => r.semanticAreas))].sort();
  const allAreas = [...new Set(coverageMap.flatMap((r) => r.semanticAreas))].sort();

  return {
    id: impl.id,
    status: failed.length || unknown.length || unauthorizedDrops.length ? "fail" : "pass",
    label, matched, failed, unknown, unauthorizedDrops, undeclaredPassing,
    coverage: `${matched.length}/${manifest.cases.length}`,
    coverageMap, coveredAreas, uncoveredAreas: allAreas.filter((a) => !coveredAreas.includes(a)),
    subsystems: subsystemReport(impl, coverageMap),
    binarySha256: existsSync(binary) ? fileHash(impl.command[0].replace(/^\.\//, "")) : null,
  };
};

const only = (() => { const a = process.argv.find((x) => x.startsWith("--impl=")); return a ? a.slice(7) : null; })();
const targets = registry.implementations.filter((i) => !only || i.id === only);
if (!targets.length) { console.error(`no implementation matching --impl=${only}`); process.exit(2); }

console.log(`conformance — corpus ${manifest.oracleVersion}, canonicalization v${manifest.canonicalizationVersion}, ${manifest.cases.length} cases\n`);

let hardFailure = false;
const results = new Map();
for (const impl of targets) {
  const r = verifyImplementation(impl);
  results.set(impl.id, r);
  if (r.status === "unbuilt") { console.log(`  ⚠ ${r.message}`); continue; }
  if (r.status === "error") { console.error(`  ✘ ${r.message}`); hardFailure = true; continue; }

  const icon = r.status === "pass" ? "✔" : "✘";
  console.log(`  ${icon} ${r.label} — ${r.coverage} corpus cases reproduced`);
  console.log(`      cases: ${r.matched.join(", ") || "(none)"}`);
  console.log(`      areas:  ${r.coveredAreas.join(", ")}`);
  const qualified = (r.subsystems || []).filter((s) => s.mutationStatus === "qualified").map((s) => s.subsystem);
  const unassessed = (r.subsystems || []).filter((s) => s.mutationStatus !== "qualified");
  console.log(`      mutation-qualified: ${qualified.join(", ") || "(none)"}`);
  if (unassessed.length) console.log(`      pinned by assumption: ${unassessed.map((s) => `${s.subsystem} (${s.mutationStatus})`).join(", ")}`);
  for (const f of r.failed) { console.error(`      FAILED ${f.caseId}: ${f.reason}`); hardFailure = true; }
  for (const u of r.unknown) { console.error(`      claims unknown case: ${u}`); hardFailure = true; }
  for (const u of r.undeclaredPassing) {
    console.error(`      UNDECLARED ${u}: reproduces the corpus hash but is not declared.`);
    console.error("        Add it to --cases and to conformance/baseline.json, or record why it is excluded.");
    hardFailure = true;
  }
  for (const d of r.unauthorizedDrops) {
    console.error(`      REGRESSION ${d}: was in the conformance baseline but is no longer declared.`);
    console.error("        Declared support is monotonic. Reducing it requires an authorized edit to conformance/baseline.json.");
    hardFailure = true;
  }
}

console.log("\nA conforming implementation is one whose declared cases all reproduce the corpus hash.");
console.log("Partial coverage is legitimate and is reported as a fraction; a declared case that fails is not.");

// ---- public conformance report -------------------------------------------
// A legible artifact for external readers, rather than raw test logs. Written
// only on a full run so a single --impl invocation cannot truncate it.
if (!only) {
  const rows = targets.map((impl) => {
    const r = results.get(impl.id);
    return {
      implementation: impl.id,
      language: impl.language,
      status: r ? r.status : "unbuilt",
      fixtures: r && r.matched ? `${r.matched.length}/${manifest.cases.length}` : `0/${manifest.cases.length}`,
      canonicalHashesIdentical: r && r.matched ? r.matched.length : 0,
      declaredCasesFailing: r && r.failed ? r.failed.length : 0,
      cases: r && r.matched ? r.matched : [],
      semanticAreasCovered: r ? r.coveredAreas : [],
      semanticAreasUncovered: r ? r.uncoveredAreas : [],
      coverageMap: r ? r.coverageMap : [],
      subsystems: r ? r.subsystems || [] : [],
      binarySha256: r ? r.binarySha256 : null,
      toolchain: impl.toolchain || null,
      notes: impl.notes || "",
    };
  });
  const report = {
    artifact: "conformance-report",
    generatedAt: new Date().toISOString(),
    ciRun: process.env.GITHUB_RUN_ID || null,
    // Integrity: the report binds to the exact corpus, spec and verifier that
    // produced it, so certification can bind to the report rather than merely
    // asserting that conformance ran.
    integrity: {
      manifestSha256: fileHash("test/golden/manifest.json"),
      canonicalizationSpecSha256: fileHash("conformance/CANONICALIZATION.md"),
      canonicalizerSha256: fileHash("test/oracle/canonicalize.mjs"),
      verifierSha256: fileHash("conformance/verify.mjs"),
      baselineSha256: fileHash("conformance/baseline.json"),
      referenceSourceSha256: fileHash("reference/src/cortex-v0.5.1.jsx"),
    },
    corpus: { oracle: manifest.oracleVersion, schemaVersion: manifest.schemaVersion, canonicalizationVersion: manifest.canonicalizationVersion, fixtures: manifest.cases.length },
    reference: { source: "reference/src/cortex-v0.5.1.jsx", baseline: manifest.sourceBaseline },
    implementations: rows,
    interpretation: "An implementation conforms when every case it DECLARES reproduces the corpus hash byte-for-byte after canonicalization. Coverage is the fraction of the corpus it declares; partial coverage is legitimate, a failing declared case is not.",
  };
  // Environmental fields (when it ran, which CI job) are historical metadata,
  // not evidence. Rewriting them on every invocation would dirty the working
  // tree with timestamp-only diffs and make a real change indistinguishable
  // from a re-run. So the report is written only when its SEMANTIC content
  // changes; otherwise the existing environmental values are preserved.
  const ENVIRONMENTAL = ["generatedAt", "ciRun"];
  const semantic = (r) => { const c = { ...r }; for (const k of ENVIRONMENTAL) delete c[k]; return JSON.stringify(c); };
  const reportPath = join(root, "conformance/REPORT.json");
  let priorReport = null;
  try { priorReport = JSON.parse(readFileSync(reportPath, "utf8")); } catch { /* first run */ }
  const unchanged = priorReport && semantic(priorReport) === semantic(report);
  if (unchanged) for (const k of ENVIRONMENTAL) report[k] = priorReport[k];
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");

  const md = [
    "# Conformance report",
    "",
    "Generated by `node conformance/verify.mjs`. Do not edit by hand.",
    "",
    `Corpus: oracle **${manifest.oracleVersion}**, schemaVersion **${manifest.schemaVersion}**, canonicalization **v${manifest.canonicalizationVersion}**, **${manifest.cases.length}** fixtures.`,
    "",
    "| Implementation | Language | Fixtures | Canonical hashes identical | Declared failing | Status |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| \`${r.implementation}\` | ${r.language} | ${r.fixtures} | ${r.canonicalHashesIdentical} | ${r.declaredCasesFailing} | ${r.status === "pass" ? "**PASS**" : r.status.toUpperCase()} |`),
    "",
    "| Implementation | Cases reproduced |",
    "|---|---|",
    ...rows.map((r) => `| \`${r.implementation}\` | ${r.cases.join(", ") || "—"} |`),
    "",
    "| Implementation | Semantic areas covered | Not yet covered |",
    "|---|---|---|",
    ...rows.map((r) => `| \`${r.implementation}\` | ${r.semanticAreasCovered.join(", ") || "—"} | ${r.semanticAreasUncovered.join(", ") || "—"} |`),
    "",
    "## Subsystem completion",
    "",
    "Matching fixtures and being **mutation-qualified** are different claims. A",
    "subsystem is qualified only when every declared semantic mutation of its rules",
    "is killed by the corpus case that claims to pin it. `not-assessed` means no",
    "mutants have been declared for it — which is *not* the same as zero survivors.",
    "",
    "| Implementation | Subsystem | Fixtures | Mutation adequacy | Killed / declared | Surviving |",
    "|---|---|---|---|---|---|",
    ...rows.flatMap((r) => (r.subsystems || []).map((s) =>
      `| \`${r.implementation}\` | ${s.subsystem} | ${s.fixtureStatus} | ${s.mutationStatus === "qualified" ? "**qualified**" : s.mutationStatus} | ${s.declaredMutants === undefined ? "—" : `${s.killedMutants}/${s.declaredMutants}`} | ${s.survivingMutants === undefined ? "—" : s.survivingMutants} |`)),
    "",
    "## How to read this",
    "",
    report.interpretation,
    "",
    "The JavaScript kernel is verified through its own golden gate (`npm run kernel:golden -- --check`), which covers the full corpus including the cascade and serialization families.",
    "",
  ].join("\n");
  writeFileSync(join(root, "conformance/REPORT.md"), md);
  console.log("\nreport written: conformance/REPORT.json + conformance/REPORT.md");
}

if (hardFailure) process.exit(1);
