#!/usr/bin/env node
// Canonicalization vector gate.
//
// Pins the encoding itself, independently of any kernel behavior. A change to
// canonicalize.mjs that alters any vector hash fails here — which is what makes
// canonicalization safe to treat as shared infrastructure across languages.
//
//   node conformance/vectors/verify-vectors.mjs           # verify
//   node conformance/vectors/verify-vectors.mjs --write    # regenerate expectations

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, canonicalize, CanonicalizationError } from "../../test/oracle/canonicalize.mjs";
import { VECTORS, REJECTION_VECTORS, encodeForExport } from "./canonicalization.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "canonicalization.json");
const root = resolve(here, "../..");

const computed = VECTORS.map((v) => ({
  id: v.id,
  note: v.note || null,
  input: encodeForExport(v.value),
  canonical: canonicalize(v.value),
  sha256: sha256(v.value),
}));

// Rejection vectors are behavioral, not hash-bearing: each must throw the
// documented code at the documented path. A value that silently encodes here
// would have collapsed a semantic distinction.
const rejectionResults = REJECTION_VECTORS.map((v) => {
  try { sha256(v.value); return { id: v.id, ok: false, detail: "accepted a value that must be rejected" }; }
  catch (e) {
    if (!(e instanceof CanonicalizationError)) return { id: v.id, ok: false, detail: `threw ${e.name}, not CanonicalizationError` };
    if (e.code !== v.code) return { id: v.id, ok: false, detail: `code ${e.code}, expected ${v.code}` };
    if (e.path !== v.path) return { id: v.id, ok: false, detail: `path "${e.path}", expected "${v.path}"` };
    return { id: v.id, ok: true, code: e.code, path: e.path };
  }
});

const doc = {
  artifact: "canonicalization-vectors",
  canonicalizationVersion: JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8")).canonicalizationVersion,
  spec: "conformance/CANONICALIZATION.md",
  encoding: {
    $undefined: "An object {\"$undefined\": true} in `input` denotes the JavaScript value undefined, which JSON cannot express.",
    $negativeZero: "An object {\"$negativeZero\": true} denotes -0.",
    $nan: "{\"$nan\": true} denotes NaN; $infinity denotes ±Infinity; $bigint denotes a BigInt. These appear only in rejectionPolicy — they are values canonicalization refuses, described rather than embedded because JSON cannot carry them.",
  },
  note: "Each vector's sha256 is over the canonical encoding of its value. An implementation agrees on canonicalization when it reproduces every hash.",
  vectors: computed,
  rejectionPolicy: {
    note: "JSON cannot represent these values. Silently encoding them (JSON.stringify turns NaN and Infinity into null) would collapse semantically distinct states, so canonicalization v1 rejects them with an explicit code and path.",
    rejected: REJECTION_VECTORS.map((v) => ({ id: v.id, input: encodeForExport(v.value), code: v.code, path: v.path })),
  },
};

if (process.argv.includes("--write")) {
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log(`canonicalization vectors written: ${computed.length} vectors`);
  process.exit(0);
}

if (!existsSync(OUT)) { console.error("no vector expectations — run with --write"); process.exit(1); }
const stored = JSON.parse(readFileSync(OUT, "utf8"));
const byId = new Map(stored.vectors.map((v) => [v.id, v]));
const problems = [];

for (const c of computed) {
  const s = byId.get(c.id);
  if (!s) { problems.push(`new vector not in expectations: ${c.id}`); continue; }
  if (s.sha256 !== c.sha256) problems.push(`ENCODING DRIFT ${c.id}\n    expected ${s.sha256}\n    got      ${c.sha256}\n    ${c.note || ""}`);
}
for (const s of stored.vectors) if (!computed.find((c) => c.id === s.id)) problems.push(`vector removed from the suite: ${s.id}`);
if (stored.canonicalizationVersion !== doc.canonicalizationVersion) problems.push(`canonicalizationVersion changed ${stored.canonicalizationVersion} → ${doc.canonicalizationVersion} — this invalidates every stored hash and requires a MAJOR release`);

for (const r of rejectionResults) if (!r.ok) problems.push(`REJECTION ${r.id}: ${r.detail}`);

if (problems.length) {
  console.error("canonicalization vectors FAILED:\n  " + problems.join("\n  "));
  console.error("\nCanonicalization is shared infrastructure: every implementation's hashes depend on it.");
  console.error("If the change is intended, it is a canonicalizationVersion event — see docs/versioning.md.");
  process.exit(1);
}
console.log(`canonicalization vectors OK: ${computed.length} encoding vectors + ${rejectionResults.length} rejection vectors, encoding v${doc.canonicalizationVersion} stable`);
