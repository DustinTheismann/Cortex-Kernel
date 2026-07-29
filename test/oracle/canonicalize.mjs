// Canonicalization for oracle fixtures — deliberately narrow.
//
// The golden hash must be stable across runs and machines, yet must NOT
// erase behavior. It is the contract's most safety-critical file, so its
// scope is fixed and small.
//
// ALLOWED normalization:
//   - object-key ordering (encoding only; arrays untouched);
//   - exclusion of transient timestamps;
//   - replacement of nondeterministic generated identifiers (uid()-minted);
//   - consistent representation of `undefined` (a sentinel — never dropped,
//     never turned into null);
//   - stable numeric formatting (normalize -0 to 0).
//
// FORBIDDEN normalization:
//   - sorting arrays whose order reflects path preference / obligation order;
//   - collapsing alternate paths or deduplicating outputs;
//   - changing absent values into null (absence is preserved as absence);
//   - rewriting verdict text or normalizing away contradictory states.
//
// Every field that could influence downstream interpretation is preserved.

import { createHash } from "node:crypto";

export const CANONICALIZATION_VERSION = 1;

/**
 * Numbers JSON cannot represent are REJECTED, never silently encoded.
 *
 * JSON.stringify turns NaN and ±Infinity into `null`, which would collapse
 * three semantically distinct states into the one value already used for
 * "explicitly null". Sentinel-encoding them instead would widen the semantic
 * domain, which is a canonicalizationVersion event — so v1 rejects.
 *
 * Integers outside the JavaScript safe range are rejected for the same reason:
 * they cannot round-trip through a double without silently changing value, so
 * two distinct inputs could canonicalize identically. A schema that needs them
 * must encode them as strings.
 *
 * This is a tightening of previously-undefined behavior, not a change to any
 * defined one: no value in the corpus is affected, and every stored hash is
 * unchanged. It therefore stays canonicalization v1.
 */
export class CanonicalizationError extends Error {
  constructor(code, path, detail) {
    super(`${code} at ${path || "(root)"}: ${detail}`);
    this.name = "CanonicalizationError";
    this.code = code;
    this.path = path || "(root)";
  }
}

const UNSUPPORTED_NUMBER = "CANONICALIZATION_UNSUPPORTED_NUMBER";

const checkNumber = (v, path) => {
  if (Number.isNaN(v)) throw new CanonicalizationError(UNSUPPORTED_NUMBER, path, "NaN has no JSON representation");
  if (!Number.isFinite(v)) throw new CanonicalizationError(UNSUPPORTED_NUMBER, path, `${v > 0 ? "Infinity" : "-Infinity"} has no JSON representation`);
  if (Number.isInteger(v) && !Number.isSafeInteger(v)) {
    throw new CanonicalizationError(UNSUPPORTED_NUMBER, path, `integer ${v} is outside the safe range (|n| <= 2^53-1) and cannot round-trip; encode it as a string`);
  }
};

// Distinguishes "present with value undefined" from null and from absent.
export const UNDEFINED_SENTINEL = "␀undefined"; // ␀undefined

// Keys whose values are wall-clock/nondeterministic; dropped wherever they appear.
const NONDETERMINISTIC_KEYS = new Set([
  "at", "generatedAt", "preregAt", "evaluatedAt", "lastUpdatedAt",
]);

// uid()-minted transient id schemes; the id VALUE is replaced with a stable
// placeholder so two runs agree while the scheme (which is behavior) survives.
const TRANSIENT_ID = /^(cand|prereg|cal|note|synth|link|neg|mech):/;
const isTransientIdKey = (key) => key === "id" || key === "preregId" || /Id$/.test(key);
const transientScheme = (val) => (typeof val === "string" && TRANSIENT_ID.test(val)) ? val.split(":")[0] + ":<id>" : null;

/**
 * Structural copy with object keys sorted, arrays preserved in order,
 * timestamps dropped, transient ids replaced by a scheme placeholder, and
 * `undefined` values represented by a sentinel. Absent keys stay absent.
 */
export const canonicalize = (value) => {
  const walk = (v, path) => {
    if (v === undefined) return UNDEFINED_SENTINEL;
    if (v === null) return null; // preserved distinct from undefined and absent
    if (typeof v === "bigint") throw new CanonicalizationError(UNSUPPORTED_NUMBER, path, "BigInt has no JSON representation; encode it as a string");
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`)); // ORDER PRESERVED — never sort
    if (typeof v === "object") {
      const out = {};
      // Keys sort by UTF-16 code unit (the default of Array.prototype.sort on
      // strings), NOT by locale or code point — see CANONICALIZATION.md §2.3.
      for (const k of Object.keys(v).sort()) {
        if (NONDETERMINISTIC_KEYS.has(k)) continue; // exclude timestamps
        const raw = v[k];
        const child = path ? `${path}.${k}` : k;
        const scheme = isTransientIdKey(k) ? transientScheme(raw) : null;
        out[k] = scheme !== null ? scheme : walk(raw, child);
      }
      return out;
    }
    if (typeof v === "number") { checkNumber(v, path); return Object.is(v, -0) ? 0 : v; }
    return v; // string | boolean
  };
  return walk(value, "");
};

/** Canonical JSON encoding used as the hash preimage. */
export const stableStringify = (value) => JSON.stringify(canonicalize(value));

/** Pretty canonical JSON written to fixture files. */
export const canonicalPretty = (value) => JSON.stringify(canonicalize(value), null, 2) + "\n";

/** sha256 of the canonical encoding. */
export const sha256 = (value) => createHash("sha256").update(stableStringify(value)).digest("hex");
