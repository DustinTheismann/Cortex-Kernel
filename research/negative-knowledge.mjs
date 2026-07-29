#!/usr/bin/env node
// Negative knowledge substrate (frontier #3) — ADVISORY, parity-isolated.
//
// A failed bridge is usually discarded. Here it becomes a first-class object
// with the cause, the contradiction, and — crucially — the condition under
// which it should be reconsidered. That converts repeated dead-end reasoning
// into a compounding record of what does not work and why.
//
// Read-only over the kernel's own decisions; never imported by the kernel.
//
//   node research/negative-knowledge.mjs         # demo over the golden corpus
//   node research/negative-knowledge.mjs --json

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildWitness } from "../packages/cortex-kernel/src/witness.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fxDir = join(root, "test/golden/fixtures");

/**
 * Turn a failed or blocked decision into a Failure record. `reconsiderWhen` is
 * the machine-checkable condition that should reopen it — without one, a
 * negative result is just a dead end rather than a lead.
 */
export const toFailure = (decision, context = {}) => {
  const w = buildWitness(decision);
  const imp = decision.impossibility;
  const blocked = decision.blockReason;
  if (!imp && !blocked) return null; // not a failure

  const contradiction = imp
    ? { kind: imp.code, detail: imp.detail }
    : { kind: blocked, detail: (decision.obligations || []).filter((o) => ["UNRESOLVED", "REFUTED"].includes(o.status)).map((o) => `${o.id}:${o.status}`).join(", ") };

  const reconsiderWhen = imp
    ? ({
      NO_KIND_PATH: { trigger: "REGISTRY_CHANGED", condition: `a conversion rule reaching "${w.selected ? w.selected.targetKind : "the target kind"}" is added` },
      NO_SHARED_PORTS: { trigger: "SCHEMA_CHANGED", condition: "either mechanism gains a port whose kind pairs with the other" },
      NO_SCHEMA: { trigger: "SCHEMA_AVAILABLE", condition: "a mechanism schema becomes available for the missing side" },
      UNIT_CONTRADICTION: { trigger: "UNIT_EVIDENCE", condition: "evidence that the source and target units are inter-convertible" },
    }[imp.code] || { trigger: "MANUAL", condition: "manual review" })
    : { trigger: "EVIDENCE_CHANGED", condition: `the obligations ${w.unresolved.map((o) => o.id).join(", ") || "in question"} are resolved` };

  return {
    id: `neg:${contradiction.kind}:${w.selected ? w.selected.chain.join("|") || "exact" : "no-path"}`,
    attemptedPath: w.selected ? w.selected.chain : [],
    sourceKind: w.selected ? w.selected.sourceKind : null,
    targetKind: w.selected ? w.selected.targetKind : null,
    failedAssumption: (w.assumptions.instantiatedPreconditions.find((p) => p.status === "REFUTED") || null),
    contradiction,
    missingEvidence: w.unresolved.map((o) => o.id),
    historicalAttempts: 1,
    reconsiderWhen,
    falsifier: w.falsifier,
    context,
  };
};

/** Merge a failure into a store, incrementing attempts rather than duplicating. */
export const record = (store, failure) => {
  if (!failure) return store;
  const existing = store.get(failure.id);
  if (existing) { existing.historicalAttempts += 1; return store; }
  store.set(failure.id, failure);
  return store;
};

/** Should this attempt be short-circuited by prior knowledge? */
export const shortCircuit = (store, id, worldState = {}) => {
  const f = store.get(id);
  if (!f) return null;
  const t = f.reconsiderWhen.trigger;
  if (worldState[t]) return null; // the world changed; reconsider
  return { skip: true, because: f.contradiction, since: `${f.historicalAttempts} prior attempt(s)`, reopensWhen: f.reconsiderWhen };
};

// ---- demo over the corpus -------------------------------------------------

const store = new Map();
for (const f of readdirSync(fxDir)) {
  const fx = JSON.parse(readFileSync(join(fxDir, f), "utf8"));
  if (!fx.output || !fx.output.stage) continue;
  record(store, toFailure(fx.output, { caseId: fx.caseId }));
}
const failures = [...store.values()];

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ artifact: "negative-knowledge", advisory: true, failures }, null, 2));
  process.exit(0);
}

console.log("negative knowledge — failed bridges as first-class objects\n");
for (const f of failures) {
  console.log(`  ${f.contradiction.kind}${f.sourceKind ? `  ${f.sourceKind} → ${f.targetKind}` : ""}`);
  console.log(`      path:      ${f.attemptedPath.join(" → ") || "(none found)"}`);
  console.log(`      because:   ${f.contradiction.detail || "(no detail)"}`);
  console.log(`      reopen if: ${f.reconsiderWhen.condition}  [${f.reconsiderWhen.trigger}]`);
}
console.log(`\n  ${failures.length} distinct failure classes recorded from the corpus.`);
console.log("  A negative result with a reopening condition is a lead; without one it is only a dead end.");
