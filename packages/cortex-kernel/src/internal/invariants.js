// Internal integrity assertions for the extracted definitions and registry.
//
// These detect CORRUPTION of the extracted v0.5.1 material — a missing kind,
// a duplicate rule id, a conversion whose endpoint is not a known kind. They
// are fail-closed guards, not behavior: they must never fire for valid v0.5.1
// data, and therefore never change valid v0.5.1 output. They exist so that a
// bad edit to the extracted registry is caught loudly rather than silently
// producing a different kernel.

import { RegistryIntegrityError } from "../errors.js";

export const assert = (condition, message) => {
  if (!condition) throw new RegistryIntegrityError(message);
};

/** Assert an array has exactly `n` elements. */
export const assertCount = (arr, n, label) =>
  assert(Array.isArray(arr) && arr.length === n, `${label}: expected exactly ${n}, got ${Array.isArray(arr) ? arr.length : "non-array"}`);

/** Assert there are no duplicates in `arr` (by identity/string). */
export const assertUnique = (arr, label) => {
  const seen = new Set();
  for (const x of arr) {
    if (seen.has(x)) throw new RegistryIntegrityError(`${label}: duplicate ${JSON.stringify(x)}`);
    seen.add(x);
  }
};

/** Assert every value in `arr` is a member of `allowed`. */
export const assertSubset = (arr, allowed, label) => {
  const set = allowed instanceof Set ? allowed : new Set(allowed);
  for (const x of arr) assert(set.has(x), `${label}: ${JSON.stringify(x)} is not an allowed value`);
};
