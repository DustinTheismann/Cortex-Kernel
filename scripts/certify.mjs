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
const OUT_MD = join(root, "docs/certification", RELEASE_TAG + ".md");

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: "utf8" }).trim();
/** git that tolerates a shallow clone: returns null rather than throwing. */
const shSafe = (cmd, args) => { try { return sh(cmd, args); } catch { return null; } };
const sha256 = (relPath) => createHash("sha256").update(readFileSync(join(root, relPath))).digest("hex");

const HASHED_FILES = {
  manifest: "test/golden/manifest.json",
  invariants: "test/oracle/invariants.mjs",
  canonicalizer: "test/oracle/canonicalize.mjs",
  referenceSource: "reference/src/cortex-v0.5.1.jsx",
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
    // Content-addressed, not history-addressed. Hashing the frozen source is
    // both stronger than recording a commit SHA (it detects tampering that a
    // commit record cannot) and independent of clone depth, so verification
    // works in a shallow checkout, from a tarball, or with no git at all.
    referenceSource: { path: HASHED_FILES.referenceSource, sha256: sha256(HASHED_FILES.referenceSource) },
    referenceBaseline: manifest.sourceBaseline,
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
  const manifest = JSON.parse(readFileSync(join(root, HASHED_FILES.manifest), "utf8"));
  return {
    kernelMergeCommitSha: arg("merge-commit") || prior.kernelMergeCommitSha || null,
    // Provenance, not compared evidence: resolving a short SHA needs history a
    // shallow clone does not have, so this is best-effort and carried forward.
    referenceCommitSha: arg("reference-commit") || shSafe("git", ["rev-parse", manifest.sourceBaseline]) || prior.referenceCommitSha || null,
    // Carried forward, never recomputed. Recomputing it from HEAD made the
    // certificate churn on every commit, and because the ledger binds the
    // certificate's hash, every churn broke the chain until the entry was
    // restated. It was also structurally unable to be right: generated BEFORE
    // the commit that contains it, it could only ever name that commit's
    // parent. The commit a release actually shipped from is bound by
    // `scripts/ledger.mjs --release`, which sets it at sealing time against an
    // existing annotated tag. Set here only when deliberately re-issuing:
    // `npm run certify -- --head=<sha>`.
    certifiedAtCommit: arg("head") || prior.certifiedAtCommit || null,
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
  // Derived from the workflow, never hardcoded: a hardcoded list goes stale
  // the moment a gate is added, and a certificate that misstates its own gate
  // set is exactly the kind of quiet drift this repository exists to prevent.
  gates: workflowGates(),
  evidence: deriveEvidence(),
  release: releaseMetadata(existing),
  buildEnvironment: buildEnvironment(),
});

/** The gate names defined by the CI workflow — the source of truth. */
const workflowGates = () => {
  const wf = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  return [...wf.matchAll(/^\s+- name:\s+(\S+)\s*$/gm)].map((m) => m[1]);
};

const readExisting = () => (existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null);

/**
 * The human-readable projection, DERIVED from the certificate rather than
 * maintained alongside it. Hand-maintained projections drift: this one was
 * carrying a fixture count and a manifest hash that had not matched the JSON
 * for several corpus revisions, and nothing caught it because prose was the
 * only place the numbers disagreed. Anything that changes on every invocation
 * (the generating commit, the build environment, the release timestamp) is
 * referenced rather than inlined, so regeneration produces a byte-identical
 * file unless the evidence itself moved.
 */
