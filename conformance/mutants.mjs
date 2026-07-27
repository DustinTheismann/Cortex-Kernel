#!/usr/bin/env node
// Mutation battery — does the corpus actually PIN the semantics it claims to?
//
// A green conformance run proves that one implementation agrees with the
// corpus. It does not prove the corpus is discriminating: a corpus that
// exercises no boundary agrees with a wrong implementation just as happily.
// That failure mode is not hypothetical here. When `compute-edges` first
// landed, four semantic mutations — disabling ubiquitous-dependency filtering,
// permitting self-edges, widening a group-size bound, dropping the
// family-token length guard — all passed conformance, because the happy-path
// corpus never reached those boundaries. The fix was additive
// (`compute-edges-boundaries`); this file is what keeps the fix honest.
//
// Each mutation below changes exactly one semantic boundary in the Rust peer.
// The battery asserts that the named corpus case detects it. A surviving
// mutant is a corpus defect, not an implementation defect.
//
// The working tree is never modified: the crate is copied to a temp directory,
// mutated there, and built with its own target dir.
//
//   node conformance/mutants.mjs           # run the battery
//   node conformance/mutants.mjs --list    # print the mutation table only

import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "../test/oracle/canonicalize.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8"));
const byCase = new Map(manifest.cases.map((c) => [c.caseId, c]));

// The corpus cases in scope for this battery. A mutation to edge derivation
// must perturb one of these and must NOT perturb anything else — a mutant that
// escapes its scope means the subsystem boundary is not where we think it is.
const SCOPE = ["compute-edges", "compute-edges-boundaries"];

// `find` is a literal substring and must occur exactly `count` times. If it no
// longer occurs, the battery fails: the implementation was refactored and the
// mutation no longer describes a real semantic boundary, so the evidence it
// supplies has silently expired.
const MUTATIONS = [
  {
    id: "disable-ubiquitous-filter",
    rule: "shared-dependency ignores ubiquitous dependencies",
    find: " && !UBIQUITOUS.contains(&d.as_str())",
    replace: "",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "permit-self-edges",
    rule: "readme-reference never links a repository to itself by name",
    find: "if *bn != a.name {",
    replace: "if true {",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "ascending-star-order",
    rule: "group hubs are the highest-starred member, not the lowest",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "a.stars.partial_cmp(&b.stars).unwrap()",
    detectedBy: ["compute-edges", "compute-edges-boundaries"],
  },
  {
    id: "unstable-tie-ordering",
    rule: "equal-star members keep input order (the sort must be stable)",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "b.stars.partial_cmp(&a.stars).unwrap().then(b.id.cmp(&a.id))",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "widen-language-bound",
    rule: "shared-language groups are capped at 14 members",
    find: "g.len() > 14",
    replace: "g.len() > 15",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "widen-family-bound",
    rule: "naming-family groups are capped at 30 members",
    find: "g.len() > 30",
    replace: "g.len() > 31",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "lower-shared-dep-floor",
    rule: "shared-dependency requires at least two shared non-ubiquitous deps",
    find: "sd.len() >= 2",
    replace: "sd.len() >= 1",
    detectedBy: ["compute-edges", "compute-edges-boundaries"],
  },
  {
    id: "drop-family-length-guard",
    rule: "a naming family token shorter than 2 characters forms no family",
    find: "f.chars().count() < 2",
    replace: "f.chars().count() < 1",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "raise-topic-hub-cap",
    rule: "a shared-topic group is truncated to its top 60 members",
    find: ".take(60)",
    replace: ".take(61)",
    detectedBy: ["compute-edges-boundaries"],
  },
  {
    id: "dedup-on-wrong-key",
    rule: "the name→id index is keyed by name, and a later repo wins",
    find: "find(|(n, _)| *n == r.name.as_str())",
    replace: "find(|(n, _)| *n == r.id.as_str())",
    detectedBy: ["compute-edges-boundaries"],
  },
];

if (process.argv.includes("--list")) {
  for (const m of MUTATIONS) console.log(`${m.id.padEnd(26)} ${m.rule}\n${"".padEnd(26)} pinned by: ${m.detectedBy.join(", ")}`);
  process.exit(0);
}

const CRATE = join(root, "impl/rust");
const original = readFileSync(join(CRATE, "src/main.rs"), "utf8");

// Reproduce the verifier's decision procedure for one case against a binary.
const caseHash = (binary, caseId) => {
  const entry = byCase.get(caseId);
  const payload = JSON.parse(execFileSync(binary, [caseId], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  const fixture = JSON.parse(readFileSync(join(root, "test/golden", entry.fixture), "utf8"));
  return sha256({ caseId, category: entry.category, ...(fixture.data !== undefined ? { data: payload } : payload) });
};

const work = mkdtempSync(join(tmpdir(), "cortex-mutants-"));
const problems = [];
const rows = [];

try {
  for (const m of MUTATIONS) {
    const occurrences = original.split(m.find).length - 1;
    if (occurrences === 0) {
      problems.push(`${m.id}: mutation site no longer present in impl/rust/src/main.rs — the mutation has expired and proves nothing. Re-target it at the current source, or remove it and record why the boundary is gone.`);
      rows.push({ id: m.id, result: "EXPIRED", detected: [] });
      continue;
    }

    const dir = join(work, m.id);
    cpSync(CRATE, dir, { recursive: true, filter: (src) => !src.includes(`${CRATE}/target`) });
    writeFileSync(join(dir, "src/main.rs"), original.split(m.find).join(m.replace));

    try {
      execFileSync("cargo", ["build", "--release", "--offline", "--manifest-path", join(dir, "Cargo.toml"), "--target-dir", join(dir, "target")], { stdio: "pipe" });
    } catch (e) {
      problems.push(`${m.id}: mutant did not compile — ${String(e.stderr || e.message).trim().split("\n").slice(-3).join(" ")}`);
      rows.push({ id: m.id, result: "UNBUILDABLE", detected: [] });
      continue;
    }

    const binary = join(dir, "target/release/cortex-conformance");
    const detected = SCOPE.filter((c) => caseHash(binary, c) !== byCase.get(c).sha256);
    const missing = m.detectedBy.filter((c) => !detected.includes(c));

    if (!detected.length) {
      problems.push(`${m.id}: SURVIVED. "${m.rule}" can be violated without any corpus case noticing. This is a corpus defect — add a case that reaches the boundary.`);
      rows.push({ id: m.id, result: "SURVIVED", detected });
    } else if (missing.length) {
      problems.push(`${m.id}: no longer detected by ${missing.join(", ")} (still detected by ${detected.join(", ") || "nothing"}). The case that pinned this rule stopped pinning it.`);
      rows.push({ id: m.id, result: "MOVED", detected });
    } else {
      rows.push({ id: m.id, result: "killed", detected });
    }
    rmSync(dir, { recursive: true, force: true });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`mutation battery — ${MUTATIONS.length} semantic mutations over edge derivation, scope: ${SCOPE.join(", ")}\n`);
for (const r of rows) {
  const icon = r.result === "killed" ? "✔" : "✘";
  console.log(`  ${icon} ${r.id.padEnd(26)} ${r.result === "killed" ? "killed by " + r.detected.join(", ") : r.result}`);
}
console.log(`\n${rows.filter((r) => r.result === "killed").length}/${MUTATIONS.length} mutants killed.`);
console.log("A surviving mutant means the corpus does not pin the rule it claims to pin.");
for (const p of problems) console.error("\n  " + p);
if (problems.length) process.exit(1);
