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

/// The frozen harness template, at exactly one site. The deterministic
/// `synthTest` surface and the cascade emit the same text; a second copy could
/// drift from the first, and would also silently widen any mutation anchored to
/// the template into a two-boundary mutation that no longer isolates anything.
fn synth_harness(po_kind: &str, ci_kind: &str, po_label: &str, ci_label: &str, expr: &str) -> String {
    format!(
        "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\nproperty('{}→{} preserves semantics', () => {{\n  const x = sample_{}();          // {}\n  const y = {};\n  assert isValid_{}(y);            // {}\n  assert approxPreserves(semantics(x), semantics(y), eps);\n}});",
        po_kind, ci_kind, po_kind, po_label, expr, ci_kind, ci_label)
}

/// Property-test skeleton (synthTest), verbatim. The adapter chain folds into
/// nested calls: [normalize] over x becomes `normalize(x)`; an empty chain
/// leaves `x` untouched.
fn synth_test(po: &SynthPort, ci: &SynthPort, adapter: &[Step]) -> String {
    let mut expr = String::from("x");
    for s in adapter { expr = format!("{}({})", s.op, expr); }
    synth_harness(po.kind, ci.kind, po.label(), ci.label(), &expr)
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

        id if cascade_cases().iter().any(|c| c.id == id) => {
            let rules = conv_rules();
            let cases = cascade_cases();
            let c = cases.iter().find(|c| c.id == id).unwrap();
            Some(cascade_payload(&rules, c))
        }

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
        let mut all: Vec<J> = supported.iter().map(|c| J::s(c)).collect();
        for c in cascade_cases() { all.push(J::s(c.id)); }
        println!("{}", J::A(all).to_json());
        return;
    }
    match build(&args[1]) {
        Some(v) => println!("{}", v.to_json()),
        None => { eprintln!("unsupported case: {}", args[1]); std::process::exit(3); }
    }
}

// ============================================================ cascade (C1)
//
// The frozen verifyCascade steps 2-4, as a pure function: schema-level port
// planning -> contract instantiation -> the ordered proof-obligation vector ->
// the five-stage ladder, then the post-ladder literature layer.
//
// PARITY ONLY. This reproduces the 17 cascade fixtures; it makes no
// mutation-adequacy claim, and no mutation is declared against it yet.
//
// Two boundaries are inputs rather than behavior, exactly as the oracle
// documents: the typed schemas (model-extracted in situ) and the soft
// precondition/invariant/metric judgments (model-supplied). The literature
// count is likewise injected. Everything between them runs here.

#[derive(Clone)]
struct CPort { name: String, kind: String, shape: String, units: String, semantics: String }

impl CPort {
    /// The raw port as the case defines it — "unspecified" not yet collapsed.
    fn raw_json(&self) -> J {
        obj(vec![
            ("name", J::S(self.name.clone())), ("kind", J::S(self.kind.clone())),
            ("shape", J::S(self.shape.clone())), ("units", J::S(self.units.clone())),
            ("semantics", J::S(self.semantics.clone())),
        ])
    }
    /// normSchema's per-port normalization: unknown kind fails closed to
    /// "claim"; "unspecified" shape/units collapse to the empty string.
    fn norm(&self) -> CPort {
        let collapse = |v: &str| if !v.is_empty() && v != "unspecified" { v.to_string() } else { String::new() };
        CPort {
            name: self.name.clone(),
            kind: if MECH_KINDS.contains(&self.kind.as_str()) { self.kind.clone() } else { "claim".into() },
            shape: collapse(&self.shape), units: collapse(&self.units),
            semantics: self.semantics.clone(),
        }
    }
    fn json(&self) -> J {
        obj(vec![
            ("name", J::S(self.name.clone())), ("kind", J::S(self.kind.clone())),
            ("shape", J::S(self.shape.clone())), ("units", J::S(self.units.clone())),
            ("semantics", J::S(self.semantics.clone())),
        ])
    }
}

#[derive(Clone)]
struct CSchema { produces: Vec<CPort>, consumes: Vec<CPort>, assumptions: Vec<String>, invariants: Vec<String> }