const renderMarkdown = (cert) => {
  const e = cert.evidence, r = cert.release;
  return [
    `# Behavioral certification — ${cert.subject} ${cert.releaseTag}`,
    "",
    "Generated by `npm run certify` from `" + RELEASE_TAG + ".json`. Do not edit by hand.",
    "",
    `This record certifies that the framework-independent kernel reproduces the`,
    `frozen OpenSource Cortex **v${cert.kernelVersion}** behavior byte-for-byte, as enforced by`,
    `the CI workflow. The machine-readable form is [\`${RELEASE_TAG}.json\`](./${RELEASE_TAG}.json).`,
    "",
    "**The certificate is reproducible, not hand-written.** Regenerate it with",
    "`npm run certify`; verify it with `npm run certify:check` (CI gate",
    "`certification`). The JSON separates `evidence` — everything re-derivable from",
    "the repository, which `--check` recomputes and compares — from `release`, the",
    "historical facts about the certified run that cannot be recomputed later, and",
    "`buildEnvironment`, the toolchain that produced it.",
    "",
    "The frozen reference is identified by the **content hash** of",
    "`" + e.referenceSource.path + "`, not by its commit SHA. That is both stronger",
    "(it detects tampering a commit record cannot) and independent of clone depth, so",
    "verification works in a shallow checkout, from a tarball, or with no git at all.",
    "The commit SHA is retained under `release` as provenance.",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Reference source hash (sha256 of \`${e.referenceSource.path}\`) | \`${e.referenceSource.sha256}\` |`,
    `| Reference commit (frozen baseline, provenance) | \`${r.referenceCommitSha || "—"}\` |`,
    `| Kernel merge commit | \`${r.kernelMergeCommitSha || "—"}\` |`,
    `| Release tag | \`${cert.releaseTag}\` |`,
    `| Oracle version | \`${e.oracleVersion}\` |`,
    `| Canonicalization version | \`${e.canonicalizationVersion}\` |`,
    `| schemaVersion | \`${e.schemaVersion}\` |`,
    `| Fixture count | \`${e.fixtureCount}\` |`,
    `| Manifest hash (sha256 of \`${e.manifest.path}\`) | \`${e.manifest.sha256}\` |`,
    `| Invariant-set hash (sha256 of \`${e.invariantVersion.set}\`) | \`${e.invariantVersion.sha256}\` |`,
    `| Canonicalizer hash (sha256 of \`${e.canonicalizer.path}\`) | \`${e.canonicalizer.sha256}\` |`,
    `| Workflow run ID | \`${r.workflow.runId || "—"}\` |`,
    `| Workflow conclusion | \`${r.workflow.conclusion || "—"}\` |`,
    `| Certified at commit | \`${r.certifiedAtCommit || "—"}\` (carried forward; the released commit is bound by the ledger at sealing) |`,
    "| Build environment | see JSON `buildEnvironment` (Node, npm, platform, arch) |",
    "| Release timestamp | see JSON `release.releaseTimestamp` |",
    "",
    "## Acceptance",
    "",
    "```bash",
    cert.acceptanceCommand,
    "```",
    "",
    "Passes only when the extracted kernel reproduces every manifest hash and fails",
    "on fixture/manifest-hash drift, ordered-array changes, semantic-invariant",
    "regressions, missing cases, unexpected output fields, nondeterministic output,",
    "or frozen-reference drift.",
    "",
    `## Gates (${cert.gates.length})`,
    "",
    cert.gates.map((g) => "`" + g + "`").join(" · "),
    "",
    "Derived from `.github/workflows/ci.yml`, which is the source of truth for the",
    "gate set; `npm run gates` fails if this list, the README table, or any prose",
    "count disagrees with it. The first seven were green on the certified workflow",
    "run; every later gate was added to keep this record from going stale.",
    "",
    "## Scope",
    "",
    "Parity-only. The frontier research track (`docs/research/frontier-backlog.md`)",
    "is isolated and does not modify the v0.5.1 extraction.",
    "",
  ].join("\n");
};

const main = () => {
  const existing = readExisting();

  if (process.argv.includes("--check")) {
    if (!existing) { console.error("certify --check: no certificate at " + OUT); process.exit(1); }
    const fresh = deriveEvidence();
    const stored = existing.evidence || {};
    const problems = [];
    const cmp = (path, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(`  ${path}\n    certificate: ${JSON.stringify(a)}\n    repository:  ${JSON.stringify(b)}`); };
    for (const k of Object.keys(fresh)) cmp("evidence." + k, stored[k], fresh[k]);

    // The Markdown projection is generated, so it must equal what the committed
    // certificate renders to. Without this the prose can restate a fixture
    // count or a hash the JSON no longer holds — which is precisely how it went
    // stale before it was generated.
    const renderedMd = renderMarkdown(existing);
    const committedMd = existsSync(OUT_MD) ? readFileSync(OUT_MD, "utf8") : null;
    if (committedMd !== renderedMd) problems.push("  docs/certification/" + RELEASE_TAG + ".md\n    the committed Markdown projection is not what the certificate renders to");

    if (problems.length) {
      console.error("certification FAILED — the certificate no longer describes this repository:\n" + problems.join("\n"));
      console.error("\nIf the change is intended, re-run `npm run certify` and commit the updated certificate.");
      process.exit(1);
    }
    console.log(`certification OK: evidence matches repository state (${fresh.fixtureCount} fixtures, oracle ${fresh.oracleVersion}, canonicalization v${fresh.canonicalizationVersion})`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const cert = buildCertificate(existing);
  writeFileSync(OUT, JSON.stringify(cert, null, 2) + "\n");
  writeFileSync(OUT_MD, renderMarkdown(cert));
  console.log("certification written: " + OUT.replace(root + "/", "") + " + " + OUT_MD.replace(root + "/", ""));
};

main();
