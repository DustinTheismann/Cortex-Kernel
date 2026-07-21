import { pairCompat } from "./search.js";
import { licenseCompat, portPairsFor, shapeCompat, unitCompat } from "./ports.js";
import { synthTest } from "./harness.js";
import type {
  BlockReason, BridgeOption, CompiledBridge, MechanismSchema, ObligationStatus,
  ProofObligation, RepoMeta, RuleInstantiation, SoftEvidence, SoftStatusRaw, Stage,
} from "./types.js";

/** Map the soft-judgment vocabulary to obligation statuses (fail-closed). */
export const mapSoft = (v: SoftStatusRaw | undefined): ObligationStatus =>
  ({ satisfied: "CONDITIONALLY-SATISFIED", conditional: "CONDITIONALLY-SATISFIED", violated: "REFUTED", unknown: "UNRESOLVED" } as const)[v as SoftStatusRaw] || "UNRESOLVED";

export interface CompileInput {
  schemaA: MechanismSchema | null;
  schemaB: MechanismSchema | null;
  /** Repo metadata for license screening; A is the schemaA side. */
  repoA?: RepoMeta | null;
  repoB?: RepoMeta | null;
  /** Model-assisted evidence. Absent → every soft judgment UNRESOLVED. */
  soft?: SoftEvidence;
}

/**
 * The deterministic bridge compiler of the frozen v0.5.1 kernel.
 *
 * Pure function of (schemas, rule registry, soft evidence): candidate port
 * pairing → top-3 min-risk multipath planning → per-edge contract
 * instantiation → refuted-path pruning → obligation vector → strict
 * five-stage ladder. Behavior (statuses, stages, codes, detail strings,
 * tie-breaks) is pinned to the standalone by the golden-test suite.
 */
