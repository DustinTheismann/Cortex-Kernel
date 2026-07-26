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
import { sha256, canonicalize } from "../../test/oracle/canonicalize.mjs";
import { VECTORS, encodeForExport } from "./canonicalization.mjs";

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

const doc = {
  artifact: "canonicalization-vectors",
  canonicalizationVersion: JSON.parse(readFileSync(join(root, "test/golden/manifest.json"), "utf8")).canonicalizationVersion,
  spec: "conformance/CANONICALIZATION.md",
  encoding: {
    $undefined: "An object {\"$undefined\": true} in `input` denotes the JavaScript value undefined, which JSON cannot express.",
    $negativeZero: "An object {\"$negativeZero\": true} denotes -0.",
  },
  note: "Each vector's sha256 is over the canonical encoding of its value. An implementation agrees on canonicalization when it reproduces every hash.",
  vectors: computed,
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

if (problems.length) {
  console.error("canonicalization vectors FAILED:\n  " + problems.join("\n  "));
  console.error("\nCanonicalization is shared infrastructure: every implementation's hashes depend on it.");
  console.error("If the change is intended, it is a canonicalizationVersion event — see docs/versioning.md.");
  process.exit(1);
}
console.log(`canonicalization vectors OK: ${computed.length} vectors, encoding v${doc.canonicalizationVersion} stable`);
