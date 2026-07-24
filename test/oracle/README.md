# v0.5.1 behavioral oracle & golden decision corpus

Measurable behavioral capture of the frozen v0.5.1 kernel, taken directly from
`reference/src/cortex-v0.5.1.jsx` @ `804f767`. These fixtures are the
**acceptance oracle** for the framework-independent extraction (Phase 2): the
extracted library must reproduce every stored `sha256` exactly.

Nothing here is transcribed. `adapter.mjs` slices the frozen definitions
verbatim and executes them; the fixtures are the artifact's own output. Where a
dependency is intrinsically nondeterministic or browser/React-coupled, it is
stubbed at that boundary only and the coupling is catalogued in
`docs/oracle-limitations.md` — never silently reimplemented.

## Layout

```
test/oracle/
  adapter.mjs        verbatim slicer + headless invocation (the only reader of the frozen source)
  cases.mjs          representative inputs — 25 required scenarios + kernel sweeps
  canonicalize.mjs   narrow canonical encoding + sha256 (canonicalizationVersion 1)
  invariants.mjs     semantic behavioral invariants
  harness.mjs        orchestration: fixtures + manifest.json + coverage.json; --check
test/golden/
  fixtures/*.json    one canonical fixture per case (input + complete output)
  manifest.json      per-case { caseId, category, fixture, sha256, expectedStage, expectedVerdict, oracleSource }
  coverage.json      behavioral claim map (computed from the decisions, not hand-set)
test/differential/
  compare.mjs        field-level + ordered-array + invariant + sha256 diff (built for Phase 2)
docs/
  extraction-map.md      objective → frozen source → case → target module
  oracle-limitations.md  extraction blockers (source, cause, instrumentation, confidence, risk)
  research/frontier-backlog.md  hyper-advancement track (parity-isolated)
```

## Regenerate / verify

```
node test/oracle/harness.mjs            # regenerate fixtures + manifest + coverage
node test/oracle/harness.mjs --check    # verify vs manifest + disk; invariants; determinism; exit 1 on drift
node test/differential/compare.mjs A.json B.json   # readable field-level decision diff
```

A fixture diff means the frozen artifact changed (forbidden) or a slice marker
broke — both are blockers, never silent updates. Do not regenerate after Phase 2
implementation begins.

## Invocation surfaces (all verbatim frozen logic)

- **Pure kernel** — kinds, registry+costs, multipath search/ranking, pair/shape/unit/license compatibility, property-test skeleton, schema normalization, literature classification, schema-v7 edge derivation. No stubs.
- **`runCascade`** — `verifyCascade` steps 2-4: contract instantiation, PO-1…PO-8, five-stage ladder, impossibility classification, final verdict, novelty class, prize candidacy. Model boundaries are inputs (schemas supplied directly; soft judgments and the literature count injected at their single call sites).
- **`runImport` / `runExport`** — `onFile` / `doExport` run behind stubbed `FileReader` / `Blob` / `URL` / `document`, capturing imported state and the exported payload byte-for-byte.

## Required-scenario coverage (all 25)

directly-compatible · incompatible · single / multiple / equal-cost paths ·
soft precondition satisfied / unresolved / failed · hard incompatibility ·
missing conversion rule · partially-instantiated obligations · advancement
halted at each boundary · advancement through TYPE_COMPOSABLE · post-ladder
literature classification · novelty-class change without ladder change ·
prize-candidacy change without ladder change · import with / without
githubUser · 16-key / 15-key export · repo+edge round-trip · unknown/extra
fields · empty graph · malformed input · deterministic replay.

See `test/golden/coverage.json` for the machine-checkable claim map and
`docs/extraction-map.md` for the objective→source→module mapping.

## Phase 2 acceptance

The extracted, framework-independent kernel is complete only when every
`manifest.json` `sha256` reproduces exactly (array order, absent-vs-null-vs-
undefined, stage advancement, path selection, obligation statuses,
import/export), with no React or browser dependency, identical across runs, and
the reference artifact byte-identical. `--check` plus `compare.mjs` are the gate.
