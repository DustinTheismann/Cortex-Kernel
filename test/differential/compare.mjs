// Differential comparator — built before extraction (Phase 1) so Phase 2 has
// a ready gate. Given two canonical decisions (A = frozen oracle, B =
// extracted kernel) it reports, in order of legibility:
//
//   1. field-level structural diff  (added / removed / changed leaf paths)
//   2. ordered-array diff           (element-wise, order-significant)
//   3. semantic-invariant diff      (which invariants B violates that A did not)
//   4. sha256 comparison            (the bottom-line equality)
//
// A hash mismatch therefore yields a readable field-level explanation, never
// just "two different hashes".
//
// Library:  import { compareDecisions } from ".../compare.mjs"
// CLI:      node test/differential/compare.mjs <fixtureA.json> <fixtureB.json>
//           (compares the `output` of each fixture, or the whole file if no `output`)

import { readFileSync } from "node:fs";
import { canonicalize, sha256, stableStringify } from "../oracle/canonicalize.mjs";
import { checkDecision } from "../oracle/invariants.mjs";

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// Walk two canonicalized values, emitting leaf-level differences with paths.
const structuralDiff = (a, b, path = "", out = []) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ kind: "array-added", path: `${path}[${i}]`, b: b[i] });
      else if (i >= b.length) out.push({ kind: "array-removed", path: `${path}[${i}]`, a: a[i] });
      else structuralDiff(a[i], b[i], `${path}[${i}]`, out);
    }
  } else if (isObj(a) && isObj(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in a)) out.push({ kind: "added", path: p, b: b[k] });
      else if (!(k in b)) out.push({ kind: "removed", path: p, a: a[k] });
      else structuralDiff(a[k], b[k], p, out);
    }
  } else if (stableStringify(a) !== stableStringify(b)) {
    // distinguish array-length/order changes for arrays vs scalar changes
    const kind = Array.isArray(a) !== Array.isArray(b) ? "type-changed" : "changed";
    out.push({ kind, path: path || "(root)", a, b });
  }
  return out;
};

// Order-significant array diffs: report arrays whose element order/length
// differs, since array order encodes path preference and obligation order.
const orderedArrayDiff = (a, b, path = "", out = []) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push({ path: path || "(root)", reason: `length ${a.length} → ${b.length}` });
    else for (let i = 0; i < a.length; i++) {
      if (stableStringify(a[i]) !== stableStringify(b[i])) out.push({ path: `${path}[${i}]`, reason: "element differs (order-significant)" });
      orderedArrayDiff(a[i], b[i], `${path}[${i}]`, out);
    }
  } else if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (k in b) orderedArrayDiff(a[k], b[k], path ? `${path}.${k}` : k, out);
  }
  return out;
};

export const compareDecisions = (rawA, rawB) => {
  const a = canonicalize(rawA), b = canonicalize(rawB);
  const hashA = sha256(rawA), hashB = sha256(rawB);
  const structural = structuralDiff(a, b);
  const ordered = orderedArrayDiff(a, b);
  const invA = checkDecision(rawA), invB = checkDecision(rawB);
  const newViolations = invB.filter((x) => !invA.includes(x));
  return { equal: hashA === hashB, hashA, hashB, structural, ordered, invariantRegressions: newViolations };
};

export const formatReport = (r) => {
  if (r.equal) return `MATCH  sha256 ${r.hashA}`;
  const lines = [`MISMATCH`, `  A sha256 ${r.hashA}`, `  B sha256 ${r.hashB}`];
  if (r.structural.length) {
    lines.push(`  field-level differences (${r.structural.length}):`);
    for (const d of r.structural.slice(0, 40)) {
      if (d.kind === "changed" || d.kind === "type-changed") lines.push(`    ~ ${d.path}: ${JSON.stringify(d.a)} → ${JSON.stringify(d.b)}`);
      else if (d.kind === "added" || d.kind === "array-added") lines.push(`    + ${d.path}: ${JSON.stringify(d.b)} (only in B)`);
      else lines.push(`    - ${d.path}: ${JSON.stringify(d.a)} (only in A)`);
    }
    if (r.structural.length > 40) lines.push(`    … ${r.structural.length - 40} more`);
  }
  if (r.ordered.length) {
    lines.push(`  ordered-array differences (${r.ordered.length}):`);
    for (const d of r.ordered.slice(0, 20)) lines.push(`    ! ${d.path}: ${d.reason}`);
  }
  if (r.invariantRegressions.length) {
    lines.push(`  semantic-invariant regressions (present in B, not A):`);
    for (const x of r.invariantRegressions) lines.push(`    × ${x}`);
  }
  return lines.join("\n");
};

// ---- CLI ------------------------------------------------------------------

const asDecision = (file) => {
  const j = JSON.parse(readFileSync(file, "utf8"));
  return j && typeof j === "object" && "output" in j ? j.output : j;
};

const args = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.length !== 2) { console.error("usage: node test/differential/compare.mjs <fixtureA.json> <fixtureB.json>"); process.exit(2); }
  const r = compareDecisions(asDecision(args[0]), asDecision(args[1]));
  console.log(formatReport(r));
  process.exit(r.equal ? 0 : 1);
}
