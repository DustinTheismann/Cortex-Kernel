import { MECH_KINDS } from "./rules.js";
import type {
  Direction, LitClass, MechanismSchema, PortPair, PortSpec, RepoMeta, TriState,
} from "./types.js";

/** Wildcard-ish shape tokens that satisfy the shape screen. */
const _wild = (s: string): boolean => /[*?]|\bn\b|any|var|dynamic|batch|unspecified/i.test(s || "");

export const shapeCompat = (a: PortSpec, b: PortSpec): TriState => {
  if (!a.shape || !b.shape) return "unresolved";
  const x = a.shape.trim().toLowerCase(), y = b.shape.trim().toLowerCase();
  return (x === y || _wild(x) || _wild(y)) ? "proved" : "unresolved";
};

export const unitCompat = (a: PortSpec, b: PortSpec): TriState => {
  if (!a.units || !b.units) return "unresolved";
  const x = a.units.trim().toLowerCase(), y = b.units.trim().toLowerCase();
  if (x === y) return "proved";
  if (x === "dimensionless" || y === "dimensionless") return "unresolved";
  return "refuted";
};

const COPYLEFT = ["gpl", "agpl", "lgpl"];

export const licKey = (r: RepoMeta | null | undefined): string | null => {
  const l = r && r.license;
  if (!l) return null;
  return String(typeof l === "object" ? (l.spdx_id || l.key || l.name) : l).toLowerCase();
};

export interface LicenseCompat {
  status: "PROVED" | "CONDITIONALLY-SATISFIED" | "UNRESOLVED";
  detail: string;
}

export const licenseCompat = (a: RepoMeta | null | undefined, b: RepoMeta | null | undefined): LicenseCompat => {
  const la = licKey(a), lb = licKey(b);
  if (!la || !lb) return { status: "UNRESOLVED", detail: (la || "?") + " / " + (lb || "?") + " — license metadata absent" };
  const cl = (x: string) => COPYLEFT.some(c => x.includes(c));
  if (cl(la) && cl(lb) && la !== lb) return { status: "CONDITIONALLY-SATISFIED", detail: "distinct copyleft (" + la + "/" + lb + ") — combined distribution needs review" };
  return { status: "PROVED", detail: la + " + " + lb + " combinable" };
};

/**
 * Normalize a raw (model-emitted) schema into the kernel's typed form.
 * Ports are capped at 4 per side; unknown kinds collapse to "claim";
 * "unspecified" shape/units become empty strings. Returns null for
 * non-objects — fail-closed.
 */
export const normSchema = (s: unknown): MechanismSchema | null => {
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const norm = (arr: unknown): PortSpec[] =>
    (Array.isArray(arr) ? arr : []).slice(0, 4).map((p: any) => ({
      name: (p && p.name) || "",
      kind: (p && (MECH_KINDS as readonly string[]).includes(p.kind)) ? p.kind : "claim",
      shape: (p && p.shape && p.shape !== "unspecified") ? String(p.shape) : "",
      units: (p && p.units && p.units !== "unspecified") ? String(p.units) : "",
      semantics: (p && p.semantics) || "",
    }));
  const strs = (arr: unknown): string[] => (Array.isArray(arr) ? arr : []).map(String);
  return {
    consumes: norm(o.consumes), produces: norm(o.produces),
    certifies: strs(o.certifies), assumptions: strs(o.assumptions), invariants: strs(o.invariants),
  };
};

/**
 * All output→input pairings between two schemas, both directions,
 * capped at 24 pairs.
 */
export const portPairsFor = (schemaA: MechanismSchema | null, schemaB: MechanismSchema | null): PortPair[] => {
  const pairs: PortPair[] = [];
  const add = (src: MechanismSchema, dst: MechanismSchema, dir: Direction) =>
    (src.produces || []).forEach(po => (dst.consumes || []).forEach(ci =>
      pairs.push({ dir, sourceOutput: po, targetInput: ci })));
  if (schemaA && schemaB) { add(schemaA, schemaB, "A→B"); add(schemaB, schemaA, "B→A"); }
  return pairs.slice(0, 24);
};

/** OpenAlex paper-count thresholds (v0.5.1 values). */
export const LIT_KNOWN = 300;
export const LIT_EMERGING = 25;

export const classifyLit = (count: number | null | undefined): LitClass =>
  count == null ? "UNVERIFIED" : (count > LIT_KNOWN ? "KNOWN" : (count >= LIT_EMERGING ? "EMERGING" : "UNEXPLORED"));
