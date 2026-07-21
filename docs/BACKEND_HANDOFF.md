# OpenSource Cortex — Backend Handoff Specification

*v0.5.1 → vΩ · confidential draft*

> **Declassification notice.** The "confidential draft" label above is
> historical, carried over from the document's original circulation. The
> repository owner has intentionally published this specification — and
> the frozen HTML bundles that embed the same label
> (`docs/backend-handoff.html`,
> `reference/standalones/Cortex_Backend_Handoff_standalone.html`) —
> under the repository's MIT license. The frozen artifacts are preserved
> byte-for-byte and therefore retain the outdated label; this notice, in
> the canonical non-frozen copy, supersedes it.

*Treating the v0.5.1 standalone as the executable contract for a distributed, verification-grounded implementation.*

The standalone artifact is now a coherent **semantic-planning kernel**: it extracts typed mechanism interfaces, plans proof-obligation-carrying bridges over a governed conversion registry, separates structural possibility from epistemic support, and refuses to claim verification it has not performed. This document freezes that behavior as the reference contract and specifies the backend that turns *planned* bridges into *verified* ones.

> **Governing principle.** The frontend is not a prototype to be rewritten into services — it is the *specification*. Every backend component below must reproduce the standalone's observable decisions bit-for-bit given the same inputs, then extend them with capabilities that require persistent services or independent execution: witnesses, solvers, replayable experiments, immutable provenance.

### What the kernel already fixes (do not regress)

| Version | Capability added | Boundary it left |
|---|---|---|
| v0.3 | Typed mechanism compatibility; producer/verifier separation; Ω5 calibration | Global (unconditional) conversions |
| v0.4 | Deterministic kind-path compiler; proof-obligation vectors; impossibility reasons | Coarse, bridge-level obligations |
| v0.5 | Contracted conversion rules (authority + preconditions); min-risk search | Single best path; aggregated contracts |
| v0.5.1 | Per-edge instantiated contracts; multipath planning + pruning; strict ladder | Static-risk frontier; model-assisted (not proven) soft obligations |

The backend's job is the last column of the last row: replace *model-assisted* obligations with *independently verified* ones, and make the frontier itself precondition-aware.

## 1. Service boundaries

Decompose along the kernel's existing internal seams — each becomes an independently deployable, independently versioned service. No service may satisfy an obligation that depends materially on its own unsupported output (the producer/verifier invariant, promoted from discipline to network topology).

- **Ingestion Fabric** — GitHub/paper/registry observation; emits immutable `CortexEvent`s. Never mutates state directly.
- **Mechanism Extractor** — repo metadata → typed `MechanismSchema`. Model-backed; its output is *evidence*, not truth, and carries an `extractionStatus`.
- **Bridge Compiler** — the frozen v0.5.1 kernel: deterministic compatibility, multipath planning, obligation instantiation. Pure function of (schemas, rule registry). Must be reproducible and side-effect-free.
- **Verifier Federation** — heterogeneous, independent instruments (§3). Consumes proof obligations, emits `VerificationResult`s with independence metadata.
- **Rule Registry** — the governed conversion graph (§4), versioned and provenance-bearing.
- **Literature/Prior-art Gateway** — OpenAlex + patents + code search behind preregistration.
- **Calibration Service** — hierarchical Bayesian outcome scoring (§7).
- **Promotion Controller** — enforces the ladder + human-authority gate; the only writer to promoted state.
- **Provenance/Audit Ledger** — append-only, signed (§9).

> **Reproducibility contract.** Bridge Compiler and Rule Registry together are the "semantic kernel." Ship them as a single versioned library with a golden-test suite seeded from the standalone: for a fixed corpus + rule set, every bridge's stage, obligation vector, chosen path, and impossibility code must match the frontend exactly. A divergence is a release blocker.

## 2. Data schemas

The canonical unit is the **Epistemic Build Object** — a bounded, testable, replayable record. Every valuable claim is one. Types below are the contract; the standalone's export (`schemaVersion 7`) is the seed migration.

