// The mutation registry — one entry per semantic boundary the corpus claims
// to pin, in the implementation that claims to reproduce it.
//
// Each entry states, in both prose and executable form, what would be wrong if
// the rule were violated:
//
//   rule             the semantic obligation, in words
//   find/replace     the smallest edit to the Rust peer that violates it
//   expectedKillers  the corpus case(s) that must catch it
//   expectedFailure  a symbolic name for the violation, carried into the report
//   assert           a predicate over the MUTANT'S OWN OUTPUT that detects the
//                    predicted violation — this is what separates a real kill
//                    from an incidental hash change
//
// Adding a subsystem here means declaring what its rules are. A subsystem with
// no entry is reported as `not-assessed`, never as "zero mutants survived".

import { EDGE_CORPORA, EDGE_CORPORA_BOUNDARIES } from "../../test/oracle/cases.mjs";

/** Corpus cases each subsystem's mutants may perturb. A mutant that escapes
 *  its scope means the subsystem boundary is not where we think it is. */
export const SUBSYSTEM_SCOPE = {
  "edge-derivation": ["compute-edges", "compute-edges-boundaries"],
};

/** Corpus inputs, so an assertion can reason about what the output SHOULD have
 *  been rather than only about what it is. */
export const CORPUS_INPUTS = {
  "compute-edges": EDGE_CORPORA,
  "compute-edges-boundaries": EDGE_CORPORA_BOUNDARIES,
};

const UBIQUITOUS = new Set(["react", "typescript", "numpy", "requests", "lodash", "express",
  "jest", "pytest", "eslint", "prettier", "webpack", "vite", "axios", "scipy", "pandas"]);

// ---- assertion helpers -----------------------------------------------------
// `out` is { caseId → { corpusName → edge[] } }; `inp` mirrors it with inputs.

const allEdges = (out) => Object.values(out).flatMap((corpora) => Object.values(corpora).flat());
const edgesOf = (out, caseId, corpus) => ((out[caseId] || {})[corpus] || []);
const ofType = (out, type) => allEdges(out).filter((e) => e.type === type);
/** A group's members are the hub (every edge's source) plus every target. */
const hubIsTopStarred = (edges, repos) => {
  if (!edges.length) return true;
  const byId = new Map(repos.map((r) => [r.id, r]));
  const hub = byId.get(edges[0].source);
  if (!hub) return true;
  const members = [hub, ...edges.map((e) => byId.get(e.target))].filter(Boolean);
  return (hub.stars || 0) === Math.max(...members.map((r) => r.stars || 0));
};

export const MUTATIONS = [
  {
    id: "disable-ubiquitous-filter",
    subsystem: "edge-derivation",
    rule: "shared-dependency ignores dependencies too common to carry signal",
    find: " && !UBIQUITOUS.contains(&d.as_str())",
    replace: "",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "UBIQUITOUS_DEPENDENCY_COUNTED_AS_SHARED",
    assert: (out) => ofType(out, "shared-dependency")
      .some((e) => e.evidence.replace(/^deps: /, "").split(", ").some((d) => UBIQUITOUS.has(d))),
  },
  {
    id: "permit-self-edges",
    subsystem: "edge-derivation",
    rule: "readme-reference never links a repository to itself by name",
    find: "if *bn != a.name {",
    replace: "if true {",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "SELF_EDGE_EMITTED",
    assert: (out) => allEdges(out).some((e) => e.source === e.target),
  },
  {
    id: "ascending-star-order",
    subsystem: "edge-derivation",
    rule: "a group hub is its highest-starred member",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "a.stars.partial_cmp(&b.stars).unwrap()",
    expectedKillers: ["compute-edges", "compute-edges-boundaries"],
    expectedFailure: "GROUP_HUB_IS_NOT_TOP_STARRED",
    assert: (out, inp) => Object.entries(out).some(([caseId, corpora]) =>
      Object.entries(corpora).some(([name, edges]) => {
        const repos = (inp[caseId] || {})[name];
        return repos ? ["shared-topic", "naming-family", "shared-language"]
          .some((t) => !hubIsTopStarred(edges.filter((e) => e.type === t), repos)) : false;
      })),
  },
  {
    id: "unstable-tie-ordering",
    subsystem: "edge-derivation",
    rule: "equal-star members keep corpus order — the sort must be stable",
    find: "b.stars.partial_cmp(&a.stars).unwrap()",
    replace: "b.stars.partial_cmp(&a.stars).unwrap().then(b.id.cmp(&a.id))",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "TIED_MEMBERS_REORDERED",
    // z1/z2/z3 all hold 5 stars, so the hub must be z1 — first in corpus order.
    assert: (out) => {
      const e = edgesOf(out, "compute-edges-boundaries", "star-ties");
      return e.length > 0 && e[0].source !== "z1";
    },
  },
  {
    id: "widen-language-bound",
    subsystem: "edge-derivation",
    rule: "shared-language is a weak signal, so groups above 14 members are skipped entirely",
    find: "g.len() > 14",
    replace: "g.len() > 15",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "OVERSIZED_LANGUAGE_GROUP_LINKED",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "language-group-over-bound").length > 0,
  },
  {
    id: "widen-family-bound",
    subsystem: "edge-derivation",
    rule: "naming-family groups above 30 members are skipped entirely",
    find: "g.len() > 30",
    replace: "g.len() > 31",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "OVERSIZED_FAMILY_GROUP_LINKED",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "family-group-over-bound").length > 0,
  },
  {
    id: "lower-shared-dep-floor",
    subsystem: "edge-derivation",
    rule: "shared-dependency requires at least two shared non-ubiquitous dependencies",
    find: "sd.len() >= 2",
    replace: "sd.len() >= 1",
    expectedKillers: ["compute-edges", "compute-edges-boundaries"],
    expectedFailure: "SINGLE_SHARED_DEPENDENCY_ACCEPTED",
    assert: (out) => ofType(out, "shared-dependency").some((e) => e.weight < 2),
  },
  {
    id: "drop-family-length-guard",
    subsystem: "edge-derivation",
    rule: "a family token shorter than two characters forms no family",
    find: "f.chars().count() < 2",
    replace: "f.chars().count() < 1",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "SINGLE_CHARACTER_FAMILY_LINKED",
    assert: (out) => ofType(out, "naming-family")
      .some((e) => (e.evidence.match(/^naming family: (.*)-\*$/) || [, ""])[1].length < 2),
  },
  {
    id: "raise-topic-hub-cap",
    subsystem: "edge-derivation",
    rule: "a shared-topic group is truncated to its top 60 members — 61 members yield 59 edges",
    find: ".take(60)",
    replace: ".take(61)",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "TOPIC_GROUP_EXCEEDS_HUB_CAP",
    assert: (out) => edgesOf(out, "compute-edges-boundaries", "topic-hub-cap").length > 59,
  },
  {
    id: "dedup-on-wrong-key",
    subsystem: "edge-derivation",
    rule: "the name→id index is keyed by name, and a later repository wins",
    find: "find(|(n, _)| *n == r.name.as_str())",
    replace: "find(|(n, _)| *n == r.id.as_str())",
    expectedKillers: ["compute-edges-boundaries"],
    expectedFailure: "NAME_INDEX_RESOLVED_TO_WRONG_REPOSITORY",
    // dup-a and dup-b are both named "same"; dup-c mentions "same", so exactly
    // one edge must result and it must target dup-b, the later one.
    assert: (out) => {
      const e = edgesOf(out, "compute-edges-boundaries", "duplicate-names");
      return e.length !== 1 || e[0].target !== "dup-b";
    },
  },
];
