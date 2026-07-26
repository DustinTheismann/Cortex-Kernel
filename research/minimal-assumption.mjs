#!/usr/bin/env node
// Minimal-assumption path search (frontier #7) — ADVISORY, parity-isolated.
//
// The frozen planner selects by min-RISK. That is one objective among several,
// and it is not obviously the scientifically strongest one. This computes
// alternative rankings over the SAME registry and reports where they disagree
// with the frozen selection — disagreement being the interesting signal.
//
//   fewestAssumptions  — least curated preconditions to discharge
//   weakestAssumptions — prefers axiomatic authority over curated
//   mostReversible     — avoids lossy steps and destroyed properties
//   mostFalsifiable    — most explicit preconditions, i.e. most ways to be wrong
//
// The frozen ranking is never altered; this only ever adds advisory views.
//
//   node research/minimal-assumption.mjs tensor certificate
//   node research/minimal-assumption.mjs --survey

import { adaptersFor } from "../packages/cortex-kernel/src/planner.js";
import { MECH_KINDS } from "../packages/cortex-kernel/src/types.js";

const OBJECTIVES = {
  minRisk: { label: "min-risk (frozen)", score: (p) => p.cost },
  fewestAssumptions: { label: "fewest assumptions", score: (p) => p.path.filter((s) => s.auth === "cur" && s.pre).length },
  weakestAssumptions: { label: "weakest assumptions", score: (p) => p.path.filter((s) => s.auth === "cur").length },
  mostReversible: { label: "most reversible", score: (p) => p.path.filter((s) => s.lossy).length * 2 + p.path.flatMap((s) => s.lose || []).length },
  mostFalsifiable: { label: "most falsifiable", score: (p) => -p.path.filter((s) => s.pre).length },
};

/** Rank a candidate set under each objective. Ties keep planner order (stable). */
export const rankAll = (from, to, k = 8) => {
  const paths = adaptersFor(from, to, k);
  if (!paths.length) return null;
  const views = {};
  for (const [id, o] of Object.entries(OBJECTIVES)) {
    const ranked = paths.map((p, i) => ({ i, chain: p.path.map((s) => s.op), ruleIds: p.path.map((s) => s.ruleId), score: o.score(p), cost: p.cost }))
      .sort((a, b) => a.score - b.score || a.i - b.i);
    views[id] = { label: o.label, best: ranked[0], ranking: ranked };
  }
  return { from, to, candidates: paths.length, views, agrees: Object.values(views).every((v) => v.best.i === views.minRisk.best.i) };
};

const survey = () => {
  const disagreements = [];
  let compared = 0;
  for (const a of MECH_KINDS) for (const b of MECH_KINDS) {
    if (a === b) continue;
    const r = rankAll(a, b);
    if (!r || r.candidates < 2) continue;
    compared++;
    if (!r.agrees) {
      const alt = Object.entries(r.views).filter(([, v]) => v.best.i !== r.views.minRisk.best.i);
      disagreements.push({ pair: `${a}>${b}`, frozen: r.views.minRisk.best.chain.join("→"), alternatives: alt.map(([id, v]) => `${id}: ${v.best.chain.join("→")}`) });
    }
  }
  console.log("minimal-assumption survey — where alternative objectives disagree with min-risk\n");
  console.log(`  ${compared} kind pairs with more than one candidate path; ${disagreements.length} show disagreement\n`);
  for (const d of disagreements.slice(0, 12)) {
    console.log(`  ${d.pair}`);
    console.log(`      frozen (min-risk): ${d.frozen}`);
    for (const a of d.alternatives) console.log(`      ${a}`);
  }
  console.log("\n  Disagreement localizes the load-bearing choice: these are the pairs where");
  console.log("  'cheapest' and 'least assuming' are not the same bridge. Advisory only —");
  console.log("  the frozen selection is unchanged.");
};

if (process.argv.includes("--survey") || process.argv.length < 4) { survey(); }
else {
  const [from, to] = process.argv.slice(2);
  const r = rankAll(from, to);
  if (!r) { console.log(`no path ${from} → ${to}`); process.exit(0); }
  console.log(`path objectives for ${from} → ${to} (${r.candidates} candidates)\n`);
  for (const [id, v] of Object.entries(r.views)) {
    console.log(`  ${v.label.padEnd(22)} ${v.best.chain.join(" → ")}   (score ${v.best.score}, cost ${v.best.cost})`);
  }
  console.log(`\n  objectives agree: ${r.agrees}`);
}
