// Leaf compatibility predicates and the soft-judgment mapping, verbatim from
// the frozen source. These are the deterministic, planner-independent checks
// (shape / unit / license) plus mapSoft. The structural pair verdict
// (pairCompat / evaluateCompatibility) depends on path search and therefore
// lives with the planner.
//
// Return vocabularies are the frozen ones exactly ("proved" / "unresolved" /
// "refuted" lowercase here; obligations upper-case them). Reason strings are
// observable and copied character-for-character.

import { SOFT_STATUS_MAP, MECH_KINDS } from "./types.js";

/**
 * Normalize a raw mechanism schema (normSchema), verbatim. Non-objects → null.
 * Each port list is capped at 4; unknown kinds fail-close to "claim";
 * "unspecified" shape/units collapse to "". Non-array meta fields → [].
 */
export const normSchema = (s) => {
  if (!s || typeof s !== "object") return null;
  const norm = (arr) => (Array.isArray(arr) ? arr : []).slice(0, 4).map((p) => ({
    name: (p && p.name) || "",
    kind: (p && MECH_KINDS.includes(p.kind)) ? p.kind : "claim",
    shape: (p && p.shape && p.shape !== "unspecified") ? String(p.shape) : "",
    units: (p && p.units && p.units !== "unspecified") ? String(p.units) : "",
    semantics: (p && p.semantics) || "",
  }));
  const strs = (arr) => (Array.isArray(arr) ? arr : []).map(String);
  return { consumes: norm(s.consumes), produces: norm(s.produces), certifies: strs(s.certifies), assumptions: strs(s.assumptions), invariants: strs(s.invariants) };
};

// wildcard/underspecified shape tokens
const _wild = (s) => /[*?]|\bn\b|any|var|dynamic|batch|unspecified/i.test(s || "");

/** Shape compatibility: unresolved if either absent; proved on match or wildcard. */
export const shapeCompat = (a, b) => {
  if (!a.shape || !b.shape) return "unresolved";
  const x = a.shape.trim().toLowerCase(), y = b.shape.trim().toLowerCase();
  return (x === y || _wild(x) || _wild(y)) ? "proved" : "unresolved";
};

/** Unit preservation: proved on match; dimensionless is unresolved; else refuted. */
export const unitCompat = (a, b) => {
  if (!a.units || !b.units) return "unresolved";
  const x = a.units.trim().toLowerCase(), y = b.units.trim().toLowerCase();
  if (x === y) return "proved";
  if (x === "dimensionless" || y === "dimensionless") return "unresolved";
  return "refuted";
};

const COPYLEFT = ["gpl", "agpl", "lgpl"];

/** License identifier from a repo's `license` (string | {spdx_id|key|name}). */
export const licKey = (r) => {
  const l = r && r.license;
  if (!l) return null;
  return String(typeof l === "object" ? (l.spdx_id || l.key || l.name) : l).toLowerCase();
};

/** License metadata screening (never a legal proof). */
export const licenseCompat = (a, b) => {
  const la = licKey(a), lb = licKey(b);
  if (!la || !lb) return { status: "UNRESOLVED", detail: (la || "?") + " / " + (lb || "?") + " — license metadata absent" };
  const cl = (x) => COPYLEFT.some((c) => x.includes(c));
  if (cl(la) && cl(lb) && la !== lb) return { status: "CONDITIONALLY-SATISFIED", detail: "distinct copyleft (" + la + "/" + lb + ") — combined distribution needs review" };
  return { status: "PROVED", detail: la + " + " + lb + " combinable" };
};

/**
 * Soft-judgment vocabulary → obligation status (mapSoft), fail-closed:
 * anything unrecognized (including undefined) becomes UNRESOLVED.
 */
export const mapSoft = (v) => SOFT_STATUS_MAP[v] || "UNRESOLVED";
