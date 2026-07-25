// Deterministic cascade advancement — the frozen verifyCascade "step 2" run
// verbatim as a pure function: schema-level planning → contract instantiation
// → proof-obligation vector → the five-stage ladder through
// EPISTEMICALLY_SUPPORTED, with impossibility classification. NO literature,
// NO model, NO network — that boundary is verdicts.js.
//
// The output object mirrors the frozen item's decision fields exactly, so the
// projected decision hashes identically to the oracle. Absent fields stay
// absent (impossibility cases carry no bridge/mechClass/blockReason).

import { normSchema, shapeCompat } from "./compatibility.js";
import { planPortBridges } from "./planner.js";
import { scoreOptions } from "./contracts.js";
import { evaluateObligations, synthTest } from "./obligations.js";
import { NULL_TRACER } from "./internal/trace.js";

/**
 * input: { schemaA, schemaB, repoA, repoB, soft }
 *   soft = { preconditions: {ruleId: rawStatus}, invariantPreserved, metricMeaningful, note }
 * Returns a deterministic decision (fields as the frozen item receives them).
 */
export const evaluateDeterministicCascade = (input, tracer = NULL_TRACER) => {
  const schemaA = normSchema(input.schemaA);
  const schemaB = normSchema(input.schemaB);
  const repoA = input.repoA || {}, repoB = input.repoB || {};
  const soft = input.soft || {};
  const preStatus = soft.preconditions || {};

  const { candPairs, options, best } = planPortBridges(schemaA, schemaB);
  tracer.record({ step: "plan", candPairs: candPairs.length, options: options.length });

  if (!best) {
    const hasPorts = candPairs.length > 0;
    const code = (schemaA && schemaB) ? (hasPorts ? "NO_KIND_PATH" : "NO_SHARED_PORTS") : "NO_SCHEMA";
    const detail = (schemaA && schemaB)
      ? (hasPorts ? "no admissible conversion between any shared ports" : "no output→input port pairing between these mechanisms")
      : "mechanism schema unavailable — fail-closed";
    const impossibility = { code, from: null, to: null, detail };
    return {
      stage: "PROPOSED", obligations: [], options: [], impossibility,
      typeCheck: { pass: false, verdict: "type_killed", stage: "PROPOSED", sharedObject: null, reason: "structurally impossible [" + code + "] — " + detail },
    };
  }

  const { scored, chosen } = scoreOptions(options, preStatus, tracer);
  const bestOpt = chosen.o, inst = chosen.inst, po = bestOpt.sourceOutput, ci = bestOpt.targetInput, adapters = bestOpt.adapters || [];
  const srcRepo = bestOpt.dir === "A→B" ? repoA : repoB, dstRepo = bestOpt.dir === "A→B" ? repoB : repoA;
  const uc = bestOpt.unit, sc = shapeCompat(po, ci); // eslint-disable-line no-unused-vars

  const O = evaluateObligations({ po, ci, adapters, inst, unit: uc, soft, srcRepo, dstRepo }, tracer);
  const po6 = O.find((o) => o.id === "PO-6"), po7 = O.find((o) => o.id === "PO-7");

  const unitContra = uc === "refuted", typeComposable = !unitContra;
  const anyRefutedPre = inst.some((x) => x.status === "REFUTED"), anyUnresolvedPre = inst.some((x) => x.status === "UNRESOLVED");
  const preconditionsSatisfied = inst.length === 0 || inst.every((x) => x.status === "CONDITIONALLY-SATISFIED" || x.status === "PROVED");
  const contractOK = typeComposable && preconditionsSatisfied;
  const epistemicOK = contractOK && po6.status === "CONDITIONALLY-SATISFIED" && po7.status === "CONDITIONALLY-SATISFIED";
  const stage = !typeComposable ? "PATH_FOUND" : (!contractOK ? "TYPE_COMPOSABLE" : (!epistemicOK ? "CONTRACT_ADMISSIBLE" : "EPISTEMICALLY_SUPPORTED"));
  tracer.record({ step: "advance", unitContra, contractOK, epistemicOK, stage });

  const mechClass = { sourceKind: po.kind, targetKind: ci.kind };
  const mechCompat = {
    matchedPorts: options.map((o) => ({ dir: o.dir, sourceOutput: o.sourceOutput, targetInput: o.targetInput, compatibility: o.exact ? "exact" : "convertible", adapter: o.adapters, lossy: o.adapters.some((s) => s.lossy) })),
    sharedFormalObject: bestOpt.exact,
    verdict: null,
    consideredPaths: scored.length,
    prunedPaths: scored.filter((s) => s.refuted).length,
  };

  const decision = { stage, obligations: O, options, mechClass, mechCompat };

  if (unitContra) {
    mechCompat.verdict = "type_killed";
    decision.impossibility = { code: "UNIT_CONTRADICTION", from: po.kind, to: ci.kind, detail: "units " + po.units + " ⟶ " + ci.units + " cannot compose" };
    decision.bridge = null;
    decision.typeCheck = { pass: false, verdict: "type_killed", stage, sharedObject: null, reason: "structurally impossible [UNIT_CONTRADICTION] — " + decision.impossibility.detail };
    return decision;
  }

  const verdict = bestOpt.exact ? "type_valid" : "conversion_required";
  mechCompat.verdict = verdict;
  const so = bestOpt.dir === "A→B" ? schemaA : schemaB, si = bestOpt.dir === "A→B" ? schemaB : schemaA;
  decision.bridge = {
    sourcePort: po, targetPort: ci, dir: bestOpt.dir, adapters,
    riskCost: Math.round(bestOpt.risk * 10) / 10,
    ruleInstantiations: inst,
    requiredAssumptions: so.assumptions || [],
    preservedInvariants: si.invariants || [],
    destroyedProperties: adapters.flatMap((s) => s.lose || []),
    executableTest: synthTest(po, ci, { adapter: adapters }),
    proofObligations: O,
  };
  decision.impossibility = null;
  decision.blockReason = stage === "EPISTEMICALLY_SUPPORTED" ? null
    : (anyRefutedPre ? "PRECONDITION_UNSATISFIED"
      : (anyUnresolvedPre ? "PRECONDITION_UNRESOLVED"
        : (po6.status === "REFUTED" ? "INVARIANT_VIOLATION"
          : (po7.status === "REFUTED" ? "POSTCONDITION_INSUFFICIENT" : "EVIDENCE_PENDING"))));
  decision.typeCheck = {
    pass: true, verdict, stage,
    sharedObject: bestOpt.exact ? (po.kind + ": " + (po.semantics || ci.semantics)) : (po.kind + " → " + ci.kind + " (" + adapters.map((s) => s.op).join(" → ") + ")"),
    reason: (verdict === "type_valid" ? "shared formal object" : "composable via adapter") + " — reached " + stage + (scored.length > 1 ? " · " + scored.length + " paths considered, " + scored.filter((s) => s.refuted).length + " pruned" : ""),
  };
  return decision;
};
