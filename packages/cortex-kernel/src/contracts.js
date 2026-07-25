// Per-edge contract instantiation and option scoring/pruning/selection,
// verbatim from the frozen source. Kept SEPARATE from obligation evaluation
// (obligations.js): this module decides WHICH path is chosen and the
// per-edge precondition contracts; obligations.js grades the chosen path.
//
// A curated rule with a precondition becomes a RuleInstantiation whose status
// is the soft judgment for that ruleId (fail-closed to UNRESOLVED). Refuted
// paths are pruned; among survivors the lowest residual-uncertainty score
// wins; if every path is refuted, the lowest-score refuted path is still
// chosen (so a refuted precondition yields TYPE_COMPOSABLE, not PROPOSED).

import { mapSoft } from "./compatibility.js";
import { NULL_TRACER } from "./internal/trace.js";

/**
 * Instantiate the curated-with-precondition steps of an adapter chain into
 * RuleInstantiations, mapping each soft judgment (by ruleId) to a status.
 */
export const instantiateContract = (adapters, preStatus = {}, tracer = NULL_TRACER) => {
  const inst = adapters
    .filter((s) => s.auth === "cur" && s.pre)
    .map((s) => {
      const status = mapSoft(preStatus[s.ruleId]);
      tracer.record({ step: "instantiate", ruleId: s.ruleId, pre: s.pre, soft: preStatus[s.ruleId], status });
      return { ruleId: s.ruleId, op: s.op, pre: s.pre, status };
    });
  return inst;
};

/**
 * Score every option (risk + 10·unresolved + 1000·refuted), prune refuted
 * paths, and select the lowest-score survivor (falling back to the lowest
 * refuted). Returns { scored, survivors, chosen } — chosen carries { o, inst }.
 */
export const scoreOptions = (options, preStatus = {}, tracer = NULL_TRACER) => {
  const scored = options.map((o) => {
    const inst = instantiateContract(o.adapters, preStatus, tracer);
    const refuted = inst.some((x) => x.status === "REFUTED");
    const unresolved = inst.filter((x) => x.status === "UNRESOLVED").length;
    const score = o.risk + unresolved * 10 + (refuted ? 1000 : 0);
    tracer.record({ step: "score", adapters: o.adapters.map((s) => s.ruleId), risk: o.risk, unresolved, refuted, score });
    return { o, inst, refuted, unresolved, score };
  });
  const survivors = scored.filter((s) => !s.refuted).sort((a, b) => a.score - b.score);
  const chosen = survivors[0] || scored.slice().sort((a, b) => a.score - b.score)[0];
  tracer.record({ step: "select", pruned: scored.filter((s) => s.refuted).length, considered: scored.length, chosenScore: chosen && chosen.score });
  return { scored, survivors, chosen };
};
