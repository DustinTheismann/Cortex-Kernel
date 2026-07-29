#!/usr/bin/env node
// Release-integrity negative tests.
//
// A release identity is a claim about a shipped artifact, and the gates that
// enforce it are only worth having if they REJECT. These tests corrupt the
// chain and the certificate directory in a scratch copy of the repository —
// one defect at a time — and require the corresponding check to fail.
//
// The defect that motivated them: the certificate was named for a shipped tag
// while its evidence tracked HEAD, and the ledger's only entry carried that
// same shipped tag while being restated on every corpus change. Both were
// individually parseable, CI was green, and neither gate could see the problem
// because neither validated release identity — only representation.
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

/**
 * A local clone of the repository under test. Cloning rather than re-creating
 * history means the sandbox's tags resolve to the SAME commits and trees as the
 * real repository, so the committed chain and certificates are valid in it
 * unchanged — and any failure is caused by the test's mutation, not by the
 * fixture setup. Uncommitted working-tree state is copied over the clone so the
 * tests run against what is actually staged for review.
 */
const sandbox = (mutate) => {
  const dir = mkdtempSync(join(tmpdir(), "cortex-release-"));
  execFileSync("git", ["clone", "--quiet", "--local", "--no-hardlinks", root, dir], { stdio: "pipe" });
  for (const p of ["ledger/chain.json", "docs/certification", "scripts", "test/golden/manifest.json"]) {
    if (existsSync(join(root, p))) cpSync(join(root, p), join(dir, p), { recursive: true });
  }
  mutate(dir);
  return dir;
};

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
  const dir = sandbox((d) => editChain(d, (c) => { c.entries[1].releaseTag = "v0.5.1-kernel"; }));
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
  // Overwrite the immutable record's fixture count with the candidate's.
  const dir = sandbox((d) => {
    const p = join(d, "docs/certification/v0.5.1-kernel.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.evidence.fixtureCount = 43;
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
    const p = join(d, "docs/certification/v0.5.1-kernel.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.evidence.manifest.sha256 = "f".repeat(64);
    writeFileSync(p, JSON.stringify(c, null, 2) + "\n");
  });
  const r = certify(dir);
  assert.equal(r.ok, false);
  assert.match(r.out, /does not describe the tree at v0\.5\.1-kernel/);
  rmSync(dir, { recursive: true, force: true });
});

test("5b. a candidate that borrows a release identity is rejected by certify", () => {
  const dir = sandbox((d) => {
    const p = join(d, "docs/certification/candidate.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.releaseTag = "v0.5.1-kernel";
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
  const dir = sandbox((d) => editChain(d, (c) => { c.entries.pop(); }));
  const r = run(dir, ["--restate"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /released and immutable/);
  rmSync(dir, { recursive: true, force: true });
});

test("sealing refuses to reuse a tag the chain already released", () => {
  const dir = sandbox(() => {});
  const r = run(dir, ["--release", "--tag=v0.5.1-kernel"]);
  assert.equal(r.ok, false);
  assert.match(r.out, /already used by ledger entry/);
  rmSync(dir, { recursive: true, force: true });
});

test("the unmodified chain and certificates verify", () => {
  const dir = sandbox(() => {});
  assert.equal(run(dir, ["--verify"]).ok, true, "baseline chain must verify");
  assert.equal(certify(dir).ok, true, "baseline certificates must verify");
  rmSync(dir, { recursive: true, force: true });
});
