// Canonicalization for oracle fixtures.
//
// The golden hash must be stable across runs and machines, yet must NOT
// erase behavior. Two rules from the extraction contract are load-bearing
// here:
//   1. Semantically meaningful array order is preserved verbatim — arrays
//      are never sorted or de-duplicated. Obligation vectors, multipath
//      option rankings, and adapter chains are ordered decisions.
//   2. Only genuinely nondeterministic values are removed — wall-clock
//      timestamps and transient generated ids (uid()-derived: prereg:*,
//      cand:*, cal:*, note:*, synth:*, link:*, neg:*, mech:*). Deterministic
//      ids such as ruleId ("tensor>distribution:normalize") are kept.
//
// Object keys are sorted only to make the JSON encoding canonical; this
// does not touch arrays and therefore does not alter any ordered decision.

import { createHash } from "node:crypto";

// Keys whose values are wall-clock/nondeterministic; dropped wherever they appear.
const NONDETERMINISTIC_KEYS = new Set([
  "at", "generatedAt", "preregAt", "evaluatedAt", "lastUpdatedAt", "preregId",
]);

// uid()-minted transient ids: a known scheme-prefix followed by a base36 blob.
const TRANSIENT_ID = /^(cand|prereg|cal|note|synth|link|neg|mech):/;

const isTransientId = (key, val) =>
  (key === "id" || /Id$/.test(key)) && typeof val === "string" && TRANSIENT_ID.test(val);

/**
 * Return a structural copy with object keys sorted, arrays preserved in
 * order, and nondeterministic fields removed. `ruleId` and other stable
 * ids survive; only timestamps and uid()-minted ids are stripped.
 */
export const canonicalize = (value) => {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk); // ORDER PRESERVED — never sort
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v).sort()) {
        if (NONDETERMINISTIC_KEYS.has(k)) continue;
        if (isTransientId(k, v[k])) continue;
        out[k] = walk(v[k]);
      }
      return out;
    }
    return v; // scalars: string | number | boolean | null
  };
  return walk(value);
};

/** Canonical JSON encoding used as the hash preimage. */
export const stableStringify = (value) => JSON.stringify(canonicalize(value));

/** Pretty canonical JSON written to fixture files (stable key order). */
export const canonicalPretty = (value) => JSON.stringify(canonicalize(value), null, 2) + "\n";

/** sha256 of the canonical encoding. */
export const sha256 = (value) => createHash("sha256").update(stableStringify(value)).digest("hex");
