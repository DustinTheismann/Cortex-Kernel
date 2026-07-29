# Changelog

All notable changes to this repository are documented here. Versioning follows
[`docs/versioning.md`](docs/versioning.md).

## [Unreleased]

Corpus growth and cross-language coverage. No frozen behavior changed; every
pre-existing fixture hash is untouched.

### Added
- Release-integrity gate (`test/release-integrity.test.mjs`): eleven negative
  tests that inject one identity defect at a time into a clone and require the
  right check to reject for the right reason — absent or invalid entry status, a
  candidate carrying an existing tag, a released tag that does not resolve to the
  bound commit, a release record regenerated from later state, and a candidate
  borrowing a release identity.
- `shape-compat-boundaries` corpus case (corpus 42 → 43): a 14×14 shape matrix
  reaching what the original 11×11 never did — the `?` wildcard character, the
  `var` and `dynamic` tokens, whitespace trimming, and both sides of the
  standalone-`n` rule. `any` and `unspecified` do contain a non-standalone `n`,
  but both are wildcards for another reason, so the word-boundary test was
  unobservable and could have been deleted unnoticed.
- `compute-edges-boundaries` corpus case (corpus 41 → 42): nine corpora that
  reach the edge-derivation boundaries the happy-path case never touched —
  ubiquitous-dependency filtering, self- and dangling mentions, language and
  family group-size bounds at and over the limit, the single-character family
  guard, the 60-member topic hub cap, star ties, and duplicate names.
- Mutation battery (`conformance/mutants.mjs` + `mutation/`, CI gate
  `mutation-battery`): one-boundary-at-a-time mutations of the Rust peer, each
  required to be killed by the corpus case that claims to pin it, with the
  predicted violation observable in the mutant's own output and every other
  declared case unperturbed. Runs against a temp copy of the crate; the working
  tree is never modified. The classifier is itself tested against synthetic
  mutants of all five outcomes (`mutation/selftest.mjs`, 17 assertions).
- Rust peer: `compute-edges`, `compute-edges-boundaries` and
  `shape-compat-boundaries`, mutation-qualifying `edge-derivation`,
  `compatibility` and `license-screening`; the planner, edge-cost, registry,
  types, schema-normalization, literature-classification and
  property-test-skeleton surfaces qualified against the corpus unchanged
  (coverage 10/41 → 13/43).
- 51 declared mutants across all ten subsystems a second implementation
  declares — registry, types, schema normalization, literature classification,
  the property-test skeleton, multipath planning, edge cost, edge derivation,
  the compatibility predicates and license screening — each carrying a semantic
  rule, a pinning fixture, a symbolic violation name, an exact site count, a
  confinement scope, and an assertion over the mutant's own output.
- `unpinnable`: rules no corpus can reach **over this state space**, recorded
  with their measurement rather than asserted in prose. The 4000-iteration
  search guard is the first: an exhaustive replay over all 256 ordered pairs
  reaches 272 iterations at worst (`tensor>graph`), a 14.7x headroom, bound to
  the registry and planner hashes and carrying the condition under which it must
  be revisited. The claim is "unreachable under the v0.5.1 registry", not
  "universally unreachable" — a denser future registry could make it bind.

### Changed
- **Certification is split into two artifacts.** `docs/certification/candidate.json`
  certifies the *current* tree and carries no release tag;
  `docs/certification/<tag>.json` is written once at sealing and describes the
  tree at that tag, verified against `git show <tag>:…`. They were previously one
  file, which produced a record with no unambiguous temporal subject: named for
  the shipped `v0.5.1-kernel` tag while its evidence tracked HEAD.
- **Ledger entries are `candidate` or `released`.** A candidate carries
  `releaseTag: null` and is restatable; a released entry names an existing tag,
  binds the commit it resolves to, and can only be succeeded. The previous single
  entry carried a shipped tag while being restated on every corpus change — an
  impossible lifecycle state that `--release` could never resolve, because the
  tag already identified an earlier commit.
- `v0.5.1-kernel` is reconstructed from its own tagged tree (41 fixtures) and
  sealed; the 43-fixture evidence is now the unreleased candidate.
- `conformance/baseline.json`: `subsystemsComplete` renamed to
  `fixtureCompleteSubsystems`. The old name asserted a completeness the field
  cannot support; fixture parity and mutation adequacy are separate claims and
  `conformance/REPORT.json` is the only place that states both, per subsystem.
- Cascade categories carry `cascade-`-prefixed semantic-area names. `compatibility`
  and `multipath-planning` previously meant both the deterministic predicate and
  planner surface and the cascade stage above it, which let the baseline claim a
  subsystem the implementation had only half-covered.
- `scripts/certify.mjs` generates the Markdown certificate from the JSON and
  fails `--check` on drift; `release.certifiedAtCommit` is carried forward
  rather than recomputed from HEAD.
- `scripts/ledger.mjs`: entries carry `provisional`/`released` status.
  `--release` refuses unless the tree is clean, HEAD is on `main`, an annotated
  tag exists at HEAD, and `npm run verify` passes.

### Verified
- The corpus is discriminating for every subsystem a second implementation
  declares: 51/51 mutants killed correctly, zero surviving, zero killed
  incidentally, zero collateral divergence.
- Across all 51, exactly one rule was found unpinned — the standalone-`n` shape
  wildcard — and one additive fixture closed it. Everything else was already
  discriminated by the corpus as it stood, which is the result rather than a
  disappointment.
- Restricting the battery to the pre-existing `compute-edges` case alone leaves
  8 of its 10 mutants alive, which is the state that shipped before this change.
- Eleven of the twelve compatibility and license mutants were killed by the
  corpus as it already stood; only the standalone-`n` rule was unpinned.
- All ten planner and edge-cost mutants were killed by the existing 16×16
  matrices, needing no new fixture: equal-cost ties occur in 24 pairs, the
  three-path retention cap binds in 124, the depth cap changes the result in 58,
  56 pairs are structurally impossible, and 124 length-five paths confirm that
  goal acceptance precedes the depth check.
- Canonicalization bounds what a fixture can pin: object keys are sorted, so a
  map-shaped case cannot observe enumeration order. Reordering `MECH_KINDS`
  leaves every planner matrix byte-identical; only `mech-kinds`, which emits an
  array, catches it. The battery reported this rather than letting a wider
  `expectedKillers` stand as an unearned claim.

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
- **Certification is split into two artifacts.** `docs/certification/candidate.json`
  certifies the *current* tree and carries no release tag;
  `docs/certification/<tag>.json` is written once at sealing and describes the
  tree at that tag, verified against `git show <tag>:…`. They were previously one
  file, which produced a record with no unambiguous temporal subject: named for
  the shipped `v0.5.1-kernel` tag while its evidence tracked HEAD.
- **Ledger entries are `candidate` or `released`.** A candidate carries
  `releaseTag: null` and is restatable; a released entry names an existing tag,
  binds the commit it resolves to, and can only be succeeded. The previous single
  entry carried a shipped tag while being restated on every corpus change — an
  impossible lifecycle state that `--release` could never resolve, because the
  tag already identified an earlier commit.
- `v0.5.1-kernel` is reconstructed from its own tagged tree (41 fixtures) and
  sealed; the 43-fixture evidence is now the unreleased candidate.
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
