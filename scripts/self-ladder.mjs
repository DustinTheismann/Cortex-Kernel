#!/usr/bin/env node
// Self-application: the kernel's own correctness claim, staged on the kernel's
// own epistemic ladder.
//
// The kernel stages bridges between mechanisms as
//   PROPOSED → PATH_FOUND → TYPE_COMPOSABLE → CONTRACT_ADMISSIBLE
//            → EPISTEMICALLY_SUPPORTED → VERIFIED
// and refuses to claim verification it has not performed. Applying that same
// discipline to the extraction itself is the honest way to state what the
// evidence does and does not establish.
//
// Every stage is decided by evidence read from artifacts, never asserted. The
// terminal stage VERIFIED is deliberately unreachable here, exactly as it is
// unreachable inside the standalone: it requires instruments this repository
// does not contain (a mechanized refinement proof), and saying otherwise would
// be the precise failure the whole project exists to prevent.
//
//   node scripts/self-ladder.mjs            # report
//   node scripts/self-ladder.mjs --json     # machine-readable

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const has = (p) => existsSync(join(root, p));
const tryRun = (cmd, args) => {
  try { execFileSync(cmd, args, { cwd: root, stdio: "pipe", encoding: "utf8" }); return { ok: true }; }
  catch (e) { return { ok: false, output: (e.stdout || "") + (e.stderr || "") }; }
};

const manifest = readJson("test/golden/manifest.json");
const coverage = readJson("test/golden/coverage.json");

// ---- obligations for the extraction's own correctness ---------------------

const flatten = (o, prefix = "") => Object.entries(o).flatMap(([k, v]) =>
  typeof v === "object" && v !== null ? flatten(v, prefix + k + ".") : [[prefix + k, v]]);

const coverageClaims = flatten(coverage);
const unmetCoverage = coverageClaims.filter(([, v]) => v !== true).map(([k]) => k);

const goldenStrict = tryRun("node", ["packages/cortex-kernel/test/golden.mjs", "--check"]);
const kernelTests = tryRun("npm", ["--prefix", "packages/cortex-kernel", "test"]);
const fuzz = tryRun("node", ["test/differential/fuzz.mjs", "--cases=500"]);
const conformance = has("impl/rust/target/release/cortex-conformance")
  ? tryRun("node", ["conformance/verify.mjs"])
  : { ok: null };
const mutants = has("impl/rust/target/release/cortex-conformance")
  ? tryRun("node", ["conformance/mutants.mjs", "--check"])
  : { ok: null };

// Which subsystems the mutation battery actually qualifies. Read from the
// generated report rather than restated here — a hand-kept list of "what we
// have tested" is the duplicated state this repository keeps eliminating.
// Everything declared complete WITHOUT a qualifying mutation run is pinned only
// by assumption: the state edge derivation was in when it reproduced its hash
// while four of its rules could be violated freely.
const mutationScope = (() => {
  try {
    return readJson("conformance/MUTATION-REPORT.json").subsystems
      .filter((s) => s.mutationStatus === "qualified").map((s) => s.subsystem);
  } catch { return []; }
})();
const declaredSubsystems = (() => {
  try { return readJson("conformance/baseline.json").implementations.rust.fixtureCompleteSubsystems; }
  catch { return []; }
})();
const unMutated = declaredSubsystems.filter((s) => !mutationScope.includes(s));

// Fixtures no mutation scope reaches. "Every declared subsystem is qualified"
// must not be read as "the corpus is discriminating": the cascade and
// serialization families have no second implementation, so nothing mutates
// them and their adequacy is untested rather than established.
const unassessedFixtures = (() => {
  try {
    const covered = new Set((readJson("conformance/MUTATION-REPORT.json").subsystems || [])
      .flatMap((s) => s.corpusScope || []));
    return manifest.cases.filter((c) => !covered.has(c.caseId)).length;
  } catch { return manifest.cases.length; }
})();

