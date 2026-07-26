# Changelog

All notable changes to this repository are documented here. Versioning follows
[`docs/versioning.md`](docs/versioning.md).

## [v0.5.1-kernel] — 2026-07-25

The frozen v0.5.1 semantic kernel, extracted into a framework-independent
package whose behavioral equivalence to the reference artifact is independently
enforced by CI.

### Added
- `@opensource-cortex/kernel` — dependency-free ESM extraction of the frozen
  v0.5.1 kernel: `types`, `registry`, `compatibility`, `planner`, `contracts`,
  `obligations`, `advancement`, `verdicts`, `serialization`, `errors`.
- Behavioral oracle (`test/oracle/`) that slices the frozen source verbatim and
  executes it headless, plus a 41-case golden corpus (`test/golden/`) with
  per-case SHA-256 hashes, a behavioral coverage map, and recorded extraction
  blockers.
- Differential comparator (`test/differential/compare.mjs`): field-level,
  ordered-array, semantic-invariant, and hash comparison with readable output.
- Opt-in explainability trace, structurally separate from the canonical
  decision (`evaluateCascade(input, { trace: true })`).
- Behavioral certification artifact (`docs/certification/`).
- Weekly Dependabot updates for the `github-actions` ecosystem.

### Changed
- Replaced the earlier, never-oracle-validated TypeScript transcription with
  the JavaScript extraction derived from the frozen reference.
- Pinned CI actions to immutable commit SHAs so a moved tag cannot change what
  CI executes.

### Verified
- All 41 oracle fixtures reproduce byte-for-byte after canonicalization.
- Array order, absent/null/undefined distinctions, stage advancement, path
  selection, obligation statuses, and import/export behavior all match.
- Deterministic across repeated runs; no React, browser, or network access.
- The frozen reference artifact remains byte-identical.

### Certification
- Reference commit: `804f767e2b9e9eb292c8368e60e9f3224a6a54f7`
- Kernel merge commit: `5777134ca3ae07620fb7d00b7653c094f01552a1`
- Oracle `v0.5.1`, canonicalization version `1`, schemaVersion `7`, 41 fixtures
- Verified by workflow run
  [`30141097317`](https://github.com/DustinTheismann/Cortex-Kernel/actions/runs/30141097317)
  (`success`)

### Known limitations
- Model schema extraction, the OpenAlex literature probe, and persisted-state
  hydration are not captured as oracle fixtures — they are intrinsically
  nondeterministic or browser-coupled. Each is documented with its
  instrumentation, confidence level, and residual risk in
  [`docs/oracle-limitations.md`](docs/oracle-limitations.md).
- `VERIFIED` remains unreachable by design; everything past
  `EPISTEMICALLY_SUPPORTED` belongs to a backend of independent instruments.
- The package is not published to npm.

## [v0.5.1-reference] — 2026-07-24

### Added
- The frozen v0.5.1 standalone as the reference contract, the full standalone
  lineage, the backend handoff specification, and the `schemaVersion 7`
  export/import contract documentation.
