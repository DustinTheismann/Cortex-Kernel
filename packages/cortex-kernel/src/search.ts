import { CONV_RULES, edgeCost } from "./rules.js";
import type { AdapterStep, Kind, KindPath, PairCompat, PortSpec } from "./types.js";

/**
 * Min-risk typed search (uniform-cost) over the contracted conversion
 * registry — not merely shortest path. Returns up to K least-risk
 * registered paths (multipath); each step carries a stable ruleId and its
 * contract metadata.
 *
 * Faithful to the standalone including its quirks: `K || 3` (K=0 behaves
 * as 3), a 4000-iteration guard, path depth capped at 4 hops, and a
 * sort-then-shift frontier whose tie order matches Array.prototype.sort
 * stability. Do not "fix" these — golden tests pin them.
 */
export const adaptersFor = (from: Kind, to: Kind, K?: number): KindPath[] => {
  if (from === to) return [{ path: [], exact: true, cost: 0 }];
  const results: KindPath[] = [];
  const pq: Array<[number, Kind, AdapterStep[]]> = [[0, from, []]];
  let guard = 0;
  while (pq.length && results.length < (K || 3) && guard++ < 4000) {
    pq.sort((a, b) => a[0] - b[0]);
    const [c, k, path] = pq.shift()!;
    if (k === to) { results.push({ path, exact: false, cost: c }); continue; }
    if (path.length > 4) continue;
    for (const e of (CONV_RULES[k] || [])) {
      pq.push([
        c + edgeCost(e),
        e.to,
        [...path, {
          from: k, to: e.to, op: e.op,
          ruleId: k + ">" + e.to + ":" + e.op,
          lossy: !!e.lossy, auth: e.auth || "cur",
          pre: e.pre || "", lose: e.lose || [],
        }],
      ]);
    }
  }
  return results;
};

/** Kind-level compatibility of one output→input port pair (top-3 multipath). */
export const pairCompat = (po: PortSpec, ci: PortSpec): PairCompat => {
  const rs = adaptersFor(po.kind, ci.kind, 3);
  if (!rs.length) return { compatibility: "incompatible", options: [], adapter: null, lossy: false, cost: 99 };
  const a = rs[0];
  return {
    compatibility: a.exact ? "exact" : "convertible",
    options: rs,
    adapter: a.path,
    lossy: a.path.some(s => s.lossy),
    cost: a.cost,
  };
};
