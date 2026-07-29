#!/usr/bin/env node
// Behavioral certification — candidate evidence and immutable release records.
//
// ---------------------------------------------------------------------------
// Two artifacts, because there are two claims.
// ---------------------------------------------------------------------------
// These were previously one file, and the result was a certificate with no
// unambiguous temporal subject: it was NAMED for a shipped release tag while
// its evidence tracked HEAD. A reader could not tell whether it meant "the
// immutable certificate for the release tagged v0.5.1-kernel" or "the current
// candidate's evidence against the v0.5.1 oracle". Both are useful records.
// They are not the same artifact, and a release identity must never be reused
// as a mutable candidate identity.
//
//   docs/certification/candidate.json   MOVING. Regenerated from the current
//     tree on every `npm run certify`. Carries NO release tag, because it has
//     not shipped. This is what a pull request is certifying.
//
//   docs/certification/<tag>.json       IMMUTABLE. Written once, when a release
//     is sealed, and never regenerated. Its evidence describes the tree at
//     <tag> — not the tree that happens to be checked out. `--check` verifies
//     it against `git show <tag>:…`, so a release record that drifts from the
//     release it names fails rather than quietly re-deriving.
//
//   node scripts/certify.mjs            # regenerate the CANDIDATE only
//   node scripts/certify.mjs --check    # candidate matches the tree, and every
//                                       # release record still matches its tag
//
// The candidate has three blocks, deliberately separated:
//
//   evidence — DERIVABLE from the tree at any time (oracle and canonicalization
//     versions, fixture count, content hashes of the manifest, invariant set,
//     canonicalizer and frozen source). `--check` recomputes and compares.
//
//   provenance — facts about the candidate that cannot be recomputed later
//     (the workflow run that verified it). Carried forward, never invented.
//
//   buildEnvironment — the toolchain that produced it. NOT compared: a
//     different machine must be able to verify the same evidence.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CERT_DIR = join(root, "docs/certification");
const CANDIDATE = join(CERT_DIR, "candidate.json");
const CANDIDATE_MD = join(CERT_DIR, "candidate.md");

