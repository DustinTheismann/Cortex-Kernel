#!/usr/bin/env node
// Certification chain — semantic history, hash-linked.
//
// A single certificate is a photograph. A chain is a lineage: each entry links
// to its predecessor by hash and declares its BEHAVIORAL DELTA, so "prove this
// version never changed how unit contradictions are classified" becomes a query
// rather than an archaeology project.
//
// ---------------------------------------------------------------------------
// Two entry kinds, because a shipped release and a moving candidate are not
// the same record.
// ---------------------------------------------------------------------------
// The head used to be a single entry NAMED for a shipped tag while being
// restated on every corpus change. That is an impossible lifecycle state: the
// tag already existed and identified an earlier commit, so the entry could
// never truthfully be sealed under it, and `--release` could never succeed.
//
//   candidate   releaseTag is null. Tracks the current tree. Restatable, and
//               each restatement is counted on the entry. Certified by
//               docs/certification/candidate.json.
//
//   released    Named for a tag that EXISTS and resolves to the entry's
//               releaseCommitSha. Immutable: never restated, only succeeded.
//               Certified by docs/certification/<tag>.json, which describes the
//               tree at that tag.
//
// Sealing is the moment the chain's integrity claim becomes load-bearing, so it
// is anchored rather than asserted: clean tree, expected branch, an annotated
// tag at HEAD, and every gate green, all checked at sealing time.
//
//   node scripts/ledger.mjs --restate [--statement="..."]  # rewrite the candidate head
//   node scripts/ledger.mjs --release --tag=v0.6.0-kernel  # seal it; the tag must exist
//   node scripts/ledger.mjs --verify                       # release-integrity checks
//   node scripts/ledger.mjs                                # print the lineage
//
// The delta is COMPUTED, not narrated: fixture sets and hashes are compared
// against the previous entry, so a silent behavioral change cannot be recorded
// as "no change".

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHAIN = join(root, "ledger/chain.json");
const CERT_DIR = join(root, "docs/certification");
const CANDIDATE_CERT = "docs/certification/candidate.json";

const STATUSES = ["candidate", "released"];

const sha = (s) => createHash("sha256").update(s).digest("hex");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const git = (args) => { try { return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim(); } catch { return null; } };

/** An entry's hash covers its content and its link — tampering breaks the chain. */
const entryHash = (e) => sha(JSON.stringify({
  seq: e.seq, status: e.status, releaseTag: e.releaseTag,
  certificatePath: e.certificatePath, certificateSha256: e.certificateSha256,
  fixtureHashes: e.fixtureHashes, behavioralDelta: e.behavioralDelta,
  previousEntrySha256: e.previousEntrySha256,
  releaseCommitSha: e.releaseCommitSha, restatements: e.restatements,
}));

const loadChain = () => (existsSync(CHAIN) ? readJson(CHAIN) : { chainVersion: 2, entries: [] });
const writeChain = (chain) => { mkdirSync(dirname(CHAIN), { recursive: true }); writeFileSync(CHAIN, JSON.stringify(chain, null, 2) + "\n"); };

const currentFixtureHashes = () => {
  const m = readJson(join(root, "test/golden/manifest.json"));
  return Object.fromEntries(m.cases.map((c) => [c.caseId, c.sha256]));
};

const computeDelta = (prev, next) => {
  const genesis = prev === null;
  const prevIds = new Set(Object.keys(prev || {}));
  const nextIds = new Set(Object.keys(next));
  const added = [...nextIds].filter((k) => !prevIds.has(k)).sort();
  const removed = [...prevIds].filter((k) => !nextIds.has(k)).sort();
  const changed = [...nextIds].filter((k) => prevIds.has(k) && prev[k] !== next[k]).sort();
  const unchanged = [...nextIds].filter((k) => prevIds.has(k) && prev[k] === next[k]).length;
  return {
    // Genesis has no predecessor, so "identical to predecessor" is not a
    // meaningful claim — null, never a misleading false.
    behaviorallyIdentical: genesis ? null : (added.length === 0 && removed.length === 0 && changed.length === 0),
    addedFixtures: genesis ? [] : added,
    removedFixtures: removed, changedFixtures: changed, unchangedFixtures: unchanged,
    baselineFixtures: genesis ? added.length : undefined,
  };
};

const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

/**
 * Rewrite the candidate head against the current corpus. Legitimate only for a
 * candidate: a released entry names a tag that already exists, so restating it
 * would rewrite history that has shipped.
 */
