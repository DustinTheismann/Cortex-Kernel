# Extraction map — v0.5.1 objectives → frozen source → oracle → target module

Maps each Phase 1 objective to the exact logic in the frozen source
(`reference/src/cortex-v0.5.1.jsx` @ `804f767`), the golden case(s) that
freeze its behavior, and the framework-independent module that will host it in
Phase 2. **The frozen source is the authority** even where its behavior looks
awkward; the target modules must move behavior, not redesign it.

Line numbers are for the baseline and are indicative anchors, not slice
boundaries (the oracle slices by textual marker — see `test/oracle/adapter.mjs`).

| Objective | Frozen source | Golden cases | Phase 2 module |
|---|---|---|---|
| Mechanism-kind definitions | `MECH_KINDS` (L7) | `mech-kinds` | `registry.js` / `types.js` |
| Conversion registry construction | `CONV_RULES` (L8), `edgeCost` (L810) | `conv-rules` | `registry.js` |
| Compatibility evaluation | `pairCompat` (L823), `shapeCompat` (L825), `unitCompat` (L826), `licenseCompat`/`licKey` (L828-829) | `pair-compat`, `shape-compat`, `unit-compat`, `license-compat`, `directly-compatible`, `hard-incompatibility` | `compatibility.js` |
| Path enumeration, pruning, ranking, selection | `adaptersFor` uniform-cost multipath (L812-822); per-item option build + risk sort (L863-869); `scored`/`survivors`/`chosen` prune+select (L888-890) | `multipath-kind-paths`, `single-conversion-path`, `multiple-competing-paths`, `equal-cost-path-tie`, `soft-precondition-failed` (pruning) | `planner.js` |
| Precondition handling | soft→status map `mapSoft` (L883), `instantiate` (L887), model soft call boundary (L872-881) | `soft-precondition-satisfied` / `-unresolved` / `-failed`, `partially-instantiated-obligations` | `contracts.js` |
| Contract generation | `RuleInstantiation` build (L887), `bridge.ruleInstantiations` (L920) | `partially-instantiated-obligations`, `multiple-competing-paths` | `contracts.js` |
| Proof-obligation instantiation & status | PO-1…PO-8 vector (L894-902) | `soft-precondition-*`, `lossy` (PO-8 via `single-conversion-path`→scalar variants), all `compile`/cascade cases | `obligations.js` |
| Stage advancement | ladder computation from `typeComposable`/`contractOK`/`epistemicOK` (L904-909) | `advancement-through-type-composable`, all boundary cases (PROPOSED→EPISTEMICALLY_SUPPORTED) | `advancement.js` |
| Impossibility classification | no-path/no-ports/no-schema (L870); UNIT_CONTRADICTION (L912-915); `blockReason` (L922) | `incompatible`, `missing-conversion-rule`, `no-schema`, `hard-incompatibility` | `advancement.js` / `verdicts.js` |
| Final verdict generation | `typeCheck` verdict/reason (L915,L923); `finalVerdict` from litClass+grounded (L940); `classifyLit` (L805) | `lit-unexplored` / `-emerging` / `-known` / `-unverified`, `classify-lit` | `verdicts.js` |
| schemaVersion 7 import behavior | `onFile` (L711-733), `computeEdges` (L177-194) | `import-with-githubUser`, `import-without-githubUser`, `import-edges-recomputed-when-absent`, `import-unknown-extra-fields`, `import-empty-graph`, `malformed-*` | `serialization.js` |
| schemaVersion 7 export behavior | `doExport` (L751-757) | `export-sixteen-keys`, `export-fifteen-keys-githubUser-undefined`, `export-drops-unknown-fields`, `roundtrip-repo-edge` | `serialization.js` |

## Notable frozen behaviors the extraction must preserve exactly

- **Multipath is uniform-cost, not shortest-path.** `edgeCost = 1 + 2·lossy + (curated?1:0) + 0.5·|destroyed|`. The BFS accepts the goal *before* the `path.length > 4` cap, so paths of length 5 can appear (see `no-kind-path` requiring a genuinely sink-free target — only `policy` has no inbound rule).
- **Risk ≠ static cost.** Selection risk adds `+0.5` for unproved shape, `+0.5` unproved / `+90` refuted units on top of `staticRisk`. Unit refutation does not remove a path; it makes it lose and drives UNIT_CONTRADICTION.
- **Pruning keeps a fallback.** If every option is refuted, the lowest-score refuted option is still chosen (so a refuted precondition yields TYPE_COMPOSABLE + PRECONDITION_UNSATISFIED, not PROPOSED).
- **`type_killed` still passes through the obligation build for UNIT_CONTRADICTION** (PATH_FOUND), but not for structural impossibility (PROPOSED).
- **The literature layer is orthogonal to the ladder.** Novelty class and prize candidacy change with paper count while the stage is fixed (`lit-*` cases; cross-case claims in the manifest).
- **Export elides `undefined`.** `doExport` constructs 16 properties; `JSON.stringify` drops an `undefined` `githubUser`, yielding 15 serialized keys. Import replaces the core object wholesale, so a file without `githubUser` clobbers any prior value.

## Target package shape (Phase 2)

```
packages/cortex-kernel/src/
  index.js  types.js  registry.js  compatibility.js  planner.js
  contracts.js  obligations.js  advancement.js  verdicts.js
  serialization.js  errors.js
```

Acceptance is entirely mechanical: `node test/oracle/harness.mjs --check` stays
green, and the extracted kernel reproduces every `manifest.json` `sha256` via
`test/differential/compare.mjs`. No React import, no browser global, identical
results across runs, frozen artifact byte-identical.
