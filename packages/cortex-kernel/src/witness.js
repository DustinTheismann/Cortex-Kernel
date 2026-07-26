// Proof-carrying bridge plans.
//
// A decision states a conclusion. A WITNESS states why, in a form a third
// party can re-check without trusting — or even running — the planner:
//
//   - the conversion chain actually used, as stable ruleIds;
//   - the assumptions the bridge inherits;
//   - which obligations remain unresolved, and of what method;
//   - which alternate paths were rejected, and the cause of each rejection;
//   - the falsifier: what evidence would overturn this decision.
//
// `verifyWitness` deliberately does NOT call the planner. It re-derives every
// claim from the witness plus the conversion registry: chain contiguity, rule
// existence and field agreement, cost arithmetic, and ladder consistency with
// the obligation vector. That independence is the point — a checker that
// called the thing it checks would prove nothing.
//
// Witnesses are additive and advisory: building one never mutates or
// influences the canonical decision (enforced by a differential test).

import { CONV_RULES, edgeCost } from "./registry.js";

/** Cause codes for why an alternate path was not selected. */
export const REJECTION = {
  REFUTED_PRECONDITION: "REFUTED_PRECONDITION",
  HIGHER_RESIDUAL_UNCERTAINTY: "HIGHER_RESIDUAL_UNCERTAINTY",
  HIGHER_RISK: "HIGHER_RISK",
};

const chainOf = (adapters) => (adapters || []).map((s) => s.ruleId);

/** What evidence would overturn this decision? Computed, not narrated. */
const falsifier = (decision) => {
  const imp = decision.impossibility;
  if (imp) {
    switch (imp.code) {
      case "NO_KIND_PATH":
        return { kind: "MISSING_RULE", statement: `A conversion rule reaching "${imp.to || "the target kind"}" would make this bridge structurally possible.`, target: imp.to || null };
      case "NO_SHARED_PORTS":
        return { kind: "MISSING_PORT", statement: "An output port on one mechanism whose kind can reach an input port kind on the other would create a candidate pairing." };
      case "NO_SCHEMA":
        return { kind: "MISSING_SCHEMA", statement: "A mechanism schema for the un-extracted side would allow structural evaluation." };
      case "UNIT_CONTRADICTION":
        return { kind: "UNIT_RECONCILIATION", statement: `Evidence that ${imp.from} in "${(decision.bridge && decision.bridge.sourcePort.units) || "source units"}" is convertible to the target units would remove the contradiction.` };
      default:
        return { kind: "UNKNOWN", statement: "No falsifier derived for this impossibility code." };
    }
  }
  const unresolved = (decision.obligations || []).filter((o) => o.status === "UNRESOLVED");
  const refuted = (decision.obligations || []).filter((o) => o.status === "REFUTED");
  if (refuted.length) return { kind: "REFUTATION_STANDS", statement: `Overturning ${refuted.map((o) => o.id).join(", ")} would remove the current block.`, obligations: refuted.map((o) => o.id) };
  if (unresolved.length) return { kind: "RESOLVE_OBLIGATION", statement: `Resolving ${unresolved.map((o) => o.id).join(", ")} would advance this bridge.`, obligations: unresolved.map((o) => o.id) };
  return { kind: "REFUTE_SUPPORT", statement: "Violating any instantiated precondition, or refuting invariant preservation or metric meaningfulness, would demote this bridge." };
};

/**
 * Build a proof-carrying witness for a decision produced by evaluateCascade
 * or evaluateDeterministicCascade. Pure: the decision is never mutated.
 */
export const buildWitness = (decision) => {
  const bridge = decision.bridge || null;
  const adapters = bridge ? bridge.adapters : [];
  const selectedChain = chainOf(adapters);
  const selectedKey = selectedChain.join("|");

  const rejected = (decision.options || [])
    .filter((o) => chainOf(o.adapters).join("|") !== selectedKey)
    .map((o) => {
      const inst = (o.adapters || []).filter((s) => s.auth === "cur" && s.pre).map((s) => s.ruleId);
      const refutedHere = (bridge ? bridge.ruleInstantiations : []).filter((x) => x.status === "REFUTED").map((x) => x.ruleId);
      const cause = inst.some((id) => refutedHere.includes(id)) ? REJECTION.REFUTED_PRECONDITION
        : (bridge && o.risk > bridge.riskCost ? REJECTION.HIGHER_RISK : REJECTION.HIGHER_RESIDUAL_UNCERTAINTY);
      return { chain: chainOf(o.adapters), risk: o.risk, staticRisk: o.staticRisk, cause };
    });

  return {
    witnessVersion: 1,
    conclusion: {
      stage: decision.stage,
      verdict: decision.typeCheck ? decision.typeCheck.verdict : null,
      blockReason: decision.blockReason ?? null,
      impossibilityCode: decision.impossibility ? decision.impossibility.code : null,
    },
    selected: bridge ? {
      sourceKind: bridge.sourcePort.kind,
      targetKind: bridge.targetPort.kind,
      dir: bridge.dir,
      chain: selectedChain,
      riskCost: bridge.riskCost,
      lossySteps: adapters.filter((s) => s.lossy).map((s) => s.ruleId),
      destroyedProperties: bridge.destroyedProperties,
    } : null,
    assumptions: {
      required: bridge ? bridge.requiredAssumptions : [],
      preservedInvariants: bridge ? bridge.preservedInvariants : [],
      instantiatedPreconditions: bridge ? bridge.ruleInstantiations.map((x) => ({ ruleId: x.ruleId, status: x.status, text: x.pre })) : [],
    },
    obligations: (decision.obligations || []).map((o) => ({ id: o.id, method: o.method, status: o.status })),
    unresolved: (decision.obligations || []).filter((o) => o.status === "UNRESOLVED").map((o) => ({ id: o.id, method: o.method })),
    rejectedAlternates: rejected,
    falsifier: falsifier(decision),
  };
};