const restate = () => {
  const chain = loadChain();
  const head = chain.entries[chain.entries.length - 1];
  if (!head) { console.error("ledger is empty"); process.exit(1); }
  if (head.status !== "candidate") {
    console.error(`seq ${head.seq} (${head.releaseTag}) is released and immutable.\n`
      + "A corpus change after a release is a new candidate entry, not a rewrite.");
    process.exit(1);
  }
  const certPath = join(root, CANDIDATE_CERT);
  if (!existsSync(certPath)) { console.error(`no candidate certificate at ${CANDIDATE_CERT} — run npm run certify`); process.exit(1); }

  const prev = chain.entries[chain.entries.length - 2] || null;
  const fixtureHashes = currentFixtureHashes();
  const delta = computeDelta(prev ? prev.fixtureHashes : null, fixtureHashes);

  const entry = {
    ...head,
    certificatePath: CANDIDATE_CERT,
    certificateSha256: sha(readFileSync(certPath)),
    fixtureCount: Object.keys(fixtureHashes).length,
    fixtureHashes,
    behavioralDelta: { ...delta, statement: arg("statement", head.behavioralDelta.statement) },
    restatements: (head.restatements || 0) + 1,
  };
  delete entry.entrySha256;
  entry.entrySha256 = entryHash(entry);
  chain.entries[chain.entries.length - 1] = entry;
  writeChain(chain);
  console.log(`ledger: restated the candidate (seq ${entry.seq}, restatement ${entry.restatements}) — ${entry.fixtureCount} fixtures`);
};

/**
 * Seal the candidate head as a release. Every precondition is checked, not
 * trusted, and the released commit is bound into the entry hash.
 */
const release = () => {
  const tag = arg("tag");
  const chain = loadChain();
  const head = chain.entries[chain.entries.length - 1];
  if (!head) { console.error("ledger is empty"); process.exit(1); }
  if (head.status !== "candidate") { console.error(`the head is already released (${head.releaseTag})`); process.exit(1); }
  if (!tag) { console.error("--release requires --tag=<new-tag>"); process.exit(2); }

  const expectedBranch = arg("branch", "main");
  const blockers = [];

  // A shipped tag is an identity, not a label: reusing one would recreate the
  // exact defect this lifecycle exists to prevent.
  if (chain.entries.some((e) => e.releaseTag === tag)) blockers.push(`tag ${tag} is already used by ledger entry ${chain.entries.find((e) => e.releaseTag === tag).seq}`);
  if (existsSync(join(CERT_DIR, tag + ".json"))) blockers.push(`docs/certification/${tag}.json already exists — a release record is written once`);

  const dirty = git(["status", "--porcelain"]);
  if (dirty === null) blockers.push("git is unavailable — a release cannot be anchored without it");
  else if (dirty) blockers.push(`the working tree is dirty:\n      ${dirty.split("\n").join("\n      ")}`);

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== expectedBranch) blockers.push(`HEAD is on '${branch}', not '${expectedBranch}' (override deliberately with --branch=)`);

  const tagType = git(["cat-file", "-t", tag]);
  if (tagType === null) blockers.push(`tag ${tag} does not exist — create and push it before sealing`);
  else if (tagType !== "tag") blockers.push(`tag ${tag} is lightweight (${tagType}); an annotated tag is required: git tag -a ${tag}`);

  const headSha = git(["rev-parse", "HEAD"]);
  const tagSha = git(["rev-list", "-n", "1", tag]);
  if (tagType === "tag" && tagSha !== headSha) blockers.push(`tag ${tag} points at ${tagSha}, but HEAD is ${headSha}`);

  if (process.argv.includes("--skip-gates")) blockers.push("--skip-gates is not permitted when sealing a release");
  else {
    process.stdout.write("verifying every gate before sealing… ");
    try { execFileSync("npm", ["run", "verify"], { cwd: root, stdio: "pipe" }); console.log("green"); }
    catch { console.log("FAILED"); blockers.push("`npm run verify` did not pass — a release cannot be sealed over a failing gate set"); }
  }

  if (blockers.length) {
    console.error(`\ncannot seal ${tag}:\n  - ` + blockers.join("\n  - "));
    console.error("\nSealing makes the entry immutable and starts the chain's integrity claim. It must be anchored, not asserted.");
    process.exit(1);
  }

  // Freeze the candidate's evidence into an immutable, tag-named record.
  const relPath = `docs/certification/${tag}.json`;
  const cand = readJson(join(root, CANDIDATE_CERT));
  const record = {
    ...cand,
    artifact: "behavioral-certification",
    identity: "release",
    releaseTag: tag,
    immutable: true,
    note: `IMMUTABLE. This record describes the tree at its tag and is never regenerated from later repository state. \`certify --check\` verifies every field against \`git show ${tag}:...\`.`,
    release: {
      releaseCommitSha: headSha,
      referenceCommitSha: cand.provenance ? cand.provenance.referenceCommitSha : null,
      workflowName: cand.provenance ? cand.provenance.workflowName : "kernel",
      workflowRunId: cand.provenance ? cand.provenance.workflowRunId : null,
      workflowUrl: cand.provenance ? cand.provenance.workflowUrl : null,
    },
  };
  delete record.provenance;
  writeFileSync(join(root, relPath), JSON.stringify(record, null, 2) + "\n");

  head.status = "released";
  head.releaseTag = tag;
  head.certificatePath = relPath;
  head.certificateSha256 = sha(readFileSync(join(root, relPath)));
  head.releaseCommitSha = headSha;
  head.tagSignature = git(["for-each-ref", `refs/tags/${tag}`, "--format=%(contents:signature)"]) ? "signed" : "unsigned";
  delete head.restatements;
  delete head.entrySha256;
  head.entrySha256 = entryHash(head);

  // A fresh candidate succeeds it, so the chain always has a moving head.
  const next = {
    seq: head.seq + 1, status: "candidate", releaseTag: null,
    certificatePath: CANDIDATE_CERT, certificateSha256: null,
    fixtureCount: head.fixtureCount, fixtureHashes: head.fixtureHashes,
    behavioralDelta: { ...computeDelta(head.fixtureHashes, head.fixtureHashes), statement: `Candidate following ${tag}. No corpus change yet.` },
    previousEntrySha256: head.entrySha256, restatements: 0,
  };
  next.entrySha256 = entryHash(next);
  chain.entries.push(next);
  writeChain(chain);
  console.log(`ledger: sealed ${tag} (seq ${head.seq}) at ${headSha.slice(0, 12)} — annotated tag, ${head.tagSignature}, all gates green.`);
  console.log(`        wrote immutable ${relPath}; a fresh candidate is now seq ${next.seq}.`);
};

