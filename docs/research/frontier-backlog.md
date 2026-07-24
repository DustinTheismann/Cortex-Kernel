# Frontier backlog — hyper-advancement track

> **Discipline.** Everything here is a *specification or experiment*, not
> implementation. Nothing in this backlog may alter parity extraction on
> `claude/extract-v051-kernel`. Frontier work lives on `research/frontier-designs`
> (specs/experiments) and only graduates to `future/kernel-next` once validated.
> An item may touch the parity branch **only** if it is infrastructure-only and
> provably behavior-preserving against the golden corpus.

Each proposal uses the fixed format: Novelty claim · Technical mechanism ·
Expected advantage · Research risk · Required evidence · Parity impact ·
Recommended phase.

---

## 1. Proof-carrying bridge plans

- **Novelty claim.** A bridge decision returns a machine-checkable *witness*, not just a verdict.
- **Technical mechanism.** Extend the compiled bridge with a serialized proof object: conversions used (ordered ruleIds), assumptions required, obligations still unresolved, rejected alternate paths with rejection cause, and a falsifier — the evidence that would overturn the decision. The witness is derivable from state the frozen planner already computes (`options`, `ruleInstantiations`, `prunedPaths`, obligation vector).
- **Expected advantage.** Turns the kernel from a decision generator into an auditable reasoning instrument; witnesses are independently re-checkable without re-running the planner.
- **Research risk.** Low-to-moderate. Risk is scope creep in the witness schema, not feasibility.
- **Required evidence.** A standalone checker that validates a witness against the rule registry and reproduces the stage; witnesses for every `compile-*` golden case.
- **Parity impact.** None if additive (a new return field behind a flag). Must not change existing canonical fields.
- **Recommended phase.** Phase 3 (first frontier deliverable; the corpus already captures the inputs it needs).

## 2. Counterfactual discovery engine

- **Novelty claim.** Plan over *missing* knowledge: which absent rule/experiment/dataset/theorem would unlock the most currently-impossible bridges.
- **Technical mechanism.** Over the impossibility set (NO_KIND_PATH / NO_SHARED_PORTS / precondition-blocked), search for the minimal registry or evidence addition that maximizes newly-admissible bridges; rank candidate additions by unlocked count and authority cost.
- **Expected advantage.** Converts a passive knowledge graph into a research-prioritization system.
- **Research risk.** Moderate. Combinatorial search cost; risk of proposing unsound rules.
- **Required evidence.** On a fixed corpus, demonstrate that a proposed addition actually unlocks the predicted bridges when applied to a *copy* of the registry (never the frozen one).
- **Parity impact.** None — reads the frozen registry, never mutates it.
- **Recommended phase.** Phase 4.

## 3. Negative knowledge substrate

- **Novelty claim.** Failed bridges are first-class, queryable objects with reconsideration conditions.
- **Technical mechanism.** Persist a `Failure { attemptedPath, failedAssumption, contradiction, missingEvidence, historicalAttempts[], reconsiderWhen }` record for every killed bridge. The frozen artifact already retains negatives as data; this enriches them with structured cause and a reopen trigger.
- **Expected advantage.** Prevents repeated dead-end reasoning; compounds a record of what does not work.
- **Research risk.** Low. Mostly schema + storage design.
- **Required evidence.** Show that re-probing a previously-failed cell short-circuits using the stored contradiction until its `reconsiderWhen` fires.
- **Parity impact.** None — a superset store around existing negatives.
- **Recommended phase.** Phase 3.

## 4. Epistemic stress testing

- **Novelty claim.** Every decision carries a robustness profile, not a binary verdict.
- **Technical mechanism.** For each decision, run controlled perturbations — remove a source, downgrade one assumption, alter one conversion rule, inject conflicting evidence, remove the highest-authority node — and record how the stage/verdict move. Perturbations run against copies of the inputs.
- **Expected advantage.** Distinguishes fragile bridges (flip under one perturbation) from robust ones.
- **Research risk.** Moderate. Perturbation space design; compute cost.
- **Required evidence.** A robustness profile for each `compile-*` case plus a demonstration that a known-fragile case is flagged.
- **Parity impact.** None — the unperturbed decision must remain byte-identical to the oracle.
- **Recommended phase.** Phase 4.

## 5. Mechanism-space embeddings

- **Novelty claim.** A hybrid symbolic-vector space over mechanisms/contracts surfaces unregistered-but-plausible bridges and latent families.
- **Technical mechanism.** Embed mechanism schemas (kinds, ports, semantics) and rules; use nearest-neighbour / analogy queries to suggest candidate conversions, outliers, and structurally-missing concepts. Suggestions are advisory until independently validated by the deterministic compiler.
- **Expected advantage.** Discovery beyond the hand-curated registry.
- **Research risk.** High. Learned components are non-deterministic and can hallucinate bridges.
- **Required evidence.** Precision/recall of suggestions against subsequently-validated bridges; every suggestion must pass the deterministic type-check before promotion.
- **Parity impact.** None permitted in the deterministic path; strictly advisory sidecar.
- **Recommended phase.** Phase 5.

## 6. Calibration ledger

- **Novelty claim.** Confidence is empirically accountable over time.
- **Technical mechanism.** Each promoted claim carries predicted confidence, later validation outcome, calibration error, authority decay, and revision history. Builds on the frozen Ω5 calibration but adds decay and revision tracking.
- **Expected advantage.** A system whose confidence is measured against reality is far more defensible than one emitting bare scores.
- **Research risk.** Low-to-moderate. Needs a real outcome stream to be meaningful.
- **Required evidence.** Reliability diagrams showing predicted vs. realized hit-rate; demonstration that authority decay responds to refutations.
- **Parity impact.** The frozen calibration math must stay identical; this is an additive ledger.
- **Recommended phase.** Phase 4.

## 7. Minimal-assumption path search

- **Novelty claim.** Select bridges by scientific strength, not only min-risk cost.
- **Technical mechanism.** Alongside the frozen min-risk multipath, compute fewest-assumptions, weakest-assumptions, most-independently-supported, most-falsifiable, and most-reversible paths as alternative rankings over the same registry.
- **Expected advantage.** Bridge selection stronger than conventional shortest-path.
- **Research risk.** Moderate. Defining and ordering "weakest"/"most falsifiable" rigorously.
- **Required evidence.** On the corpus, show these rankings diverge meaningfully from min-risk and correlate with downstream validation.
- **Parity impact.** None — additive rankings; the frozen `options` ordering (risk-ascending) stays the selected one.
- **Recommended phase.** Phase 4.

## 8. Adversarial path tournament

- **Novelty claim.** Retain planner disagreement as structured evidence instead of averaging it away.
- **Technical mechanism.** Run multiple planners with different objectives — conservative, novelty-seeking, evidence-maximizing, contradiction-seeking, minimal-assumption, falsification-first — and record where they disagree as a first-class artifact.
- **Expected advantage.** Disagreement localizes the load-bearing assumptions of a bridge.
- **Research risk.** Moderate-to-high. Objective design; interpretation of disagreement.
- **Required evidence.** Case studies where the tournament exposes a hidden assumption a single planner missed.
- **Parity impact.** None — the frozen planner is one competitor; its output is unchanged.
- **Recommended phase.** Phase 5.