/**
 * Independently validate a witness against the conversion registry.
 * Uses only the witness and the registry — never the planner.
 * Returns { valid, checks, violations }.
 */
export const verifyWitness = (witness, rules = CONV_RULES) => {
  const violations = [];
  const checks = [];
  const ok = (name) => checks.push(name);

  if (witness.witnessVersion !== 1) violations.push(`unsupported witnessVersion ${witness.witnessVersion}`);
  else ok("witnessVersion");

  const index = new Map();
  for (const [from, edges] of Object.entries(rules)) for (const e of edges) index.set(from + ">" + e.to + ":" + e.op, { from, ...e });

  const sel = witness.selected;
  if (sel) {
    // 1. every rule in the chain exists in the registry
    const steps = sel.chain.map((id) => ({ id, rule: index.get(id) }));
    const missing = steps.filter((s) => !s.rule).map((s) => s.id);
    if (missing.length) violations.push(`chain references unknown rule(s): ${missing.join(", ")}`);
    else ok("chain rules exist in registry");

    if (!missing.length) {
      // 2. the chain is contiguous and terminates at the declared kinds
      let cursor = sel.sourceKind;
      let contiguous = true;
      for (const s of steps) {
        if (s.rule.from !== cursor) { violations.push(`chain break at ${s.id}: expected a rule from "${cursor}"`); contiguous = false; break; }
        cursor = s.rule.to;
      }
      if (contiguous) {
        if (cursor !== sel.targetKind) violations.push(`chain ends at "${cursor}" but the witness claims target "${sel.targetKind}"`);
        else ok("chain is contiguous from source to target");
      }

      // 3. declared lossy steps and destroyed properties agree with the registry
      const registryLossy = steps.filter((s) => s.rule.lossy).map((s) => s.id);
      if (JSON.stringify(registryLossy) !== JSON.stringify(sel.lossySteps)) violations.push(`declared lossy steps ${JSON.stringify(sel.lossySteps)} disagree with registry ${JSON.stringify(registryLossy)}`);
      else ok("lossy steps agree with registry");

      const registryDestroyed = steps.flatMap((s) => s.rule.lose || []);
      if (JSON.stringify(registryDestroyed) !== JSON.stringify(sel.destroyedProperties)) violations.push(`declared destroyed properties disagree with registry`);
      else ok("destroyed properties agree with registry");

      // 4. every curated-with-precondition rule is instantiated exactly once
      const curated = steps.filter((s) => (s.rule.auth || "cur") === "cur" && s.rule.pre).map((s) => s.id);
      const instantiated = witness.assumptions.instantiatedPreconditions.map((x) => x.ruleId);
      if (JSON.stringify(curated) !== JSON.stringify(instantiated)) violations.push(`instantiated preconditions ${JSON.stringify(instantiated)} do not match the curated rules on the chain ${JSON.stringify(curated)}`);
      else ok("every curated precondition on the chain is instantiated");

      // 5. static cost arithmetic is reproducible from the registry
      const staticCost = steps.reduce((acc, s) => acc + edgeCost(s.rule), 0);
      if (sel.riskCost < staticCost - 1e-9) violations.push(`declared riskCost ${sel.riskCost} is below the registry static cost ${staticCost}`);
      else ok("risk cost is consistent with registry edge costs");
    }
  } else if (!witness.conclusion.impossibilityCode) {
    violations.push("witness has neither a selected bridge nor an impossibility code");
  } else ok("impossibility witness carries no bridge, as expected");

  // 6. ladder consistency, re-derived from the obligation vector alone
  const byId = (p) => witness.obligations.filter((o) => new RegExp(p).test(o.id));
  const pre = byId("^PO-5");
  const po6 = witness.obligations.find((o) => o.id === "PO-6");
  const po7 = witness.obligations.find((o) => o.id === "PO-7");
  const po3 = witness.obligations.find((o) => o.id === "PO-3");
  if (witness.obligations.length) {
    const unitContra = po3 && po3.status === "REFUTED";
    const preSatisfied = pre.every((x) => x.status === "CONDITIONALLY-SATISFIED" || x.status === "PROVED");
    const contractOK = !unitContra && preSatisfied;
    const epistemicOK = contractOK && po6 && po7 && po6.status === "CONDITIONALLY-SATISFIED" && po7.status === "CONDITIONALLY-SATISFIED";
    const expected = unitContra ? "PATH_FOUND" : (!contractOK ? "TYPE_COMPOSABLE" : (!epistemicOK ? "CONTRACT_ADMISSIBLE" : "EPISTEMICALLY_SUPPORTED"));
    if (witness.conclusion.stage !== expected) violations.push(`stage "${witness.conclusion.stage}" is not re-derivable from the obligation vector (expected "${expected}")`);
    else ok("stage is re-derivable from the obligation vector");
  }

  // 7. every rejected alternate carries a recognized cause
  const badCause = witness.rejectedAlternates.filter((r) => !Object.values(REJECTION).includes(r.cause));
  if (badCause.length) violations.push(`rejected alternates with unrecognized cause: ${badCause.length}`);
  else ok("all rejected alternates carry a cause");

  // 8. a falsifier is always present
  if (!witness.falsifier || !witness.falsifier.kind) violations.push("witness carries no falsifier");
  else ok("falsifier present");

  return { valid: violations.length === 0, checks, violations };
};
