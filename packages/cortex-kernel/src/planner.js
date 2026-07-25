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
import { shapeCompat, unitCompat } from "./compatibility.js";

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

/**
 * Candidate output→input port pairs across two schemas (portPairsFor),
 * verbatim: A→B and B→A directions, capped at 24.
 */
export const portPairsFor = (schemaA, schemaB) => {
  const pairs = [];
  const add = (src, dst, dir) => (src.produces || []).forEach((po) => (dst.consumes || []).forEach((ci) => pairs.push({ dir, sourceOutput: po, targetInput: ci })));
  if (schemaA && schemaB) { add(schemaA, schemaB, "A→B"); add(schemaB, schemaA, "B→A"); }
  return pairs.slice(0, 24);
};

/**
 * Schema-level bridge planning (the frozen per-item option build), verbatim.
 * For every candidate port pair, expand its top-3 min-risk kind paths into
 * options carrying the SELECTION risk (staticRisk + shape/unit penalties),
 * sort ascending by risk, keep the top 3. Returns { candPairs, options, best }.
 * `candPairs` entries are annotated with their `.compatibility`.
 */
export const planPortBridges = (schemaA, schemaB, rules = CONV_RULES) => {
  const candPairs = portPairsFor(schemaA, schemaB);
  const opts = [];
  candPairs.forEach((p) => {
    const c = pairCompat(p.sourceOutput, p.targetInput, rules);
    p.compatibility = c.compatibility;
    if (c.compatibility === "incompatible") return;
    const u = unitCompat(p.sourceOutput, p.targetInput), sh = shapeCompat(p.sourceOutput, p.targetInput);
    (c.options || []).forEach((o) => opts.push({
      dir: p.dir, sourceOutput: p.sourceOutput, targetInput: p.targetInput,
      exact: o.exact, adapters: o.path, staticRisk: o.cost,
      risk: o.cost + (sh === "proved" ? 0 : 0.5) + (u === "refuted" ? 90 : (u === "proved" ? 0 : 0.5)),
      unit: u,
    }));
  });
  opts.sort((a, b) => a.risk - b.risk);
  const options = opts.slice(0, 3);
  return { candPairs, options, best: options[0] || null };
};
