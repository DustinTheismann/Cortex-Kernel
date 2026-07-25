// Proof-obligation evaluation and the property-test skeleton, verbatim from
// the frozen source. Grades the chosen path into the ordered PO-1..PO-8
// vector. Kept SEPARATE from contract construction (contracts.js): this module
// consumes the chosen option + its instantiations and produces obligations; it
// never selects paths.
//
// Every detail string is observable and copied character-for-character,
// including the em-dashes, the "⟶" arrow, and the dimensionless caveat.

import { shapeCompat, unitCompat, licenseCompat } from "./compatibility.js";
import { mapSoft } from "./compatibility.js";
import { NULL_TRACER } from "./internal/trace.js";

/** Property-test skeleton (synthTest), verbatim. `best.adapter` is the chain. */
export const synthTest = (po, ci, best) => {
  const chain = (best.adapter || []).map((s) => s.op);
  const expr = chain.length ? chain.reduce((acc, op) => op + "(" + acc + ")", "x") : "x";
  return "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\nproperty('" + po.kind + "→" + ci.kind + " preserves semantics', () => {\n  const x = sample_" + po.kind + "();          // " + (po.semantics || po.name || po.kind) + "\n  const y = " + expr + ";\n  assert isValid_" + ci.kind + "(y);            // " + (ci.semantics || ci.name || ci.kind) + "\n  assert approxPreserves(semantics(x), semantics(y), eps);\n});";
};

/**
 * Build the ordered proof-obligation vector for the chosen path.
 *   input: { po, ci, adapters, inst, unit, soft, srcRepo, dstRepo }
 *     po/ci   — chosen source-output / target-input ports
 *     adapters— chosen adapter chain (steps)
 *     inst    — RuleInstantiations from contracts.instantiateContract
 *     unit    — the option's unit status (uc): "proved"|"unresolved"|"refuted"
 *     soft    — { invariantPreserved, metricMeaningful, note }
 *     srcRepo/dstRepo — repo metadata for license screening
 * Returns the PO array in frozen order (PO-5 splits into PO-5.N when curated).
 */
export const evaluateObligations = ({ po, ci, adapters, inst, unit, soft = {}, srcRepo, dstRepo }, tracer = NULL_TRACER) => {
  const uc = unit;
  const sc = shapeCompat(po, ci);
  const O = [];
  O.push({ id: "PO-1", name: "Kind path", method: "deterministic", status: "PROVED", detail: adapters.length ? (po.kind + " → " + ci.kind + " via " + adapters.map((s) => s.op).join(" → ")) : (po.kind + " ≡ " + ci.kind) });
  O.push({ id: "PO-2", name: "Shape compatibility", method: "deterministic", status: sc.toUpperCase(), detail: (po.shape || "unspecified") + " ⟶ " + (ci.shape || "unspecified") });
  O.push({ id: "PO-3", name: "Unit preservation", method: "deterministic", status: uc.toUpperCase(), detail: (po.units || "unspecified") + " ⟶ " + (ci.units || "unspecified") + (uc === "unresolved" && /dimensionless/i.test((po.units || "") + (ci.units || "")) ? " (dimensionless ≠ dimensional — not auto-proved)" : "") });
  const lc = licenseCompat(srcRepo, dstRepo);
  O.push({ id: "PO-4", name: "License metadata screening", method: "deterministic", status: lc.status === "PROVED" ? "CONDITIONALLY-SATISFIED" : lc.status, detail: lc.detail + (lc.status === "PROVED" ? " (metadata screen only — not a legal proof)" : "") });
  if (inst.length) inst.forEach((x, xi) => O.push({ id: "PO-5." + (xi + 1), name: "Precondition · " + x.op, method: "model-assisted", status: x.status, detail: x.pre }));
  else O.push({ id: "PO-5", name: "Preconditions", method: "deterministic", status: "PROVED", detail: "path is fully axiomatic — no semantic precondition" });
  O.push({ id: "PO-6", name: "Invariant preservation", method: "model-assisted", status: mapSoft(soft.invariantPreserved), detail: adapters.some((s) => (s.lose || []).length) ? ("destroys: " + adapters.flatMap((s) => s.lose || []).join(", ")) : "no properties destroyed on path" });
  O.push({ id: "PO-7", name: "Metric measures outcome", method: "model-assisted", status: mapSoft(soft.metricMeaningful), detail: soft.note || "" });
  if (adapters.some((s) => s.lossy)) O.push({ id: "PO-8", name: "Bounded information loss", method: "deterministic", status: "CONDITIONALLY-SATISFIED", detail: "lossy hops: " + adapters.filter((s) => s.lossy).map((s) => s.op).join(", ") + " — adapter must bound loss" });
  tracer.record({ step: "obligations", ids: O.map((o) => o.id), statuses: O.map((o) => o.status) });
  return O;
};
