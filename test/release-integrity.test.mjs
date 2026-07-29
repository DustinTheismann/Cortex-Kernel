#!/usr/bin/env node
// Release-integrity negative tests.
//
// A release identity is a claim about a shipped artifact, and the gates that
// enforce it are only worth having if they REJECT. These tests corrupt the
// chain and the certificate directory in a scratch copy of the repository —
// one defect at a time — and require the corresponding check to fail.
//
// The defect that motivated them: the certificate was named for a release tag
// while its evidence tracked HEAD, and the ledger's only entry carried that
// same tag while being restated on every corpus change. Both were individually
// parseable, CI was green, and neither gate could see the problem because
// neither validated release identity — only representation.
//
// Enforcing that model then surfaced a second fact the first review had assumed
// away: the tag it was named for was never published. The repository has no
// released entry at all today, which is exactly why these tests seal their own.
//
//   node --test test/release-integrity.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TAG = "vTEST-release";

/**
 * A clone of the repository that then SEALS ITS OWN release, so the tests do
 * not depend on the real repository having one. That independence matters: the
 * repository currently has no published tag at all, and a test suite that
 * silently degrades when no release exists would be testing nothing — the
 * failure mode these checks were written to eliminate.
 *
 * Sealing is driven through the real `ledger --release`, so the fixture is
 * produced by the code under test rather than hand-assembled, and every
 * mutation below corrupts a genuinely sealed release.
 */
const sandbox = (mutate, sealArgs = []) => {
  const dir = mkdtempSync(join(tmpdir(), "cortex-release-"));
  execFileSync("git", ["clone", "--quiet", "--local", "--no-hardlinks", root, dir], { stdio: "pipe" });
  for (const p of ["ledger/chain.json", "docs/certification", "scripts", "test/golden", "test/oracle", "package.json"]) {
    if (existsSync(join(root, p))) cpSync(join(root, p), join(dir, p), { recursive: true });
  }
  const g = (...a) => execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: dir, stdio: "pipe" });
  g("checkout", "-q", "-B", "main");
  g("add", "-A");
  // --allow-empty: in a clean checkout the copy above is a no-op, and a commit
  // with no changes exits non-zero. Without this the sandbox only works when the
  // working tree happens to be dirty — which is how it passed locally and failed
  // in CI.
  g("commit", "-q", "--allow-empty", "-m", "sandbox base");
  g("tag", "-a", TAG, "-m", "sandbox release");
  // --skip-gates is refused by design, so the gate run is neutralised instead:
  // the sandbox has no Rust toolchain and the point here is release identity.
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  pkg.scripts.verify = "node -e 0";
  writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  g("add", "-A"); g("commit", "-q", "--allow-empty", "-m", "neutralise gates"); g("tag", "-f", "-a", TAG, "-m", "sandbox release");
  execFileSync("node", [join(dir, "scripts/ledger.mjs"), "--release", `--tag=${TAG}`, ...sealArgs], { cwd: dir, stdio: "pipe" });
  mutate(dir);
  return dir;
};

const chainOf = (dir) => JSON.parse(readFileSync(join(dir, "ledger/chain.json"), "utf8"));

const run = (dir, args) => {
  try {
    const out = execFileSync("node", [join(dir, "scripts/ledger.mjs"), ...args], { cwd: dir, encoding: "utf8", stdio: "pipe" });
    return { ok: true, out };
  } catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; }
};
const certify = (dir) => {
  try { execFileSync("node", [join(dir, "scripts/certify.mjs"), "--check"], { cwd: dir, encoding: "utf8", stdio: "pipe" }); return { ok: true, out: "" }; }
  catch (e) { return { ok: false, out: (e.stdout || "") + (e.stderr || "") }; }
};
const editChain = (dir, fn) => {
  const p = join(dir, "ledger/chain.json");
  const c = JSON.parse(readFileSync(p, "utf8"));
  fn(c);
  writeFileSync(p, JSON.stringify(c, null, 2) + "\n");
};

// Each test asserts on the SPECIFIC diagnostic for its defect, never merely on
// "it failed" — a check that rejects for the wrong reason is not enforcing the
// rule it claims to.

test("1. an entry whose status is absent is rejected", () => {
  const dir = sandbox((d) => editChain(d, (c) => { delete c.entries[1].status; }));
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /status .* is absent or invalid/);
  rmSync(dir, { recursive: true, force: true });
});

test("1b. an entry whose status is outside candidate|released is rejected", () => {
  const dir = sandbox((d) => editChain(d, (c) => { c.entries[1].status = "provisional"; }));
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /must be one of candidate \| released/);
  rmSync(dir, { recursive: true, force: true });
});

test("2. a candidate carrying a tag that already exists is rejected", () => {
  // The exact impossible state that shipped: shipped identity, mutable content.
  const dir = sandbox((d) => editChain(d, (c) => { c.entries[1].releaseTag = TAG; }));
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /a candidate must not carry a releaseTag/);
  assert.match(r.out, /ALREADY EXISTS/);
  rmSync(dir, { recursive: true, force: true });
});