const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: "utf8" }).trim();
/** git that tolerates a shallow clone or a missing tag: null rather than throw. */
const shSafe = (cmd, args) => { try { return sh(cmd, args); } catch { return null; } };
const hash = (buf) => createHash("sha256").update(buf).digest("hex");
const sha256 = (relPath) => hash(readFileSync(join(root, relPath)));
/** The same file as it existed in the tree at a git ref. */
const sha256AtRef = (ref, relPath) => {
  try { return hash(execFileSync("git", ["show", `${ref}:${relPath}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 })); }
  catch { return null; }
};

const HASHED_FILES = {
  manifest: "test/golden/manifest.json",
  invariants: "test/oracle/invariants.mjs",
  canonicalizer: "test/oracle/canonicalize.mjs",
  referenceSource: "reference/src/cortex-v0.5.1.jsx",
};

/**
 * Everything a third party can recompute from a tree alone. `at` selects the
 * tree: the working copy by default, or a git ref for a release record.
 */
const deriveEvidence = (at = null) => {
  const read = (p) => (at ? execFileSync("git", ["show", `${at}:${p}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 }) : readFileSync(join(root, p)));
  const h = (p) => (at ? sha256AtRef(at, p) : sha256(p));
  const manifest = JSON.parse(read(HASHED_FILES.manifest).toString("utf8"));
  return {
    // Content-addressed, not history-addressed. Hashing the frozen source is
    // stronger than recording a commit SHA (it detects tampering a commit
    // record cannot) and independent of clone depth.
    referenceSource: { path: HASHED_FILES.referenceSource, sha256: h(HASHED_FILES.referenceSource) },
    referenceBaseline: manifest.sourceBaseline,
    oracleVersion: manifest.oracleVersion,
    canonicalizationVersion: manifest.canonicalizationVersion,
    schemaVersion: manifest.schemaVersion,
    fixtureCount: manifest.cases.length,
    manifest: { path: HASHED_FILES.manifest, sha256: h(HASHED_FILES.manifest) },
    invariantVersion: { set: HASHED_FILES.invariants, sha256: h(HASHED_FILES.invariants) },
    canonicalizer: { path: HASHED_FILES.canonicalizer, sha256: h(HASHED_FILES.canonicalizer) },
  };
};

const buildEnvironment = () => ({
  node: process.version,
  npm: (() => { try { return "v" + sh("npm", ["--version"]); } catch { return null; } })(),
  platform: process.platform,
  arch: process.arch,
});

/** The gate names defined by the CI workflow — the source of truth. */
const workflowGates = () => {
  const wf = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  return [...wf.matchAll(/^\s+- name:\s+(\S+)\s*$/gm)].map((m) => m[1]);
};

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const buildCandidate = (prior) => {
  const p = (prior && prior.provenance) || {};
  const runId = arg("run-id") || process.env.GITHUB_RUN_ID || p.workflowRunId || null;
  return {
    artifact: "behavioral-certification-candidate",
    subject: "@opensource-cortex/kernel",
    kernelVersion: "0.5.1",
    // Deliberately NOT a release tag. This candidate has not shipped, and
    // borrowing a shipped tag's name is the defect this split exists to fix.
    identity: "candidate",
    releaseTag: null,
    acceptanceCommand: "npm run kernel:golden -- --check",
    // Derived from the workflow, never hardcoded: a hardcoded list goes stale
    // the moment a gate is added.
    gates: workflowGates(),
    evidence: deriveEvidence(),
    provenance: {
      referenceCommitSha: arg("reference-commit") || shSafe("git", ["rev-parse", JSON.parse(readFileSync(join(root, HASHED_FILES.manifest), "utf8")).sourceBaseline]) || p.referenceCommitSha || null,
      workflowName: p.workflowName || "kernel",
      workflowRunId: runId,
      workflowUrl: runId ? `https://github.com/DustinTheismann/Cortex-Kernel/actions/runs/${runId}` : null,
    },
    buildEnvironment: buildEnvironment(),
    note: "A candidate, not a release. When a release is cut, scripts/ledger.mjs --release copies this evidence into docs/certification/<tag>.json, which is then immutable and verified against the tree at <tag>.",
  };
};

/**
 * The human-readable projection, DERIVED rather than maintained alongside.
 * Hand-maintained projections drift: this one carried a fixture count and a
 * manifest hash that had not matched the JSON for several corpus revisions.
 * Anything that changes on every invocation is referenced, not inlined, so
 * regeneration is byte-stable unless the evidence itself moved.
 */
const renderCandidateMarkdown = (c) => {
  const e = c.evidence, p = c.provenance;
  return [
    "# Behavioral certification — candidate",
    "",
    "Generated by `npm run certify` from `candidate.json`. Do not edit by hand.",
    "",
    "> **This is not a release record.** It certifies the *current* tree against the",
    "> frozen v0.5.1 behavioral oracle and carries no release tag, because it has not",
    "> shipped. Immutable per-release records live beside it as",
    "> `docs/certification/<tag>.json` and describe the tree at their tag, not this one.",
    "",
    "Verified by `npm run certify:check` (CI gate `certification`), which recomputes",
    "every field below from the working tree and fails on any mismatch — so an",
    "oracle or canonicalizer change that was not re-certified fails CI rather than",
    "shipping a stale claim.",
    "",
    "The frozen reference is identified by the **content hash** of",
    "`" + e.referenceSource.path + "`, not by a commit SHA. That is both stronger",
    "(it detects tampering a commit record cannot) and independent of clone depth, so",
    "verification works in a shallow checkout, from a tarball, or with no git at all.",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Reference source hash (sha256 of \`${e.referenceSource.path}\`) | \`${e.referenceSource.sha256}\` |`,
    `| Reference baseline (provenance) | \`${p.referenceCommitSha || "—"}\` |`,
    `| Oracle version | \`${e.oracleVersion}\` |`,
    `| Canonicalization version | \`${e.canonicalizationVersion}\` |`,
    `| schemaVersion | \`${e.schemaVersion}\` |`,
    `| Fixture count | \`${e.fixtureCount}\` |`,
    `| Manifest hash (sha256 of \`${e.manifest.path}\`) | \`${e.manifest.sha256}\` |`,
    `| Invariant-set hash (sha256 of \`${e.invariantVersion.set}\`) | \`${e.invariantVersion.sha256}\` |`,
    `| Canonicalizer hash (sha256 of \`${e.canonicalizer.path}\`) | \`${e.canonicalizer.sha256}\` |`,
    `| Verifying workflow run | \`${p.workflowRunId || "—"}\` |`,
    "| Build environment | see JSON `buildEnvironment` (Node, npm, platform, arch) |",
    "",
    "## Acceptance",
    "",
    "```bash",
    c.acceptanceCommand,
    "```",
    "",
    "Passes only when the extracted kernel reproduces every manifest hash and fails",
    "on fixture/manifest-hash drift, ordered-array changes, semantic-invariant",
    "regressions, missing cases, unexpected output fields, nondeterministic output,",
    "or frozen-reference drift.",
    "",
    `## Gates (${c.gates.length})`,
    "",
    c.gates.map((g) => "`" + g + "`").join(" · "),
    "",
    "Derived from `.github/workflows/ci.yml`, the source of truth for the gate set;",
    "`npm run gates` fails if this list, the README table, or any prose count",
    "disagrees with it.",
    "",
    "## Becoming a release",
    "",
    "```bash",
    "node scripts/ledger.mjs --release --tag=<tag>",
    "```",
    "",
    "Seals the ledger's candidate entry and copies this evidence to",
    "`docs/certification/<tag>.json`, which is thereafter immutable and verified",
    "against the tree at `<tag>` rather than against HEAD.",
    "",
    "## Scope",
    "",
    "Parity-only. The frontier research track (`docs/research/frontier-backlog.md`)",
    "is isolated and does not modify the v0.5.1 extraction.",
    "",
  ].join("\n");
};

/** Every immutable release record on disk. */
const releaseRecords = () => (existsSync(CERT_DIR)
  ? readdirSync(CERT_DIR)
    .filter((f) => f.endsWith(".json") && f !== "candidate.json")
    .map((f) => ({ file: f, tag: f.replace(/\.json$/, ""), path: join(CERT_DIR, f) }))
  : []);

const main = () => {
  const prior = existsSync(CANDIDATE) ? JSON.parse(readFileSync(CANDIDATE, "utf8")) : null;

  if (process.argv.includes("--check")) {
    const problems = [];

    // 1. The candidate must describe the tree it sits in.
    if (!prior) problems.push(`no candidate certificate at ${CANDIDATE.replace(root + "/", "")} — run npm run certify`);
    else {
      const fresh = deriveEvidence();
      const stored = prior.evidence || {};
      for (const k of Object.keys(fresh)) {
        if (JSON.stringify(stored[k]) !== JSON.stringify(fresh[k])) {
          problems.push(`  candidate evidence.${k}\n    certificate: ${JSON.stringify(stored[k])}\n    repository:  ${JSON.stringify(fresh[k])}`);
        }
      }
      if (prior.releaseTag !== null) problems.push("  the candidate carries a releaseTag — a candidate has not shipped and must not borrow a release identity");
      const md = existsSync(CANDIDATE_MD) ? readFileSync(CANDIDATE_MD, "utf8") : null;
      if (md !== renderCandidateMarkdown(prior)) problems.push("  docs/certification/candidate.md is not what the candidate renders to");
    }

    // 2. Every release record must still describe the tree at ITS OWN tag —
    //    never the tree that happens to be checked out. This is the check that
    //    makes a release record immutable in substance and not just in prose.
    for (const rec of releaseRecords()) {
      const cert = JSON.parse(readFileSync(rec.path, "utf8"));
      if (cert.identity !== "release") { problems.push(`  ${rec.file}: identity is ${JSON.stringify(cert.identity)}, expected "release"`); continue; }
      if (cert.releaseTag !== rec.tag) { problems.push(`  ${rec.file}: releaseTag ${JSON.stringify(cert.releaseTag)} does not match its filename`); continue; }
      const resolved = shSafe("git", ["rev-list", "-n", "1", rec.tag]);
      if (!resolved) {
        problems.push(`  ${rec.file}: tag ${rec.tag} does not resolve — a release record whose tag is unreachable cannot be verified.\n    In CI this means the checkout must fetch tags (fetch-depth: 0).`);
        continue;
      }
      if (cert.release && cert.release.releaseCommitSha && cert.release.releaseCommitSha !== resolved) {
        problems.push(`  ${rec.file}: records releaseCommitSha ${cert.release.releaseCommitSha} but tag ${rec.tag} resolves to ${resolved}`);
      }
      const atTag = deriveEvidence(rec.tag);
      for (const k of Object.keys(atTag)) {
        if (JSON.stringify((cert.evidence || {})[k]) !== JSON.stringify(atTag[k])) {
          problems.push(`  ${rec.file}: evidence.${k} does not describe the tree at ${rec.tag}\n    certificate: ${JSON.stringify((cert.evidence || {})[k])}\n    tree at tag: ${JSON.stringify(atTag[k])}`);
        }
      }
    }

    if (problems.length) {
      console.error("certification FAILED:\n" + problems.join("\n"));
      console.error("\nA candidate that drifted: re-run `npm run certify` and commit it.");
      console.error("A release record that drifted: it is IMMUTABLE — do not regenerate it. Restore it from the tag.");
      process.exit(1);
    }
    const e = prior.evidence;
    console.log(`certification OK: candidate matches the working tree (${e.fixtureCount} fixtures, oracle ${e.oracleVersion}, canonicalization v${e.canonicalizationVersion})`);
    const rels = releaseRecords();
    console.log(`  ${rels.length} immutable release record(s) verified against their tags: ${rels.map((r) => r.tag).join(", ") || "(none)"}`);
    return;
  }

  // Regeneration writes the CANDIDATE only. Release records are written once,
  // by `ledger --release`, and never again.
  if (process.argv.includes("--release-record")) {
    console.error("certify does not write release records. Seal a release with: node scripts/ledger.mjs --release --tag=<tag>");
    process.exit(2);
  }
  mkdirSync(CERT_DIR, { recursive: true });
  const c = buildCandidate(prior);
  writeFileSync(CANDIDATE, JSON.stringify(c, null, 2) + "\n");
  writeFileSync(CANDIDATE_MD, renderCandidateMarkdown(c));
  console.log("candidate certification written: docs/certification/candidate.json + candidate.md");
};

main();
