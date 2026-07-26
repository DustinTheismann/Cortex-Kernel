#!/usr/bin/env node
// Counterfactual discovery engine (frontier #2) — ADVISORY, parity-isolated.
//
// The kernel answers "is this bridge possible?". This asks the inverse:
// *what missing rule would unlock the most currently-impossible bridges?*
// That turns a passive knowledge graph into a research-prioritization
// instrument: it names the single highest-leverage gap in the registry.
//
// Strictly read-only. It plans over COPIES of the frozen registry and never
// mutates it, is not imported by the kernel, and cannot affect parity.
//
//   node research/counterfactual.mjs            # ranked candidate additions
//   node research/counterfactual.mjs --json

import { CONV_RULES } from "../packages/cortex-kernel/src/registry.js";
import { MECH_KINDS } from "../packages/cortex-kernel/src/types.js";

/** Kinds reachable from `start` under a rule set (plain reachability). */
const reachable = (rules, start) => {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    const k = stack.pop();
    for (const e of rules[k] || []) if (!seen.has(e.to)) { seen.add(e.to); stack.push(e.to); }
  }
  return seen;
};

const reachablePairs = (rules) => {
  let n = 0;
  const impossible = [];
  for (const a of MECH_KINDS) {
    const r = reachable(rules, a);
    for (const b of MECH_KINDS) {
      if (a === b) continue;
      if (r.has(b)) n++; else impossible.push(`${a}>${b}`);
    }
  }
  return { count: n, impossible };
};

const base = reachablePairs(CONV_RULES);

// Every conversion the registry does not already contain is a candidate.
const existing = new Set();
for (const [from, edges] of Object.entries(CONV_RULES)) for (const e of edges) existing.add(`${from}>${e.to}`);

const candidates = [];
for (const from of MECH_KINDS) {
  for (const to of MECH_KINDS) {
    if (from === to || existing.has(`${from}>${to}`)) continue;
    const trial = { ...CONV_RULES, [from]: [...(CONV_RULES[from] || []), { to, op: "hypothetical", auth: "cur", pre: "UNJUSTIFIED — candidate rule under evaluation" }] };
    const after = reachablePairs(trial);
    const unlocked = after.count - base.count;
    if (unlocked > 0) {
      const nowPossible = base.impossible.filter((p) => !after.impossible.includes(p));
      candidates.push({ rule: `${from}>${to}`, from, to, unlockedPairs: unlocked, examples: nowPossible.slice(0, 6) });
    }
  }
}
candidates.sort((a, b) => b.unlockedPairs - a.unlockedPairs || a.rule.localeCompare(b.rule));

const result = {
  artifact: "counterfactual-discovery",
  advisory: true,
  registryPairs: { total: MECH_KINDS.length * (MECH_KINDS.length - 1), reachable: base.count, impossible: base.impossible.length },
  candidates: candidates.slice(0, 15),
  caveat: "A candidate is a STRUCTURAL observation only: it says a rule would increase reachability, never that the conversion is sound. Any addition requires an authority tier, a precondition, and review — see docs/research/frontier-backlog.md.",
};

if (process.argv.includes("--json")) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

console.log("counterfactual discovery — highest-leverage missing conversion rules\n");
console.log(`  registry reaches ${base.count}/${result.registryPairs.total} ordered kind pairs; ${base.impossible.length} are impossible\n`);
for (const c of result.candidates.slice(0, 10)) {
  console.log(`  +${String(c.unlockedPairs).padStart(3)} pairs   ${c.rule}`);
  console.log(`              e.g. ${c.examples.join(", ")}`);
}
console.log(`\n  ${result.caveat}`);
