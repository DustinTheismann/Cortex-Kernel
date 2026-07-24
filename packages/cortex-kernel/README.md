# @opensource-cortex/kernel

Framework-independent extraction of the **frozen OpenSource Cortex v0.5.1
semantic kernel**. Pure ESM — no React, no DOM, no network, no import-time side
effects. Every observable decision is reproduced **byte-for-byte** against the
Phase 1 golden corpus (`test/golden/` at the repo root); the frozen standalone
(`reference/src/cortex-v0.5.1.jsx`) remains the sole authority.

> Status: **Phase 2 extraction in progress.** The public surface grows one
> parity-verified module at a time. It is not published yet.

## Design rules

- ESM only; `"type": "module"`, explicit `exports`, `sideEffects: false`.
- No dependencies. Tests use `node:test` / `node:assert`.
- No `window`, `document`, `FileReader`, `Blob`, `fetch`, or storage access.
- Deterministic: identical input → identical output, across runs and machines.
- The extraction **moves behavior, not abstractions** — the frozen source wins
  over any cleaner-looking alternative.

## Target public surface

```js
import {
  createRegistry, evaluateCompatibility, planBridge,
  instantiateContract, evaluateObligations, evaluateCascade,
  applyLiteratureAssessment, deriveVerdict,
  importBrainIndex, exportBrainIndex, SCHEMA_VERSION,
} from "@opensource-cortex/kernel";
```

Exports appear here only once their module reproduces the golden corpus.

## Explainability trace (infrastructure)

Decision operations accept `{ trace: true }` and return a structurally separate
`trace` alongside `decision`. **Enabling trace never changes the canonical
decision hash** — enforced by a differential test.

## Development

```
npm test                       # unit + reference-integrity + smoke
npm run kernel:golden          # reproduce every Phase 1 hash (the parity gate)
npm run pack:smoke             # packed artifact imports cleanly
```

## Layout

```
src/
  index.js         public API
  types.js         mechanism kinds, stages, obligation ids, verdicts, impossibility, SCHEMA_VERSION
  registry.js      conversion registry + edge costs + integrity assertions
  compatibility.js pair / shape / unit / license compatibility
  planner.js       min-risk multipath enumeration, ranking, selection
  contracts.js     per-edge contract instantiation
  obligations.js   proof-obligation vector + statuses
  advancement.js   deterministic five-stage ladder
  verdicts.js      final verdict / novelty class / prize candidacy
  serialization.js schemaVersion 7 import / export
  errors.js        error taxonomy
  internal/
    invariants.js  fail-closed integrity assertions
```
