import type { AdapterStep, PortSpec } from "./types.js";

/**
 * Generated property-test skeleton (unexecuted in-artifact — a RunPack for
 * a real backend). String output is byte-identical to the standalone's.
 */
export const synthTest = (po: PortSpec, ci: PortSpec, adapters: AdapterStep[]): string => {
  const chain = (adapters || []).map(s => s.op);
  const expr = chain.length ? chain.reduce((acc, op) => op + "(" + acc + ")", "x") : "x";
  return "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\nproperty('" + po.kind + "→" + ci.kind + " preserves semantics', () => {\n  const x = sample_" + po.kind + "();          // " + (po.semantics || po.name || po.kind) + "\n  const y = " + expr + ";\n  assert isValid_" + ci.kind + "(y);            // " + (ci.semantics || ci.name || ci.kind) + "\n  assert approxPreserves(semantics(x), semantics(y), eps);\n});";
};
