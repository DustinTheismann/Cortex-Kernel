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
import { sha256 } from "../test/oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
const registry = JSON.parse(readFileSync(join(root, "conformance/implementations.json"), "utf8"));

const byCase = new Map(manifest.cases.map((c) => [c.caseId, c]));

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

  return {
    id: impl.id, status: failed.length || unknown.length ? "fail" : "pass",
    label, matched, failed, unknown,
    coverage: `${matched.length}/${manifest.cases.length}`,
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
  for (const f of r.failed) { console.error(`      FAILED ${f.caseId}: ${f.reason}`); hardFailure = true; }
  for (const u of r.unknown) { console.error(`      claims unknown case: ${u}`); hardFailure = true; }
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
      notes: impl.notes || "",
    };
  });
  const report = {
    artifact: "conformance-report",
    corpus: { oracle: manifest.oracleVersion, schemaVersion: manifest.schemaVersion, canonicalizationVersion: manifest.canonicalizationVersion, fixtures: manifest.cases.length },
    reference: { source: "reference/src/cortex-v0.5.1.jsx", baseline: manifest.sourceBaseline },
    implementations: rows,
    interpretation: "An implementation conforms when every case it DECLARES reproduces the corpus hash byte-for-byte after canonicalization. Coverage is the fraction of the corpus it declares; partial coverage is legitimate, a failing declared case is not.",
  };
  writeFileSync(join(root, "conformance/REPORT.json"), JSON.stringify(report, null, 2) + "\n");

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
