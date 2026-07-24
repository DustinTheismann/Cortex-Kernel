# v0.5.1 oracle corpus

Behavioral capture of the frozen v0.5.1 kernel, taken directly from
`reference/src/cortex-v0.5.1.jsx` at baseline `804f767`. These fixtures are
the **acceptance oracle** for the framework-independent extraction: the
extracted library must reproduce every stored `sha256` exactly.

Nothing here is transcribed or re-implemented. `harness.mjs` slices the
deterministic definitions out of the frozen source verbatim and executes
them; the fixtures are the artifact's own output.

## Files

- `oracle/cases.mjs` — representative inputs (kernel matrices + verdict-engine cases).
- `oracle/canonicalize.mjs` — stable encoding + `sha256`. Preserves semantically
  meaningful array order; strips only timestamps and `uid()`-minted transient ids.
- `oracle/harness.mjs` — verbatim slicer, faithful runner, fixture/manifest writer.
- `golden/fixtures/*.json` — one canonical fixture per case.
- `golden/manifest.json` — per-case `{ caseId, oracleSource, sourceBaseline, schemaVersion, sha256, fixture }`, plus recorded extraction blockers.

## Regenerate / verify

```
node test/oracle/harness.mjs            # regenerate fixtures + manifest
node test/oracle/harness.mjs --check    # verify against manifest + disk; exit 1 on any drift
```

A fixture diff means either the frozen artifact changed (forbidden) or a
slice marker broke — both are blockers, never silent updates. Do not
regenerate after Phase 2 implementation begins.

## What is captured

| Concern | Cases |
|---|---|
| mechanism-kind definitions | `mech-kinds` |
| conversion-rule registry | `conv-rules` (registry + per-edge `edgeCost`) |
| multipath search & ranking | `multipath-kind-paths` (all 16×16 ordered pairs) |
| compatibility checking | `pair-compat`, `shape-compat`, `unit-compat`, `license-compat` |
| property-test skeleton | `synth-test` |
| schema normalization | `norm-schema` |
| literature classification | `classify-lit` |
| schemaVersion-7 edge derivation | `compute-edges` |
| contract instantiation · PO status · verdict advancement | `compile-*` (11 cases across the full ladder) |

The `compile-*` cases run the frozen `verifyCascade` core verbatim. Its two
model boundaries are treated as inputs: mechanism schemas are supplied
directly (`schemaA`/`schemaB`), and the soft-obligation judgments are
injected at the single `window.claude` call via each case's `model` policy.
Everything between — port pairing, top-3 min-risk multipath planning,
per-edge contract instantiation, refuted-path pruning, the PO-1..PO-8
obligation vector, and the five-stage ladder — is the frozen artifact's own
logic.

## Extraction blockers

Recorded in `manifest.json` under `blockers`. Logic that cannot be captured
verbatim because it is intrinsically nondeterministic or DOM/React-coupled:
model schema extraction, the soft-judgment model call (captured only at its
injected boundary), the OpenAlex literature probe, prize-candidate export,
and the schema-v7 import/export **envelope** (`onFile`/`doExport`). The pure
schema-v7 edge derivation (`computeEdges`) is captured; the envelope's
deterministic transforms are enumerated in `data/brain-index.schema` and
await a stubbed-execution harness in a later phase.

## Phase 2 acceptance

The extracted, framework-independent kernel must reproduce every `sha256` in
`manifest.json` exactly — no semantic redesign, no new rules, verdicts, or
scoring. `--check` is the gate.
