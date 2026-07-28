// Mutation battery engine — classification, not scoring.
//
// A green conformance run proves that one implementation agrees with the
// corpus. It does not prove the corpus is discriminating: a corpus that
// exercises no boundary agrees with a wrong implementation just as happily.
// That failure mode is not hypothetical here. When `compute-edges` first
// landed, four semantic mutations passed conformance, because the happy-path
// corpus never reached the boundaries they violated.
//
// ---------------------------------------------------------------------------
// A hash mismatch is NOT a kill.
// ---------------------------------------------------------------------------
// Counting "the hash changed" as a kill makes the score decorative: a mutant
// that crashes, or that perturbs output for a reason unrelated to the rule it
// was meant to violate, would score identically to one that demonstrates the
// rule is enforced. So every mutant carries a SEMANTIC ASSERTION — a predicate
// over the mutant's own output that detects the specific predicted violation.
// A mutant counts as killed only when the fixture that claims to pin the rule
// diverges AND the predicted violation is observable.
//
//   killed_correctly    the expected fixture diverged and the predicted
//                       violation is observable — the only success state
//   killed_incidentally output changed, but not in the predicted way, or not
//                       via the fixture that claims to pin the rule, or the
//                       mutant merely crashed
//   survived            the corpus accepted incorrect behavior — a CORPUS
//                       defect, not an implementation defect
//   invalid_mutant      the mutation changed no behavior (site gone, or the
//                       built binary is byte-identical) — it proves nothing
//                       while continuing to look like evidence
//   not_executed        harness defect: the mutant never ran
//
// The working tree is never modified: the crate is copied to a temp directory,
// mutated there, and built with its own target dir.

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "../../test/oracle/canonicalize.mjs";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SRC = "impl/rust/src/main.rs";
export const CRATE = join(root, "impl/rust");
export const BINARY = "impl/rust/target/release/cortex-conformance";

export const fileHash = (p) => createHash("sha256").update(readFileSync(join(root, p))).digest("hex");
const bytesHash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

/**
 * Run one mutant end to end and classify the outcome.
 *
 * `build` and `execute` are injected so the classifier can be exercised
 * directly by the self-test without a Rust toolchain: a classifier nobody can
 * test is exactly the kind of instrument this repository refuses to trust.
 */
