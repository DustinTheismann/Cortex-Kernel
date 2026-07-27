# Version policy

This repository versions two different things, and conflating them is the main
way to misread a tag.

## Two version lines

| Line | Example | What it names |
|---|---|---|
| **Reference** | `v0.5.1-reference` | A frozen standalone artifact — the executable specification. Immutable once tagged. |
| **Kernel** | `v0.5.1-kernel` | An extraction that reproduces a specific reference version's behavior, verified against the oracle corpus. |

A kernel tag always carries the reference version it certifies against. So
`v0.5.1-kernel` means *"the kernel that is behaviorally equivalent to reference
v0.5.1"*, and its certificate names the exact reference commit.

## Kernel package semantics

`@opensource-cortex/kernel` follows Semantic Versioning, with one project
specific rule layered on top:

- **PATCH** (`0.5.1` → `0.5.2`) — internal changes, performance, docs, or
  tooling. **Every golden hash must still match**; behavior cannot change.
- **MINOR** (`0.5.x` → `0.6.0`) — additive public API, new advisory outputs, or
  a new reference version whose behavior is a superset. Existing fixtures must
  still pass, or the corpus is re-certified with the change explicitly
  documented.
- **MAJOR** (`0.x` → `1.0`) — a deliberate behavioral change to the kernel, a
  new canonicalization version, or a breaking API change. Requires a new
  reference baseline and a fresh certification.

**Behavioral change is a version event, not an implementation detail.** If a
golden hash changes, that is either a bug or a version bump — never a silent
fixture regeneration.

## Canonicalization version

`canonicalizationVersion` (currently `1`) versions the *encoding* used to
compare decisions, independent of kernel behavior. Changing it invalidates
every stored hash, so it bumps only with a MAJOR release and a full
re-certification.

## Stability policy

- Exports listed in the package README are **public**. Removing or changing the
  shape of one is a MAJOR change.
- Anything under `src/internal/` is **private** and may change in any release.
- The canonical decision shape is public and hash-pinned; the `trace` channel is
  **advisory** and may gain fields in a MINOR release — it is excluded from the
  decision hash by construction.
- Frozen artifacts under `reference/`, plus `index.html` and
  `docs/backend-handoff.html`, are **immutable**. They are never edited; CI
  enforces byte identity.

## Reference-compatible quirks

Behaviors that are faithful to the frozen reference but arguably arise from a
language artifact rather than an intended domain rule. They are **frozen for
v0.5.1** and must be reproduced exactly by every conforming implementation. Each
is a candidate for deliberate cleanup in a future version — never a bug to be
quietly "fixed", because fixing one silently breaks conformance.

| Quirk | Behavior | Why it exists | Candidate action |
|---|---|---|---|
| Array accepted as a schema | `normSchema([])` returns a fully-normalized schema with empty port lists, rather than `null` | JavaScript reports `typeof [] === "object"`, so the reference's `typeof s !== "object"` guard does not reject arrays | In a future version, reject non-plain-objects explicitly. Would change the `norm-schema` fixture and is therefore a MAJOR event. |
| `String()` coercion of metadata | `assumptions: [1, "two"]` normalizes to `["1", "two"]` | The reference maps `String` over the array without type checking | Consider rejecting non-string metadata instead of coercing. |
| Unknown kind fails closed to `claim` | Any unrecognized port kind becomes `claim` | Deliberate fail-closed default in the reference | Likely intended; document rather than change. |

An implementation author who "corrects" any of these will fail conformance. That
is the intended outcome: the corpus, not intuition, defines the behavior.

## Pre-1.0

While below `1.0`, MINOR releases may adjust the public API with a documented
migration note in the changelog. The behavioral guarantee is not relaxed by
this: golden parity applies at every version.