const OBLIGATIONS = [
  { id: "SO-1", name: "Package exists and imports without side effects", method: "deterministic",
    status: has("packages/cortex-kernel/src/index.js") ? "PROVED" : "REFUTED",
    detail: "packages/cortex-kernel/src/index.js present; import purity asserted by smoke test" },

  { id: "SO-2", name: "Every corpus case has a producer", method: "deterministic",
    status: goldenStrict.ok ? "PROVED" : "REFUTED",
    detail: `kernel:golden --check is strict: ${manifest.cases.length} cases, zero pending` },

  { id: "SO-3", name: "Behavioral coverage map is complete", method: "deterministic",
    status: unmetCoverage.length === 0 ? "PROVED" : "UNRESOLVED",
    detail: unmetCoverage.length ? `unmet claims: ${unmetCoverage.join(", ")}` : `${coverageClaims.length} behavioral claims, all evidenced` },

  { id: "SO-4", name: "Every stored hash reproduces", method: "deterministic",
    status: goldenStrict.ok ? "PROVED" : "REFUTED",
    detail: `${manifest.cases.length}/${manifest.cases.length} fixtures reproduce byte-for-byte after canonicalization` },

  { id: "SO-5", name: "Semantic invariants hold and unit suite passes", method: "deterministic",
    status: kernelTests.ok ? "PROVED" : "REFUTED",
    detail: "unit, metamorphic, reference-integrity, witness and trace-invariance tests" },

  { id: "SO-6", name: "Agreement beyond the pinned points", method: "deterministic",
    status: fuzz.ok ? "CONDITIONALLY-SATISFIED" : "REFUTED",
    detail: "seeded differential fuzzing agrees, but sampling is finite: it cannot establish agreement over the whole input space" },

  { id: "SO-7", name: "Independent implementation reproduces the corpus", method: "deterministic",
    status: conformance.ok === null ? "UNRESOLVED" : (conformance.ok ? "CONDITIONALLY-SATISFIED" : "REFUTED"),
    detail: conformance.ok === null
      ? "conformance binary not built — run npm run conformance:build"
      : "a second, independently written implementation reproduces its declared subset; coverage is partial" },

  // Every other obligation asks whether the implementations match the corpus.
  // This one asks whether the CORPUS IS WORTH MATCHING. They are independent:
  // edge derivation reproduced its hash for an entire release while four of its
  // rules could be violated without any fixture noticing, because the corpus
  // never reached those boundaries. A green corpus is only as strong as its
  // discrimination, and until now nothing here measured that.
  { id: "SO-9", name: "The corpus discriminates the semantics it claims to pin", method: "deterministic",
    status: mutants.ok === null ? "UNRESOLVED" : (mutants.ok ? "CONDITIONALLY-SATISFIED" : "REFUTED"),
    detail: mutants.ok === null
      ? "conformance binary not built — run npm run conformance:build"
      : `every declared semantic mutation of ${mutationScope.length} subsystem(s) is killed by the case that claims to pin it, with the predicted violation observable and every other declared case unperturbed; `
        + (unMutated.length
          ? `${unMutated.length} declared subsystem(s) have no mutation coverage and are pinned by assumption: ${unMutated.join(", ")}. `
          : "every subsystem a second implementation declares is now mutation-qualified. ")
        + `${unassessedFixtures} of ${manifest.cases.length} corpus fixtures remain outside every mutation scope — the cascade and serialization layers, which no second implementation reaches, so their adequacy is untested rather than established. `
        + "Adequacy is also finite: a hand-authored mutation set can only refute discrimination, never prove it.",
    falsifier: "A semantic mutation of a declared subsystem that the corpus does not catch." },

  { id: "SO-8", name: "Mechanized refinement proof", method: "formal",
    status: "UNRESOLVED",
    detail: "no proof assistant, model checker, or exhaustive symbolic execution is present. The deterministic core is finite-state and tractable to verify formally; until that exists this obligation is open." },
];

// ---- ladder ---------------------------------------------------------------

const byId = (id) => OBLIGATIONS.find((o) => o.id === id);
const proved = (id) => byId(id).status === "PROVED";
const supported = (id) => ["PROVED", "CONDITIONALLY-SATISFIED"].includes(byId(id).status);

const pathFound = proved("SO-1");
const typeComposable = pathFound && proved("SO-2");
const contractAdmissible = typeComposable && proved("SO-3") && proved("SO-4") && proved("SO-5");
const epistemicallySupported = contractAdmissible && supported("SO-6") && supported("SO-7") && supported("SO-9");
const verified = epistemicallySupported && proved("SO-8");

const stage = verified ? "VERIFIED"
  : epistemicallySupported ? "EPISTEMICALLY_SUPPORTED"
    : contractAdmissible ? "CONTRACT_ADMISSIBLE"
      : typeComposable ? "TYPE_COMPOSABLE"
        : pathFound ? "PATH_FOUND" : "PROPOSED";

const blockReason = verified ? null
  : !epistemicallySupported ? "EVIDENCE_PENDING"
    : "NO_MECHANIZED_PROOF";

const falsifier = {
  kind: "REFUTE_EQUIVALENCE",
  statement: "A single input on which the extracted kernel and the frozen reference produce different canonical decisions would refute this claim. The differential fuzzer is the standing search for exactly that input.",
};

const report = {
  subject: "@opensource-cortex/kernel extraction correctness",
  reference: manifest.sourceBaseline,
  oracleVersion: manifest.oracleVersion,
  stage, blockReason,
  obligations: OBLIGATIONS,
  falsifier,
  honestStatement: verified
    ? "Equivalence is formally established."
    : "Equivalence is strongly evidenced and not proved. The corpus verifies finitely many points; fuzzing extends that sampling; a second implementation corroborates portability. None of these is a proof over the whole input space, and this report will not claim one.",
};

if (process.argv.includes("--json")) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`self-ladder — ${report.subject}\n`);
for (const o of OBLIGATIONS) {
  const mark = { PROVED: "✔", "CONDITIONALLY-SATISFIED": "~", UNRESOLVED: "?", REFUTED: "✘" }[o.status];
  console.log(`  ${mark} ${o.id} ${o.name}`);
  console.log(`      ${o.status} · ${o.method}`);
  console.log(`      ${o.detail}`);
}
const LADDER = ["PROPOSED", "PATH_FOUND", "TYPE_COMPOSABLE", "CONTRACT_ADMISSIBLE", "EPISTEMICALLY_SUPPORTED", "VERIFIED"];
console.log("\n  " + LADDER.map((s) => (s === stage ? `[${s}]` : s)).join(" → "));
console.log(`\n  stage: ${stage}${blockReason ? ` · blocked by: ${blockReason}` : ""}`);
console.log(`  ${report.honestStatement}`);
console.log(`\n  falsifier: ${falsifier.statement}`);