export const runMutant = (m, ctx) => {
  const { manifest, subsystemScope, corpusInputs, source, baselineBinaryHash, build, execute, declared, workDir } = ctx;
  const byCase = new Map(manifest.cases.map((c) => [c.caseId, c]));
  const record = {
    id: m.id, subsystem: m.subsystem, rule: m.rule, expectedFailure: m.expectedFailure,
    expectedKillers: m.expectedKillers, actualKillers: [], collateralDivergence: [], outcome: null, detail: "",
  };
  const fail = (outcome, detail, advice) => {
    record.outcome = outcome; record.detail = detail;
    return { record, problem: `${m.id}: ${detail}${advice ? ". " + advice : ""}` };
  };

  const scope = subsystemScope[m.subsystem];
  if (!scope) return fail("not_executed", `no corpus scope declared for subsystem ${m.subsystem}`);

  // A mutant whose pinning fixture was deleted is unprotected, not passing.
  const missing = [...new Set([...scope, ...m.expectedKillers])].filter((c) => !byCase.has(c));
  if (missing.length) {
    return fail("not_executed", `pinning fixture(s) no longer in the corpus: ${missing.join(", ")}`,
      "A mutant whose pinning fixture was removed is unprotected, not passing.");
  }

  // Exact cardinality, not mere presence. `find` is applied to every match, so
  // a refactor that duplicates the fragment would silently turn a
  // one-boundary mutant into a multi-site one — it would still be "killed",
  // but no longer by the boundary it names. Zero occurrences is the expired
  // case; any other count is a mutation that no longer means what it says.
  const occurrences = source.split(m.find).length - 1;
  if (occurrences === 0) {
    return fail("invalid_mutant", `mutation site absent from ${SRC} — the mutation has expired and proves nothing`,
      "Re-target it at the current source, or remove it and record why the boundary is gone.");
  }
  if (occurrences !== m.expectedOccurrences) {
    return fail("invalid_mutant",
      `expected ${m.expectedOccurrences} mutation site(s) in ${SRC}, found ${occurrences} — the mutation no longer isolates one boundary`,
      "Narrow `find` until it matches only the intended site, or update expectedOccurrences deliberately.");
  }

  const mutatedSource = source.split(m.find).join(m.replace);
  let built;
  try { built = build(m, mutatedSource, workDir); }
  catch (e) { return fail("not_executed", "mutant did not compile: " + String(e.stderr || e.message).trim().split("\n").slice(-2).join(" ")); }

  if (built.binaryHash === baselineBinaryHash) {
    return fail("invalid_mutant", "the mutant binary is byte-identical to the baseline — an equivalent mutation that cannot change behavior",
      "It contributes no evidence; replace it with a mutation that reaches the rule.");
  }

  const outputs = {}, inputs = {};
  for (const caseId of scope) {
    const entry = byCase.get(caseId);
    let payload;
    try { payload = execute(built, caseId); }
    catch (e) {
      return fail("killed_incidentally",
        `the mutant failed to produce output (${caseId}: ${String(e.message).split("\n")[0]}) rather than demonstrating ${m.expectedFailure}`,
        "A crash is not evidence that the corpus pins the rule.");
    }
    outputs[caseId] = payload;
    inputs[caseId] = corpusInputs[caseId] || {};
    const fixture = JSON.parse(readFileSync(join(root, "test/golden", entry.fixture), "utf8"));
    const wrapped = { caseId, category: entry.category, ...(fixture.data !== undefined ? { data: payload } : payload) };
    if (sha256(wrapped) !== entry.sha256) record.actualKillers.push(caseId);
  }

  if (!record.actualKillers.length) {
    return fail("survived", `"${m.rule}" can be violated without any corpus case in scope noticing`,
      "This is a CORPUS defect: add a case that reaches the boundary.");
  }

  // Collateral controls. Divergence inside the scope proves the boundary is
  // pinned; it does not prove the mutation was CONFINED to that boundary. Every
  // other case the implementation declares is a control that must stay
  // reproducing. A mutant that also perturbs unrelated fixtures has not
  // demonstrated a localized rule — the subsystem boundary is not where the
  // registry says it is, and crediting it as a clean kill would overstate what
  // the corpus establishes.
  const scopeSet = new Set(scope);
  const collateral = [];
  for (const caseId of declared(built).filter((c) => !scopeSet.has(c) && byCase.has(c))) {
    const entry = byCase.get(caseId);
    let payload;
    try { payload = execute(built, caseId); }
    catch { collateral.push(`${caseId} (failed to execute)`); continue; }
    const fixture = JSON.parse(readFileSync(join(root, "test/golden", entry.fixture), "utf8"));
    const wrapped = { caseId, category: entry.category, ...(fixture.data !== undefined ? { data: payload } : payload) };
    if (sha256(wrapped) !== entry.sha256) collateral.push(caseId);
  }
  record.collateralDivergence = collateral;
  if (collateral.length) {
    return fail("killed_incidentally",
      `the mutation also perturbed declared case(s) outside its subsystem: ${collateral.join(", ")}`,
      "A mutation credited to one boundary must be confined to it. Narrow the mutation, or correct the subsystem scope.");
  }

  let observed = false, threw = null;
  try { observed = m.assert(outputs, inputs) === true; }
  catch (e) { threw = e.message; }

  if (threw) return fail("killed_incidentally", `the semantic assertion threw: ${threw}`, "The assertion must be decidable on mutant output.");
  if (!observed) {
    return fail("killed_incidentally",
      `output changed, but ${m.expectedFailure} is not observable — the divergence does not demonstrate the rule`,
      "A hash mismatch is not a kill.");
  }
  const lost = m.expectedKillers.filter((c) => !record.actualKillers.includes(c));
  if (lost.length) {
    return fail("killed_incidentally",
      `${m.expectedFailure} is observable, but ${lost.join(", ")} no longer diverges — the case that claims to pin this rule stopped pinning it`,
      "Update expectedKillers deliberately, or restore the coverage.");
  }

  record.outcome = "killed_correctly";
  record.detail = `${m.expectedFailure} observed; killed by ${record.actualKillers.join(", ")}`;
  return { record, problem: null };
};