```typescript
// the atom of the system — nothing enters promoted state outside one
interface EpistemicBuild {
  id: string; parentStateHash: string;
  claim: Claim; mechanismGraph: MechanismGraph;
  bridge: {
    sourcePort: FormalPort; targetPort: FormalPort;
    adapters: AdapterStep[];              // the compiled conversion program
    ruleInstantiations: RuleInstantiation[]; // per-edge, from v0.5.1
    proofObligations: ProofObligation[];
  };
  verification: { results: VerificationResult[] };
  calibration: { prior: Dist; posterior: Dist; };
  governance: {
    producer: InstrumentId; verifiers: InstrumentId[];
    stage: Stage;                          // the five-judgment ladder
    promotionDecision?: PromotionDecision;
    expirationConditions: Condition[]; rollbackPlan?: RollbackContract;
  };
}
type Stage = "PROPOSED"|"PATH_FOUND"|"TYPE_COMPOSABLE"
           |"CONTRACT_ADMISSIBLE"|"EPISTEMICALLY_SUPPORTED"|"VERIFIED";
```

```typescript
// promoted from v0.5.1 — the abstraction the kernel already reasons about
interface RuleInstantiation {
  ruleId: string; edgeIndex: number;
  sourceState: TypedState; targetState: TypedState;
  precondition: string;
  status: "PROVED"|"CONDITIONALLY-SATISFIED"|"UNRESOLVED"|"REFUTED";
  evidence: EvidenceRef[];               // backend fills this; frontend leaves []
}
interface ProofObligation {
  id: string; name: string;
  method: "deterministic"|"model-assisted"|"solver"|"proof-assistant"|"experiment";
  status: ObligationStatus; witness?: WitnessRef;   // backend-only
}
```

Every port keeps the richer `FormalPort` (kind, semanticType, shape, units, encoding, constraints, invariants, confidentiality, license). `TypedState` carries the accumulated guarantees/assumptions/loss along an adapter path — the object the backend frontier should expand over (§10).

## 3. Verification interfaces

This is the layer the standalone *cannot* contain, and the reason it stops at `EPISTEMICALLY_SUPPORTED`. A `VerificationResult` answers exactly one `ProofObligation`; the Promotion Controller composes them.

```typescript
interface Verifier {
  id: InstrumentId; family: string;      // model family / solver / human
  canDischarge(o: ProofObligation): boolean;
  verify(o: ProofObligation, ctx: BuildContext): Promise<VerificationResult>;
}
interface VerificationResult {
  obligationId: string; verifier: InstrumentId;
  result: "PROVED"|"REFUTED"|"CONDITIONAL"|"INCONCLUSIVE";
  witness?: WitnessRef;                   // SMT model, proof term, run hash
  independence: VerificationIndependence; at: string;
}
interface VerificationIndependence {
  producerFamily: string; verifierFamily: string;
  sharedModelProvider: boolean; sharedPromptLineage: boolean;
  sharedDataSource: boolean; sharedCodePath: boolean;
  independenceScore: number;              // 0..1 — measurable, not declared
}
```

Obligation → instrument mapping: deterministic POs (kind path, shape, units) discharge in the kernel; `constraint_set`/`bound` obligations route to an **SMT solver**; `proof_term`/`certificate` obligations to a **proof assistant** (Lean/Coq); adapter behavior to **property-based testing** against the generated harness; prior-art to the Literature Gateway; residual semantic judgment to a **human reviewer**. The hard rule: `independenceScore` below a policy floor cannot discharge a promotion-critical obligation.

## 4. Rule registry governance

The conversion graph is part of the epistemic constitution: one bad edge fabricates bridges corpus-wide. Every rule is a governed object; a rule change is itself a tracked prediction, calibrated against downstream outcomes.

```typescript
interface ConversionRule {
  id: string; version: string; fromKind: Kind; toKind: Kind; operation: string;
  preconditions: Predicate[]; postconditions: Predicate[];
  preservedProperties: string[]; destroyedProperties: string[];
  lossy: boolean; reversible: boolean;
  authority: "axiomatic"|"curated"|"source_verified"|"empirically_validated";
  provenance: { author: string; justification: string; addedAt: string };
  tests: TestRef[]; counterexamples: CounterexampleRef[];
  confidence: number; applicableDomains: string[]; deprecated?: boolean;
}
```

The standalone ships `axiomatic` and `curated` edges only. The backend earns the higher tiers: `source_verified` requires a discharged proof obligation for the rule's own soundness; `empirically_validated` requires a calibration record showing bridges through that edge survive at the claimed rate. Deprecating an edge must re-open every promoted build that traversed it (§6 invalidation).

## 5. Proof-witness formats

A witness is what upgrades an obligation from *asserted* to *checkable-by-a-third-party* — the thing the standalone structurally cannot produce.