/**
 * Release-integrity verification. These are not documentation checks: each one
 * rejects a state in which the chain would claim more than it can support.
 */
const verify = () => {
  const chain = loadChain();
  const problems = [];
  let prevHash = null;

  for (const e of chain.entries) {
    const label = `seq ${e.seq} (${e.releaseTag || "candidate"})`;

    // 1. Status must be present and valid. An entry with no lifecycle state
    //    was previously treated as provisional by inference, which let an
    //    undeclared state pass as a deliberate one.
    if (!STATUSES.includes(e.status)) {
      problems.push(`${label}: status ${JSON.stringify(e.status)} is absent or invalid — must be one of ${STATUSES.join(" | ")}`);
    }

    // link + tamper
    if (e.previousEntrySha256 !== prevHash) problems.push(`${label}: broken link — expected previous ${prevHash}, found ${e.previousEntrySha256}`);
    if (entryHash(e) !== e.entrySha256) problems.push(`${label}: entry hash mismatch — the entry was altered after being written`);

    if (e.status === "candidate") {
      // 2. A candidate must not carry a tag that already exists. That is the
      //    impossible lifecycle state: shipped identity, mutable content.
      if (e.releaseTag) {
        problems.push(`${label}: a candidate must not carry a releaseTag — it has not shipped`);
        if (git(["cat-file", "-t", e.releaseTag])) {
          problems.push(`${label}: worse, tag ${e.releaseTag} ALREADY EXISTS. A shipped release identity cannot name a restatable entry.`);
        }
      }
      if (e.certificatePath !== CANDIDATE_CERT) problems.push(`${label}: a candidate must be certified by ${CANDIDATE_CERT}, not ${e.certificatePath}`);
    }

    if (e.status === "released") {
      if (!e.releaseTag) problems.push(`${label}: a released entry must name its tag`);
      if (!e.releaseCommitSha) problems.push(`${label}: a released entry must bind releaseCommitSha`);
      if (e.restatements) problems.push(`${label}: a released entry records ${e.restatements} restatement(s) — released entries are immutable`);
      // 3. The tag must resolve to the bound commit. A moved tag, or a record
      //    naming a commit the tag never pointed at, fails here.
      const resolved = git(["rev-list", "-n", "1", e.releaseTag]);
      if (resolved === null) {
        problems.push(`${label}: tag ${e.releaseTag} does not resolve — cannot verify the release it claims.\n    In CI the checkout must fetch tags (fetch-depth: 0).`);
      } else if (resolved !== e.releaseCommitSha) {
        problems.push(`${label}: tag ${e.releaseTag} resolves to ${resolved} but the entry binds ${e.releaseCommitSha}`);
      }
      // 4. Its certificate must exist, be unaltered, and be a release record.
      const cp = join(root, e.certificatePath || "");
      if (!e.certificatePath || !existsSync(cp)) problems.push(`${label}: certificate ${e.certificatePath} is missing`);
      else {
        if (sha(readFileSync(cp)) !== e.certificateSha256) problems.push(`${label}: the certificate changed after certification — a release record is immutable`);
        const c = readJson(cp);
        if (c.identity !== "release") problems.push(`${label}: ${e.certificatePath} has identity ${JSON.stringify(c.identity)}, expected "release"`);
        if (c.releaseTag !== e.releaseTag) problems.push(`${label}: ${e.certificatePath} names ${JSON.stringify(c.releaseTag)}, entry names ${JSON.stringify(e.releaseTag)}`);
        // 5. A release record must describe the tree at its own tag, not a
        //    later one. This is what stops an immutable record being quietly
        //    re-derived from current state.
        if (resolved) {
          const atTag = (() => {
            try { return JSON.parse(execFileSync("git", ["show", `${e.releaseTag}:test/golden/manifest.json`], { cwd: root, maxBuffer: 64 * 1024 * 1024 }).toString("utf8")); }
            catch { return null; }
          })();
          if (atTag && c.evidence && c.evidence.fixtureCount !== atTag.cases.length) {
            problems.push(`${label}: ${e.certificatePath} claims ${c.evidence.fixtureCount} fixtures, but the tree at ${e.releaseTag} has ${atTag.cases.length}`
              + " — a release record was regenerated from later repository state");
          }
        }
      }
    }
    prevHash = e.entrySha256;
  }

  // The head must describe the current corpus.
  const head = chain.entries[chain.entries.length - 1];
  if (head) {
    const d = computeDelta(head.fixtureHashes, currentFixtureHashes());
    if (!d.behaviorallyIdentical) {
      problems.push("the corpus has changed since the head entry without a ledger update:"
        + `\n    changed: ${d.changedFixtures.join(", ") || "(none)"}`
        + `\n    added:   ${d.addedFixtures.join(", ") || "(none)"}`
        + `\n    removed: ${d.removedFixtures.join(", ") || "(none)"}`
        + (head.status === "released"
          ? "\n    The head is released and immutable — this should be impossible; a candidate must follow every release."
          : "\n    The head is a candidate — restate it: node scripts/ledger.mjs --restate"));
    }
  }

  if (problems.length) { console.error("ledger FAILED:\n  " + problems.join("\n  ")); process.exit(1); }
  const released = chain.entries.filter((e) => e.status === "released").length;
  console.log(`ledger OK: ${chain.entries.length} entries (${released} released, ${chain.entries.length - released} candidate),`
    + " links intact, release records bound to their tags, head describes the current corpus");
};

