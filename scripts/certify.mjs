#!/usr/bin/env node
// Reproducible behavioral certification.
//
// Certification is not a one-time hand-written artifact: this script derives
// it from live repository state so it can be regenerated and, more
// importantly, VERIFIED.
//
//   node scripts/certify.mjs            # regenerate docs/certification/<tag>.json
//   node scripts/certify.mjs --check    # verify the committed certificate still
//                                       # matches repository state; exit 1 on drift
//
// The certificate has two parts, deliberately separated:
//
//   evidence — DERIVABLE from the repo at any time (commit SHAs, oracle and
//     canonicalization versions, fixture count, content hashes of the manifest,
//     invariant set and canonicalizer). `--check` recomputes these and fails on
//     any mismatch, so an un-recertified change to the oracle cannot pass CI.
//
//   release — HISTORICAL facts about the certified release that cannot be
//     recomputed later (the merge commit that shipped it, the workflow run that
//     verified it, the release timestamp). These are supplied once, carried
//     forward verbatim on regeneration, and never invented.
//
//   buildEnvironment — the toolchain that produced the run (Node, npm, OS).
//     Recorded for reproducibility, but NOT compared by --check: a different
//     machine must be able to verify the same evidence.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_TAG = "v0.5.1-kernel";
const OUT = join(root, "docs/certification", RELEASE_TAG + ".json");

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: "utf8" }).trim();
const sha256 = (relPath) => createHash("sha256").update(readFileSync(join(root, relPath))).digest("hex");

const HASHED_FILES = {
  manifest: "test/golden/manifest.json",
  invariants: "test/oracle/invariants.mjs",
  canonicalizer: "test/oracle/canonicalize.mjs",
};

/**
 * Everything a third party can recompute from the repository alone, and which
 * is STABLE across ordinary commits. HEAD is deliberately not here: it changes
 * every commit, so comparing it would make the gate fail for reasons unrelated
 * to behavior. HEAD at certification time is recorded under `release`.
 */
const deriveEvidence = () => {
  const manifest = JSON.parse(readFileSync(join(root, HASHED_FILES.manifest), "utf8"));
  return {
    referenceCommitSha: sh("git", ["rev-parse", manifest.sourceBaseline]),
    oracleVersion: manifest.oracleVersion,
    canonicalizationVersion: manifest.canonicalizationVersion,
    schemaVersion: manifest.schemaVersion,
    fixtureCount: manifest.cases.length,
    manifest: { path: HASHED_FILES.manifest, sha256: sha256(HASHED_FILES.manifest) },
    invariantVersion: { set: HASHED_FILES.invariants, sha256: sha256(HASHED_FILES.invariants) },
    canonicalizer: { path: HASHED_FILES.canonicalizer, sha256: sha256(HASHED_FILES.canonicalizer) },
  };
};

const buildEnvironment = () => ({
  node: process.version,
  npm: (() => { try { return "v" + sh("npm", ["--version"]); } catch { return null; } })(),
  platform: process.platform,
  arch: process.arch,
});

// Release metadata: taken from the existing certificate when present (so
// regeneration never fabricates history), overridable by flags/CI env.
const releaseMetadata = (existing) => {
  const arg = (name) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  const prior = (existing && existing.release) || {};
  const runId = arg("run-id") || process.env.GITHUB_RUN_ID || prior.workflow?.runId || null;
  return {
    kernelMergeCommitSha: arg("merge-commit") || prior.kernelMergeCommitSha || null,
    certifiedAtCommit: arg("head") || sh("git", ["rev-parse", "HEAD"]),
    workflow: {
      name: prior.workflow?.name || "kernel",
      runId,
      conclusion: arg("conclusion") || prior.workflow?.conclusion || null,
      url: runId ? `https://github.com/DustinTheismann/Cortex-Kernel/actions/runs/${runId}` : null,
    },
    releaseTimestamp: arg("timestamp") || prior.releaseTimestamp || new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  };
};

const buildCertificate = (existing) => ({
  artifact: "behavioral-certification",
  subject: "@opensource-cortex/kernel",
  kernelVersion: "0.5.1",
  releaseTag: RELEASE_TAG,
  acceptanceCommand: "npm run kernel:golden -- --check",
  gates: ["reference-integrity", "oracle-check", "kernel-unit", "kernel-golden", "kernel-differential", "package-smoke", "determinism", "certification"],
  evidence: deriveEvidence(),
  release: releaseMetadata(existing),
  buildEnvironment: buildEnvironment(),
});

const readExisting = () => (existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null);

const main = () => {
  const existing = readExisting();

  if (process.argv.includes("--check")) {
    if (!existing) { console.error("certify --check: no certificate at " + OUT); process.exit(1); }
    const fresh = deriveEvidence();
    const stored = existing.evidence || {};
    const problems = [];
    const cmp = (path, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`  ${path}\n    certificate: ${JSON.stringify(a)}\n    repository:  ${JSON.stringify(b)}`); };
    for (const k of Object.keys(fresh)) cmp("evidence." + k, stored[k], fresh[k]);

    if (problems.length) {
      console.error("certification FAILED — the certificate no longer describes this repository:\n" + problems.join("\n"));
      console.error("\nIf the change is intended, re-run `npm run certify` and commit the updated certificate.");
      process.exit(1);
    }
    console.log(`certification OK: evidence matches repository state (${fresh.fixtureCount} fixtures, oracle ${fresh.oracleVersion}, canonicalization v${fresh.canonicalizationVersion})`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(buildCertificate(existing), null, 2) + "\n");
  console.log("certification written: " + OUT.replace(root + "/", ""));
};

main();