test("3. a released entry whose tag does not resolve to its releaseCommitSha is rejected", () => {
  const dir = sandbox((d) => editChain(d, (c) => { c.entries[0].releaseCommitSha = "0".repeat(40); }));
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /resolves to .* but the entry binds/);
  rmSync(dir, { recursive: true, force: true });
});

test("4. a release record regenerated from later state is rejected by the ledger", () => {
  // Claim a fixture count the tree at the tag does not have — what
  // regenerating an immutable record from a later, larger corpus would produce.
  const dir = sandbox((d) => {
    const p = join(d, `docs/certification/${TAG}.json`);
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.evidence.fixtureCount = c.evidence.fixtureCount + 7;
    writeFileSync(p, JSON.stringify(c, null, 2) + "\n");
  });
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  // Either diagnostic is correct: the record is both altered and now
  // inconsistent with the tree at its tag.
  assert.match(r.out, /immutable|regenerated from later repository state/);
  rmSync(dir, { recursive: true, force: true });
});

test("5. a release record that does not describe the tree at its tag is rejected by certify", () => {
  const dir = sandbox((d) => {
    const p = join(d, `docs/certification/${TAG}.json`);
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.evidence.manifest.sha256 = "f".repeat(64);
    writeFileSync(p, JSON.stringify(c, null, 2) + "\n");
  });
  const r = certify(dir);
  assert.equal(r.ok, false);
  assert.match(r.out, new RegExp(`does not describe the tree at ${TAG}`));
  rmSync(dir, { recursive: true, force: true });
});

test("5b. a candidate that borrows a release identity is rejected by certify", () => {
  const dir = sandbox((d) => {
    const p = join(d, "docs/certification/candidate.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.releaseTag = TAG;
    writeFileSync(p, JSON.stringify(c, null, 2) + "\n");
  });
  const r = certify(dir);
  assert.equal(r.ok, false);
  assert.match(r.out, /must not borrow a release identity/);
  rmSync(dir, { recursive: true, force: true });
});

test("a released entry may not record restatements", () => {
  const dir = sandbox((d) => editChain(d, (c) => { c.entries[0].restatements = 3; }));
  const r = run(dir, ["--verify"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /released entries are immutable/);
  rmSync(dir, { recursive: true, force: true });
});

test("restating a released head is refused", () => {
  // Drop the fresh candidate that sealing opened, leaving the released entry
  // as the head.
  const dir = sandbox((d) => editChain(d, (c) => { c.entries.pop(); }));
  const r = run(dir, ["--restate"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /released and immutable/);
  rmSync(dir, { recursive: true, force: true });
});

test("sealing refuses to reuse a tag the chain already released", () => {
  const dir = sandbox(() => {});
  const r = run(dir, ["--release", `--tag=${TAG}`]);
  assert.equal(r.ok, false);
  assert.match(r.out, /already used by ledger entry/);
  rmSync(dir, { recursive: true, force: true });
});

// A candidate's wording describes an UNRELEASED state. Inheriting it into an
// immutable released entry freezes a sentence that is false the moment it is
// sealed — which is the contradiction the whole release model removes. The
// override must therefore be honoured at sealing, not only at restatement.

test("--release seals the supplied statement, not the candidate's", () => {
  const RELEASE_STATEMENT = "Kernel 0.5.2 certified against frozen reference 0.5.1 — sealed statement, supplied at release.";
  const before = JSON.parse(readFileSync(join(root, "ledger/chain.json"), "utf8"));
  const candidateStatement = before.entries[before.entries.length - 1].behavioralDelta.statement;

  const dir = sandbox(() => {}, [`--statement=${RELEASE_STATEMENT}`]);
  const sealed = chainOf(dir).entries.find((e) => e.status === "released");

  assert.equal(sealed.behavioralDelta.statement, RELEASE_STATEMENT,
    "the sealed entry must carry the statement supplied at --release, exactly");
  assert.notEqual(sealed.behavioralDelta.statement, candidateStatement,
    "candidate statement and release statement must differ — inheriting the candidate's is the defect");
  // The chain must still verify with the overridden wording: the statement is
  // inside entryHash, so a naive override would break the entry hash.
  assert.equal(run(dir, ["--verify"]).ok, true, "the sealed chain must verify");
  rmSync(dir, { recursive: true, force: true });
});

test("--release falls back to the candidate's statement when none is supplied", () => {
  const before = JSON.parse(readFileSync(join(root, "ledger/chain.json"), "utf8"));
  const candidateStatement = before.entries[before.entries.length - 1].behavioralDelta.statement;

  const dir = sandbox(() => {});
  const sealed = chainOf(dir).entries.find((e) => e.status === "released");
  assert.equal(sealed.behavioralDelta.statement, candidateStatement,
    "with no override the candidate's wording is carried forward unchanged");
  rmSync(dir, { recursive: true, force: true });
});

test("the unmodified chain and certificates verify", () => {
  const dir = sandbox(() => {});
  assert.equal(run(dir, ["--verify"]).ok, true, "baseline chain must verify");
  assert.equal(certify(dir).ok, true, "baseline certificates must verify");
  rmSync(dir, { recursive: true, force: true });
});
