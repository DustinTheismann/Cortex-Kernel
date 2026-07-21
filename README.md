# OpenSource Cortex

**A proof-obligation-carrying bridge planner for mechanism-level software synthesis.**

OpenSource Cortex maps a corpus of public GitHub repositories as a galaxy of typed *mechanisms*, then reasons — deterministically, and with explicit epistemic humility — about which repositories could *compose* into something that does not yet exist. It is not a recommender and not a visualization: it is a semantic-planning kernel that constructs explicit conversion programs between mechanisms, carries their assumptions and information losses, separates structural possibility from epistemic support, and refuses to claim verification it has not performed.

The entire application is a single self-contained HTML file.

---

## What it actually does

**1. Observe — a galaxy of typed mechanisms.**
Discovers public repos via the GitHub Search API (tokenless: 10 search requests/minute — Search has its own rate bucket, separate from the core REST limit) and renders them as a force-directed field, clustered by topic/domain, weighted by signal. Edges encode concrete relationships (shared dependencies, topic overlap, language, cross-references), each with clickable evidence. Hovering a node ignites its constellation of connected repos.

**2. Extract — typed mechanism interfaces.**
For each repo the model emits a **typed interface** of its core mechanism: `consumes` / `produces` ports, each with a `kind` drawn from a fixed 16-kind set (`tensor`, `distribution`, `bound`, `certificate`, `proof_term`, `constraint_set`, `optimization_problem`, `program`, `trace`, `dataset`, `policy`, `claim`, `measurement`, …), plus `shape`, `units`, and a structural `semantics` phrase. Extraction is *evidence*, not truth.

**3. Plan — a proof-obligation-carrying bridge compiler.**
Compatibility between two mechanisms is decided by **deterministic code**, not model judgment:

- A governed **conversion registry** (`CONV_RULES`) whose every edge carries an `authority` (`axiomatic` / `curated`), a `precondition`, a `lossy` flag, and the properties it destroys.
- **Minimum-risk multipath search** (uniform-cost, not shortest-path) over that registry, penalizing conversion steps, lossy hops, curated-vs-axiomatic authority, and destroyed properties. It retains the **top-3** lowest-risk paths rather than a single route.
- **Per-edge instantiated contracts**: each conversion step becomes its own `RuleInstantiation` with an independently tracked precondition status, rather than one aggregated assumption per bridge.

**4. Grade — a five-stage epistemic maturity ladder.**
Every candidate bridge is placed on an explicit ladder:

```
PROPOSED → PATH_FOUND → TYPE_COMPOSABLE → CONTRACT_ADMISSIBLE → EPISTEMICALLY_SUPPORTED → VERIFIED
```

`CONTRACT_ADMISSIBLE` requires **every** curated-rule precondition to be at least conditionally satisfied — an *unresolved* precondition holds the bridge at `TYPE_COMPOSABLE` (`PRECONDITION_UNRESOLVED`), never advancing on "not yet disproven." **`VERIFIED` is displayed as permanently unreachable inside the standalone** — it is a backend-only stage. "Type-composable" is explicitly *not* "promotable."

**5. Falsify — preregistered literature grounding.**
Novelty is not "absent from GitHub." Before probing, the system preregisters a mechanism-specific query and thresholds, then measures paper density via the OpenAlex API. A bridge that is thoroughly explored in the literature is classed `KNOWN` and killed regardless of repo sparsity. Impossibility is reported with machine-readable codes (`NO_KIND_PATH`, `UNIT_CONTRADICTION`, `NO_SHARED_PORTS`, `NO_SCHEMA`, `PRECONDITION_UNSATISFIED`, …), so negatives are retained as data.

**6. Calibrate — reality feedback (Ω5).**
Predictions enter a ledger; you record `CONFIRMED` / `REFUTED` as reality resolves them; the system computes hit-rate by predicted class and feeds weak/productive priors back into generation. Safeguards are hard constraints: neutral until a minimum sample and a multiplier floor that forbids hard rejection from history alone — calibration only ever tunes *skepticism*, never *admissibility*. (Sparse-cell probing is available but manual; no standing exploration quota is enforced.)

**7. Govern — the conversion graph is part of the constitution.**
A **Rules** panel treats the conversion registry as governed state (one bad edge fabricates bridges corpus-wide), showing every rule, its authority class, precondition, and lossy status, and stating honestly that no rule is source-verified or empirically-validated inside the artifact. The **producer can never promote its own output** — promotion is fail-closed and terminates at a human-authority gate.

---

## Honest boundaries

This is a **semantic-planning kernel**, precisely scoped:

- Compatibility, kind-path search, obligation instantiation, and ladder placement through `TYPE_COMPOSABLE` are **deterministic and reproducible** — given the same schemas and rule set, that output is identical. Model-supplied soft precondition evidence then feeds path pruning, final path selection, PO-5 statuses, and advancement beyond `TYPE_COMPOSABLE`, so the upper ladder is **not** reproducible from schemas and rules alone. Literature probing runs afterward and affects novelty class, final verdict, and prize candidacy — not the five-stage ladder.
- The soft obligations (assumption satisfiability, invariant preservation, metric meaningfulness) are **model-assisted** and capped at `CONDITIONALLY-SATISFIED` — a model may never mark them `PROVED`.
- There is **no formal verification**: no SMT solver, no proof assistant, no executed tests. The generated property-test is a **skeleton**, and `VERIFIED` is deliberately out of reach. Everything past `EPISTEMICALLY_SUPPORTED` belongs to a backend of independent instruments — see [`docs/backend-handoff.html`](docs/backend-handoff.html).

## Runtime dependencies

- **In-browser model helper** for extraction and soft obligations — requires a host that provides it; not available in a fully offline file.
- **GitHub REST API** — discovery uses the Search endpoints, which have their own unauthenticated bucket (10 requests/minute); enrichment uses core endpoints under the general unauthenticated limit (60 requests/hour, surfaced in-app as the "core quota"). A token raises both ceilings; none is bundled.
- **OpenAlex API** for literature density.

When opened fully offline, the galaxy, fusion matrix, filters, Load/Export, the deterministic compiler, and the governance panels all work; synthesis, generation, live fetch, and literature probing go dark.

## Files

| Path | What it is |
|------|-----------|
| `index.html` | The application — single self-contained file (byte-identical to `reference/standalones/OpenSource_Cortex_v0.5.1_standalone.html`) |
| `docs/backend-handoff.html` | Backend handoff specification: service boundaries, schemas, verifier & calibration protocols, proof-witness formats, provenance model |
| `data/brain-index.schema` | Export format (`schemaVersion 7`): repos, edges, synthesis nodes, preregs, prize candidates, ledger, calibration, rule instantiations |

## Usage

Open the HTML file in a browser. Discover a corpus, or **Load** a previously exported `brain-index.json` to restore a corpus without re-fetching — loading is an overlay onto current state, not an exact-state reset (see `data/brain-index.schema`). Explore the galaxy, open the **Fusion matrix** to probe sparse mechanism cells, and use **Export** to save your corpus. When the host provides `window.storage`, state also persists across reloads; without it, the exported file is the only durable copy.

## Version

**v0.5.1** — Instantiated Contract Gate. Export `schemaVersion 7`.

Progression: v0.3 typed compatibility → v0.4 deterministic kind-path compiler + proof-obligation vectors → v0.5 contracted conversion rules + minimum-risk search → **v0.5.1** per-edge instantiated contracts + multipath planning + strict ladder.

## License

MIT — see [LICENSE](LICENSE).
