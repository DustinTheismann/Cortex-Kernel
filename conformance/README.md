# Cortex conformance

**The corpus is the specification. Implementations are peers.**

This directory is the domain-neutral half of the repository: the apparatus that
makes "does this program behave like that program?" a *checkable claim* rather
than an assertion. The JavaScript kernel holds no privileged position — it is
one conforming implementation among others.

```
frozen reference ──▶ oracle ──▶ canonical fixtures ──▶ manifest hashes
                                                            │
                    ┌───────────────────────────────────────┤
                    ▼                    ▼                  ▼
              JS implementation   Rust implementation   your implementation
                    └──────── all certified against the same hashes ────────┘
```

## Contents

| Path | What it is |
|---|---|
| `CANONICALIZATION.md` | Language-neutral encoding spec (version 1) — the normative contract for hashing |
| `schema/` | JSON Schemas for the manifest, fixtures, and certificates |
| `verify.mjs` | The verifier: certifies any implementation against the corpus |
| `mutants.mjs` · `mutation/` | The mutation battery: certifies that the *corpus* discriminates |
| `REPORT.json` · `REPORT.md` | Generated conformance report (normative / projection) |
| `MUTATION-REPORT.json` | Generated per-subsystem mutation adequacy |
| `baseline.json` | Monotonic declared-support floor and fixture-completeness per subsystem |
| `implementations.json` | Registry of implementations and how to build/run them |

## Protocol

An implementation is any executable that answers two invocations:

```bash
<impl> --cases          # → JSON array of corpus case ids it claims to support
<impl> <case-id>        # → the JSON payload for that case, on stdout
```

That is the entire contract. No linking, no FFI, no shared runtime. The verifier
re-parses and re-canonicalizes each payload, so **key order and number
formatting in your output do not matter** — only values do.

## Certifying an implementation

```bash
node conformance/verify.mjs                 # every registered implementation
node conformance/verify.mjs --impl=rust     # one
```

A conforming implementation is one whose **declared** cases all reproduce the
corpus hash. Partial coverage is legitimate and reported as a fraction — an
implementation may support the planner but not serialization. A *declared* case
that fails is not legitimate, and fails the run.

## Adding an implementation

1. Implement the deterministic semantics against `CANONICALIZATION.md` and the
   frozen reference — **not** by transliterating an existing implementation. A
   transliteration inherits bugs the corpus cannot see; an independent
   implementation that reproduces the hashes is real evidence.
2. Emit each case's payload per the protocol above.
3. Register it in `implementations.json`.
4. Run the verifier. Any mismatch is your bug, or a genuine ambiguity in the
   spec — both worth knowing.

## Current implementations

| Implementation | Language | Coverage | Notes |
|---|---|---|---|
| `packages/cortex-kernel` | JavaScript | 43/43 | Full corpus, including cascade and serialization |
| `impl/rust` | Rust | 13/43 | Deterministic core plus schema normalization, edge derivation and the compatibility predicates: registry, edge costs, min-risk multipath planner, shape/unit/license predicates. Dependency-free. |

The Rust implementation was written independently against the frozen semantics
and reproduced its declared hashes — including the full 16×16 multipath
planner — with no adjustment to the corpus. That is the evidence that this
contract is genuinely portable rather than an artifact of one language's
floating-point, sort stability, or string handling.

## Is the corpus discriminating?

Conformance answers *does this implementation match the fixtures*. It does not
answer *do the fixtures pin the semantics* — and those come apart. When edge
derivation was first declared, the Rust peer reproduced its hash while four of
its rules could be violated freely: the happy-path corpus contained no
dependency that was both shared and ubiquitous, no repository that mentioned
itself, and no group large enough to reach a size bound. Coverage read 11/41
and was green.

```bash
npm run mutants                                    # classify and write the report
npm run mutants:check                              # also require the committed report to be current
npm run mutants:list                               # the table: rule, pinning fixture, violation
node conformance/mutants.mjs --subsystem=edge-derivation
```