| Obligation class | Witness | Independent re-check |
|---|---|---|
| Kind path | Adapter program (typed) | Re-run kernel — deterministic |
| Constraint / bound | SMT model or `unsat` core | Re-check with any SMT solver |
| Proof term / certificate | Machine-checkable proof object | Kernel of a proof assistant |
| Adapter behavior | Property-test corpus + seeds + results | Replay the RunPack |
| Prior-art / novelty | Preregistered query + signed result set | Re-issue the frozen query |

Witnesses are content-addressed and stored in the ledger; a build references witnesses by hash, never by inclusion.

## 6. Execution protocol — RunPacks & invalidation

The generated property-test string in the standalone is a *skeleton*. The backend makes it a **RunPack**: a reproducible, signed experiment. A bridge does not reach `VERIFIED` until its RunPack executes green in a pinned environment.

```typescript
interface RunPack {
  hypothesisId: string; containerDigest: string;
  sourceCommitHashes: string[]; datasetHashes: string[];
  commands: string[]; expectedOutputs: string[];
  falsificationRules: string[]; resultHashes?: string[]; signature?: string;
}
```

**Dynamic invalidation** closes the loop the standalone cannot: because ingestion is event-based, a source change propagates epistemic consequences. A commit that alters a function signature → the extractor re-emits the mechanism schema → an existing bridge no longer type-checks → dependent builds transition to `STALE` → predictions and promotions are flagged → a re-verification job is generated. A cortex must retire beliefs whose foundations moved, or it becomes a museum of stale claims.

## 7. Calibration protocol

Replace the standalone's single per-class multiplier with a **hierarchical Bayesian** model using partial pooling, so sparse classes borrow strength from their parents and do not overfit early false negatives.

```
P(survives | mechanism-pair, domain-pair, evidence-quality, depth,
             verifier-independence, bridge-complexity, source-maturity,
             literature-class, assumption-count)
```

Pooling order: global prior → domain-pair → mechanism-pair → specific-bridge posterior. Every prediction enters with timestamp, confidence, assumptions, and an evaluation date; when reality resolves it, the service emits a posterior, a credible interval, calibration error, and the reason confidence moved. Preserve the standalone's safeguards as hard constraints: minimum sample before any weight moves off neutral, a floor that forbids hard rejection from history alone, time decay, and a standing exploration quota so calibration only ever changes *skepticism*, never *admissibility* (which the type system alone may refuse).

## 8. Independent-verifier protocol

Producer/verifier separation, made operational and adversarial. Each claim moves through distinct instruments that stake calibrated reputation on falsifiable outcomes; influence tracks calibration, not eloquence.

- **Generator** proposes; **Mechanist** reconstructs the formal interface blind to the proposal; **Prosecutor** attempts to kill it; **Prior-art hunter** finds equivalents; **Experiment designer** builds the RunPack; **Replicator** reproduces results; **Auditor** inspects provenance and independence.
- Promotion requires results from instruments whose aggregate `independenceScore` clears policy — and the human-authority gate remains terminal and recorded as the final instrument.
- The producing instrument's judgment can never, alone, promote its own output. This is enforced by the Promotion Controller, not by convention.

## 9. Audit & provenance model

Current state becomes a *projection* of an append-only event log — the property the standalone's per-key storage lacks.

```typescript
interface CortexEvent {
  eventId: string; eventType: string;       // RepoObserved, MechanismExtracted,
  occurredAt: string; observedAt: string;    // BridgePlanned, ObligationDischarged,
  actor: InstrumentId; entityId: string;     // CandidatePromoted, ClaimInvalidated…
  previousHash: string; payloadHash: string; eventHash: string; signature: string;
}
```

Guarantees: full replay, causal ordering, tamper-evidence (hash chain), branching and counterfactual analysis, and exact reconstruction of *why* any claim was believed at any past time. Promotions and rule changes are signed. Nothing is silently overwritten; negatives are retained, not deleted.

## 10. The one open kernel item

> **Precondition-gated frontier.** v0.5.1 instantiates and enforces contracts *after* a min-risk frontier expansion, then prunes and re-ranks. The exact next step — and the natural seam between kernel and backend — is to make the frontier itself expand over `TypedState`, evaluating each rule's precondition against the actual carried state *before* the edge enters the search. That converts "plan then prune" into "never plan the impossible," and it is where a real predicate checker (SMT) first earns its place. The standalone approximates this with post-hoc pruning; the backend should complete it.

### Non-goal

Do not re-implement the UI as the first backend milestone. The valuable, hard, and novel work is the verification substrate. The frontend already *is* the interaction contract and the golden test; keep it as the reference oracle and build inward from reality, not outward from the screen.
