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
| `packages/cortex-kernel` | JavaScript | 41/41 | Full corpus, including cascade and serialization |
| `impl/rust` | Rust | 8/41 | Deterministic core: registry, edge costs, min-risk multipath planner, shape/unit/license predicates. Dependency-free. |

The Rust implementation was written independently against the frozen semantics
and reproduced all eight declared hashes — including the full 16×16 multipath
planner — with no adjustment to the corpus. That is the evidence that this
contract is genuinely portable rather than an artifact of one language's
floating-point, sort stability, or string handling.

## Why this exists

Verifying an extraction against its reference is a general problem. The
apparatus here — canonical encoding, hashed corpus, semantic invariants,
field-level differential comparison, reproducible certification — has nothing to
do with Cortex semantics. It is reusable by anyone porting, rewriting, or
optimizing a reference implementation who wants the equivalence claim to be
mechanically enforced rather than hoped for.