The battery copies the Rust crate to a temp directory, changes exactly one
semantic boundary — disable ubiquitous-dependency filtering, permit self-edges,
widen a group bound, fail open on an absent shape or unit, downgrade a unit
contradiction, prove a versioned copyleft pair — and requires the named corpus
case to catch it. The working tree is never modified.

### A hash mismatch is not a kill

Counting "the hash changed" as a kill makes the score decorative: a mutant that
crashes, or that perturbs output for a reason unrelated to the rule it was meant
to violate, would score exactly like one that demonstrates the rule is enforced.
So every mutant carries a **semantic assertion** — a predicate over its own
output that detects the specific predicted violation (a self-edge exists; a
ubiquitous dependency appears in shared-dependency evidence; a group hub is not
the highest-starred member). Five outcomes are distinguished, and only the first
counts:

| Outcome | Meaning |
|---|---|
| `killed_correctly` | The expected fixture diverged **and** the predicted violation is observable |
| `killed_incidentally` | Output changed, but not in the predicted way, not via the fixture that claims to pin the rule, or the mutant merely crashed |
| `survived` | The corpus accepted incorrect behavior — a **corpus** defect, not an implementation defect |
| `invalid_mutant` | The mutation changed no behavior (site gone, or the built binary is byte-identical) — it proves nothing while still looking like evidence |
| `not_executed` | Harness defect: the mutant never ran, or its pinning fixture was deleted |

The remedy for a survivor is additive: a new case that reaches the boundary,
leaving every existing hash untouched. That is how `compute-edges-boundaries`
came to exist.

### The classifier is itself tested

If the classifier silently degraded to "the hash changed", every score would
still read 24/24 and nothing would notice — the same failure mode, one level up.
So `mutation/selftest.mjs` drives the engine with synthetic mutants whose correct
outcome is known by construction, and asserts that each of the five states is
reachable and correctly distinguished. It runs first, in milliseconds, without a
Rust toolchain.

### Confinement, not just divergence

Divergence inside a mutant's subsystem scope proves the boundary is pinned. It
does not prove the mutation was *confined* there. So every other case the
implementation declares runs as a **control** and must keep reproducing; a
mutation that also perturbs unrelated fixtures is `killed_incidentally`, because
crediting it to one boundary would overstate what the corpus establishes.

Mutation sites are also counted exactly, not merely found. `find` is applied to
every match, so a refactor that duplicates the fragment would quietly turn a
one-boundary mutant into a multi-site one — still "killed", but no longer by the
boundary it names. Each entry declares `expectedOccurrences` and any other count
is an `invalid_mutant`.

### Fixture-complete is not complete

`baseline.json`'s `fixtureCompleteSubsystems` makes exactly one claim: every
corpus case exercising the subsystem is declared and reproduces. A subsystem is
**complete** only when it is fixture-complete *and* mutation-qualified — those
are separate claims and `REPORT.json` is the only place that states both:

```json
{ "subsystem": "edge-derivation", "fixtureStatus": "pass",
  "mutationStatus": "qualified", "declaredMutants": 10,
  "killedMutants": 10, "survivingMutants": 0 }
```

A subsystem with no declared mutants reports `"mutationStatus": "not-assessed"`
and **no counts at all**. "We looked and found none" and "we never looked" are
different epistemic states and must never render the same way. A report that no
longer binds to the current corpus and implementation reports `"stale"`, not
`"qualified"`.

## Why this exists

Verifying an extraction against its reference is a general problem. The
apparatus here — canonical encoding, hashed corpus, semantic invariants,
field-level differential comparison, reproducible certification — has nothing to
do with Cortex semantics. It is reusable by anyone porting, rewriting, or
optimizing a reference implementation who wants the equivalence claim to be
mechanically enforced rather than hoped for.
