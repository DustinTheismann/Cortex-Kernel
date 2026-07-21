// Golden-fixture generator.
//
// Reads the FROZEN standalone source (reference/src/cortex-v0.5.1.jsx),
// slices the deterministic kernel definitions out of it verbatim, executes
// them, and writes fixtures/*.json. The fixtures therefore come from the
// reference artifact itself, not from a copy that could drift. Regenerate
// with `npm run golden:regen`; a fixture diff means either the frozen
// artifact changed (forbidden) or this slicer broke — both are blockers.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, "../../../../reference/src/cortex-v0.5.1.jsx");
const src = readFileSync(srcPath, "utf8");

const sliceBetween = (startMarker, endMarker) => {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("start marker not found: " + startMarker);
  const e = src.indexOf(endMarker, s);
  if (e < 0) throw new Error("end marker not found: " + endMarker);
  return src.slice(s, e);
};
const sliceLine = (startMarker) => {
  const s = src.indexOf(startMarker);
  if (s < 0) throw new Error("marker not found: " + startMarker);
  return src.slice(s, src.indexOf("\n", s));
};

// class fields → const declarations
const kindsDecl = "const " + sliceLine("MECH_KINDS = [");
const rulesDecl = "const " + sliceLine("CONV_RULES = {");
// the compiler block: edgeCost … synthTest (everything before the cascade)
const compilerBlock = sliceBetween("const edgeCost =", "// ---------- VERIFICATION CASCADE");
// normalization + literature classification
const normDecl = sliceLine("const normSchema = (s) =>");
const litDecl = sliceLine("const LIT_KNOWN = ");
const classifyDecl = sliceLine("const classifyLit = (count) =>");

const factory = new Function(`
  ${kindsDecl}
  ${rulesDecl}
  ${litDecl}
  ${classifyDecl}
  ${compilerBlock}
  ${normDecl}
  return { MECH_KINDS, CONV_RULES, edgeCost, adaptersFor, pairCompat,
           shapeCompat, unitCompat, licenseCompat, licKey, synthTest,
           normSchema, classifyLit, LIT_KNOWN, LIT_EMERGING };
`);
const K = factory();

const fixtures = join(here, "fixtures");
mkdirSync(fixtures, { recursive: true });
const save = (name, data) => writeFileSync(join(fixtures, name), JSON.stringify(data, null, 1) + "\n");

// 1) every ordered kind pair: full multipath result + pairCompat verdict
const kindPaths = {};
const pairVerdicts = {};
for (const a of K.MECH_KINDS) for (const b of K.MECH_KINDS) {
  kindPaths[a + ">" + b] = K.adaptersFor(a, b, 3);
  pairVerdicts[a + ">" + b] = K.pairCompat({ kind: a }, { kind: b });
}
save("kind-paths.json", kindPaths);
save("pair-compat.json", pairVerdicts);

// 2) edge costs for every registry edge
const costs = {};
for (const [from, edges] of Object.entries(K.CONV_RULES))
  for (const e of edges) costs[from + ">" + e.to + ":" + e.op] = K.edgeCost(e);
save("edge-costs.json", costs);

// 3) shape/unit compatibility over a value matrix
const shapes = ["", "[batch,d]", "[BATCH,D]", "DAG", "dag", "scalar", "[n]", "any", "unspecified", "3x3", "*"];
const units = ["", "probability", "Probability", "dimensionless", "logits", "L2-radius", "seconds"];
const shapeTable = {}, unitTable = {};
for (const x of shapes) for (const y of shapes)
  shapeTable[x + "|" + y] = K.shapeCompat({ shape: x }, { shape: y });
for (const x of units) for (const y of units)
  unitTable[x + "|" + y] = K.unitCompat({ units: x }, { units: y });
save("shape-compat.json", shapeTable);
save("unit-compat.json", unitTable);

// 4) license screening combos
const lics = [null, "MIT", "mit", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "Apache-2.0",
  { spdx_id: "GPL-3.0" }, { key: "agpl-3.0" }, { name: "MIT License" }];
const licTable = [];
for (const a of lics) for (const b of lics)
  licTable.push({ a, b, out: K.licenseCompat(a == null ? {} : { license: a }, b == null ? {} : { license: b }) });
save("license-compat.json", licTable);

// 5) property-test skeletons over representative paths
const synthCases = [
  { po: { kind: "tensor", semantics: "certified radius" }, ci: { kind: "tensor", semantics: "input field" }, path: "tensor>tensor" },
  { po: { kind: "tensor", name: "T" }, ci: { kind: "bound", name: "B" }, path: "tensor>bound" },
  { po: { kind: "graph" }, ci: { kind: "claim" }, path: "graph>claim" },
];
save("synth-test.json", synthCases.map(c => {
  const best = K.pairCompat(c.po, c.ci);
  return { ...c, adapters: (best.adapter || []).map(s => s.op), out: K.synthTest(c.po, c.ci, { adapter: best.adapter || [] }) };
}));

// 6) schema normalization edge cases
const rawSchemas = [
  null, 42, "x", [],
  {},
  { consumes: "nope", produces: [{ name: "p", kind: "tensor", shape: "unspecified", units: "unspecified", semantics: "s" }] },
  { produces: [{ kind: "not-a-kind" }, { kind: "bound", shape: "[n]", units: "L2" }, {}, { kind: "trace" }, { kind: "scalar" }], assumptions: [1, "two"], invariants: null },
];
save("norm-schema.json", rawSchemas.map(s => ({ in: s, out: K.normSchema(s) })));

// 7) literature classification boundaries
save("classify-lit.json", [null, 0, 24, 25, 299, 300, 301].map(c => ({ in: c, out: K.classifyLit(c) })));

console.log("fixtures written to", fixtures);