const show = () => {
  const chain = loadChain();
  if (!chain.entries.length) { console.log("ledger is empty"); return; }
  console.log("certification chain (semantic lineage)\n");
  for (const e of chain.entries) {
    const seal = e.status === "released"
      ? `released at ${(e.releaseCommitSha || "").slice(0, 12)}${e.tagSignature ? ", " + e.tagSignature : ""}`
      : `candidate${e.restatements ? `, restated ×${e.restatements}` : ""}`;
    console.log(`  [${e.seq}] ${e.releaseTag || "(unreleased candidate)"}  (${seal})`);
    console.log(`      entry     ${e.entrySha256.slice(0, 16)}…  ← prev ${e.previousEntrySha256 ? e.previousEntrySha256.slice(0, 16) + "…" : "(genesis)"}`);
    console.log(`      fixtures  ${e.fixtureCount} · ${e.behavioralDelta.behaviorallyIdentical === null ? "baseline (no predecessor)" : e.behavioralDelta.behaviorallyIdentical ? "behaviorally identical to predecessor" : "behavioral change declared"}`);
    console.log(`      ${e.behavioralDelta.statement}\n`);
  }
};

if (process.argv.includes("--restate")) restate();
else if (process.argv.includes("--release")) release();
else if (process.argv.includes("--verify")) verify();
else show();
