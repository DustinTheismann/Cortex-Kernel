#!/usr/bin/env node
// Certification chain — semantic history, hash-linked.
//
// A single certificate is a photograph. A chain is a lineage: each release
// links to its predecessor by hash and declares its BEHAVIORAL DELTA, so
// "prove this version never changed how unit contradictions are classified"
// becomes a query rather than an archaeology project.
//
//   node scripts/ledger.mjs --append --tag=v0.6.0-kernel [--statement="..."]
//   node scripts/ledger.mjs --verify     # links intact, certificates unchanged
//   node scripts/ledger.mjs              # print the lineage
//
// The delta is COMPUTED, not narrated: fixture sets and hashes are compared
// against the previous entry, so a silent behavioral change cannot be recorded
// as "no change".

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHAIN = join(root, "ledger/chain.json");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/** An entry's hash covers its content and its link — tampering breaks the chain. */
const entryHash = (e) => sha(JSON.stringify({
  seq: e.seq, releaseTag: e.releaseTag, certificateSha256: e.certificateSha256,
  fixtureHashes: e.fixtureHashes, behavioralDelta: e.behavioralDelta,
  previousEntrySha256: e.previousEntrySha256,
}));

const loadChain = () => (existsSync(CHAIN) ? readJson(CHAIN) : { chainVersion: 1, entries: [] });

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

const append = () => {
  const tagArg = process.argv.find((a) => a.startsWith("--tag="));
  if (!tagArg) { console.error("ledger --append requires --tag=<release-tag>"); process.exit(2); }
  const tag = tagArg.slice(6);
  const stmtArg = process.argv.find((a) => a.startsWith("--statement="));

  const certPath = join(root, "docs/certification", tag + ".json");
  if (!existsSync(certPath)) { console.error(`no certificate for ${tag} at ${certPath}`); process.exit(1); }

  const chain = loadChain();
  const prev = chain.entries[chain.entries.length - 1] || null;
  if (prev && prev.releaseTag === tag) { console.error(`${tag} is already the head of the chain`); process.exit(1); }

  const fixtureHashes = currentFixtureHashes();
  const delta = computeDelta(prev ? prev.fixtureHashes : null, fixtureHashes);

  const entry = {
    seq: chain.entries.length,
    releaseTag: tag,
    certificateSha256: sha(readFileSync(certPath)),
    fixtureCount: Object.keys(fixtureHashes).length,
    fixtureHashes,
    behavioralDelta: {
      ...delta,
      statement: stmtArg ? stmtArg.slice(12)
        : (prev ? (delta.behaviorallyIdentical ? "No behavioral change: every fixture hash is identical to the previous release."
          : `Behavioral change declared: ${delta.changedFixtures.length} changed, ${delta.addedFixtures.length} added, ${delta.removedFixtures.length} removed.`)
          : "Genesis: the behavioral baseline is established by this corpus."),
    },
    previousEntrySha256: prev ? prev.entrySha256 : null,
  };
  entry.entrySha256 = entryHash(entry);

  chain.entries.push(entry);
  mkdirSync(dirname(CHAIN), { recursive: true });
  writeFileSync(CHAIN, JSON.stringify(chain, null, 2) + "\n");
  console.log(`ledger: appended ${tag} (seq ${entry.seq}) — ${entry.behavioralDelta.statement}`);
};

const verify = () => {
  const chain = loadChain();
  const problems = [];
  let prevHash = null;
  for (const e of chain.entries) {
    if (e.previousEntrySha256 !== prevHash) problems.push(`seq ${e.seq} (${e.releaseTag}): broken link — expected previous ${prevHash}, found ${e.previousEntrySha256}`);
    if (entryHash(e) !== e.entrySha256) problems.push(`seq ${e.seq} (${e.releaseTag}): entry hash mismatch — the entry was altered after being written`);
    const certPath = join(root, "docs/certification", e.releaseTag + ".json");
    if (!existsSync(certPath)) problems.push(`seq ${e.seq}: certificate ${e.releaseTag}.json is missing`);
    else if (sha(readFileSync(certPath)) !== e.certificateSha256) problems.push(`seq ${e.seq} (${e.releaseTag}): the certificate changed after certification`);
    prevHash = e.entrySha256;
  }
  // the head must describe the current corpus
  const head = chain.entries[chain.entries.length - 1];
  if (head) {
    const now = currentFixtureHashes();
    const d = computeDelta(head.fixtureHashes, now);
    if (!d.behaviorallyIdentical) {
      problems.push(`the corpus has changed since the head release ${head.releaseTag} without a new ledger entry:`
        + `\n    changed: ${d.changedFixtures.join(", ") || "(none)"}`
        + `\n    added:   ${d.addedFixtures.join(", ") || "(none)"}`
        + `\n    removed: ${d.removedFixtures.join(", ") || "(none)"}`);
    }
  }
  if (problems.length) { console.error("ledger FAILED:\n  " + problems.join("\n  ")); process.exit(1); }
  console.log(`ledger OK: ${chain.entries.length} entr${chain.entries.length === 1 ? "y" : "ies"}, links intact, certificates unchanged, head describes the current corpus`);
};

const show = () => {
  const chain = loadChain();
  if (!chain.entries.length) { console.log("ledger is empty"); return; }
  console.log("certification chain (semantic lineage)\n");
  for (const e of chain.entries) {
    console.log(`  [${e.seq}] ${e.releaseTag}`);
    console.log(`      entry     ${e.entrySha256.slice(0, 16)}…  ← prev ${e.previousEntrySha256 ? e.previousEntrySha256.slice(0, 16) + "…" : "(genesis)"}`);
    console.log(`      fixtures  ${e.fixtureCount} · ${e.behavioralDelta.behaviorallyIdentical === null ? "baseline (no predecessor)" : e.behavioralDelta.behaviorallyIdentical ? "behaviorally identical to predecessor" : "behavioral change declared"}`);
    console.log(`      ${e.behavioralDelta.statement}\n`);
  }
};

if (process.argv.includes("--append")) append();
else if (process.argv.includes("--verify")) verify();
else show();