export const compileBridge = (input: CompileInput): CompiledBridge => {
  const { schemaA, schemaB, repoA, repoB } = input;
  const soft = input.soft || {};
  const preStatus = soft.preconditions || {};

  const candPairs = portPairsFor(schemaA, schemaB);
  const opts: BridgeOption[] = [];
  candPairs.forEach(p => {
    const c = pairCompat(p.sourceOutput, p.targetInput);
    p.compatibility = c.compatibility;
    if (c.compatibility === "incompatible") return;
    const u = unitCompat(p.sourceOutput, p.targetInput), sh = shapeCompat(p.sourceOutput, p.targetInput);
    (c.options || []).forEach(o => opts.push({
      dir: p.dir, sourceOutput: p.sourceOutput, targetInput: p.targetInput,
      exact: o.exact, adapters: o.path, staticRisk: o.cost,
      risk: o.cost + (sh === "proved" ? 0 : 0.5) + (u === "refuted" ? 90 : (u === "proved" ? 0 : 0.5)),
      unit: u,
    }));
  });
  opts.sort((a, b) => a.risk - b.risk);
  const options = opts.slice(0, 3);
  const best = options[0] || null;

  if (!best) {
    const hasPorts = candPairs.length > 0;
    const impossibility = {
      code: (schemaA && schemaB) ? (hasPorts ? "NO_KIND_PATH" as const : "NO_SHARED_PORTS" as const) : "NO_SCHEMA" as const,
      from: null, to: null,
      detail: (schemaA && schemaB)
        ? (hasPorts ? "no admissible conversion between any shared ports" : "no output→input port pairing between these mechanisms")
        : "mechanism schema unavailable — fail-closed",
    };
    return {
      stage: "PROPOSED", obligations: [], mechClass: null, mechCompat: null, bridge: null,
      impossibility, blockReason: null,
      typeCheck: {
        pass: false, verdict: "type_killed", stage: "PROPOSED", sharedObject: null,
        reason: "structurally impossible [" + impossibility.code + "] — " + impossibility.detail,
      },
      options: [], candidatePairs: candPairs,
    };
  }

  // instantiate contracts per option, PRUNE refuted paths, pick lowest
  // residual-uncertainty survivor, build obligation vector + strict ladder
  const instantiate = (opt: BridgeOption): RuleInstantiation[] =>
    opt.adapters.filter(s => s.auth === "cur" && s.pre)
      .map(s => ({ ruleId: s.ruleId, op: s.op, pre: s.pre, status: mapSoft(preStatus[s.ruleId]) }));
  const scored = options.map(o => {
    const inst = instantiate(o);
    const refuted = inst.some(x => x.status === "REFUTED");
    const unresolved = inst.filter(x => x.status === "UNRESOLVED").length;
    return { o, inst, refuted, unresolved, score: o.risk + unresolved * 10 + (refuted ? 1000 : 0) };
  });
  const survivors = scored.filter(s => !s.refuted).sort((a, b) => a.score - b.score);
  const chosen = survivors[0] || scored.slice().sort((a, b) => a.score - b.score)[0];
  const bestOpt = chosen.o, inst = chosen.inst, po = bestOpt.sourceOutput, ci = bestOpt.targetInput, adapters = bestOpt.adapters || [];
  const srcRepo = bestOpt.dir === "A→B" ? repoA : repoB, dstRepo = bestOpt.dir === "A→B" ? repoB : repoA;
  const uc = bestOpt.unit, sc = shapeCompat(po, ci);

  const O: ProofObligation[] = [];
  O.push({ id: "PO-1", name: "Kind path", method: "deterministic", status: "PROVED", detail: adapters.length ? (po.kind + " → " + ci.kind + " via " + adapters.map(s => s.op).join(" → ")) : (po.kind + " ≡ " + ci.kind) });
  O.push({ id: "PO-2", name: "Shape compatibility", method: "deterministic", status: sc.toUpperCase() as ObligationStatus, detail: (po.shape || "unspecified") + " ⟶ " + (ci.shape || "unspecified") });
  O.push({ id: "PO-3", name: "Unit preservation", method: "deterministic", status: uc.toUpperCase() as ObligationStatus, detail: (po.units || "unspecified") + " ⟶ " + (ci.units || "unspecified") + (uc === "unresolved" && /dimensionless/i.test((po.units || "") + (ci.units || "")) ? " (dimensionless ≠ dimensional — not auto-proved)" : "") });
  const lc = licenseCompat(srcRepo, dstRepo);
  O.push({ id: "PO-4", name: "License metadata screening", method: "deterministic", status: lc.status === "PROVED" ? "CONDITIONALLY-SATISFIED" : lc.status, detail: lc.detail + (lc.status === "PROVED" ? " (metadata screen only — not a legal proof)" : "") });
  if (inst.length) inst.forEach((x, xi) => O.push({ id: "PO-5." + (xi + 1), name: "Precondition · " + x.op, method: "model-assisted", status: x.status, detail: x.pre }));
  else O.push({ id: "PO-5", name: "Preconditions", method: "deterministic", status: "PROVED", detail: "path is fully axiomatic — no semantic precondition" });
  O.push({ id: "PO-6", name: "Invariant preservation", method: "model-assisted", status: mapSoft(soft.invariantPreserved), detail: adapters.some(s => (s.lose || []).length) ? ("destroys: " + adapters.flatMap(s => s.lose || []).join(", ")) : "no properties destroyed on path" });
  O.push({ id: "PO-7", name: "Metric measures outcome", method: "model-assisted", status: mapSoft(soft.metricMeaningful), detail: soft.note || "" });
  if (adapters.some(s => s.lossy)) O.push({ id: "PO-8", name: "Bounded information loss", method: "deterministic", status: "CONDITIONALLY-SATISFIED", detail: "lossy hops: " + adapters.filter(s => s.lossy).map(s => s.op).join(", ") + " — adapter must bound loss" });

  const po6 = O.find(o => o.id === "PO-6")!, po7 = O.find(o => o.id === "PO-7")!;
  const unitContra = uc === "refuted", typeComposable = !unitContra;
  const anyRefutedPre = inst.some(x => x.status === "REFUTED"), anyUnresolvedPre = inst.some(x => x.status === "UNRESOLVED");
  const preconditionsSatisfied = inst.length === 0 || inst.every(x => x.status === "CONDITIONALLY-SATISFIED" || x.status === "PROVED");
  const contractOK = typeComposable && preconditionsSatisfied;
  const epistemicOK = contractOK && po6.status === "CONDITIONALLY-SATISFIED" && po7.status === "CONDITIONALLY-SATISFIED";
  const stage: Stage = !typeComposable ? "PATH_FOUND" : (!contractOK ? "TYPE_COMPOSABLE" : (!epistemicOK ? "CONTRACT_ADMISSIBLE" : "EPISTEMICALLY_SUPPORTED"));

  const mechClass = { sourceKind: po.kind, targetKind: ci.kind };
  const mechCompat = {
    matchedPorts: options.map(o => ({ dir: o.dir, sourceOutput: o.sourceOutput, targetInput: o.targetInput, compatibility: (o.exact ? "exact" : "convertible") as "exact" | "convertible", adapter: o.adapters, lossy: o.adapters.some(s => s.lossy) })),
    sharedFormalObject: bestOpt.exact,
    verdict: null as "type_valid" | "conversion_required" | "type_killed" | null,
    consideredPaths: scored.length,
    prunedPaths: scored.filter(s => s.refuted).length,
  };

  if (unitContra) {
    mechCompat.verdict = "type_killed";
    const impossibility = { code: "UNIT_CONTRADICTION" as const, from: po.kind, to: ci.kind, detail: "units " + po.units + " ⟶ " + ci.units + " cannot compose" };
    return {
      stage, obligations: O, mechClass, mechCompat, bridge: null, impossibility, blockReason: null,
      typeCheck: { pass: false, verdict: "type_killed", stage, sharedObject: null, reason: "structurally impossible [UNIT_CONTRADICTION] — " + impossibility.detail },
      options, candidatePairs: candPairs,
    };
  }

  const verdict = bestOpt.exact ? "type_valid" as const : "conversion_required" as const;
  mechCompat.verdict = verdict;
  const so = bestOpt.dir === "A→B" ? schemaA! : schemaB!, si = bestOpt.dir === "A→B" ? schemaB! : schemaA!;
  const bridge = {
    sourcePort: po, targetPort: ci, dir: bestOpt.dir, adapters,
    riskCost: Math.round(bestOpt.risk * 10) / 10,
    ruleInstantiations: inst,
    requiredAssumptions: so.assumptions || [],
    preservedInvariants: si.invariants || [],
    destroyedProperties: adapters.flatMap(s => s.lose || []),
    executableTest: synthTest(po, ci, adapters),
    proofObligations: O,
  };
  const blockReason: BlockReason | null = stage === "EPISTEMICALLY_SUPPORTED" ? null
    : (anyRefutedPre ? "PRECONDITION_UNSATISFIED"
      : (anyUnresolvedPre ? "PRECONDITION_UNRESOLVED"
        : (po6.status === "REFUTED" ? "INVARIANT_VIOLATION"
          : (po7.status === "REFUTED" ? "POSTCONDITION_INSUFFICIENT" : "EVIDENCE_PENDING"))));
  return {
    stage, obligations: O, mechClass, mechCompat, bridge, impossibility: null, blockReason,
    typeCheck: {
      pass: true, verdict, stage,
      sharedObject: bestOpt.exact ? (po.kind + ": " + (po.semantics || ci.semantics)) : (po.kind + " → " + ci.kind + " (" + adapters.map(s => s.op).join(" → ") + ")"),
      reason: (verdict === "type_valid" ? "shared formal object" : "composable via adapter") + " — reached " + stage + (scored.length > 1 ? " · " + scored.length + " paths considered, " + scored.filter(s => s.refuted).length + " pruned" : ""),
    },
    options, candidatePairs: candPairs,
  };
};
