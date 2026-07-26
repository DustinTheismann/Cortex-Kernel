#!/usr/bin/env node
// Differential fuzzing — frozen oracle vs extracted kernel.
//
// The golden corpus pins 41 points in an infinite input space. This generates
// inputs across that space and runs BOTH implementations on each, comparing
// canonical decision hashes. It is the bridge from "41 fixed points agree" to
// "the implementations agree wherever we can look".
//
// Deterministic by construction: a seeded PRNG, so a divergence is always
// reproducible via --seed. Divergences are reported with the field-level
// differential comparator, never as bare hashes.
//
//   node test/differential/fuzz.mjs                    # default seed, 500 cases
//   node test/differential/fuzz.mjs --cases=5000       # deeper sweep
//   node test/differential/fuzz.mjs --seed=12345       # reproduce a divergence
//
// Coverage of the generated space is reported so the sweep cannot silently
// degenerate into 500 trivially-identical cases.

import { runCascade, projectDecision } from "../oracle/adapter.mjs";
import { sha256 } from "../oracle/canonicalize.mjs";
import { compareDecisions, formatReport } from "./compare.mjs";
import { evaluateCascade } from "../../packages/cortex-kernel/src/index.js";
import { planPortBridges } from "../../packages/cortex-kernel/src/planner.js";
import { normSchema } from "../../packages/cortex-kernel/src/compatibility.js";
import { MECH_KINDS } from "../../packages/cortex-kernel/src/types.js";

// ---- deterministic PRNG (mulberry32) -------------------------------------
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- generators -----------------------------------------------------------
const SHAPES = ["", "unspecified", "[batch,d]", "[n]", "DAG", "scalar", "3x3", "any", "*", "weird shape"];
const UNITS = ["", "unspecified", "probability", "dimensionless", "logits", "L2-radius", "seconds", "meters"];
const SEMANTICS = ["", "certified L2 radius", "input field", "observable quantity", "a claim"];
const LICENSES = [undefined, "MIT", "GPL-3.0", "AGPL-3.0", "Apache-2.0", { spdx_id: "LGPL-2.1" }, { key: "mit" }];
const SOFT = ["satisfied", "conditional", "violated", "unknown", undefined, "garbage-value"];
const LIT_COUNTS = [null, 0, 24, 25, 26, 299, 300, 301, 5000];

const make = (r) => {
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const port = () => ({
    name: pick(["", "p", "port-1"]),
    kind: pick(MECH_KINDS),
    shape: pick(SHAPES),
    units: pick(UNITS),
    semantics: pick(SEMANTICS),
  });
  const ports = (max) => Array.from({ length: Math.floor(r() * (max + 1)) }, port);
  const schema = () => (r() < 0.08 ? null : {
    produces: ports(3),
    consumes: ports(3),
    certifies: r() < 0.5 ? [] : ["c"],
    assumptions: r() < 0.5 ? [] : ["assumption-x", "assumption-y"],
    invariants: r() < 0.5 ? [] : ["invariant-y"],
  });
  const repo = (id) => { const l = pick(LICENSES); return l === undefined ? { id } : { id, license: l }; };
  const model = () => {
    const m = {};
    if (r() < 0.75) m.pre = pick(SOFT);
    if (r() < 0.4) m.invariant = pick(SOFT);
    if (r() < 0.4) m.metric = pick(SOFT);
    if (r() < 0.15) m.note = "a note";
    return m;
  };
  return {
    schemaA: schema(), schemaB: schema(),
    repoA: repo("repoA"), repoB: repo("repoB"),
    model: model(),
    litGround: r() < 0.5,
    litCount: pick(LIT_COUNTS),
  };
};

// Resolve the model policy into per-ruleId soft evidence exactly as the frozen
// soft-judgment call is answered (over the planned top-3 options).
const resolveSoft = (schemaA, schemaB, model = {}) => {
  const { options } = planPortBridges(normSchema(schemaA), normSchema(schemaB));
  const preconditions = {};
  options.forEach((o) => o.adapters.forEach((s) => {
    if (s.auth === "cur" && s.pre) preconditions[s.ruleId] = (model.preOverrides && model.preOverrides[s.ruleId]) || model.pre || "unknown";
  }));
  return { preconditions, invariantPreserved: model.invariant || "unknown", metricMeaningful: model.metric || "unknown", note: model.note || "" };
};