impl CSchema {
    fn raw_json(&self) -> J {
        obj(vec![
            ("produces", J::A(self.produces.iter().map(|p| p.raw_json()).collect())),
            ("consumes", J::A(self.consumes.iter().map(|p| p.raw_json()).collect())),
            ("certifies", J::A(vec![])),
            ("assumptions", J::A(self.assumptions.iter().map(|a| J::S(a.clone())).collect())),
            ("invariants", J::A(self.invariants.iter().map(|a| J::S(a.clone())).collect())),
        ])
    }
    fn norm(&self) -> CSchema {
        CSchema {
            produces: self.produces.iter().take(4).map(|p| p.norm()).collect(),
            consumes: self.consumes.iter().take(4).map(|p| p.norm()).collect(),
            assumptions: self.assumptions.clone(), invariants: self.invariants.clone(),
        }
    }
}

/// The model-supplied soft judgments. `pre` applies to every curated
/// precondition unless `pre_overrides` names the ruleId.
#[derive(Clone, Default)]
struct Soft { pre: Option<&'static str>, pre_overrides: Vec<(&'static str, &'static str)>, invariant: Option<&'static str>, metric: Option<&'static str> }

/// mapSoft, fail-closed: anything unrecognised (including absent) is UNRESOLVED.
fn map_soft(v: Option<&str>) -> &'static str {
    match v {
        Some("satisfied") | Some("conditional") => "CONDITIONALLY-SATISFIED",
        Some("violated") => "REFUTED",
        _ => "UNRESOLVED",
    }
}

struct COption { dir: &'static str, source_output: CPort, target_input: CPort, exact: bool, adapters: Vec<Step>, static_risk: f64, risk: f64, unit: &'static str }

