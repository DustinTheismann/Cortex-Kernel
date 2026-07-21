# @opensource-cortex/kernel

The frozen **v0.5.1 semantic kernel** as a versioned library — the "semantic kernel" the backend handoff spec requires shipping with a golden-test suite seeded from the standalone (see `docs/BACKEND_HANDOFF.md` §1, *Reproducibility contract*).

Deterministic and side-effect-free: a pure function of (mechanism schemas, rule registry, soft evidence). No runtime dependencies.

## What's here

| Module | Contents |
|---|---|
| `rules` | `MECH_KINDS` (16 kinds), `CONV_RULES` (the governed conversion registry, axiomatic + curated tiers), `edgeCost`, `STAGE_RANK` |
| `search` | `adaptersFor` — min-risk uniform-cost multipath search (top-K, depth ≤ 4); `pairCompat` |
| `ports` | `shapeCompat`, `unitCompat`, `licenseCompat`, `normSchema`, `portPairsFor`, `classifyLit` |
| `compile` | `compileBridge` — the full deterministic pipeline: port pairing → multipath planning → per-edge contract instantiation → refuted-path pruning → PO-1…PO-8 obligation vector → strict five-stage ladder → impossibility codes |
| `harness` | `synthTest` — the property-test skeleton generator (byte-identical output) |
| `brain-index` | `loadBrainIndex` / `exportBrainIndex` / `computeEdges` — explicit normalization of the `schemaVersion 7` contract, with the standalone's overlay semantics made pure and reportable (`LoadReport`) |

Model-assisted judgments (preconditions, invariant preservation, metric meaningfulness) enter `compileBridge` as **data** (`SoftEvidence`), never as calls — absent evidence fails closed to `UNRESOLVED`. `VERIFIED` is unreachable here by construction, exactly as in the standalone.

## Golden testing

`test/golden/harness.mjs` does not copy standalone code — it **reads the frozen artifact** (`reference/src/cortex-v0.5.1.jsx`), slices the deterministic definitions out verbatim, executes them, and writes `test/golden/fixtures/`. The test suite then asserts this port matches those fixtures exactly: all 256 ordered kind-pair multipath results, every registry edge cost, shape/unit/license tables, skeleton strings, schema normalization, and literature-class boundaries.

A fixture diff means the frozen artifact changed (forbidden) or the port drifted (release blocker). Regenerate with `npm run golden:regen`.

The compile pipeline itself has no runnable verbatim slice in the standalone (it is entangled with model calls there), so its contract — ladder transitions, pruning, obligation vectors, impossibility codes, block reasons — is pinned case-by-case in `test/compile.test.ts` on top of the golden-tested primitives.

`test/brain-index.test.ts` pins every legacy behavior documented in `data/brain-index.schema` (four layers: v7 envelope, accepted import envelope, overlay loader, non-round-tripping fields).

## Use

```ts
import { compileBridge, normSchema } from "@opensource-cortex/kernel";

const result = compileBridge({
  schemaA: normSchema(rawExtractorOutputA),
  schemaB: normSchema(rawExtractorOutputB),
  repoA, repoB,                    // license screening only
  soft: {                          // model-assisted evidence, as data
    preconditions: { "scalar>bound:threshold": "satisfied" },
    invariantPreserved: "satisfied",
    metricMeaningful: "conditional",
  },
});
result.stage;          // "PROPOSED" | ... | "EPISTEMICALLY_SUPPORTED" (never "VERIFIED")
result.obligations;    // PO-1…PO-8 vector
result.bridge;         // adapters, ruleInstantiations, executableTest skeleton
result.impossibility;  // NO_SCHEMA | NO_SHARED_PORTS | NO_KIND_PATH | UNIT_CONTRADICTION
```

```sh
npm test           # build + golden + pipeline + migration suites
npm run golden:regen
```

## Versioning

The package version tracks the kernel it freezes (`0.5.1`). Behavior changes — including "fixes" to quirks like the search's tie-break order — are kernel-version changes and must bump accordingly. The precondition-gated frontier (handoff §10) lands as a new version, never as a patch to this one.
