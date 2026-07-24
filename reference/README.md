# Reference oracles

Per [docs/BACKEND_HANDOFF.md](../docs/BACKEND_HANDOFF.md), the v0.5.1 standalone is
the executable specification for the backend: "Every backend component below must
reproduce the standalone's observable decisions bit-for-bit given the same inputs."
This directory preserves the full standalone lineage as the reference contract and
golden-test seed.

## Lineage

| Artifact | Role |
|---|---|
| `GitHub_Brain_standalone.html` | Pre-Cortex origin: repo-graph observation and combination probing |
| `OpenSource_Cortex_v0.4_standalone.html` | Deterministic kind-path compiler; proof-obligation vectors; impossibility reasons |
| `OpenSource_Cortex_v0.5_standalone.html` | Contracted conversion rules (authority + preconditions); min-risk search |
| `OpenSource_Cortex_v0.5.1_standalone.html` | **The frozen kernel**: per-edge instantiated contracts; multipath planning + pruning; strict ladder |
| `Cortex_Backend_Handoff_standalone.html` | Original bundled form of the handoff spec (canonical Markdown in `docs/`) |

## Layout

- `standalones/` — the original self-extracting HTML bundles, exactly as exported.
  Open in a browser to run; each unpacks React 18.3.1 and its app source from
  embedded resources.
- `src/` — the application source extracted from each bundle's
  `<script type="text/x-dc" data-dc-script="">` block (inside the JSON-encoded
  `__bundler/template` payload). One `Component extends DCLogic` class per version.
  Extracted verbatim for review and cross-version diffing; the `standalones/` files
  remain the artifacts of record.

The v0.5.1 export (`schemaVersion 7`) is the seed migration for the backend's
`EpistemicBuild` store, and its `CONV_RULES` table is the initial Rule Registry
content (`axiomatic` + `curated` tiers only).
