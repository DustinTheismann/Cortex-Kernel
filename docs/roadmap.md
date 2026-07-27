# Roadmap

What is done, what is next, and what is deliberately out of scope. Frontier
research items live in [`research/frontier-backlog.md`](research/frontier-backlog.md)
and never modify parity work.

## Current — shipped

- ✓ **Frozen reference** — the v0.5.1 standalone preserved as the executable
  specification, with its full lineage (`v0.5.1-reference`).
- ✓ **Behavioral oracle** — the frozen source sliced verbatim and executed
  headless; 42-case golden corpus with per-case hashes, coverage map, and
  documented extraction blockers.
- ✓ **Framework-independent extraction** — `@opensource-cortex/kernel`, pure
  ESM, no React/DOM/network, reproducing every fixture byte-for-byte
  (`v0.5.1-kernel`).
- ✓ **Certification + hardened CI** — reproducible certification artifact,
  a gated CI pipeline, actions pinned to immutable SHAs, weekly Dependabot.

- ✓ **Verification beyond the corpus** — seeded differential fuzzing of the
  frozen oracle against the extraction; thousands of generated inputs per run.
- ✓ **Proof-carrying bridge plans** — every decision emits a witness that
  re-verifies against the registry without the planner.
- ✓ **Conformance suite** — canonicalization spec, schemas, and a verifier that
  certifies any implementation over a two-call protocol.
- ✓ **Second implementation** — a dependency-free Rust peer reproducing its
  declared corpus hashes, proving the contract is language-neutral.
- ✓ **Certification chain, frontier map, self-ladder** — semantic lineage, a
  published unverified surface, and the kernel judging its own claim.
- ✓ **Research modules** — counterfactual discovery, negative knowledge, and
  minimal-assumption search, all advisory and parity-isolated.

## Next

- ☐ **GitHub Release** for `v0.5.1-kernel` with notes, certification links, and
  compatibility guarantees.
- ☐ **Supply-chain hardening** — CodeQL, dependency review, secret scanning.
- ☐ **Benchmarking** — planner throughput and allocation profile on large
  corpora, so optimization can be evaluated against parity rather than intuition.
- ☐ **API stabilization** — freeze the public surface toward `1.0` under the
  stability policy in [`versioning.md`](versioning.md).
- ☐ **npm publication** — if public distribution is intended.

## Medium term

- ☐ **Rust coverage to parity** — extend the Rust implementation from the
  deterministic core and edge derivation (12/42) through the cascade and
  serialization to 42/42. Each increment closes a subsystem and must leave the
  mutation battery at zero survivors, not merely raise the fraction.
- ☐ **Further ports** — Python and Go against the *same* corpus. The corpus,
  not the JavaScript, is the specification.
- ☐ **Close SO-8** — exhaustive symbolic execution or a machine-checked
  refinement proof of the deterministic core, the only route from
  `EPISTEMICALLY_SUPPORTED` to `VERIFIED`.
- ☐ **Plugin architecture** — allow alternative registries and planners behind
  the same contract, with parity enforced per-plugin.

## Long term

- ☐ **Backend integration** — the independent instruments (solvers, verifiers,
  replayable experiments) that the handoff specification requires for anything
  past `EPISTEMICALLY_SUPPORTED`.
- ☐ **Research modules** — graduated frontier items, each gated on its own
  evidence requirements.

## Out of scope

- Changing frozen artifacts. They are immutable; CI enforces byte identity.
- Semantic redesign of v0.5.1 behavior inside the parity track. Behavioral
  change is a version event with a new baseline and fresh certification.
- Treating advisory or learned outputs as deterministic kernel results.
