# Oracle limitations & extraction blockers

Logic in the frozen source that cannot be invoked as a pure function because
it is coupled to React state, rendering, browser globals, closure-local
variables, the network, or the model. For each: source location, affected
behavior, why direct invocation is impossible, the adapter/instrumentation
used (if any), a confidence level, and residual risk.

**Rule of honesty:** where behavior is reached only through instrumentation,
that is stated. Nothing inaccessible is silently reimplemented and labelled
oracle-derived. Where a boundary is *injected* (model/network), the fixtures
capture the deterministic logic *around* the boundary, with the boundary value
supplied as a documented input.

Confidence scale: **high** = frozen code runs verbatim, only deterministic
stubs injected; **medium** = frozen code runs but behind non-trivial
instrumentation; **n/a** = not captured, documented only.

---

## B1 · Model-inferred mechanism schema extraction

- **Source.** `verifyCascade` step 1, L839-855 (`window.claude.complete` schema extractor).
- **Affected behavior.** Turning repo metadata into typed `{consumes,produces,…}` schemas.
- **Why invocation is impossible independently.** Output is a language-model inference — inherently nondeterministic; it cannot be a golden oracle.
- **Instrumentation.** None at this boundary. Instead the oracle treats the *schema* as the compiler's input: every cascade case supplies `schemaA`/`schemaB` directly, exactly as the frozen `normSchema` (L854) would normalize them.
- **Confidence.** n/a (boundary, not captured). The normalization it feeds (`normSchema`) **is** captured (`norm-schema`).
- **Residual risk.** Low. The extraction's *only* downstream effect is the schema; by pinning the schema we pin everything deterministic that follows.

## B2 · Soft-obligation judgments (preconditions / invariant / metric)

- **Source.** `verifyCascade` step 2 model call, L872-881.
- **Affected behavior.** Per-edge precondition status and invariant/metric judgments feeding PO-5/6/7 and the ladder above TYPE_COMPOSABLE.
- **Why impossible.** Model-supplied, nondeterministic in situ.
- **Instrumentation.** The single `window.claude` call is stubbed to return a case-specified judgment (`model` policy). The frozen code then parses it with the real `parseCombos`, maps it with the real `mapSoft`, instantiates contracts, prunes, and advances — all verbatim.
- **Confidence.** high (verbatim logic; only the boundary value is injected).
- **Residual risk.** Low. Real model *phrasing* is not exercised, but only `satisfied|conditional|violated|unknown` reach the deterministic code, and all four are covered.

## B3 · Literature probe (OpenAlex network + model fallback)

- **Source.** `verifyCascade` step 3, L926-943 (`openAlexCount` network; `litEstimateViaModel` fallback).
- **Affected behavior.** Paper-count retrieval → `classifyLit` → novelty class → final verdict → prize eligibility.
- **Why impossible.** Live HTTP to `api.openalex.org`; the fallback is a model call. Both nondeterministic.
- **Instrumentation.** `openAlexCount` is stubbed to return an injected count (`litCount`); `litGround` toggles whether the probe runs. `classifyLit`, the `finalVerdict` mapping, and the prize predicate then run verbatim.
- **Confidence.** medium (network boundary injected; surrounding classification/verdict/prize logic verbatim). `classifyLit` itself is also captured purely (`classify-lit`).
- **Residual risk.** Low-to-moderate. Real OpenAlex responses, the blocked-path model fallback, and rate-limit behavior are not captured — only the count→class→verdict→prize logic given a count.

## B4 · Preregistration & prize-candidate side effects

- **Source.** `verifyCascade` step 3-4, L933-935 (prereg), L944-951 (candidate), plus `setPreregs`/`setCandidates`/`setProbeLog`/`sset`/`doExport`/`setTimeout`.
- **Affected behavior.** Emitting a prereg record, minting a prize candidate, appending the probe log, auto-exporting.
- **Why impossible.** React state setters, `uid()`, wall-clock timestamps, deferred `setTimeout` export.
- **Instrumentation.** Setters are captured (candidate and probe-log entry are surfaced in the decision projection); `uid()` is a deterministic counter; timestamps are stripped by canonicalization; the deferred `doExport` is a no-op.
- **Confidence.** medium (the *derived records* are captured verbatim; their persistence/scheduling is not).
- **Residual risk.** Low for record content (covered by `lit-unexplored` → prize candidate). The *persistence* semantics (per-item `sset`, deferred export) are not part of the decision and are out of scope here.

## B5 · schemaVersion-7 import (`onFile`)

- **Source.** L711-733.
- **Affected behavior.** JSON parse, `repos[]` requirement, edge recomputation, notes/mechCalibration transforms, overlay semantics, per-item persistence, input-field reset.
- **Why impossible.** `FileReader`, `setData` and ~15 React setters, `persistRepo` (IndexedDB).
- **Instrumentation.** `FileReader` is stubbed to deliver the case JSON synchronously; every setter is captured into a plain state object; `persistRepo`/`sset` record keys only. `onFile` runs verbatim.
- **Confidence.** high (verbatim; browser/React boundaries captured).
- **Residual risk.** Low. The IndexedDB *durability* and cross-session hydration (see B7) are not modelled — only the in-memory result of a single import.

## B6 · schemaVersion-7 export (`doExport`)

- **Source.** L751-757.
- **Affected behavior.** Envelope construction (16 properties), notes map→array, mechCalibration `Object.values`, `undefined` elision (15 vs 16 keys), download.
- **Why impossible.** `Blob`, `URL.createObjectURL`, `document.createElement`, DOM append/click.
- **Instrumentation.** `Blob` captures the serialized payload; `URL`/`document`/`setTimeout` are inert stubs. `doExport` runs verbatim and we parse the captured payload.
- **Confidence.** high (verbatim; the serialized bytes are exactly what the artifact would download).
- **Residual risk.** Low. Only the download side effect is stubbed; the payload is genuine.

## B7 · Persisted-state hydration (IndexedDB overlay)

- **Source.** persistence layer L196-234 (`STORE`, `slistGet`, hydrate-on-mount).
- **Affected behavior.** Cross-reload persistence; export snapshotting *merged* in-memory + hydrated state (schema §4).
- **Why impossible.** `window.storage`/IndexedDB, React mount lifecycle, closure refs.
- **Instrumentation.** None. Not captured in Phase 1.
- **Confidence.** n/a.
- **Residual risk.** Moderate. The distinction "persisted-only records appear in an export only after reload/hydration" (documented in `data/brain-index.schema` §4) is asserted by documentation, not by an executed fixture. A later phase may add a stubbed-STORE harness.

---

## Summary

| Blocker | Captured? | Confidence | Mechanism |
|---|---|---|---|
| B1 schema extraction | at its output (schema input) | n/a | direct schema input |
| B2 soft judgments | yes (logic around boundary) | high | stubbed model reply |
| B3 literature probe | classification/verdict/prize given a count | medium | stubbed count |
| B4 prereg / prize records | record content yes; persistence no | medium | captured setters |
| B5 import (`onFile`) | yes | high | stubbed FileReader + captured setters |
| B6 export (`doExport`) | yes | high | stubbed Blob/DOM |
| B7 persisted hydration | no | n/a | documented only |
