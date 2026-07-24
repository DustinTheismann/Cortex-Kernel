// Deterministic bridge planning — min-RISK multipath search over the
// conversion registry, verbatim from the frozen source (adaptersFor /
// pairCompat). NOT shortest-path: uniform-cost by edgeCost, retaining the top
// K least-risk registered paths.
//
// Frozen behaviors preserved exactly (and pinned by golden + metamorphic tests):
//   - identity short-circuit: from === to → one exact, empty-path option;
//   - a priority queue re-sorted by cumulative cost each pop (stable);
//   - the goal is accepted BEFORE the depth cap, so a path of length 5 can
//     appear even though expansion stops at length > 4;
//   - a 4000-iteration guard;
//   - each step records { from, to, op, ruleId, lossy, auth, pre, lose } with
//     lossy/auth/pre/lose ALWAYS present (defaulted), because their presence is
//     observable in the exported bridge;
//   - results are returned in ascending cumulative cost (alternate-path order).
//
// The registry is a parameter (default CONV_RULES) so metamorphic properties
// can be probed against modified copies without touching the frozen default.

import { CONV_RULES, edgeCost, ruleId } from "./registry.js";

/**
 * Up to K least-risk registered paths from `from` to `to`.
 * Returns [{ path, exact, cost }] in ascending cost. `path` is a list of steps.
 */
export const adaptersFor = (from, to, K, rules = CONV_RULES) => {
  if (from === to) return [{ path: [], exact: true, cost: 0 }];
  const results = [];
  const pq = [[0, from, []]];
  let guard = 0;
  while (pq.length && results.length < (K || 3) && guard++ < 4000) {
    pq.sort((a, b) => a[0] - b[0]);
    const [c, k, path] = pq.shift();
    if (k === to) { results.push({ path, exact: false, cost: c }); continue; }
    if (path.length > 4) continue;
    for (const e of (rules[k] || [])) {
      pq.push([c + edgeCost(e), e.to, [...path, {
        from: k, to: e.to, op: e.op, ruleId: ruleId(k, e),
        lossy: !!e.lossy, auth: e.auth || "cur", pre: e.pre || "", lose: e.lose || [],
      }]]);
    }
  }
  return results;
};

/** Public alias: plan the top-K bridges between two kinds. */
export const planBridge = (from, to, { k = 3, registry } = {}) =>
  adaptersFor(from, to, k, registry ? registry.rules : CONV_RULES);

/**
 * Structural pair verdict (pairCompat), verbatim. Incompatible → cost sentinel
 * 99 and no options.
 */
export const pairCompat = (po, ci, rules = CONV_RULES) => {
  const rs = adaptersFor(po.kind, ci.kind, 3, rules);
  if (!rs.length) return { compatibility: "incompatible", options: [], adapter: null, lossy: false, cost: 99 };
  const a = rs[0];
  return { compatibility: a.exact ? "exact" : "convertible", options: rs, adapter: a.path, lossy: a.path.some((s) => s.lossy), cost: a.cost };
};

/** Public alias for the structural pair verdict. */
export const evaluateCompatibility = (po, ci, { registry } = {}) =>
  pairCompat(po, ci, registry ? registry.rules : CONV_RULES);