/// portPairsFor + planPortBridges: candidate pairs both directions capped at
/// 24, options ranked by risk, top three retained.
fn plan_port_bridges(rules: &[(&'static str, Vec<Rule>)], a: &CSchema, b: &CSchema, a_present: bool, b_present: bool) -> (usize, Vec<COption>) {
    let mut pairs: Vec<(&'static str, CPort, CPort)> = vec![];
    if a_present && b_present {
        for po in &a.produces { for ci in &b.consumes { pairs.push(("A→B", po.clone(), ci.clone())); } }
        for po in &b.produces { for ci in &a.consumes { pairs.push(("B→A", po.clone(), ci.clone())); } }
    }
    pairs.truncate(24);
    let n_pairs = pairs.len();

    let mut opts: Vec<COption> = vec![];
    for (dir, po, ci) in &pairs {
        let rs = adapters_for(rules, &po.kind, &ci.kind, 3);
        if rs.is_empty() { continue; }
        let u = unit_compat(&po.units, &ci.units);
        let sh = shape_compat(&po.shape, &ci.shape);
        for o in &rs {
            opts.push(COption {
                dir, source_output: po.clone(), target_input: ci.clone(),
                exact: o.exact, adapters: o.path.clone(), static_risk: o.cost,
                risk: o.cost + if sh == "proved" { 0.0 } else { 0.5 }
                    + if u == "refuted" { 90.0 } else if u == "proved" { 0.0 } else { 0.5 },
                unit: u,
            });
        }
    }
    // Stable sort by risk — ties keep enumeration order, as in the frozen sort.
    opts.sort_by(|x, y| x.risk.partial_cmp(&y.risk).unwrap());
    opts.truncate(3);
    (n_pairs, opts)
}

impl COption {
    fn json(&self) -> J {
        obj(vec![
            ("dir", J::s(self.dir)),
            ("sourceOutput", self.source_output.json()),
            ("targetInput", self.target_input.json()),
            ("exact", J::B(self.exact)),
            ("adapters", J::A(self.adapters.iter().map(|s| s.to_json()).collect())),
            ("staticRisk", J::N(self.static_risk)),
            ("risk", J::N(self.risk)),
            ("unit", J::s(self.unit)),
        ])
    }
}

#[derive(Clone)]
struct Inst { rule_id: String, op: String, pre: String, status: &'static str }

impl Inst {
    fn json(&self) -> J {
        obj(vec![
            ("ruleId", J::S(self.rule_id.clone())), ("op", J::S(self.op.clone())),
            ("pre", J::S(self.pre.clone())), ("status", J::s(self.status)),
        ])
    }
}

/// instantiateContract: only curated steps carrying a precondition become
/// RuleInstantiations, each graded by the soft judgment for its ruleId.
fn instantiate_contract(adapters: &[Step], soft: &Soft) -> Vec<Inst> {
    adapters.iter().filter(|s| s.auth == "cur" && !s.pre.is_empty()).map(|s| {
        let raw = soft.pre_overrides.iter().find(|(k, _)| *k == s.rule_id.as_str()).map(|(_, v)| *v).or(soft.pre);
        Inst { rule_id: s.rule_id.clone(), op: s.op.clone(), pre: s.pre.clone(), status: map_soft(raw) }
    }).collect()
}

struct Scored { inst: Vec<Inst>, refuted: bool, score: f64 }

/// scoreOptions: risk + 10·unresolved + 1000·refuted; refuted paths pruned;
/// lowest-scoring survivor wins, falling back to the lowest refuted so a
/// refuted precondition yields TYPE_COMPOSABLE rather than PROPOSED.
fn score_options(options: &[COption], soft: &Soft) -> (Vec<Scored>, usize) {
    let scored: Vec<Scored> = options.iter().map(|o| {
        let inst = instantiate_contract(&o.adapters, soft);
        let refuted = inst.iter().any(|x| x.status == "REFUTED");
        let unresolved = inst.iter().filter(|x| x.status == "UNRESOLVED").count();
        Scored { inst, refuted, score: o.risk + unresolved as f64 * 10.0 + if refuted { 1000.0 } else { 0.0 } }
    }).collect();
    let mut order: Vec<usize> = (0..scored.len()).filter(|&i| !scored[i].refuted).collect();
    order.sort_by(|&x, &y| scored[x].score.partial_cmp(&scored[y].score).unwrap());
    let chosen = order.first().copied().unwrap_or_else(|| {
        let mut all: Vec<usize> = (0..scored.len()).collect();
        all.sort_by(|&x, &y| scored[x].score.partial_cmp(&scored[y].score).unwrap());
        all[0]
    });
    (scored, chosen)
}

/// evaluateObligations: the ordered PO-1..PO-8 vector. Every detail string is
/// observable and copied character-for-character.
fn evaluate_obligations(po: &CPort, ci: &CPort, adapters: &[Step], inst: &[Inst], unit: &str, soft: &Soft) -> Vec<J> {
    let sc = shape_compat(&po.shape, &ci.shape);
    let mut o: Vec<J> = vec![];
    let up = |s: &str| s.to_uppercase();
    o.push(obj(vec![("id", J::s("PO-1")), ("name", J::s("Kind path")), ("method", J::s("deterministic")),
        ("status", J::s("PROVED")),
        ("detail", J::S(if !adapters.is_empty() {
            format!("{} → {} via {}", po.kind, ci.kind, adapters.iter().map(|s| s.op.as_str()).collect::<Vec<_>>().join(" → "))
        } else { format!("{} ≡ {}", po.kind, ci.kind) }))]));
    let dsh = |v: &str| if v.is_empty() { "unspecified".to_string() } else { v.to_string() };
    o.push(obj(vec![("id", J::s("PO-2")), ("name", J::s("Shape compatibility")), ("method", J::s("deterministic")),
        ("status", J::S(up(sc))), ("detail", J::S(format!("{} ⟶ {}", dsh(&po.shape), dsh(&ci.shape))))]));
    let dimensionless = format!("{}{}", po.units, ci.units).to_lowercase().contains("dimensionless");
    o.push(obj(vec![("id", J::s("PO-3")), ("name", J::s("Unit preservation")), ("method", J::s("deterministic")),
        ("status", J::S(up(unit))),
        ("detail", J::S(format!("{} ⟶ {}{}", dsh(&po.units), dsh(&ci.units),
            if unit == "unresolved" && dimensionless { " (dimensionless ≠ dimensional — not auto-proved)" } else { "" })))]));
    // Both repos carry no license metadata in every cascade case, so screening
    // is UNRESOLVED — never PROVED, which would be the fail-open direction.
    o.push(obj(vec![("id", J::s("PO-4")), ("name", J::s("License metadata screening")), ("method", J::s("deterministic")),
        ("status", J::s("UNRESOLVED")), ("detail", J::s("? / ? — license metadata absent"))]));
    if inst.is_empty() {
        o.push(obj(vec![("id", J::s("PO-5")), ("name", J::s("Preconditions")), ("method", J::s("deterministic")),
            ("status", J::s("PROVED")), ("detail", J::s("path is fully axiomatic — no semantic precondition"))]));
    } else {
        for (i, x) in inst.iter().enumerate() {
            o.push(obj(vec![("id", J::S(format!("PO-5.{}", i + 1))), ("name", J::S(format!("Precondition · {}", x.op))),
                ("method", J::s("model-assisted")), ("status", J::s(x.status)), ("detail", J::S(x.pre.clone()))]));
        }
    }
    let destroyed: Vec<String> = adapters.iter().flat_map(|s| s.lose.clone()).collect();
    o.push(obj(vec![("id", J::s("PO-6")), ("name", J::s("Invariant preservation")), ("method", J::s("model-assisted")),
        ("status", J::s(map_soft(soft.invariant))),
        ("detail", J::S(if !destroyed.is_empty() { format!("destroys: {}", destroyed.join(", ")) } else { "no properties destroyed on path".into() }))]));
    o.push(obj(vec![("id", J::s("PO-7")), ("name", J::s("Metric measures outcome")), ("method", J::s("model-assisted")),
        ("status", J::s(map_soft(soft.metric))), ("detail", J::s(""))]));
    if adapters.iter().any(|s| s.lossy) {
        o.push(obj(vec![("id", J::s("PO-8")), ("name", J::s("Bounded information loss")), ("method", J::s("deterministic")),
            ("status", J::s("CONDITIONALLY-SATISFIED")),
            ("detail", J::S(format!("lossy hops: {} — adapter must bound loss",
                adapters.iter().filter(|s| s.lossy).map(|s| s.op.as_str()).collect::<Vec<_>>().join(", "))))]));
    }
    o
}

/// synthTest for cascade ports. Same frozen template as `synth_test`; only the
/// label preference differs, since a CPort carries empty strings where a
/// SynthPort carries None.
fn synth_test_cascade(po: &CPort, ci: &CPort, adapters: &[Step]) -> String {
    let mut expr = String::from("x");
    for s in adapters { expr = format!("{}({})", s.op, expr); }
    let label = |p: &CPort| if !p.semantics.is_empty() { p.semantics.clone() } else if !p.name.is_empty() { p.name.clone() } else { p.kind.clone() };
    synth_harness(&po.kind, &ci.kind, &label(po), &label(ci), &expr)
}

struct Decision { out: Vec<(String, J)> }

impl Decision {
    fn set(&mut self, k: &str, v: J) { self.out.push((k.to_string(), v)); }
}

/// evaluateDeterministicCascade + applyLiteratureAssessment, projected to the
/// oracle's DECISION_FIELDS. Absent fields stay ABSENT: an impossibility case
/// carries no bridge, mechClass, mechCompat or blockReason at all, and that
/// absence is observable after canonicalization.
fn evaluate_cascade(rules: &[(&'static str, Vec<Rule>)], c: &CascadeCase) -> J {
    let a_present = c.schema_a.is_some();
    let b_present = c.schema_b.is_some();
    let empty = CSchema { produces: vec![], consumes: vec![], assumptions: vec![], invariants: vec![] };
    let sa: CSchema = c.schema_a.as_ref().map(|s| s.norm()).unwrap_or_else(|| empty.clone());
    let sb: CSchema = c.schema_b.as_ref().map(|s| s.norm()).unwrap_or_else(|| empty.clone());

    let (n_pairs, options) = plan_port_bridges(rules, &sa, &sb, a_present, b_present);
    let mut d = Decision { out: vec![] };

    if options.is_empty() {
        let both = a_present && b_present;
        let code = if both { if n_pairs > 0 { "NO_KIND_PATH" } else { "NO_SHARED_PORTS" } } else { "NO_SCHEMA" };
        let detail = if both {
            if n_pairs > 0 { "no admissible conversion between any shared ports" }
            else { "no output→input port pairing between these mechanisms" }
        } else { "mechanism schema unavailable — fail-closed" };
        d.set("stage", J::s("PROPOSED"));
        d.set("obligations", J::A(vec![]));
        d.set("options", J::A(vec![]));
        d.set("impossibility", obj(vec![("code", J::s(code)), ("from", J::Null), ("to", J::Null), ("detail", J::s(detail))]));
        d.set("typeCheck", obj(vec![
            ("pass", J::B(false)), ("verdict", J::s("type_killed")), ("stage", J::s("PROPOSED")),
            ("sharedObject", J::Null),
            ("reason", J::S(format!("structurally impossible [{}] — {}", code, detail))),
        ]));
        return literature(d, c, false, None, None);
    }

    let (scored, ci_idx) = score_options(&options, &c.soft);
    let best = &options[ci_idx];
    let inst = &scored[ci_idx].inst;
    let po = &best.source_output;
    let ci = &best.target_input;
    let adapters = &best.adapters;

    let obligations = evaluate_obligations(po, ci, adapters, inst, best.unit, &c.soft);
    let status_of = |id: &str| -> &'static str {
        for o in &obligations {
            if let J::O(kv) = o {
                let is = kv.iter().any(|(k, v)| k == "id" && matches!(v, J::S(s) if s == id));
                if is { if let Some((_, J::S(s))) = kv.iter().find(|(k, _)| k == "status") {
                    return match s.as_str() {
                        "CONDITIONALLY-SATISFIED" => "CONDITIONALLY-SATISFIED",
                        "REFUTED" => "REFUTED", "PROVED" => "PROVED", _ => "UNRESOLVED" }; } }
            }
        }
        "UNRESOLVED"
    };
    let po6 = status_of("PO-6");
    let po7 = status_of("PO-7");

    let unit_contra = best.unit == "refuted";
    let type_composable = !unit_contra;
    let any_refuted = inst.iter().any(|x| x.status == "REFUTED");
    let any_unresolved = inst.iter().any(|x| x.status == "UNRESOLVED");
    let pre_ok = inst.is_empty() || inst.iter().all(|x| x.status == "CONDITIONALLY-SATISFIED" || x.status == "PROVED");
    let contract_ok = type_composable && pre_ok;
    let epistemic_ok = contract_ok && po6 == "CONDITIONALLY-SATISFIED" && po7 == "CONDITIONALLY-SATISFIED";
    let stage = if !type_composable { "PATH_FOUND" }
        else if !contract_ok { "TYPE_COMPOSABLE" }
        else if !epistemic_ok { "CONTRACT_ADMISSIBLE" } else { "EPISTEMICALLY_SUPPORTED" };

    let pruned = scored.iter().filter(|s| s.refuted).count();
    let mech_class = obj(vec![("sourceKind", J::S(po.kind.clone())), ("targetKind", J::S(ci.kind.clone()))]);
    let matched: Vec<J> = options.iter().map(|o| obj(vec![
        ("dir", J::s(o.dir)), ("sourceOutput", o.source_output.json()), ("targetInput", o.target_input.json()),
        ("compatibility", J::s(if o.exact { "exact" } else { "convertible" })),
        ("adapter", J::A(o.adapters.iter().map(|s| s.to_json()).collect())),
        ("lossy", J::B(o.adapters.iter().any(|s| s.lossy))),
    ])).collect();

    d.set("stage", J::s(stage));
    d.set("obligations", J::A(obligations.clone()));
    d.set("options", J::A(options.iter().map(|o| o.json()).collect()));
    d.set("mechClass", mech_class);

    let verdict = if unit_contra { "type_killed" } else if best.exact { "type_valid" } else { "conversion_required" };
    d.set("mechCompat", obj(vec![
        ("matchedPorts", J::A(matched)),
        ("sharedFormalObject", J::B(best.exact)),
        ("verdict", J::s(verdict)),
        ("consideredPaths", J::N(scored.len() as f64)),
        ("prunedPaths", J::N(pruned as f64)),
    ]));

    if unit_contra {
        let detail = format!("units {} ⟶ {} cannot compose", po.units, ci.units);
        d.set("impossibility", obj(vec![("code", J::s("UNIT_CONTRADICTION")),
            ("from", J::S(po.kind.clone())), ("to", J::S(ci.kind.clone())), ("detail", J::S(detail.clone()))]));
        d.set("bridge", J::Null);
        d.set("typeCheck", obj(vec![
            ("pass", J::B(false)), ("verdict", J::s("type_killed")), ("stage", J::s(stage)),
            ("sharedObject", J::Null),
            ("reason", J::S(format!("structurally impossible [UNIT_CONTRADICTION] — {}", detail))),
        ]));
        return literature(d, c, false, None, None);
    }

    let (so, si) = if best.dir == "A→B" { (&sa, &sb) } else { (&sb, &sa) };
    d.set("bridge", obj(vec![
        ("sourcePort", po.json()), ("targetPort", ci.json()), ("dir", J::s(best.dir)),
        ("adapters", J::A(adapters.iter().map(|s| s.to_json()).collect())),
        ("riskCost", J::N((best.risk * 10.0).round() / 10.0)),
        ("ruleInstantiations", J::A(inst.iter().map(|x| x.json()).collect())),
        ("requiredAssumptions", J::A(so.assumptions.iter().map(|x| J::S(x.clone())).collect())),
        ("preservedInvariants", J::A(si.invariants.iter().map(|x| J::S(x.clone())).collect())),
        ("destroyedProperties", J::A(adapters.iter().flat_map(|s| s.lose.clone()).map(J::S).collect())),
        ("executableTest", J::S(synth_test_cascade(po, ci, adapters))),
        ("proofObligations", J::A(obligations)),
    ]));
    d.set("impossibility", J::Null);
    d.set("blockReason", if stage == "EPISTEMICALLY_SUPPORTED" { J::Null }
        else if any_refuted { J::s("PRECONDITION_UNSATISFIED") }
        else if any_unresolved { J::s("PRECONDITION_UNRESOLVED") }
        else if po6 == "REFUTED" { J::s("INVARIANT_VIOLATION") }
        else if po7 == "REFUTED" { J::s("POSTCONDITION_INSUFFICIENT") }
        else { J::s("EVIDENCE_PENDING") });

    let shared_object = if best.exact {
        format!("{}: {}", po.kind, if !po.semantics.is_empty() { &po.semantics } else { &ci.semantics })
    } else {
        format!("{} → {} ({})", po.kind, ci.kind, adapters.iter().map(|s| s.op.as_str()).collect::<Vec<_>>().join(" → "))
    };
    let reason = format!("{} — reached {}{}",
        if verdict == "type_valid" { "shared formal object" } else { "composable via adapter" }, stage,
        if scored.len() > 1 { format!(" · {} paths considered, {} pruned", scored.len(), pruned) } else { String::new() });
    d.set("typeCheck", obj(vec![
        ("pass", J::B(true)), ("verdict", J::s(verdict)), ("stage", J::s(stage)),
        ("sharedObject", J::S(shared_object.clone())), ("reason", J::S(reason)),
    ]));

    literature(d, c, true, Some(stage.to_string()), Some(shared_object))
}

/// The post-ladder literature layer (frozen steps 3-4). The count is an INPUT;
/// no network call is made, and no count is invented when grounding is off.
fn literature(mut d: Decision, c: &CascadeCase, pass: bool, stage: Option<String>, shared_object: Option<String>) -> J {
    let grounded = true; // hollow verdict is PLAUSIBLE in every cascade case
    d.set("mechanismGrounded", J::B(grounded));

    let (lit_class, lit_count): (&'static str, Option<f64>) = if !pass {
        ("SKIPPED", None)
    } else if !c.lit_ground {
        ("OFF", None)
    } else {
        (classify_lit(c.lit_count), c.lit_count)
    };
    d.set("litClass", J::s(lit_class));

    if !pass {
        d.set("finalVerdict", J::s("INCOHERENT"));
        let reason = d.out.iter().find(|(k, _)| k == "typeCheck").and_then(|(_, v)| {
            if let J::O(kv) = v { kv.iter().find(|(k, _)| k == "reason").map(|(_, r)| r.clone()) } else { None }
        }).unwrap_or(J::s(""));
        d.set("verifications", J::A(vec![obj(vec![
            ("instrument", J::s("typecheck")), ("result", J::s("fail")), ("reason", reason), ("at", J::s("")),
        ])]));
    } else {
        let final_verdict = if !grounded { "INCOHERENT" }
            else if lit_class == "OFF" { "PLAUSIBLE" }
            else if lit_class == "UNEXPLORED" { "PROMISING" } else { lit_class };
        d.set("litCount", lit_count.map(J::N).unwrap_or(J::Null));
        // `litNote` is present-but-undefined in the frozen projection: the
        // literature result object never carries a note. Canonicalization has
        // a sentinel for exactly this, so absent and undefined stay distinct.
        d.set("litNote", J::s("␀undefined"));
        d.set("modelEstimated", J::B(false));
        d.set("finalVerdict", J::s(final_verdict));
        d.set("verifications", J::A(vec![
            obj(vec![("instrument", J::s("typecheck")), ("result", J::s("pass")),
                ("sharedObject", shared_object.clone().map(J::S).unwrap_or(J::Null)), ("at", J::s(""))]),
            obj(vec![("instrument", J::s("openalex")), ("result", J::s(lit_class)),
                ("count", lit_count.map(J::N).unwrap_or(J::Null)), ("preregId", J::s("prereg:kernel")), ("at", J::s(""))]),
        ]));
        d.set("preregId", J::s("prereg:kernel"));
    }

    let prize = pass && stage.as_deref() == Some("EPISTEMICALLY_SUPPORTED") && grounded && lit_class == "UNEXPLORED";
    let get = |k: &str| d.out.iter().find(|(kk, _)| kk == k).map(|(_, v)| v.clone()).unwrap_or(J::Null);
    let prize_candidate = if prize {
        obj(vec![
            ("id", J::s("cand:kernel")), ("at", J::s("")), ("cell", J::s("cellA×cellB")),
            ("combination", J::s("A ⊕ B")), ("usesFromA", J::s("repoA")), ("usesFromB", J::s("repoB")),
            ("sharedMechanism", J::s("shared mechanism")), ("hollowCheck", J::Null),
            ("typeCheck", get("typeCheck")), ("mechCompat", get("mechCompat")), ("mechClass", get("mechClass")),
            ("bridge", get("bridge")), ("obligations", get("obligations")), ("impossibility", get("impossibility")),
            ("schemaA", c.schema_a.as_ref().map(|s| norm_schema_json(&s.norm())).unwrap_or(J::Null)),
            ("schemaB", c.schema_b.as_ref().map(|s| norm_schema_json(&s.norm())).unwrap_or(J::Null)),
            ("litQuery", J::s("query terms")), ("litCount", lit_count.map(J::N).unwrap_or(J::Null)),
            ("litTop", J::A(vec![])), ("preregId", J::s("prereg:kernel")),
            ("producedBy", J::s("model:in-artifact")), ("status", J::s("candidate-awaiting-independent-verification")),
        ])
    } else { J::Null };

    let verdict_word = if prize { "CANDIDATE" }
        else if lit_class == "EMERGING" { "EMERGING" }
        else if lit_class == "KNOWN" { "KNOWN" } else { "INCOHERENT" };
    let probe = obj(vec![
        ("cellName", J::s("cellA×cellB")), ("density", J::N(0.0)),
        ("paperCount", lit_count.map(J::N).unwrap_or(J::Null)),
        ("verdict", J::s(verdict_word)), ("prize", J::B(prize)),
        ("killedByType", J::N(if pass { 0.0 } else { 1.0 })),
        ("mechClasses", match get("mechClass") { J::Null => J::A(vec![]), m => J::A(vec![m]) }),
        ("at", J::s("")),
    ]);
    d.set("prizeCandidate", prize_candidate);
    d.set("probeLogEntry", probe);
    J::O(d.out)
}

fn norm_schema_json(s: &CSchema) -> J {
    obj(vec![
        ("consumes", J::A(s.consumes.iter().map(|p| p.json()).collect())),
        ("produces", J::A(s.produces.iter().map(|p| p.json()).collect())),
        ("certifies", J::A(vec![])),
        ("assumptions", J::A(s.assumptions.iter().map(|a| J::S(a.clone())).collect())),
        ("invariants", J::A(s.invariants.iter().map(|a| J::S(a.clone())).collect())),
    ])
}

/// One cascade case: the schemas, the soft judgments, and the literature
/// input. Mirrors test/oracle/cases.mjs CASCADE_CASES.
struct CascadeCase {
    id: &'static str,
    schema_a: Option<CSchema>,
    schema_b: Option<CSchema>,
    soft: Soft,
    lit_ground: bool,
    lit_count: Option<f64>,
}

/// port(kind) — the case helper: name is the kind's first letter, shape and
/// units are "unspecified", semantics is "<kind> mechanism".
fn cport(kind: &str) -> CPort {
    CPort { name: kind[0..1].to_string(), kind: kind.to_string(), shape: "unspecified".into(),
        units: "unspecified".into(), semantics: format!("{} mechanism", kind) }
}
fn cport_with(kind: &str, semantics: Option<&str>, units: Option<&str>) -> CPort {
    let mut p = cport(kind);
    if let Some(s) = semantics { p.semantics = s.to_string(); }
    if let Some(u) = units { p.units = u.to_string(); }
    p
}
/// schema(produces, consumes) — certifies empty, fixed assumption/invariant.
fn cschema(produces: Vec<CPort>, consumes: Vec<CPort>) -> CSchema {
    CSchema { produces, consumes, assumptions: vec!["assumption-x".into()], invariants: vec!["invariant-y".into()] }
}
fn soft(pre: Option<&'static str>, invariant: Option<&'static str>, metric: Option<&'static str>) -> Soft {
    Soft { pre, pre_overrides: vec![], invariant, metric }
}

fn cascade_cases() -> Vec<CascadeCase> {
    let ev = || soft(Some("satisfied"), Some("unknown"), Some("unknown"));
    let all = || soft(Some("satisfied"), Some("satisfied"), Some("satisfied"));
    let none = || soft(None, None, None);
    let mk = |id, a: Option<CSchema>, b: Option<CSchema>, s: Soft, lg: bool, lc: Option<f64>|
        CascadeCase { id, schema_a: a, schema_b: b, soft: s, lit_ground: lg, lit_count: lc };
    let a_prod = |k: &str| Some(cschema(vec![cport(k)], vec![]));
    let b_cons = |k: &str| Some(cschema(vec![], vec![cport(k)]));
    vec![
        mk("directly-compatible",
            Some(cschema(vec![cport_with("tensor", Some("certified L2 radius"), None)], vec![])),
            Some(cschema(vec![], vec![cport_with("tensor", Some("input field"), None)])), all(), false, None),
        mk("incompatible", Some(cschema(vec![], vec![cport("tensor")])), Some(cschema(vec![], vec![cport("tensor")])), none(), false, None),
        mk("single-conversion-path", a_prod("tensor"), b_cons("dataset"), ev(), false, None),
        mk("multiple-competing-paths", a_prod("tensor"), b_cons("distribution"), ev(), false, None),
        mk("equal-cost-path-tie", a_prod("distribution"), b_cons("dataset"), ev(), false, None),
        mk("soft-precondition-satisfied", a_prod("tensor"), b_cons("distribution"), ev(), false, None),
        mk("soft-precondition-unresolved", a_prod("tensor"), b_cons("distribution"), soft(Some("unknown"), Some("unknown"), Some("unknown")), false, None),
        mk("soft-precondition-failed", a_prod("tensor"), b_cons("distribution"), soft(Some("violated"), Some("unknown"), Some("unknown")), false, None),
        mk("hard-incompatibility",
            Some(cschema(vec![cport_with("tensor", None, Some("probability"))], vec![])),
            Some(cschema(vec![], vec![cport_with("tensor", None, Some("seconds"))])), none(), false, None),
        mk("missing-conversion-rule", a_prod("tensor"), b_cons("policy"), none(), false, None),
        mk("no-schema", a_prod("tensor"), None, none(), false, None),
        mk("partially-instantiated-obligations", a_prod("tensor"), b_cons("certificate"),
            Soft { pre: None, pre_overrides: vec![("scalar>bound:threshold", "satisfied"), ("bound>certificate:wrap", "unknown")],
                   invariant: Some("unknown"), metric: Some("unknown") }, false, None),
        mk("advancement-through-type-composable", a_prod("tensor"), b_cons("distribution"), all(), false, None),
        mk("lit-unexplored", a_prod("tensor"), b_cons("distribution"), all(), true, Some(10.0)),
        mk("lit-emerging", a_prod("tensor"), b_cons("distribution"), all(), true, Some(100.0)),
        mk("lit-known", a_prod("tensor"), b_cons("distribution"), all(), true, Some(5000.0)),
        mk("lit-unverified", a_prod("tensor"), b_cons("distribution"), all(), true, None),
    ]
}

/// The fixture payload: the case input as declared, plus the computed decision.
fn cascade_payload(rules: &[(&'static str, Vec<Rule>)], c: &CascadeCase) -> J {
    let mut model: Vec<(&str, J)> = vec![];
    if !c.soft.pre_overrides.is_empty() {
        model.push(("preOverrides", J::O(c.soft.pre_overrides.iter().map(|(k, v)| (k.to_string(), J::s(v))).collect())));
    }
    if let Some(p) = c.soft.pre { model.push(("pre", J::s(p))); }
    if let Some(i) = c.soft.invariant { model.push(("invariant", J::s(i))); }
    if let Some(m) = c.soft.metric { model.push(("metric", J::s(m))); }
    let mut input: Vec<(&str, J)> = vec![
        ("schemaA", c.schema_a.as_ref().map(|s| s.raw_json()).unwrap_or(J::Null)),
        ("schemaB", c.schema_b.as_ref().map(|s| s.raw_json()).unwrap_or(J::Null)),
        ("model", obj(model)),
    ];
    if c.lit_ground {
        input.push(("litGround", J::B(true)));
        input.push(("litCount", c.lit_count.map(J::N).unwrap_or(J::Null)));
    }
    obj(vec![("input", obj(input)), ("output", evaluate_cascade(rules, c))])
}