// ---- run ------------------------------------------------------------------
const argNum = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.slice(name.length + 3)) : dflt;
};

const main = async () => {
  const seed = argNum("seed", 20260726);
  const cases = argNum("cases", 500);
  const r = rng(seed);

  const seen = { stages: new Set(), codes: new Set(), litClasses: new Set(), blockReasons: new Set(), verdicts: new Set(), prize: 0, po8: 0, po4nonUnresolved: 0, pruned: 0 };
  const divergences = [];

  for (let i = 0; i < cases; i++) {
    const g = make(r);
    const oracleResult = await runCascade({ schemaA: g.schemaA, schemaB: g.schemaB, repoA: g.repoA, repoB: g.repoB, model: g.model, litGround: g.litGround, litCount: g.litCount });
    const oracleDecision = projectDecision(oracleResult);

    const kernelDecision = evaluateCascade({
      schemaA: g.schemaA, schemaB: g.schemaB, repoA: g.repoA, repoB: g.repoB,
      soft: resolveSoft(g.schemaA, g.schemaB, g.model),
      litGround: g.litGround, litCount: g.litCount,
    });

    // observed-space accounting
    seen.stages.add(oracleDecision.stage);
    if (oracleDecision.impossibility) seen.codes.add(oracleDecision.impossibility.code);
    if (oracleDecision.litClass) seen.litClasses.add(oracleDecision.litClass);
    if (oracleDecision.blockReason) seen.blockReasons.add(oracleDecision.blockReason);
    if (oracleDecision.typeCheck) seen.verdicts.add(oracleDecision.typeCheck.verdict);
    if (oracleDecision.prizeCandidate) seen.prize++;
    if ((oracleDecision.obligations || []).some((o) => o.id === "PO-8")) seen.po8++;
    if ((oracleDecision.obligations || []).some((o) => o.id === "PO-4" && o.status !== "UNRESOLVED")) seen.po4nonUnresolved++;
    if (oracleDecision.mechCompat && oracleDecision.mechCompat.prunedPaths > 0) seen.pruned++;

    if (sha256(oracleDecision) !== sha256(kernelDecision)) {
      divergences.push({ index: i, input: g, report: formatReport(compareDecisions(oracleDecision, kernelDecision)) });
      if (divergences.length >= 3) break; // enough to diagnose
    }
  }

  console.log(`differential fuzz — seed ${seed}, ${cases} cases`);
  console.log(`  stages observed:      ${[...seen.stages].sort().join(", ")}`);
  console.log(`  impossibility codes:  ${[...seen.codes].sort().join(", ") || "(none)"}`);
  console.log(`  literature classes:   ${[...seen.litClasses].sort().join(", ") || "(none)"}`);
  console.log(`  block reasons:        ${[...seen.blockReasons].sort().join(", ") || "(none)"}`);
  console.log(`  typeCheck verdicts:   ${[...seen.verdicts].sort().join(", ")}`);
  console.log(`  prize candidates: ${seen.prize} · PO-8 lossy: ${seen.po8} · PO-4 resolved: ${seen.po4nonUnresolved} · pruned-path cases: ${seen.pruned}`);

  if (divergences.length) {
    console.error(`\nDIVERGENCE: ${divergences.length} case(s) where the extracted kernel disagrees with the frozen oracle.`);
    for (const d of divergences) {
      console.error(`\n--- case #${d.index} (reproduce: --seed=${seed} --cases=${d.index + 1}) ---`);
      console.error("input: " + JSON.stringify(d.input));
      console.error(d.report);
    }
    process.exit(1);
  }
  console.log(`\nOK: oracle and kernel agree on all ${cases} generated cases.`);
};

await main();
