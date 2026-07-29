//! Rust implementation of the deterministic v0.5.1 Cortex kernel core.
//!
//! This is a PEER implementation, not a port of the JavaScript: it is written
//! against the same frozen semantics and is certified by reproducing the same
//! conformance corpus hashes. If it disagrees with the corpus, it is wrong —
//! the corpus is the specification.
//!
//! Conformance protocol: `cortex-conformance <case-id>` prints the JSON payload
//! for that case on stdout. The verifier canonicalizes and hashes it, so key
//! order and number formatting here are irrelevant; only values matter.
//!
//! Dependency-free by design (hand-rolled JSON writer) so it builds offline.

use std::fmt::Write as _;

// ---------------------------------------------------------------- JSON value

#[derive(Clone)]
enum J {
    Null,
    B(bool),
    N(f64),
    S(String),
    A(Vec<J>),
    O(Vec<(String, J)>),
}

impl J {
    fn s(v: &str) -> J { J::S(v.to_string()) }
    fn write(&self, out: &mut String) {
        match self {
            J::Null => out.push_str("null"),
            J::B(b) => out.push_str(if *b { "true" } else { "false" }),
            J::N(n) => {
                if n.fract() == 0.0 && n.abs() < 1e15 { let _ = write!(out, "{}", *n as i64); }
                else { let _ = write!(out, "{}", n); }
            }
            J::S(s) => {
                out.push('"');
                for c in s.chars() {
                    match c {
                        '"' => out.push_str("\\\""),
                        '\\' => out.push_str("\\\\"),
                        '\n' => out.push_str("\\n"),
                        '\r' => out.push_str("\\r"),
                        '\t' => out.push_str("\\t"),
                        c if (c as u32) < 0x20 => { let _ = write!(out, "\\u{:04x}", c as u32); }
                        c => out.push(c),
                    }
                }
                out.push('"');
            }
            J::A(items) => {
                out.push('[');
                for (i, it) in items.iter().enumerate() { if i > 0 { out.push(','); } it.write(out); }
                out.push(']');
            }
            J::O(entries) => {
                out.push('{');
                for (i, (k, v)) in entries.iter().enumerate() {
                    if i > 0 { out.push(','); }
                    J::S(k.clone()).write(out);
                    out.push(':');
                    v.write(out);
                }
                out.push('}');
            }
        }
    }
    fn to_json(&self) -> String { let mut s = String::new(); self.write(&mut s); s }
}

fn obj(pairs: Vec<(&str, J)>) -> J { J::O(pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()) }

// ------------------------------------------------------------------ registry

/// A conversion rule. `Option` fields record PRESENCE, which is observable in
/// the exported registry — an absent `lossy` is not the same as `lossy: false`.
#[derive(Clone)]
struct Rule {
    to: &'static str,
    op: &'static str,
    auth: Option<&'static str>,
    pre: Option<&'static str>,
    lossy: Option<bool>,
    lose: Option<&'static [&'static str]>,
}