/** Real build/execute against the Rust crate. */
export const cargoRunner = {
  build: (m, mutatedSource, workDir) => {
    const dir = join(workDir, m.id);
    cpSync(CRATE, dir, { recursive: true, filter: (src) => !src.startsWith(join(CRATE, "target")) });
    writeFileSync(join(dir, "src/main.rs"), mutatedSource);
    execFileSync("cargo", ["build", "--release", "--offline", "--manifest-path", join(dir, "Cargo.toml"), "--target-dir", join(dir, "target")], { stdio: "pipe" });
    const binary = join(dir, "target/release/cortex-conformance");
    return { dir, binary, binaryHash: bytesHash(binary) };
  },
  execute: (built, caseId) =>
    JSON.parse(execFileSync(built.binary, [caseId], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })),
  // The conformance protocol's own `--cases` call, so the control set is what
  // the MUTANT declares rather than a list maintained beside it.
  declared: (built) => {
    try { return JSON.parse(execFileSync(built.binary, ["--cases"], { encoding: "utf8" })); }
    catch { return []; }
  },
};

/** Aggregate a classified run into the per-subsystem report. */
export const summarize = (mutations, results, subsystemScope, scopeLabel, extraIntegrity = {}) => {
  const subsystems = {};
  for (const m of mutations) {
    const s = subsystems[m.subsystem] || (subsystems[m.subsystem] = {
      subsystem: m.subsystem, corpusScope: subsystemScope[m.subsystem] || [],
      declaredMutants: 0, killedMutants: 0, survivingMutants: 0, inconclusiveMutants: 0, mutationStatus: "unqualified",
    });
    const r = results.find((x) => x.id === m.id);
    s.declaredMutants++;
    if (r.outcome === "killed_correctly") s.killedMutants++;
    else if (r.outcome === "survived") s.survivingMutants++;
    else s.inconclusiveMutants++;
  }
  for (const s of Object.values(subsystems)) {
    s.mutationStatus = s.declaredMutants > 0 && s.killedMutants === s.declaredMutants ? "qualified" : "unqualified";
  }
  return {
    artifact: "mutation-report",
    interpretation: "A subsystem is mutation-qualified when every declared semantic mutation of its rules is killed by the corpus case that claims to pin it, with the predicted violation observable in the mutant's own output. A hash mismatch alone is not a kill. Subsystems absent from this report have NOT been assessed, which is a different epistemic state from having zero surviving mutants.",
    // Binds the report to the exact corpus, registry and implementation that
    // produced it, so a stale report cannot be read as a current claim.
    integrity: {
      manifestSha256: fileHash("test/golden/manifest.json"),
      implementationSourceSha256: fileHash(SRC),
      ...extraIntegrity,
    },
    scope: scopeLabel,
    subsystems: Object.values(subsystems).sort((a, b) => (a.subsystem < b.subsystem ? -1 : 1)),
    mutants: results,
  };
};

export const makeWorkDir = () => mkdtempSync(join(tmpdir(), "cortex-mutants-"));
export const cleanup = (dir) => rmSync(dir, { recursive: true, force: true });
export const binaryExists = () => existsSync(join(root, BINARY));