const fn r(
    to: &'static str, op: &'static str, auth: Option<&'static str>,
    pre: Option<&'static str>, lossy: Option<bool>, lose: Option<&'static [&'static str]>,
) -> Rule { Rule { to, op, auth, pre, lossy, lose } }

const AX: Option<&'static str> = Some("ax");
const CUR: Option<&'static str> = Some("cur");

const MECH_KINDS: [&str; 16] = [
    "tensor", "scalar", "distribution", "graph", "subgraph", "bound", "certificate",
    "proof_term", "constraint_set", "optimization_problem", "program", "trace",
    "dataset", "policy", "claim", "measurement",
];

/// Ordered exactly as the frozen CONV_RULES: source-kind order and rule order
/// both feed the planner's enumeration and tie-breaks.
fn conv_rules() -> Vec<(&'static str, Vec<Rule>)> {
    vec![
        ("tensor", vec![
            r("distribution", "normalize", CUR, Some("nonneg & normalizable to unit mass"), None, Some(&["scale"])),
            r("measurement", "observe", CUR, Some("tensor is an observable quantity"), None, None),
            r("scalar", "reduce", AX, None, Some(true), Some(&["structure"])),
            r("dataset", "materialize", AX, None, None, None),
        ]),
        ("distribution", vec![
            r("tensor", "parameterize", CUR, Some("finite parameterization exists"), None, None),
            r("scalar", "expectation", AX, None, Some(true), Some(&["variance", "higher-moments"])),
            r("measurement", "sample", CUR, Some("sampling procedure defined"), None, None),
        ]),
        ("scalar", vec![
            r("bound", "threshold", CUR, Some("scalar is a comparable magnitude"), None, None),
            r("measurement", "record", AX, None, None, None),
        ]),
        ("measurement", vec![
            r("scalar", "aggregate", AX, None, Some(true), None),
            r("dataset", "collect", AX, None, None, None),
            r("trace", "timestamp", CUR, Some("measurements are ordered"), None, None),
        ]),
        ("graph", vec![
            r("subgraph", "restrict", AX, None, Some(true), Some(&["global-structure"])),
            r("constraint_set", "encode-edges", CUR, Some("edges express constraints"), None, None),
            r("tensor", "adjacency", AX, None, None, None),
        ]),
        ("subgraph", vec![
            r("graph", "embed", AX, None, None, None),
            r("program", "lower", CUR, Some("subgraph is executable"), Some(true), None),
            r("tensor", "featurize", CUR, Some("a feature map is defined"), Some(true), Some(&["topology"])),
        ]),
        ("bound", vec![
            r("certificate", "wrap", CUR, Some("bound is soundly derived"), None, None),
            r("claim", "assert", CUR, Some("bound supports the claim"), None, None),
        ]),
        ("certificate", vec![
            r("claim", "assert", AX, None, None, None),
            r("proof_term", "reify", CUR, Some("certificate is machine-checkable"), None, None),
        ]),
        ("proof_term", vec![
            r("certificate", "extract", AX, None, None, None),
            r("claim", "conclude", AX, None, None, None),
        ]),
        ("constraint_set", vec![
            r("optimization_problem", "add-objective", CUR, Some("an objective is defined"), None, None),
            r("program", "compile", CUR, Some("constraints are executable"), None, None),
        ]),
        ("optimization_problem", vec![
            r("constraint_set", "drop-objective", AX, None, Some(true), Some(&["objective"])),
            r("program", "solve", CUR, Some("a solver exists"), None, None),
            r("bound", "dual-bound", CUR, Some("duality gap is bounded"), None, None),
        ]),
        ("program", vec![
            r("trace", "execute", CUR, Some("program terminates on the inputs"), None, None),
            r("certificate", "attest", CUR, Some("execution is independently verifiable"), Some(true), None),
        ]),
        ("trace", vec![
            r("dataset", "log", AX, None, None, None),
            r("measurement", "probe", AX, None, None, None),
        ]),
        ("dataset", vec![
            r("tensor", "batch", AX, None, None, None),
            r("distribution", "empirical", CUR, Some("samples are i.i.d."), None, None),
        ]),
        ("policy", vec![
            r("constraint_set", "encode", CUR, Some("policy is expressible as constraints"), None, None),
            r("program", "implement", CUR, Some("policy is executable"), None, None),
        ]),
        ("claim", vec![
            r("constraint_set", "formalize", CUR, Some("claim is fully formalizable (not normative/ambiguous/probabilistic)"), None, None),
        ]),
    ]
}

fn rules_from<'a>(rules: &'a [(&'static str, Vec<Rule>)], kind: &str) -> &'a [Rule] {
    rules.iter().find(|(k, _)| *k == kind).map(|(_, v)| v.as_slice()).unwrap_or(&[])
}

fn rule_id(from: &str, e: &Rule) -> String { format!("{}>{}:{}", from, e.to, e.op) }

/// 1 + 2*lossy + (curated ? 1 : 0) + 0.5*|destroyed|
fn edge_cost(e: &Rule) -> f64 {
    1.0 + if e.lossy.unwrap_or(false) { 2.0 } else { 0.0 }
        + if e.auth.unwrap_or("cur") == "cur" { 1.0 } else { 0.0 }
        + (e.lose.map(|l| l.len()).unwrap_or(0) as f64) * 0.5
}

// ------------------------------------------------------------------- planner

#[derive(Clone)]
struct Step { from: String, to: String, op: String, rule_id: String, lossy: bool, auth: String, pre: String, lose: Vec<String> }

impl Step {
    fn to_json(&self) -> J {
        obj(vec![
            ("from", J::s(&self.from)), ("to", J::s(&self.to)), ("op", J::s(&self.op)),
            ("ruleId", J::s(&self.rule_id)), ("lossy", J::B(self.lossy)), ("auth", J::s(&self.auth)),
            ("pre", J::s(&self.pre)),
            ("lose", J::A(self.lose.iter().map(|x| J::s(x)).collect())),
        ])
    }
}

struct PathResult { path: Vec<Step>, exact: bool, cost: f64 }

/// Min-RISK uniform-cost multipath search. Mirrors the frozen algorithm
/// exactly, including: identity short-circuit; a queue re-sorted by cumulative
/// cost on every pop (stable, so ties keep insertion order); goal acceptance
/// BEFORE the depth cap, so a length-5 path can appear; and the 4000-iteration
/// guard.
fn adapters_for(rules: &[(&'static str, Vec<Rule>)], from: &str, to: &str, k: usize) -> Vec<PathResult> {
    if from == to { return vec![PathResult { path: vec![], exact: true, cost: 0.0 }]; }
    let mut results: Vec<PathResult> = Vec::new();
    let mut pq: Vec<(f64, String, Vec<Step>)> = vec![(0.0, from.to_string(), vec![])];
    let mut guard = 0;
    while !pq.is_empty() && results.len() < k && guard < 4000 {
        guard += 1;
        // stable sort by cost, then take the front — identical to JS sort+shift
        pq.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
        let (c, node, path) = pq.remove(0);
        if node == to { results.push(PathResult { path, exact: false, cost: c }); continue; }
        if path.len() > 4 { continue; }
        for e in rules_from(rules, &node) {
            let mut next = path.clone();
            next.push(Step {
                from: node.clone(), to: e.to.to_string(), op: e.op.to_string(),
                rule_id: rule_id(&node, e), lossy: e.lossy.unwrap_or(false),
                auth: e.auth.unwrap_or("cur").to_string(), pre: e.pre.unwrap_or("").to_string(),
                lose: e.lose.map(|l| l.iter().map(|s| s.to_string()).collect()).unwrap_or_default(),
            });
            pq.push((c + edge_cost(e), e.to.to_string(), next));
        }
    }
    results
}

fn path_result_json(p: &PathResult) -> J {
    obj(vec![
        ("path", J::A(p.path.iter().map(|s| s.to_json()).collect())),
        ("exact", J::B(p.exact)),
        ("cost", J::N(p.cost)),
    ])
}

fn pair_compat(rules: &[(&'static str, Vec<Rule>)], a: &str, b: &str) -> J {
    let rs = adapters_for(rules, a, b, 3);
    if rs.is_empty() {
        return obj(vec![
            ("compatibility", J::s("incompatible")), ("options", J::A(vec![])),
            ("adapter", J::Null), ("lossy", J::B(false)), ("cost", J::N(99.0)),
        ]);
    }
    let first = &rs[0];
    obj(vec![
        ("compatibility", J::s(if first.exact { "exact" } else { "convertible" })),
        ("options", J::A(rs.iter().map(path_result_json).collect())),
        ("adapter", J::A(first.path.iter().map(|s| s.to_json()).collect())),
        ("lossy", J::B(first.path.iter().any(|s| s.lossy))),
        ("cost", J::N(first.cost)),
    ])
}

// ------------------------------------------------------------- compatibility

fn is_word(c: char) -> bool { c.is_ascii_alphanumeric() || c == '_' }

/// Equivalent of /[*?]|\bn\b|any|var|dynamic|batch|unspecified/i
fn wild(s: &str) -> bool {
    let l = s.to_lowercase();
    if l.contains('*') || l.contains('?') { return true; }
    for p in ["any", "var", "dynamic", "batch", "unspecified"] { if l.contains(p) { return true; } }
    let chars: Vec<char> = l.chars().collect();
    for (i, c) in chars.iter().enumerate() {
        if *c == 'n' {
            let before_ok = i == 0 || !is_word(chars[i - 1]);
            let after_ok = i + 1 == chars.len() || !is_word(chars[i + 1]);
            if before_ok && after_ok { return true; }
        }
    }
    false
}

fn shape_compat(a: &str, b: &str) -> &'static str {
    if a.is_empty() || b.is_empty() { return "unresolved"; }
    let x = a.trim().to_lowercase();
    let y = b.trim().to_lowercase();
    if x == y || wild(&x) || wild(&y) { "proved" } else { "unresolved" }
}

fn unit_compat(a: &str, b: &str) -> &'static str {
    if a.is_empty() || b.is_empty() { return "unresolved"; }
    let x = a.trim().to_lowercase();
    let y = b.trim().to_lowercase();
    if x == y { return "proved"; }
    if x == "dimensionless" || y == "dimensionless" { return "unresolved"; }
    "refuted"
}

/// A license value as it appears in the corpus: absent, a string, or an object
/// carrying exactly one of spdx_id / key / name.
#[derive(Clone)]
enum Lic { None, Str(&'static str), Obj(&'static str, &'static str) }

impl Lic {
    fn json(&self) -> J {
        match self {
            Lic::None => J::Null,
            Lic::Str(s) => J::s(s),
            Lic::Obj(k, v) => obj(vec![(k, J::s(v))]),
        }
    }
    fn key(&self) -> Option<String> {
        match self {
            Lic::None => None,
            Lic::Str(s) => Some(s.to_lowercase()),
            Lic::Obj(_, v) => Some(v.to_lowercase()),
        }
    }
}

fn license_compat(a: &Lic, b: &Lic) -> J {
    let la = a.key();
    let lb = b.key();
    match (&la, &lb) {
        (Some(x), Some(y)) => {
            let copyleft = |s: &str| ["gpl", "agpl", "lgpl"].iter().any(|c| s.contains(c));
            if copyleft(x) && copyleft(y) && x != y {
                obj(vec![
                    ("status", J::s("CONDITIONALLY-SATISFIED")),
                    ("detail", J::S(format!("distinct copyleft ({}/{}) — combined distribution needs review", x, y))),
                ])
            } else {
                obj(vec![("status", J::s("PROVED")), ("detail", J::S(format!("{} + {} combinable", x, y)))])
            }
        }
        _ => obj(vec![
            ("status", J::s("UNRESOLVED")),
            ("detail", J::S(format!("{} / {} — license metadata absent",
                la.clone().unwrap_or_else(|| "?".into()), lb.clone().unwrap_or_else(|| "?".into())))),
        ]),
    }
}

const LIT_KNOWN: f64 = 300.0;
const LIT_EMERGING: f64 = 25.0;

fn classify_lit(count: Option<f64>) -> &'static str {
    match count {
        None => "UNVERIFIED",
        Some(c) if c > LIT_KNOWN => "KNOWN",
        Some(c) if c >= LIT_EMERGING => "EMERGING",
        Some(_) => "UNEXPLORED",
    }
}

// ------------------------------------------------------------ edge derivation

/// A repository as the edge-derivation corpora carry it. Only the fields
/// computeEdges reads are modelled; absent metadata is an empty collection,
/// matching the reference's `(x || [])` guards.
struct Repo {
    id: String,
    name: String,
    topics: Vec<String>,
    stars: f64,
    mentions: Vec<String>,
    enriched: bool,
    deps: Vec<String>,
    language: Option<String>,
}

fn repo(
    id: &str, name: &str, topics: &[&str], stars: f64,
    mentions: &[&str], enriched: bool, deps: &[&str], language: Option<&str>,
) -> Repo {
    Repo {
        id: id.into(), name: name.into(),
        topics: topics.iter().map(|s| s.to_string()).collect(), stars,
        mentions: mentions.iter().map(|s| s.to_string()).collect(), enriched,
        deps: deps.iter().map(|s| s.to_string()).collect(),
        language: language.map(|s| s.to_string()),
    }
}

struct Edge { source: String, target: String, etype: &'static str, weight: f64, evidence: String }

impl Edge {
    fn json(&self) -> J {
        obj(vec![
            ("source", J::S(self.source.clone())), ("target", J::S(self.target.clone())),
            ("type", J::s(self.etype)), ("weight", J::N(self.weight)),
            ("evidence", J::S(self.evidence.clone())),
        ])
    }
}

/// Dependencies too common to carry signal — excluded from shared-dependency.
const UBIQUITOUS: [&str; 15] = [
    "react", "typescript", "numpy", "requests", "lodash", "express", "jest", "pytest",
    "eslint", "prettier", "webpack", "vite", "axios", "scipy", "pandas",
];

/// The naming family of a repo: the first token before any of - _ . / or space.
fn fam(name: &str) -> String {
    let head = name.split(|c| c == '-' || c == '_' || c == '.' || c == '/' || c == ' ').next().unwrap_or("");
    let head = if head.is_empty() { name } else { head };
    head.to_lowercase()
}

/// Insertion-ordered grouping. JavaScript objects preserve string-key insertion
/// order and the reference iterates them with Object.entries, so a hash map
/// would produce a different edge order.
fn group_by<'a, F: Fn(&'a Repo) -> Vec<String>>(list: &'a [Repo], key: F) -> Vec<(String, Vec<&'a Repo>)> {
    let mut groups: Vec<(String, Vec<&Repo>)> = Vec::new();
    for r in list {
        for k in key(r) {
            match groups.iter_mut().find(|(gk, _)| *gk == k) {
                Some((_, v)) => v.push(r),
                None => groups.push((k, vec![r])),
            }
        }
    }
    groups
}

/// Star-descending, STABLE — ties keep corpus order, which decides the hub.
fn by_stars_desc<'a>(g: &[&'a Repo]) -> Vec<&'a Repo> {
    let mut v: Vec<&Repo> = g.to_vec();
    v.sort_by(|a, b| b.stars.partial_cmp(&a.stars).unwrap());
    v
}

/// computeEdges, verbatim. Edge-type order is observable and fixed:
/// readme-reference, shared-topic, shared-dependency, naming-family,
/// shared-language. Every relation is hub-and-spoke rather than pairwise,
/// except shared-dependency which is pairwise over the enriched subset.
fn compute_edges(list: &[Repo]) -> Vec<Edge> {
    let mut edges: Vec<Edge> = Vec::new();

    // id by name; a later repo with the same name overwrites an earlier one.
    let mut id_by_name: Vec<(&str, &str)> = Vec::new();
    for r in list {
        match id_by_name.iter_mut().find(|(n, _)| *n == r.name.as_str()) {
            Some((_, id)) => *id = r.id.as_str(),
            None => id_by_name.push((r.name.as_str(), r.id.as_str())),
        }
    }
    let lookup = |n: &str| id_by_name.iter().find(|(k, _)| *k == n).map(|(_, v)| *v);

    // readme-reference: directed, and never a self-reference by NAME.
    for a in list {
        for bn in &a.mentions {
            if let Some(target) = lookup(bn) {
                if *bn != a.name {
                    edges.push(Edge { source: a.id.clone(), target: target.into(), etype: "readme-reference", weight: 3.0,
                        evidence: format!("{}'s README mentions {}", a.name, bn) });
                }
            }
        }
    }

    // shared-topic: each member linked to the topic's star-hub, capped at 60.
    for (t, g) in group_by(list, |r| r.topics.clone()) {
        if g.len() < 2 { continue; }
        let grp: Vec<&Repo> = by_stars_desc(&g).into_iter().take(60).collect();
        for m in grp.iter().skip(1) {
            edges.push(Edge { source: grp[0].id.clone(), target: m.id.clone(), etype: "shared-topic", weight: 1.0,
                evidence: format!("topic: {}", t) });
        }
    }

    // shared-dependency: pairwise over the enriched subset, ubiquitous
    // dependencies excluded, at least two shared to qualify.
    let enr: Vec<&Repo> = list.iter().filter(|r| r.enriched && !r.deps.is_empty()).collect();
    if enr.len() * enr.len().saturating_sub(1) / 2 <= 80000 {
        for i in 0..enr.len() {
            for j in (i + 1)..enr.len() {
                let sd: Vec<&String> = enr[i].deps.iter()
                    .filter(|d| enr[j].deps.contains(d) && !UBIQUITOUS.contains(&d.as_str())).collect();
                if sd.len() >= 2 {
                    edges.push(Edge { source: enr[i].id.clone(), target: enr[j].id.clone(), etype: "shared-dependency",
                        weight: sd.len() as f64,
                        evidence: format!("deps: {}", sd.iter().take(5).map(|s| s.as_str()).collect::<Vec<_>>().join(", ")) });
                }
            }
        }
    }

    // naming-family: family token must itself be >= 2 chars; group 2..=30.
    for (f, g) in group_by(list, |r| vec![fam(&r.name)]) {
        if f.chars().count() < 2 || g.len() < 2 || g.len() > 30 { continue; }
        let grp = by_stars_desc(&g);
        for m in grp.iter().skip(1) {
            edges.push(Edge { source: grp[0].id.clone(), target: m.id.clone(), etype: "naming-family", weight: 2.0,
                evidence: format!("naming family: {}-*", f) });
        }
    }

    // shared-language: weak signal, so only modest groups (2..=14).
    for (l, g) in group_by(list, |r| r.language.clone().map(|x| vec![x]).unwrap_or_default()) {
        if g.len() < 2 || g.len() > 14 { continue; }
        let grp = by_stars_desc(&g);
        for m in grp.iter().skip(1) {
            edges.push(Edge { source: grp[0].id.clone(), target: m.id.clone(), etype: "shared-language", weight: 1.0,
                evidence: format!("both {}", l) });
        }
    }

    edges
}

/// The edge-derivation corpora, mirroring test/oracle/cases.mjs EDGE_CORPORA.
fn edge_corpora() -> Vec<(&'static str, Vec<Repo>)> {
    vec![
        ("readme-and-topic", vec![
            repo("r1", "alpha", &["opt"], 10.0, &["beta"], false, &[], None),
            repo("r2", "beta", &["opt"], 5.0, &[], false, &[], None),
            repo("r3", "gamma", &["opt"], 2.0, &[], false, &[], None),
        ]),
        ("shared-dependency", vec![
            repo("d1", "one", &[], 0.0, &[], true, &["ed25519", "blake3", "numpy"], None),
            repo("d2", "two", &[], 0.0, &[], true, &["ed25519", "blake3", "react"], None),
            repo("d3", "three", &[], 0.0, &[], true, &["ed25519"], None),
        ]),
        ("naming-family-and-language", vec![
            repo("f1", "core-engine", &[], 9.0, &[], false, &[], Some("Rust")),
            repo("f2", "core-cli", &[], 4.0, &[], false, &[], Some("Rust")),
            repo("f3", "core-docs", &[], 1.0, &[], false, &[], Some("Python")),
            repo("f4", "unrelated", &[], 7.0, &[], false, &[], Some("Rust")),
        ]),
        ("empty", vec![]),
    ]
}

/// Boundary corpora: each makes a rule observable that the happy-path corpora
/// leave unexercised — UBIQ filtering, self-mention rejection, group-size
/// bounds, the family-length guard, the topic hub cap, and tie-breaking.
fn edge_corpora_boundaries() -> Vec<(&'static str, Vec<Repo>)> {
    let plain = |id: &str| repo(id, id, &[], 0.0, &[], false, &[], None);
    vec![
        ("ubiquitous-filter", vec![
            repo("u1", "u1", &[], 0.0, &[], true, &["react", "numpy", "lodash"], None),
            repo("u2", "u2", &[], 0.0, &[], true, &["react", "numpy", "ed25519"], None),
            repo("u3", "u3", &[], 0.0, &[], true, &["ed25519", "blake3"], None),
            repo("u4", "u4", &[], 0.0, &[], true, &["ed25519", "blake3", "react"], None),
        ]),
        ("self-and-dangling-mention", vec![
            repo("s1", "solo", &[], 0.0, &["solo", "ghost"], false, &[], None),
            repo("s2", "other", &[], 0.0, &["solo"], false, &[], None),
        ]),
        ("language-group-over-bound", (0..15).map(|i| repo(&format!("L{}", i), &format!("L{}", i), &[], (15 - i) as f64, &[], false, &[], Some("Go"))).collect()),
        ("language-group-at-bound", (0..14).map(|i| repo(&format!("K{}", i), &format!("K{}", i), &[], (14 - i) as f64, &[], false, &[], Some("Zig"))).collect()),
        ("single-char-family", vec![plain("a-one"), plain("a-two"), plain("ab-one"), plain("ab-two")]),
        ("family-group-over-bound", (0..31).map(|i| repo(&format!("fam{}", i), &format!("shared-{}", i), &[], (31 - i) as f64, &[], false, &[], None)).collect()),
        ("topic-hub-cap", (0..61).map(|i| repo(&format!("t{}", i), &format!("t{}", i), &["big"], (61 - i) as f64, &[], false, &[], None)).collect()),
        ("star-ties", (1..=3).map(|i| repo(&format!("z{}", i), &format!("z{}", i), &["tie"], 5.0, &[], false, &[], None)).collect()),
        ("duplicate-names", vec![
            repo("dup-a", "same", &[], 0.0, &[], false, &[], None),
            repo("dup-b", "same", &[], 0.0, &[], false, &[], None),
            repo("dup-c", "ref", &[], 0.0, &["same"], false, &[], None),
        ]),
    ]
}

// --------------------------------------------------------------- corpus cases

/// A port as the synth-test fixture carries it: `kind` plus optionally a
/// `name` or `semantics`. Field PRESENCE is observable in the echoed input.
#[derive(Clone)]
struct SynthPort { kind: &'static str, name: Option<&'static str>, semantics: Option<&'static str> }

impl SynthPort {
    fn json(&self) -> J {
        let mut pairs: Vec<(&str, J)> = vec![("kind", J::s(self.kind))];
        if let Some(n) = self.name { pairs.push(("name", J::s(n))); }
        if let Some(sem) = self.semantics { pairs.push(("semantics", J::s(sem))); }
        obj(pairs)
    }
    /// The frozen synthTest label preference: semantics, else name, else kind.
    fn label(&self) -> &'static str { self.semantics.or(self.name).unwrap_or(self.kind) }
}

/// Property-test skeleton (synthTest), verbatim. The adapter chain folds into
/// nested calls: [normalize] over x becomes `normalize(x)`; an empty chain
/// leaves `x` untouched.
fn synth_test(po: &SynthPort, ci: &SynthPort, adapter: &[Step]) -> String {
    let mut expr = String::from("x");
    for s in adapter { expr = format!("{}({})", s.op, expr); }
    format!(
        "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\nproperty('{}→{} preserves semantics', () => {{\n  const x = sample_{}();          // {}\n  const y = {};\n  assert isValid_{}(y);            // {}\n  assert approxPreserves(semantics(x), semantics(y), eps);\n}});",
        po.kind, ci.kind, po.kind, po.label(), expr, ci.kind, ci.label())
}

const SHAPES: [&str; 11] = ["", "[batch,d]", "[BATCH,D]", "DAG", "dag", "scalar", "[n]", "any", "unspecified", "3x3", "*"];
/// Shape boundaries the matrix above never reaches: the `?` character, the
/// `var` and `dynamic` tokens, whitespace trimming, and both sides of the
/// standalone-`n` rule. `any` and `unspecified` contain a non-standalone `n`
/// but are wildcards for another reason, so the word-boundary test was
/// unobservable until these.
const SHAPES_BOUNDARY: [&str; 14] = [
    "", "n", "[n]", "x n y", "int8", "3n", "n3", "n_x", " dag ", "dag", "?", "var", "dynamic", "3x3",
];
const UNITS: [&str; 7] = ["", "probability", "Probability", "dimensionless", "logits", "L2-radius", "seconds"];
const CLASSIFY_INPUTS: [Option<f64>; 9] = [None, Some(0.0), Some(24.0), Some(25.0), Some(26.0), Some(299.0), Some(300.0), Some(301.0), Some(5000.0)];

// ------------------------------------------------------- schema normalization

/// A raw, untrusted schema value as it arrives from extraction. Mirrors the
/// JavaScript value domain closely enough to reproduce normSchema exactly —
/// including that a JS array has `typeof === "object"` and so normalizes as an
/// object with no ports rather than being rejected.
#[derive(Clone)]
enum Raw {
    Null,
    Num(f64),
    Str(&'static str),
    Arr(Vec<Raw>),
    Obj(Vec<(&'static str, Raw)>),
}

impl Raw {
    fn json(&self) -> J {
        match self {
            Raw::Null => J::Null,
            Raw::Num(n) => J::N(*n),
            Raw::Str(s) => J::s(s),
            Raw::Arr(xs) => J::A(xs.iter().map(|x| x.json()).collect()),
            Raw::Obj(kvs) => J::O(kvs.iter().map(|(k, v)| (k.to_string(), v.json())).collect()),
        }
    }
    fn get(&self, key: &str) -> Option<&Raw> {
        if let Raw::Obj(kvs) = self { kvs.iter().find(|(k, _)| *k == key).map(|(_, v)| v) } else { None }
    }
    /// JavaScript String(v) for the value classes the corpus exercises.
    fn to_js_string(&self) -> String {
        match self {
            Raw::Null => "null".into(),
            Raw::Num(n) => if n.fract() == 0.0 && n.abs() < 1e15 { format!("{}", *n as i64) } else { format!("{}", n) },
            Raw::Str(s) => (*s).to_string(),
            Raw::Arr(_) => String::new(),
            Raw::Obj(_) => "[object Object]".into(),
        }
    }
    fn as_str(&self) -> Option<&'static str> { if let Raw::Str(s) = self { Some(s) } else { None } }
}

/// normSchema, verbatim: non-objects become null; each port list is capped at
/// four; an unknown kind fails closed to "claim"; "unspecified" shape/units
/// collapse to ""; non-array metadata fields become empty arrays.
fn norm_schema(s: &Raw) -> J {
    let is_objectish = matches!(s, Raw::Obj(_) | Raw::Arr(_));
    if !is_objectish { return J::Null; }

    let norm_ports = |field: Option<&Raw>| -> J {
        let items: Vec<Raw> = match field { Some(Raw::Arr(xs)) => xs.clone(), _ => vec![] };
        J::A(items.iter().take(4).map(|p| {
            let name = p.get("name").and_then(|v| v.as_str()).unwrap_or("");
            let kind = match p.get("kind").and_then(|v| v.as_str()) {
                Some(k) if MECH_KINDS.contains(&k) => k,
                _ => "claim",
            };
            let collapse = |v: Option<&Raw>| -> String {
                match v.and_then(|x| x.as_str()) {
                    Some(x) if !x.is_empty() && x != "unspecified" => x.to_string(),
                    _ => String::new(),
                }
            };
            obj(vec![
                ("name", J::s(name)), ("kind", J::s(kind)),
                ("shape", J::S(collapse(p.get("shape")))), ("units", J::S(collapse(p.get("units")))),
                ("semantics", J::s(p.get("semantics").and_then(|v| v.as_str()).unwrap_or(""))),
            ])
        }).collect())
    };
    let strs = |field: Option<&Raw>| -> J {
        match field { Some(Raw::Arr(xs)) => J::A(xs.iter().map(|x| J::S(x.to_js_string())).collect()), _ => J::A(vec![]) }
    };

    obj(vec![
        ("consumes", norm_ports(s.get("consumes"))),
        ("produces", norm_ports(s.get("produces"))),
        ("certifies", strs(s.get("certifies"))),
        ("assumptions", strs(s.get("assumptions"))),
        ("invariants", strs(s.get("invariants"))),
    ])
}

/// The corpus normalization inputs, mirroring test/oracle/cases.mjs RAW_SCHEMAS.
fn raw_schemas() -> Vec<Raw> {
    vec![
        Raw::Null,
        Raw::Num(42.0),
        Raw::Str("x"),
        Raw::Arr(vec![]),
        Raw::Obj(vec![]),
        Raw::Obj(vec![
            ("consumes", Raw::Str("nope")),
            ("produces", Raw::Arr(vec![Raw::Obj(vec![
                ("name", Raw::Str("p")), ("kind", Raw::Str("tensor")),
                ("shape", Raw::Str("unspecified")), ("units", Raw::Str("unspecified")),
                ("semantics", Raw::Str("s")),
            ])])),
        ]),
        Raw::Obj(vec![
            ("produces", Raw::Arr(vec![
                Raw::Obj(vec![("kind", Raw::Str("not-a-kind"))]),
                Raw::Obj(vec![("kind", Raw::Str("bound")), ("shape", Raw::Str("[n]")), ("units", Raw::Str("L2"))]),
                Raw::Obj(vec![]),
                Raw::Obj(vec![("kind", Raw::Str("trace"))]),
                Raw::Obj(vec![("kind", Raw::Str("scalar"))]),
            ])),
            ("assumptions", Raw::Arr(vec![Raw::Num(1.0), Raw::Str("two")])),
            ("invariants", Raw::Null),
        ]),
    ]
}

fn synth_cases() -> Vec<(SynthPort, SynthPort)> {
    vec![
        (SynthPort { kind: "tensor", name: None, semantics: Some("certified radius") },
         SynthPort { kind: "tensor", name: None, semantics: Some("input field") }),
        (SynthPort { kind: "tensor", name: Some("T"), semantics: None },
         SynthPort { kind: "bound", name: Some("B"), semantics: None }),
        (SynthPort { kind: "graph", name: None, semantics: None },
         SynthPort { kind: "claim", name: None, semantics: None }),
    ]
}

fn licenses() -> Vec<Lic> {
    vec![
        Lic::None, Lic::Str("MIT"), Lic::Str("mit"), Lic::Str("GPL-3.0"), Lic::Str("AGPL-3.0"),
        Lic::Str("LGPL-2.1"), Lic::Str("Apache-2.0"),
        Lic::Obj("spdx_id", "GPL-3.0"), Lic::Obj("key", "agpl-3.0"), Lic::Obj("name", "MIT License"),
    ]
}

fn rule_json(e: &Rule) -> J {
    // Emit only the fields the frozen registry declares — presence is observable.
    let mut pairs: Vec<(&str, J)> = vec![("to", J::s(e.to)), ("op", J::s(e.op))];
    if let Some(l) = e.lossy { pairs.push(("lossy", J::B(l))); }
    if let Some(a) = e.auth { pairs.push(("auth", J::s(a))); }
    if let Some(p) = e.pre { pairs.push(("pre", J::s(p))); }
    if let Some(l) = e.lose { pairs.push(("lose", J::A(l.iter().map(|x| J::s(x)).collect()))); }
    obj(pairs)
}

fn build(case_id: &str) -> Option<J> {
    let rules = conv_rules();
    match case_id {
        "mech-kinds" => Some(obj(vec![("kinds", J::A(MECH_KINDS.iter().map(|k| J::s(k)).collect()))])),

        "conv-rules" => {
            let registry = J::O(rules.iter().map(|(k, v)| {
                (k.to_string(), J::A(v.iter().map(rule_json).collect()))
            }).collect());
            let mut costs: Vec<(String, J)> = vec![];
            for (from, edges) in &rules {
                for e in edges { costs.push((rule_id(from, e), J::N(edge_cost(e)))); }
            }
            Some(obj(vec![("registry", registry), ("edgeCosts", J::O(costs))]))
        }

        "multipath-kind-paths" => {
            let mut out: Vec<(String, J)> = vec![];
            for a in MECH_KINDS { for b in MECH_KINDS {
                let rs = adapters_for(&rules, a, b, 3);
                out.push((format!("{}>{}", a, b), J::A(rs.iter().map(path_result_json).collect())));
            }}
            Some(J::O(out))
        }

        "pair-compat" => {
            let mut out: Vec<(String, J)> = vec![];
            for a in MECH_KINDS { for b in MECH_KINDS {
                out.push((format!("{}>{}", a, b), pair_compat(&rules, a, b)));
            }}
            Some(J::O(out))
        }

        "shape-compat" => {
            let mut out: Vec<(String, J)> = vec![];
            for x in SHAPES { for y in SHAPES { out.push((format!("{}|{}", x, y), J::s(shape_compat(x, y)))); }}
            Some(J::O(out))
        }

        "shape-compat-boundaries" => {
            let mut out: Vec<(String, J)> = vec![];
            for x in SHAPES_BOUNDARY { for y in SHAPES_BOUNDARY { out.push((format!("{}|{}", x, y), J::s(shape_compat(x, y)))); }}
            Some(J::O(out))
        }

        "unit-compat" => {
            let mut out: Vec<(String, J)> = vec![];
            for x in UNITS { for y in UNITS { out.push((format!("{}|{}", x, y), J::s(unit_compat(x, y)))); }}
            Some(J::O(out))
        }

        "license-compat" => {
            let ls = licenses();
            let mut out: Vec<J> = vec![];
            for a in &ls { for b in &ls {
                out.push(obj(vec![("a", a.json()), ("b", b.json()), ("out", license_compat(a, b))]));
            }}
            Some(J::A(out))
        }

        "synth-test" => Some(J::A(synth_cases().iter().map(|(po, ci)| {
            // The selected adapter chain is the frozen pairCompat first option.
            let rs = adapters_for(&rules, po.kind, ci.kind, 3);
            let adapter: Vec<Step> = if rs.is_empty() { vec![] } else { rs[0].path.clone() };
            obj(vec![
                ("po", po.json()), ("ci", ci.json()),
                ("out", J::S(synth_test(po, ci, &adapter))),
            ])
        }).collect())),

        "norm-schema" => Some(J::A(raw_schemas().iter().map(|r| obj(vec![
            ("in", r.json()), ("out", norm_schema(r)),
        ])).collect())),

        "compute-edges" => Some(J::O(edge_corpora().iter().map(|(name, list)| {
            (name.to_string(), J::A(compute_edges(list).iter().map(|e| e.json()).collect()))
        }).collect())),

        "compute-edges-boundaries" => Some(J::O(edge_corpora_boundaries().iter().map(|(name, list)| {
            (name.to_string(), J::A(compute_edges(list).iter().map(|e| e.json()).collect()))
        }).collect())),

        "classify-lit" => Some(J::A(CLASSIFY_INPUTS.iter().map(|c| obj(vec![
            ("in", match c { None => J::Null, Some(v) => J::N(*v) }),
            ("out", J::s(classify_lit(*c))),
        ])).collect())),

        _ => None,
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("usage: cortex-conformance <case-id>|--cases");
        std::process::exit(2);
    }
    if args[1] == "--cases" {
        let supported = ["mech-kinds", "conv-rules", "multipath-kind-paths", "pair-compat",
                         "shape-compat", "shape-compat-boundaries", "unit-compat", "license-compat", "classify-lit",
                         "synth-test", "norm-schema", "compute-edges",
                         "compute-edges-boundaries"];
        println!("{}", J::A(supported.iter().map(|c| J::s(c)).collect()).to_json());
        return;
    }
    match build(&args[1]) {
        Some(v) => println!("{}", v.to_json()),
        None => { eprintln!("unsupported case: {}", args[1]); std::process::exit(3); }
    }
}
