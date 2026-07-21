
class Component extends DCLogic {
  SAMPLE = {"generatedAt":"2026-06-24T00:00:00Z","githubUser":"demo","repoCount":3,"repos":[{"id":"oif-kernel","name":"oif-kernel","description":"Governed multi-paradigm decision kernel with fail-closed gates.","topics":["governance","gates","epistemics"],"language":"Python","stars":4,"updatedAt":"2026-06-01T00:00:00Z","defaultBranch":"main","dependencies":["ed25519","numpy"],"readme":"# OIF Kernel\nNine intelligence lanes with fail-closed gate semantics. See also efds-stack for the signing chain.","fileTree":["src/kernel.py","INVARIANTS.md","SKILL.md"],"signalFiles":{"INVARIANTS.md":"- determinism\n- governed baselines","SKILL.md":"governed build"},"mentionsRepos":["efds-stack"],"enriched":true},{"id":"efds-stack","name":"efds-stack","description":"Exotic Field Discovery Stack: preregistration + Ed25519 signing + control-suite gate.","topics":["governance","epistemics","verification"],"language":"Python","stars":2,"updatedAt":"2026-05-20T00:00:00Z","defaultBranch":"main","dependencies":["ed25519","scipy"],"readme":"# EFDS\nChain-continuity verification with signed RunPacks.","fileTree":["src/sign.py","CONSTITUTION.md"],"signalFiles":{"CONSTITUTION.md":"fail-closed"},"mentionsRepos":[],"enriched":true},{"id":"causal-gate","name":"causal-gate","description":"Demonstrates a causal gate rejects reward hacks a benchmark-only gate accepts.","topics":["gates","evaluation"],"language":"Python","stars":1,"updatedAt":"2026-06-10T00:00:00Z","defaultBranch":"main","dependencies":["numpy","pytest"],"readme":"# causal-gate\nAblation-and-invariance check.","fileTree":["causal_gate.py","tests/test_gate.py"],"signalFiles":{},"mentionsRepos":[],"enriched":true}],"edges":[{"source":"oif-kernel","target":"efds-stack","type":"readme-reference","weight":3,"evidence":"oif-kernel's README mentions efds-stack"},{"source":"oif-kernel","target":"efds-stack","type":"shared-topic","weight":2,"evidence":"topics: epistemics, governance"},{"source":"oif-kernel","target":"efds-stack","type":"shared-dependency","weight":1,"evidence":"deps: ed25519"},{"source":"oif-kernel","target":"causal-gate","type":"shared-topic","weight":1,"evidence":"topics: gates"}]};

  LANG_COLORS = {"Python":"#5B8FF9","JavaScript":"#F6C744","TypeScript":"#4FC3F7","Rust":"#E07A5F","Go":"#43C6AC","Java":"#C97BB0","C++":"#9D8DF1","C":"#9D8DF1","Shell":"#8FBF6A","HTML":"#E08A4B","CSS":"#E0556B","Ruby":"#E0556B","Swift":"#F08A5D","Kotlin":"#B388FF","Julia":"#9558B2","_":"#8A8F98"};
  EDGE_COLORS = {"readme-reference":"#E8924A","shared-topic":"#5B8FF9","shared-dependency":"#43C6AC","naming-family":"#B884E8","shared-language":"#6E7787","provenance":"#E8C24A","manual":"#E86A9E"};
  MECH_KINDS = ["tensor","scalar","distribution","graph","subgraph","bound","certificate","proof_term","constraint_set","optimization_problem","program","trace","dataset","policy","claim","measurement"];
  CONV_RULES = {tensor:[{to:"distribution",op:"normalize",auth:"cur",pre:"nonneg & normalizable to unit mass",lose:["scale"]},{to:"measurement",op:"observe",auth:"cur",pre:"tensor is an observable quantity"},{to:"scalar",op:"reduce",lossy:true,auth:"ax",lose:["structure"]},{to:"dataset",op:"materialize",auth:"ax"}],distribution:[{to:"tensor",op:"parameterize",auth:"cur",pre:"finite parameterization exists"},{to:"scalar",op:"expectation",lossy:true,auth:"ax",lose:["variance","higher-moments"]},{to:"measurement",op:"sample",auth:"cur",pre:"sampling procedure defined"}],scalar:[{to:"bound",op:"threshold",auth:"cur",pre:"scalar is a comparable magnitude"},{to:"measurement",op:"record",auth:"ax"}],measurement:[{to:"scalar",op:"aggregate",lossy:true,auth:"ax"},{to:"dataset",op:"collect",auth:"ax"},{to:"trace",op:"timestamp",auth:"cur",pre:"measurements are ordered"}],graph:[{to:"subgraph",op:"restrict",lossy:true,auth:"ax",lose:["global-structure"]},{to:"constraint_set",op:"encode-edges",auth:"cur",pre:"edges express constraints"},{to:"tensor",op:"adjacency",auth:"ax"}],subgraph:[{to:"graph",op:"embed",auth:"ax"},{to:"program",op:"lower",lossy:true,auth:"cur",pre:"subgraph is executable"},{to:"tensor",op:"featurize",lossy:true,auth:"cur",pre:"a feature map is defined",lose:["topology"]}],bound:[{to:"certificate",op:"wrap",auth:"cur",pre:"bound is soundly derived"},{to:"claim",op:"assert",auth:"cur",pre:"bound supports the claim"}],certificate:[{to:"claim",op:"assert",auth:"ax"},{to:"proof_term",op:"reify",auth:"cur",pre:"certificate is machine-checkable"}],proof_term:[{to:"certificate",op:"extract",auth:"ax"},{to:"claim",op:"conclude",auth:"ax"}],constraint_set:[{to:"optimization_problem",op:"add-objective",auth:"cur",pre:"an objective is defined"},{to:"program",op:"compile",auth:"cur",pre:"constraints are executable"}],optimization_problem:[{to:"constraint_set",op:"drop-objective",lossy:true,auth:"ax",lose:["objective"]},{to:"program",op:"solve",auth:"cur",pre:"a solver exists"},{to:"bound",op:"dual-bound",auth:"cur",pre:"duality gap is bounded"}],program:[{to:"trace",op:"execute",auth:"cur",pre:"program terminates on the inputs"},{to:"certificate",op:"attest",lossy:true,auth:"cur",pre:"execution is independently verifiable"}],trace:[{to:"dataset",op:"log",auth:"ax"},{to:"measurement",op:"probe",auth:"ax"}],dataset:[{to:"tensor",op:"batch",auth:"ax"},{to:"distribution",op:"empirical",auth:"cur",pre:"samples are i.i.d."}],policy:[{to:"constraint_set",op:"encode",auth:"cur",pre:"policy is expressible as constraints"},{to:"program",op:"implement",auth:"cur",pre:"policy is executable"}],claim:[{to:"constraint_set",op:"formalize",auth:"cur",pre:"claim is fully formalizable (not normative/ambiguous/probabilistic)"}]};
  EDGE_LABEL = {"readme-reference":"README reference","shared-topic":"Shared topic","shared-dependency":"Shared dependency","naming-family":"Naming family","shared-language":"Shared language","provenance":"Provenance","manual":"See-also (manual)"};
  EDGE_SHORT = {"readme-reference":"README ref","shared-topic":"Shared topic","shared-dependency":"Shared dep","naming-family":"Naming family","shared-language":"Shared lang","provenance":"Provenance","manual":"See-also"};

  SYSTEM_PROMPT = "You propose possible technical combinations across software repositories, and you are adversarial about your own proposals. Rules: (1) Never propose a combination without naming the SPECIFIC capability drawn from each repo — cite a file, feature, or mechanism, never 'both are about AI'. (2) State the actual shared mechanism that makes them combinable. (3) If that mechanism is vague or generic, rate the combination LIKELY-HOLLOW. (4) Prefer rejecting a clean-sounding combination over shipping one whose mechanism you cannot state precisely. (5) For each combination give a concrete hollow-check: what would have to be true for this to be real, and how to falsify it. Return ONLY a JSON array, no prose, no markdown fences. Each element: {\"combination\": string, \"usesFromA\": string, \"usesFromB\": string, \"sharedMechanism\": string, \"hollowCheck\": string, \"verdict\": \"PROMISING\" | \"SPECULATIVE\" | \"LIKELY-HOLLOW\"}.";

  UBIQUITOUS = ["react","typescript","numpy","requests","lodash","express","jest","pytest","eslint","prettier","webpack","vite","axios","scipy","pandas"];
  SIGNAL_NAMES = ["SKILL.md","INVARIANTS.md","CONSTITUTION.md","SEED.md","ACTIONAL.md","MODALITY.md","package.json","pyproject.toml","Cargo.toml","requirements.txt"];
  SCIENCE_QUERIES = ["topic:physics","topic:astronomy","topic:astrophysics","topic:cosmology","topic:mathematics","topic:scientific-computing","topic:numerical-methods","topic:computational-physics","topic:bioinformatics","topic:computational-biology","topic:genomics","topic:chemistry","topic:quantum-computing","topic:statistics","topic:linear-algebra","topic:differential-equations","topic:optimization","topic:simulation","topic:neuroscience","topic:geophysics","topic:fluid-dynamics","topic:climate-science","topic:mathematical-modeling","topic:data-science"];

  SCIENCE_QUERIES = ["topic:ai-safety","topic:ai-alignment","topic:alignment","topic:interpretability","topic:mechanistic-interpretability","topic:ai-governance","topic:ai-evaluation","topic:evals","topic:model-evaluation","topic:eval-harness","topic:red-teaming","topic:rlhf","topic:scalable-oversight","topic:oversight","topic:formal-verification","topic:neural-network-verification","topic:adversarial-robustness","topic:epistemics","topic:ai-ethics","topic:llm-evaluation","topic:safety-benchmarks"];

  DOMAINS = [
    { key: "Alignment", color: "#36e0ff", litTerm: "AI alignment RLHF reward modeling", topics: ["alignment","ai-alignment","rlhf","reward-modeling","reward-model","scalable-oversight","oversight","instruction-tuning","preference-learning","dpo","constitutional-ai","value-alignment"] },
    { key: "Interp", color: "#ff5ec4", litTerm: "mechanistic interpretability neural networks", topics: ["interpretability","mechanistic-interpretability","explainable-ai","xai","explainability","feature-attribution","probing","saliency","circuits","sparse-autoencoder","activation-patching","feature-visualization"] },
    { key: "Evals", color: "#9cff57", litTerm: "language model evaluation benchmark", topics: ["ai-evaluation","evals","model-evaluation","eval-harness","llm-evaluation","evaluation","benchmark","benchmarks","safety-benchmarks","llm-eval","leaderboard"] },
    { key: "RedTeam", color: "#ff8a5b", litTerm: "LLM red teaming jailbreak prompt injection", topics: ["red-teaming","redteaming","jailbreak","jailbreaking","prompt-injection","adversarial-prompting","attacks","llm-attacks"] },
    { key: "Robustness", color: "#e0556b", litTerm: "adversarial robustness certified defense", topics: ["adversarial-robustness","robustness","adversarial-examples","certified-robustness","adversarial","adversarial-attacks","adversarial-defense","adversarial-training"] },
    { key: "Verification", color: "#9a6cff", litTerm: "formal verification neural network", topics: ["formal-verification","neural-network-verification","formal-methods","model-checking","verification","theorem-proving","certified","provable-guarantees"] },
    { key: "Governance", color: "#ffd84a", litTerm: "AI governance policy regulation", topics: ["ai-governance","ai-policy","ai-regulation","responsible-ai","governance","ai-ethics","ethics","ai-law","compliance","auditing","ai-audit"] },
    { key: "Epistemics", color: "#43C6AC", litTerm: "language model calibration uncertainty truthfulness", topics: ["epistemics","calibration","uncertainty-quantification","uncertainty","forecasting","truthfulness","hallucination","factuality","honesty","knowledge"] },
    { key: "Oversight", color: "#b884e8", litTerm: "AI control monitoring guardrails runtime", topics: ["gates","guardrails","safety-filters","content-moderation","monitoring","control","ai-control","runtime-monitoring","safety-gates","governed","fail-closed"] }
  ];

  App = () => {
    const h = React.createElement;
    const { useState, useRef, useEffect, useMemo, useCallback } = React;
    const LANG = this.LANG_COLORS, EDGEC = this.EDGE_COLORS, EDGEL = this.EDGE_LABEL, EDGES = this.EDGE_SHORT, SYS = this.SYSTEM_PROMPT, MECH_KINDS = this.MECH_KINDS, CONV_RULES = this.CONV_RULES;
    const UBIQ = new Set(this.UBIQUITOUS), SIGSET = new Set(this.SIGNAL_NAMES);
    const STORE = (typeof window !== "undefined" && window.storage) ? window.storage : null;
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const [data, setData] = useState(() => this.SAMPLE);
    const [err, setErr] = useState("");
    const [sel, setSel] = useState(null);
    const [combo, setCombo] = useState([]);
    const [search, setSearch] = useState("");
    const [edgeTypes, setEdgeTypes] = useState({ "readme-reference": true, "shared-topic": true, "shared-dependency": true, "naming-family": true, "shared-language": true, "provenance": true, "manual": true });
    const [langOff, setLangOff] = useState({});
    const [recency, setRecency] = useState(100);
    const [cluster, setCluster] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [edgeInfo, setEdgeInfo] = useState(null);
    const [synth, setSynth] = useState(null);
    const [showSynth, setShowSynth] = useState(false);
    const [openSig, setOpenSig] = useState(null);
    const [d3ready, setD3ready] = useState(!!window.d3);
    const [readmeOpen, setReadmeOpen] = useState(true);
    const [treeOpen, setTreeOpen] = useState(false);
    const [expandCard, setExpandCard] = useState({});

    // second-brain state
    const [synthNodes, setSynthNodes] = useState([]);
    const [notes, setNotes] = useState({});
    const [manualLinks, setManualLinks] = useState([]);
    const [negatives, setNegatives] = useState([]);
    const [storeErr, setStoreErr] = useState("");
    const [onlySynth, setOnlySynth] = useState(false);
    const [focusNode, setFocusNode] = useState(null);
    const [linking, setLinking] = useState(null);

    // live fetch state
    const [showFetch, setShowFetch] = useState(false);
    const [ghUser, setGhUser] = useState("");
    const [ghToken, setGhToken] = useState("");
    const [includeForks, setIncludeForks] = useState(false);
    const [fetchState, setFetchState] = useState(null);
    const [enrichMode, setEnrichMode] = useState("click");
    const [enrichProg, setEnrichProg] = useState(null);
    const [rate, setRate] = useState(null);
    const [enrichingIds, setEnrichingIds] = useState({});
    const [related, setRelated] = useState(null);
    const [view, setView] = useState("galaxy");
    const [gap, setGap] = useState(null);
    const [cellHi, setCellHi] = useState(null);
    const [probeLog, setProbeLog] = useState([]);
    const [litGround, setLitGround] = useState(true);
    const [frontier, setFrontier] = useState(null);
    const [preregs, setPreregs] = useState([]);
    const [candidates, setCandidates] = useState([]);
    const [calibration, setCalibration] = useState([]);
    const [mechCal, setMechCal] = useState({});
    const mechCalRef = useRef({}); useEffect(() => { mechCalRef.current = mechCal; }, [mechCal]);
    const [showCortex, setShowCortex] = useState(false);
    const [cortexTab, setCortexTab] = useState("calibration");
    const preregsRef = useRef([]); useEffect(() => { preregsRef.current = preregs; }, [preregs]);
    const candidatesRef = useRef([]); useEffect(() => { candidatesRef.current = candidates; }, [candidates]);
    const calibrationRef = useRef([]); useEffect(() => { calibrationRef.current = calibration; }, [calibration]);
    const generateRef = useRef(null);
    const genCounterRef = useRef(0);
    const firstPrizeRef = useRef(false);
    const litBlockedRef = useRef(false);
    const frontierRef = useRef(null); useEffect(() => { frontierRef.current = frontier; }, [frontier]);
    const scanFrontierRef = useRef(null);
    const exploreGapRef = useRef(null);
    const probeLogRef = useRef([]); useEffect(() => { probeLogRef.current = probeLog; }, [probeLog]);
    const gapRef = useRef(null);
    const [showDiscover, setShowDiscover] = useState(false);
    const [discoverState, setDiscoverState] = useState(null);
    const [discoverText, setDiscoverText] = useState(this.SCIENCE_QUERIES.join("\n"));
    const discoverCancelRef = useRef(false);
    const discoverBusyRef = useRef(false);
    const discoverRunRef = useRef(null);
    const enrichCancelRef = useRef(false);
    const rateRef = useRef(null);
    const enrichRunningRef = useRef(false);
    const enrichAllRef = useRef(null);
    const resumedRef = useRef(false);
    const haloCacheRef = useRef({});
    const lastDrawRef = useRef(0);
    const cellHiRef = useRef(null);
    const noteTimers = useRef({});

    const wrapRef = useRef(null), canvasRef = useRef(null), tipRef = useRef(null);
    const simRef = useRef(null), nodesRef = useRef([]), linksRef = useRef([]);
    const nodeMapRef = useRef(new Map());
    const tRef = useRef({ k: 1, x: 0, y: 0 });
    const sizeRef = useRef({ w: 800, h: 600 });
    const hoverRef = useRef(null), hoverNbrRef = useRef(new Set());
    const dragRef = useRef(null), panRef = useRef(null), downRef = useRef(null);
    const drawRef = useRef(null), centeredRef = useRef(false);
    const dataRef = useRef(data); useEffect(() => { dataRef.current = data; }, [data]);

    useEffect(() => {
      if (window.d3) { setD3ready(true); return; }
      const iv = setInterval(() => { if (window.d3) { setD3ready(true); clearInterval(iv); } }, 60);
      return () => clearInterval(iv);
    }, []);

    const repos = data.repos || [];
    const byId = useMemo(() => { const m = {}; repos.forEach(r => { if (r && r.id) m[r.id] = r; }); return m; }, [data]);
    const synthById = useMemo(() => { const m = {}; synthNodes.forEach(s => m[s.id] = s); return m; }, [synthNodes]);
    const langs = useMemo(() => { const s = new Set(); repos.forEach(r => s.add(r.language || "Other")); return [...s].sort(); }, [data]);

    // ---------- domain classification + fusion matrix (from topics; zero enrichment) ----------
    const DOMAINS = this.DOMAINS;
    const domTopicMap = useMemo(() => { const m = {}; DOMAINS.forEach((d, i) => d.topics.forEach(t => { (m[t] = m[t] || []).push(i); })); return m; }, []);
    const classify = useMemo(() => {
      // repoDomains[id] = Set of domain indices; per-domain member arrays
      const repoDomains = {}; const members = DOMAINS.map(() => []);
      repos.forEach(r => {
        const set = new Set();
        (r.topics || []).forEach(t => { const di = domTopicMap[String(t).toLowerCase()]; if (di) di.forEach(i => set.add(i)); });
        repoDomains[r.id] = set;
        set.forEach(i => members[i].push(r));
      });
      return { repoDomains, members };
    }, [data]);
    const matrix = useMemo(() => {
      const N = DOMAINS.length, M = Array.from({ length: N }, () => new Array(N).fill(0)); const cellRepos = {};
      repos.forEach(r => {
        const ds = [...(classify.repoDomains[r.id] || [])];
        if (ds.length === 1) { M[ds[0]][ds[0]]++; (cellRepos[ds[0] + "_" + ds[0]] = cellRepos[ds[0] + "_" + ds[0]] || []).push(r); }
        for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++) { const i = ds[a], j = ds[b]; M[i][j]++; M[j][i]++; const key = Math.min(i, j) + "_" + Math.max(i, j); (cellRepos[key] = cellRepos[key] || []).push(r); }
      });
      let maxOff = 1, maxDiag = 1; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (i === j) maxDiag = Math.max(maxDiag, M[i][j]); else maxOff = Math.max(maxOff, M[i][j]); }
      const classified = repos.filter(r => (classify.repoDomains[r.id] || new Set()).size > 0).length;
      return { M, cellRepos, maxOff, maxDiag, N, classified };
    }, [data, classify]);
    const fam = (name) => (String(name || "").split(/[-_./ ]/)[0] || name || "").toLowerCase();
    const radiusFor = (r) => Math.max(6, Math.min(24, 5 + 1.85 * Math.sqrt((r.fileTree || []).length)));
    const langColor = (l) => LANG[l] || LANG._;
    const COSMIC = ["#36e0ff", "#ff5ec4", "#b48cff", "#9cff57", "#ffd84a", "#5b8fff", "#ff8a5b", "#4ad9c0"];
    const regionColor = (n) => { if (n.kind === "synth") return "#ffe27a"; const key = fam(n.kind === "cluster" ? n.family : ((n.repo && n.repo.name) || n.id)); let hsh = 0; for (let i = 0; i < key.length; i++) hsh = (hsh * 31 + key.charCodeAt(i)) >>> 0; return COSMIC[hsh % COSMIC.length]; };
    const hexA = (hex, a) => { const m = String(hex).replace("#", ""); const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m; const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16); return "rgba(" + r + "," + g + "," + b + "," + a + ")"; };
    const fmtDate = (s) => { const d = new Date(s); return isNaN(d) ? "—" : d.toISOString().slice(0, 10); };
    const fmtTime = (epoch) => { try { return new Date(epoch * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return "?"; } };

    // ---------- deterministic edge computation (scales via hub topology) ----------
    const computeEdges = useCallback((list) => {
      list = list || []; const n = list.length; const edges = []; const idByName = {}; list.forEach(r => idByName[r.name] = r.id);
      // readme-reference (directed, enrichment-derived)
      list.forEach(a => (a.mentionsRepos || []).forEach(bn => { if (idByName[bn] && bn !== a.name) edges.push({ source: a.id, target: idByName[bn], type: "readme-reference", weight: 3, evidence: a.name + "'s README mentions " + bn }); }));
      // shared-topic: connect each repo in a topic to that topic's star-hub → topic constellations (O(n) not O(n²))
      const topicMap = {}; list.forEach(r => (r.topics || []).forEach(t => { (topicMap[t] = topicMap[t] || []).push(r); }));
      Object.entries(topicMap).forEach(([t, g]) => { if (g.length < 2) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 60); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-topic", weight: 1, evidence: "topic: " + t }); });
      // shared-dependency: pairwise but only over the (small) enriched set
      const enr = list.filter(r => r.enriched && (r.dependencies || []).length);
      if (enr.length * (enr.length - 1) / 2 <= 80000) for (let i = 0; i < enr.length; i++) for (let j = i + 1; j < enr.length; j++) { const sd = (enr[i].dependencies || []).filter(d => (enr[j].dependencies || []).includes(d) && !UBIQ.has(d)); if (sd.length >= 2) edges.push({ source: enr[i].id, target: enr[j].id, type: "shared-dependency", weight: sd.length, evidence: "deps: " + sd.slice(0, 5).join(", ") }); }
      // naming-family hubs
      const byFam = {}; list.forEach(r => { const f = fam(r.name); (byFam[f] = byFam[f] || []).push(r); });
      Object.entries(byFam).forEach(([f, g]) => { if (f.length < 2 || g.length < 2 || g.length > 30) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "naming-family", weight: 2, evidence: "naming family: " + f + "-*" }); });
      // shared-language hubs (weak; only modest groups to avoid hairball)
      const byLang = {}; list.forEach(r => { if (r.language) (byLang[r.language] = byLang[r.language] || []).push(r); });
      Object.entries(byLang).forEach(([l, g]) => { if (g.length < 2 || g.length > 14) return; const grp = g.slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)); const hub = grp[0]; for (let i = 1; i < grp.length; i++) edges.push({ source: hub.id, target: grp[i].id, type: "shared-language", weight: 1, evidence: "both " + l }); });
      return edges;
    }, []);

    // ---------- persistence ----------
    const sset = useCallback(async (key, val) => { if (!STORE) return; try { await STORE.set(key, JSON.stringify(val), false); } catch (e) { setStoreErr("save failed (" + key + "): " + e.message); } }, []);
    const sdel = useCallback(async (key) => { if (!STORE) return; try { await STORE.delete(key); } catch (e) {} }, []);
    const slistGet = useCallback(async (prefix) => {
      if (!STORE) return [];
      let keys = []; try { keys = await STORE.list(prefix) || []; } catch (e) { setStoreErr("list failed: " + e.message); return []; }
      const out = [];
      for (const k of keys) { const key = typeof k === "string" ? k : (k && (k.key || k.name)); if (!key) continue; try { const v = await STORE.get(key); if (v != null) out.push({ key, val: JSON.parse(v) }); } catch (e) {} }
      return out;
    }, []);
    const persistRepo = useCallback((r) => {
      if (!STORE) return; const base = { ...r };
      try { if (JSON.stringify(base).length > 4000000) { sset("readme:" + r.id, r.readme || ""); base.readme = ""; base._readmeLazy = true; } } catch (e) {}
      sset("repo:" + r.id, base);
    }, [sset]);

    // hydrate on mount
    useEffect(() => { (async () => {
      if (!STORE) { setStoreErr("window.storage unavailable — this session will not persist."); return; }
      try {
        const [rRepos, rSynth, rNotes, rLinks, rNeg, rPre, rCand, rCal, rMech] = await Promise.all([slistGet("repo:"), slistGet("synth:"), slistGet("note:"), slistGet("link:"), slistGet("neg:"), slistGet("prereg:"), slistGet("cand:"), slistGet("cal:"), slistGet("mech:")]);
        if (rMech.length) { const mc = {}; rMech.forEach(x => { const k = x.val.sourceKind + ">" + x.val.targetKind; mc[k] = x.val; }); setMechCal(mc); }
        if (rPre.length) setPreregs(rPre.map(x => x.val));
        if (rCand.length) { setCandidates(rCand.map(x => x.val)); firstPrizeRef.current = true; }
        if (rCal.length) setCalibration(rCal.map(x => x.val));
        if (rSynth.length) setSynthNodes(rSynth.map(x => x.val));
        if (rNotes.length) { const o = {}; rNotes.forEach(x => { if (x.val && x.val.id) o[x.val.id] = x.val.text; }); setNotes(o); }
        if (rLinks.length) setManualLinks(rLinks.map(x => x.val));
        if (rNeg.length) setNegatives(rNeg.map(x => x.val));
        if (rRepos.length) {
          const reposArr = rRepos.map(x => x.val);
          for (const r of reposArr) { if (r._readmeLazy) { try { const rv = await STORE.get("readme:" + r.id); if (rv != null) r.readme = JSON.parse(rv); } catch (e) {} } }
          nodeMapRef.current = new Map(); centeredRef.current = false;
          setData({ generatedAt: new Date().toISOString(), githubUser: (reposArr[0] && reposArr[0]._user) || "brain", repoCount: reposArr.length, repos: reposArr, edges: computeEdges(reposArr) });
          const pending = reposArr.filter(r => !r.enriched && r._user).length;
          if (pending && !resumedRef.current) { resumedRef.current = true; setFetchState({ listed: reposArr.length, absorbing: true, resumed: pending }); setTimeout(() => { enrichAllRef.current && enrichAllRef.current(); }, 1000); }
        }
      } catch (e) { setStoreErr("hydrate failed: " + e.message); }
    })(); }, []);

    // ---------- graph (filtered/clustered + tiers) ----------
    const provClosure = useCallback((start) => {
      const adj = {}; const add = (a, b) => { (adj[a] = adj[a] || new Set()).add(b); (adj[b] = adj[b] || new Set()).add(a); };
      synthNodes.forEach(s => (s.parents || []).forEach(p => add(s.id, p)));
      const seen = new Set([start]), stack = [start];
      while (stack.length) { const x = stack.pop(); (adj[x] ? [...adj[x]] : []).forEach(y => { if (!seen.has(y)) { seen.add(y); stack.push(y); } }); }
      return seen;
    }, [synthNodes]);

    const graph = useMemo(() => {
      const map = nodeMapRef.current;
      const times = repos.map(r => Date.parse(r.updatedAt) || 0).filter(Boolean);
      const minT = times.length ? Math.min(...times) : 0, maxT = times.length ? Math.max(...times) : 0;
      const cutoff = recency >= 100 ? -Infinity : maxT - (recency / 100) * (maxT - minT);
      let visRepos = repos.filter(r => !langOff[r.language || "Other"] && ((Date.parse(r.updatedAt) || 0) >= cutoff));
      let allowSynth = new Set(synthNodes.map(s => s.id));
      if (onlySynth) { const keep = new Set(); synthNodes.forEach(s => (s.parents || []).forEach(p => { if (byId[p]) keep.add(p); })); visRepos = visRepos.filter(r => keep.has(r.id)); }
      if (focusNode) { const clo = provClosure(focusNode); visRepos = visRepos.filter(r => clo.has(r.id)); allowSynth = new Set([...allowSynth].filter(id => clo.has(id))); }
      const visIds = new Set(visRepos.map(r => r.id));

      const families = {}; visRepos.forEach(r => { const f = fam(r.name); (families[f] = families[f] || []).push(r.id); });
      const collapsed = {};
      if (cluster) Object.entries(families).forEach(([f, ids]) => { if (ids.length >= 2 && !expanded[f]) ids.forEach(id => collapsed[id] = "fam:" + f); });

      const nodes = []; const present = new Set();
      visRepos.forEach(r => { if (collapsed[r.id]) return; let n = map.get(r.id); if (!n) { n = { id: r.id }; map.set(r.id, n); } n.kind = "repo"; n.repo = r; n.r = radiusFor(r); nodes.push(n); present.add(r.id); });
      Object.entries(families).forEach(([f, ids]) => { if (cluster && ids.length >= 2 && !expanded[f]) { const cid = "fam:" + f; let n = map.get(cid); if (!n) { n = { id: cid }; map.set(cid, n); } n.kind = "cluster"; n.family = f; n.members = ids; n.r = Math.min(34, 11 + 3.2 * Math.sqrt(ids.length)); nodes.push(n); present.add(cid); } });
      synthNodes.forEach(s => { if (!allowSynth.has(s.id)) return; let n = map.get(s.id); if (!n) { n = { id: s.id }; map.set(s.id, n); } n.kind = "synth"; n.synth = s; n.r = 10 + Math.min(8, (s.depth || 1) * 2); nodes.push(n); present.add(s.id); });

      const resolve = id => collapsed[id] || id;
      const lmap = {};
      (data.edges || []).forEach(e => {
        if (!e || !edgeTypes[e.type]) return;
        if (!visIds.has(e.source) || !visIds.has(e.target)) return;
        const s = resolve(e.source), t = resolve(e.target); if (s === t) return;
        const a = s < t ? s : t, b = s < t ? t : s, key = a + "|" + b + "|" + e.type;
        if (!lmap[key]) lmap[key] = { source: a, target: b, type: e.type, weight: 0, evidence: [] };
        lmap[key].weight += e.weight || 1; if (e.evidence) lmap[key].evidence.push(e.evidence);
      });
      const links = Object.values(lmap);
      if (edgeTypes["provenance"]) synthNodes.forEach(s => { if (!present.has(s.id)) return; (s.parents || []).forEach(p => { if (present.has(p)) links.push({ source: s.id, target: p, type: "provenance", weight: 1, evidence: ["promoted from " + p] }); }); });
      if (edgeTypes["manual"]) manualLinks.forEach(l => { const s = resolve(l.source), t = resolve(l.target); if (present.has(s) && present.has(t) && s !== t) links.push({ source: s, target: t, type: "manual", weight: 2, evidence: ["manual see-also link"], linkId: l.id }); });

      const deg = {}; links.forEach(l => { deg[l.source] = (deg[l.source] || 0) + 1; deg[l.target] = (deg[l.target] || 0) + 1; });
      nodes.forEach(n => { n.deg = deg[n.id] || 0; });
      const sig = nodes.map(n => n.id).join(",") + "::" + links.map(l => l.source + ">" + l.target + ":" + l.type).join(",");
      return { nodes, links, sig, minT, maxT };
    }, [data, langOff, recency, edgeTypes, cluster, expanded, synthNodes, manualLinks, onlySynth, focusNode]);

    // ---------- d3 simulation ----------
    useEffect(() => {
      if (!d3ready) return;
      const d3 = window.d3, { nodes, links } = graph;
      const connectedN = nodes.filter(n => n.deg > 0).length;
      const orphans = nodes.filter(n => n.deg === 0);
      const coreR = 130 + Math.sqrt(Math.max(1, connectedN)) * 24, perRing = 26;
      orphans.forEach((n, i) => { n._ring = Math.floor(i / perRing); });
      const ringR = n => coreR + 60 + (n._ring || 0) * 46;
      nodes.forEach(n => { if (n.x == null) { const a = Math.random() * 6.28, rr = n.deg === 0 ? ringR(n) : 30 + Math.random() * 160; n.x = Math.cos(a) * rr; n.y = Math.sin(a) * rr; } });
      const sim = d3.forceSimulation(nodes)
        .velocityDecay(0.55)
        .force("charge", d3.forceManyBody().strength(n => n.deg === 0 ? -55 : -300))
        .force("link", d3.forceLink(links).id(d => d.id).distance(l => 70 + (l.type === "readme-reference" ? 0 : 30)).strength(l => Math.min(0.9, 0.18 + 0.12 * l.weight)))
        .force("center", d3.forceCenter(0, 0))
        .force("collide", d3.forceCollide().radius(d => d.r + 7).strength(0.9))
        .force("radial", d3.forceRadial(n => n.deg === 0 ? ringR(n) : 0, 0, 0).strength(n => n.deg === 0 ? 0.6 : 0))
        .force("x", d3.forceX(0).strength(n => n.deg === 0 ? 0 : 0.04)).force("y", d3.forceY(0).strength(n => n.deg === 0 ? 0 : 0.04))
        .on("tick", () => {
          const c = Math.cos(0.0009), s = Math.sin(0.0009);
          for (const n of orphans) { if (n.fx != null) continue; const nx = n.x * c - n.y * s, ny = n.x * s + n.y * c; n.x = nx; n.y = ny; }
          nodesRef.current = nodes; linksRef.current = links; drawRef.current && drawRef.current();
        });
      sim.alphaMin(0.0005);
      simRef.current = sim; nodesRef.current = nodes; linksRef.current = links;
      sim.alpha(nodes.length > 1200 ? 0.25 : 0.9).restart();
      const t = setTimeout(() => { if (!centeredRef.current) { fitView(); centeredRef.current = true; } sim.alphaTarget(nodes.length > 1500 ? 0 : 0.012).restart(); }, 350);
      return () => { clearTimeout(t); sim.stop(); };
    }, [graph.sig, d3ready]);

    // ---------- canvas size ----------
    const sizeCanvas = useCallback(() => {
      const wrap = wrapRef.current, cv = canvasRef.current; if (!wrap || !cv) return;
      const r = wrap.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: r.width, h: r.height };
      cv.width = Math.max(1, Math.floor(r.width * dpr)); cv.height = Math.max(1, Math.floor(r.height * dpr));
      cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
      if (!centeredRef.current) { tRef.current = { k: 1, x: r.width / 2, y: r.height / 2 }; }
      drawRef.current && drawRef.current();
    }, []);
    useEffect(() => {
      sizeCanvas();
      const raf = requestAnimationFrame(sizeCanvas);
      const wrap = wrapRef.current;
      let ro; if (wrap && window.ResizeObserver) { ro = new ResizeObserver(() => sizeCanvas()); ro.observe(wrap); }
      window.addEventListener("resize", sizeCanvas);
      return () => { cancelAnimationFrame(raf); ro && ro.disconnect(); window.removeEventListener("resize", sizeCanvas); };
    }, [sizeCanvas]);

    const searchActive = search.trim().length > 0;
    const matchNode = useCallback((n) => {
      const q = search.trim().toLowerCase(); if (!q) return true;
      const note = (notes[n.id] || "").toLowerCase();
      if (n.kind === "cluster") return n.family.includes(q) || (n.members || []).some(id => { const r = byId[id]; return r && (r.name + " " + (r.description || "") + " " + (r.topics || []).join(" ")).toLowerCase().includes(q); });
      if (n.kind === "synth") { const s = n.synth; return ((s.combination || "") + " " + (s.sharedMechanism || "") + " " + note).toLowerCase().includes(q); }
      const r = n.repo; return (r.name + " " + (r.description || "") + " " + (r.topics || []).join(" ") + " " + note).toLowerCase().includes(q);
    }, [search, byId, notes]);

    // ---------- draw ----------
    const draw = useCallback(() => {
      const cv = canvasRef.current; if (!cv) return;
      const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
      const { k, x, y } = tRef.current, { w, h } = sizeRef.current;
      const T = performance.now();
      const big = nodesRef.current.length > 150;
      if (big && T - (lastDrawRef.current || 0) < 33) return;
      lastDrawRef.current = T;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#06070a"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k * dpr, 0, 0, k * dpr, x * dpr, y * dpr);
      const nodes = nodesRef.current, links = linksRef.current;
      const hov = hoverRef.current, comboSet = new Set(combo);

      // focus / lit constellation
      const focusId = (hov && hov.id) || sel;
      let litSet = null;
      if (searchActive) { litSet = new Set(); nodes.forEach(n => { if (matchNode(n)) litSet.add(n.id); }); }
      else if (cellHiRef.current && cellHiRef.current.size) { litSet = cellHiRef.current; }
      else if (focusId) { litSet = new Set([focusId]); links.forEach(l => { if (l.source.id === focusId) litSet.add(l.target.id); else if (l.target.id === focusId) litSet.add(l.source.id); }); }
      const litOf = (id) => !litSet || litSet.has(id);

      // ignite easing (ghost -> star) + twinkle phase
      nodes.forEach(n => {
        if (n._ph == null) n._ph = ((n.id.charCodeAt(0) || 0) * 1.7 + (n.id.length || 0)) % 6.283;
        const tgt = n.kind !== "repo" ? 1 : (n.repo && n.repo.enriched ? 1 : 0.14);
        if (n._ig == null) n._ig = tgt; else n._ig += (tgt - n._ig) * 0.07;
      });

      const haloSprite = (color) => { const c = haloCacheRef.current; if (c[color]) return c[color]; const s = 128, cv2 = document.createElement("canvas"); cv2.width = cv2.height = s; const g2 = cv2.getContext("2d"); const grad = g2.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); grad.addColorStop(0, hexA(color, 0.55)); grad.addColorStop(0.35, hexA(color, 0.2)); grad.addColorStop(1, hexA(color, 0)); g2.fillStyle = grad; g2.fillRect(0, 0, s, s); c[color] = cv2; return cv2; };
      const flatEdges = links.length > 300;
      // ---- EDGES (additive, cool blue→violet, under nodes) ----
      ctx.globalCompositeOperation = "lighter";
      links.forEach(l => {
        if (!l.source || l.source.x == null || !l.target || l.target.x == null) return;
        const enrichGated = l.type === "shared-dependency" || l.type === "readme-reference";
        const ig = enrichGated ? Math.min(l.source._ig || 1, l.target._ig || 1) : 1;
        let base = 0.06 + Math.min(0.16, l.weight * 0.03);
        if (litSet) base *= (litOf(l.source.id) && litOf(l.target.id)) ? 1.7 : 0.1;
        const a = base * (0.2 + 0.8 * ig);
        if (a < 0.012) return;
        ctx.globalAlpha = a;
        ctx.lineWidth = Math.max(0.5, Math.min(3.2, 0.5 + l.weight * 0.5)) / k;
        if (l.type === "manual") { ctx.strokeStyle = "#ff6ab0"; ctx.setLineDash([6 / k, 4 / k]); }
        else if (l.type === "provenance") { ctx.strokeStyle = "#ffd84a"; ctx.setLineDash([2 / k, 3 / k]); }
        else if (flatEdges) { ctx.strokeStyle = "#5566ff"; ctx.setLineDash([]); }
        else { const g = ctx.createLinearGradient(l.source.x, l.source.y, l.target.x, l.target.y); g.addColorStop(0, "#3a7bff"); g.addColorStop(1, "#9a6cff"); ctx.strokeStyle = g; ctx.setLineDash([]); }
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      });
      ctx.setLineDash([]);

      // ---- HALOS (additive bloom, sprite-cached) ----
      nodes.forEach(n => {
        if (n.x == null) return;
        const lit = litOf(n.id), ig = n._ig == null ? 1 : n._ig, deg = n.deg || 0;
        const col = n.kind === "synth" ? "#ffe27a" : (n.kind === "cluster" ? "#8fa0c8" : regionColor(n));
        const tw = 0.82 + 0.18 * Math.sin(T * 0.0011 + n._ph);
        let bright = ig * tw * (lit ? 1 : 0.26);
        if (comboSet.has(n.id) || sel === n.id) bright = Math.max(bright, ig * 0.9);
        const haloR = n.r * (2.0 + Math.min(3.4, deg * 0.22)) * (n.kind === "synth" ? 1.55 : 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, bright));
        ctx.drawImage(haloSprite(col), n.x - haloR, n.y - haloR, haloR * 2, haloR * 2);
      });

      // ---- CORES ----
      ctx.globalCompositeOperation = "source-over";
      nodes.forEach(n => {
        if (n.x == null) return;
        const lit = litOf(n.id), ig = n._ig == null ? 1 : n._ig;
        const col = n.kind === "synth" ? "#ffe27a" : (n.kind === "cluster" ? "#5a6478" : regionColor(n));
        ctx.globalAlpha = lit ? 1 : 0.4;
        if (comboSet.has(n.id)) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6 / k, 0, 6.2832); ctx.fillStyle = "rgba(255,210,120,0.18)"; ctx.fill(); }
        if (n.kind === "synth") {
          const s = n.r; ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(Math.PI / 4); ctx.fillStyle = col; ctx.fillRect(-s, -s, 2 * s, 2 * s); ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8); ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (0.55 + 0.45 * ig), 0, 6.2832); ctx.fillStyle = col; ctx.fill();
          ctx.globalAlpha = (lit ? 1 : 0.4) * (0.45 + 0.55 * ig);
          ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(1, n.r * 0.3), 0, 6.2832); ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill();
          ctx.globalAlpha = lit ? 1 : 0.4;
          if (n.kind === "cluster") { ctx.lineWidth = 2 / k; ctx.strokeStyle = "#8a93a8"; ctx.setLineDash([4 / k, 3 / k]); ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]); }
        }
        let ring = null, rw = 2;
        if (sel === n.id) { ring = "#ffffff"; rw = 2.5; } else if (comboSet.has(n.id)) { ring = "#ffd84a"; rw = 2.5; } else if (hov && hov.id === n.id) { ring = "#dfe6f2"; rw = 2; }
        if (ring) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4 / k, 0, 6.2832); ctx.lineWidth = rw / k; ctx.strokeStyle = ring; ctx.stroke(); }
        if (notes[n.id]) { ctx.beginPath(); ctx.arc(n.x + n.r * 0.72, n.y - n.r * 0.72, 2.2 / k + 1.5, 0, 6.2832); ctx.fillStyle = "#ffd84a"; ctx.fill(); }
        ctx.globalAlpha = 1;
      });

      // ---- LABELS ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "600 11px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const showAll = k > 1.2 || nodes.length <= 40;
      nodes.forEach(n => {
        if (n.x == null) return;
        const special = (litSet && litSet.has(n.id)) || sel === n.id || comboSet.has(n.id) || (hov && hov.id === n.id);
        if (!showAll && !special) return;
        const sx = n.x * k + x, sy = n.y * k + y;
        if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) return;
        const label = n.kind === "cluster" ? (n.family + " ·" + n.members.length) : (n.kind === "synth" ? ("◆ " + (n.synth.combination || "synthesis").slice(0, 22)) : n.repo.name);
        const ty = sy + n.r * k + 4;
        ctx.globalAlpha = (litSet && !litSet.has(n.id) && !special) ? 0.18 : (special ? 1 : 0.6);
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(6,7,10,0.92)"; ctx.strokeText(label, sx, ty);
        ctx.fillStyle = n.kind === "synth" ? "#ffe27a" : (special ? "#ffffff" : "#aeb4be"); ctx.fillText(label, sx, ty);
      });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }, [combo, sel, searchActive, matchNode, notes]);
    useEffect(() => { drawRef.current = draw; draw(); });
    useEffect(() => { cellHiRef.current = cellHi ? new Set((matrix.cellRepos[cellHi] || []).map(r => r.id)) : null; if (drawRef.current) drawRef.current(); }, [cellHi, matrix]);

    const toData = (sx, sy) => { const { k, x, y } = tRef.current; return [(sx - x) / k, (sy - y) / k]; };
    const hitNode = (sx, sy) => { const [dx, dy] = toData(sx, sy); const ns = nodesRef.current; for (let i = ns.length - 1; i >= 0; i--) { const n = ns[i]; if (n.x == null) continue; if (Math.hypot(n.x - dx, n.y - dy) <= n.r + 3) return n; } return null; };
    const hitEdge = (sx, sy) => {
      const [px, py] = toData(sx, sy); const ls = linksRef.current; const thr = 6 / tRef.current.k; let best = null, bd = thr;
      ls.forEach(l => { if (!l.source || l.source.x == null || !l.target || l.target.x == null) return; const x1 = l.source.x, y1 = l.source.y, x2 = l.target.x, y2 = l.target.y; const dxs = x2 - x1, dys = y2 - y1, len2 = dxs * dxs + dys * dys || 1; let t = ((px - x1) * dxs + (py - y1) * dys) / len2; t = Math.max(0, Math.min(1, t)); const cx = x1 + t * dxs, cy = y1 + t * dys, d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = l; } });
      return best;
    };
    const fitView = () => {
      const ns = nodesRef.current.filter(n => n.x != null); const { w, h } = sizeRef.current; if (!ns.length) return;
      const padL = 270, padR = 30, padT = 24, padB = 24;
      const aw = Math.max(80, w - padL - padR), ah = Math.max(80, h - padT - padB), acx = padL + aw / 2, acy = padT + ah / 2;
      let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
      ns.forEach(n => { mnx = Math.min(mnx, n.x - n.r); mny = Math.min(mny, n.y - n.r); mxx = Math.max(mxx, n.x + n.r); mxy = Math.max(mxy, n.y + n.r); });
      const gw = mxx - mnx + 60, gh = mxy - mny + 60, k = Math.max(0.2, Math.min(2.2, Math.min(aw / gw, ah / gh)));
      tRef.current = { k, x: acx - k * (mnx + mxx) / 2, y: acy - k * (mny + mxy) / 2 }; draw();
    };
    const zoomBy = (f) => { const { w, h } = sizeRef.current, t = tRef.current; const cx = w / 2, cy = h / 2; const nk = Math.max(0.15, Math.min(6, t.k * f)); tRef.current = { k: nk, x: cx - (cx - t.x) * (nk / t.k), y: cy - (cy - t.y) * (nk / t.k) }; draw(); };

    // ---------- pointer ----------
    const linkingRef = useRef(null); useEffect(() => { linkingRef.current = linking; }, [linking]);
    const enrichModeRef = useRef(enrichMode); useEffect(() => { enrichModeRef.current = enrichMode; }, [enrichMode]);
    useEffect(() => {
      const cv = canvasRef.current; if (!cv) return;
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const onDown = (e) => { const [sx, sy] = pos(e); const n = hitNode(sx, sy); downRef.current = { sx, sy, shift: e.shiftKey || e.metaKey, t: Date.now(), moved: false }; if (n) { dragRef.current = n; const [dx, dy] = toData(sx, sy); n.fx = dx; n.fy = dy; simRef.current && simRef.current.alphaTarget(0.3).restart(); } else { panRef.current = { x: tRef.current.x, y: tRef.current.y, sx, sy }; } };
      const onMove = (e) => {
        const [sx, sy] = pos(e);
        if (downRef.current && Math.hypot(sx - downRef.current.sx, sy - downRef.current.sy) > 4) downRef.current.moved = true;
        if (dragRef.current) { const [dx, dy] = toData(sx, sy); dragRef.current.fx = dx; dragRef.current.fy = dy; return; }
        if (panRef.current) { const p = panRef.current; tRef.current = { ...tRef.current, x: p.x + (sx - p.sx), y: p.y + (sy - p.sy) }; draw(); return; }
        const n = hitNode(sx, sy);
        if (n !== hoverRef.current) { hoverRef.current = n; const set = new Set(); if (n) { set.add(n.id); linksRef.current.forEach(l => { if (l.source.id === n.id) set.add(l.target.id); else if (l.target.id === n.id) set.add(l.source.id); }); } hoverNbrRef.current = set; draw(); }
        const tip = tipRef.current;
        if (n) {
          cv.style.cursor = linkingRef.current ? "crosshair" : "pointer";
          const ttl = n.kind === "cluster" ? (n.family + " ·" + n.members.length) : (n.kind === "synth" ? ("◆ " + (n.synth.combination || "synthesis")) : n.repo.name);
          const sub = n.kind === "cluster" ? "family cluster — click to expand" : (n.kind === "synth" ? ("validated synthesis · depth " + (n.synth.depth || 1)) : (n.repo.description || ""));
          tip.style.display = "block"; tip.style.left = (sx + 14) + "px"; tip.style.top = (sy + 14) + "px";
          tip.innerHTML = "<b style='color:" + (n.kind === "synth" ? "#E8C24A" : "#fff") + "'>" + ttl + "</b><div style='color:#9aa1ad;max-width:240px'>" + sub + "</div>";
        } else {
          const le = hitEdge(sx, sy);
          if (le) { cv.style.cursor = "help"; tip.style.display = "block"; tip.style.left = (sx + 14) + "px"; tip.style.top = (sy + 14) + "px"; tip.innerHTML = "<b style='color:" + EDGEC[le.type] + "'>" + EDGEL[le.type] + " · w" + le.weight + "</b><div style='color:#cdd3dd;max-width:260px'>" + le.evidence.join("<br>") + "</div>"; }
          else { cv.style.cursor = linkingRef.current ? "crosshair" : "default"; tip.style.display = "none"; }
        }
      };
      const onUp = (e) => {
        const d = downRef.current; if (dragRef.current) { dragRef.current.fx = null; dragRef.current.fy = null; dragRef.current = null; simRef.current && simRef.current.alphaTarget(0.012); } panRef.current = null; downRef.current = null;
        if (d && !d.moved) {
          const n = hitNode(d.sx, d.sy);
          if (n) {
            if (linkingRef.current) { if (n.id !== linkingRef.current && n.kind !== "cluster") addLink(linkingRef.current, n.id); setLinking(null); return; }
            if (n.kind === "cluster") { setExpanded(p => ({ ...p, [n.family]: true })); }
            else if (d.shift) { setCombo(p => p.includes(n.id) ? p.filter(i => i !== n.id) : [...p, n.id]); }
            else { setSel(n.id); setEdgeInfo(null); if (n.kind === "repo" && !n.repo.enriched && enrichModeRef.current === "click" && (n.repo._user || dataRef.current.githubUser !== "demo")) triggerEnrich(n.repo); }
          } else { const le = hitEdge(d.sx, d.sy); if (le) { setEdgeInfo(le); setSel(null); } else { setSel(null); setEdgeInfo(null); if (linkingRef.current) setLinking(null); } }
        }
      };
      const onWheel = (e) => { e.preventDefault(); const [sx, sy] = pos(e); const t = tRef.current; const f = Math.pow(1.0015, -e.deltaY); const nk = Math.max(0.15, Math.min(6, t.k * f)); tRef.current = { k: nk, x: sx - (sx - t.x) * (nk / t.k), y: sy - (sy - t.y) * (nk / t.k) }; draw(); };
      const onLeave = () => { if (tipRef.current) tipRef.current.style.display = "none"; if (hoverRef.current) { hoverRef.current = null; hoverNbrRef.current = new Set(); draw(); } };
      const onKey = (e) => { if (e.key === "Escape") { setLinking(null); setEdgeInfo(null); } };
      cv.addEventListener("mousedown", onDown); window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
      cv.addEventListener("wheel", onWheel, { passive: false }); cv.addEventListener("mouseleave", onLeave); window.addEventListener("keydown", onKey);
      return () => { cv.removeEventListener("mousedown", onDown); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); cv.removeEventListener("wheel", onWheel); cv.removeEventListener("mouseleave", onLeave); window.removeEventListener("keydown", onKey); };
    }, [draw]);

    // ---------- notes / links / promotion ----------
    const setNote = (id, text) => {
      setNotes(p => { const n = { ...p }; if (text) n[id] = text; else delete n[id]; return n; });
      clearTimeout(noteTimers.current[id]);
      noteTimers.current[id] = setTimeout(() => { if (text) sset("note:" + id, { id, text }); else sdel("note:" + id); }, 500);
    };
    const addLink = (a, b) => { if (manualLinks.some(l => (l.source === a && l.target === b) || (l.source === b && l.target === a))) return; const l = { id: "link:" + uid(), source: a, target: b }; setManualLinks(p => [...p, l]); sset(l.id, l); };
    const delLink = (id) => { setManualLinks(p => p.filter(l => l.id !== id)); sdel(id); setEdgeInfo(null); };
    const promote = (it) => {
      const parents = (synth && synth.parents) || combo;
      const depth = (parents.length ? Math.max(...parents.map(p => synthById[p] ? (synthById[p].depth || 1) : 0)) : 0) + 1;
      const node = { id: "synth:" + uid(), kind: "synth", combination: it.combination, usesFromA: it.usesFromA, usesFromB: it.usesFromB, sharedMechanism: it.sharedMechanism, hollowCheck: it.hollowCheck, verdict: it.verdict, parents: [...parents], createdAt: new Date().toISOString(), status: "validated", depth };
      setSynthNodes(p => [...p, node]); sset(node.id, node);
      setSynth(s => s ? { ...s, items: s.items.filter(x => x !== it) } : s);
    };
    const archive = (it) => {
      const parents = (synth && synth.parents) || combo;
      const neg = { id: "neg:" + uid(), combination: it.combination, why: it.hollowCheck || it.sharedMechanism || "", parents: [...parents], createdAt: new Date().toISOString() };
      setNegatives(p => [...p, neg]); sset(neg.id, neg);
      setSynth(s => s ? { ...s, items: s.items.filter(x => x !== it) } : s);
    };
    const delSynthNode = (id) => { setSynthNodes(p => p.filter(s => s.id !== id)); sdel(id); if (sel === id) setSel(null); setCombo(p => p.filter(i => i !== id)); };
    const resetBrain = async () => {
      if (!window.confirm("Reset the entire persistent brain? This permanently deletes all saved repos, syntheses, notes, links, and negatives.")) return;
      if (STORE) for (const pre of ["repo:", "synth:", "note:", "link:", "neg:", "readme:"]) { try { const keys = await STORE.list(pre) || []; for (const k of keys) { const key = typeof k === "string" ? k : (k && (k.key || k.name)); if (key) await STORE.delete(key); } } catch (e) {} }
      setSynthNodes([]); setNotes({}); setManualLinks([]); setNegatives([]); setCombo([]); setSel(null); setExpanded({}); setFocusNode(null);
      nodeMapRef.current = new Map(); centeredRef.current = false; setData(this.SAMPLE);
    };

    // ---------- live GitHub ----------
    const ghHeaders = (preview) => { const hh = { "Accept": preview || "application/vnd.github+json" }; if (ghToken.trim()) hh["Authorization"] = "Bearer " + ghToken.trim(); return hh; };
    const readRate = (res) => { const rem = res.headers.get("X-RateLimit-Remaining"); const rst = res.headers.get("X-RateLimit-Reset"); if (rem != null) { const v = { remaining: +rem, reset: rst ? +rst : null }; rateRef.current = v; setRate(v); } return { rem: rem != null ? +rem : null, rst: rst ? +rst : null }; };
    const rateMsg = (rst) => "GitHub rate limit reached" + (rst ? " — resets at " + fmtTime(rst) : "") + ". Add a read-only token to raise the limit to 5,000/hour.";
    const decodeB64 = (b64) => { try { const bin = atob((b64 || "").replace(/\s/g, "")); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder("utf-8").decode(bytes); } catch (e) { return ""; } };
    const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mapRepo = (r, user) => ({ id: r.name, name: r.name, description: r.description || "", topics: r.topics || [], language: r.language || null, stars: r.stargazers_count || 0, updatedAt: r.updated_at, defaultBranch: r.default_branch || "main", dependencies: [], readme: "", fileTree: [], signalFiles: {}, mentionsRepos: [], enriched: false, _user: user });
    const parseDeps = (sig) => {
      const deps = new Set();
      if (sig["package.json"]) { try { const pj = JSON.parse(sig["package.json"]); ["dependencies", "devDependencies"].forEach(k => Object.keys(pj[k] || {}).forEach(d => deps.add(d.toLowerCase()))); } catch (e) {} }
      if (sig["requirements.txt"]) sig["requirements.txt"].split("\n").forEach(l => { const m = l.trim().match(/^([A-Za-z0-9_.\-]+)/); if (m) deps.add(m[1].toLowerCase()); });
      if (sig["pyproject.toml"]) (sig["pyproject.toml"].match(/"([A-Za-z0-9_.\-]+)\s*[><=~!]/g) || []).forEach(x => { const m = x.match(/"([A-Za-z0-9_.\-]+)/); if (m) deps.add(m[1].toLowerCase()); });
      if (sig["Cargo.toml"]) (sig["Cargo.toml"].match(/^[a-z0-9_\-]+\s*=/gmi) || []).forEach(x => deps.add(x.split("=")[0].trim().toLowerCase()));
      return [...deps].filter(d => d.length > 1);
    };

    const fetchRepos = async () => {
      const user = ghUser.trim(); if (!user) { setFetchState({ error: "Enter a GitHub username." }); return; }
      setFetchState({ listing: true });
      const listAll = async (preview) => {
        let all = [], page = 1;
        while (true) {
          const res = await fetch("https://api.github.com/users/" + encodeURIComponent(user) + "/repos?per_page=100&type=owner&sort=updated&page=" + page, { headers: ghHeaders(preview) });
          const rr = readRate(res);
          if (res.status === 404) throw { kind: "nf" };
          if (res.status === 403 && rr.rem === 0) throw { kind: "rate", rst: rr.rst };
          if (!res.ok) { const j = await res.json().catch(() => ({})); throw { kind: "err", msg: "GitHub error " + res.status + (j.message ? ": " + j.message : "") }; }
          const batch = await res.json(); if (!Array.isArray(batch)) throw { kind: "err", msg: "Unexpected response shape." };
          all = all.concat(batch); if (batch.length < 100 || page > 20) break; page++;
        }
        return all;
      };
      let raw;
      try { raw = await listAll("application/vnd.github+json"); }
      catch (ex) {
        if (ex && ex.kind === "nf") { setFetchState({ error: 'User "' + user + '" not found.' }); return; }
        if (ex && ex.kind === "rate") { setFetchState({ error: rateMsg(ex.rst) }); return; }
        if (ex && ex.kind === "err") { setFetchState({ error: ex.msg }); return; }
        setFetchState({ error: "Live fetch from GitHub is blocked in this environment (network/CORS). Use the external ingestion script and the Load button instead.", blocked: true }); return;
      }
      let mapped = raw.filter(r => includeForks || !r.fork).map(r => mapRepo(r, user));
      if (mapped.length && mapped.every(r => !r.topics || !r.topics.length)) {
        try { const raw2 = await listAll("application/vnd.github.mercy-preview+json"); const tm = {}; raw2.forEach(r => tm[r.name] = r.topics || []); mapped.forEach(r => { r.topics = tm[r.name] || r.topics || []; }); } catch (e) {}
      }
      const nd = { generatedAt: new Date().toISOString(), githubUser: user, repoCount: mapped.length, repos: mapped, edges: computeEdges(mapped) };
      nodeMapRef.current = new Map(); centeredRef.current = false;
      setData(nd); setSel(null); setCombo([]); setExpanded({}); setErr("");
      setFetchState({ listed: mapped.length, absorbing: true });
      mapped.forEach(persistRepo);
      setTimeout(() => { enrichAllRef.current && enrichAllRef.current(); }, 500);
    };

    const enrichRepo = async (repo, allNames) => {
      const user = repo._user || dataRef.current.githubUser;
      try {
        let fileTree = [], truncated = false;
        const tr = await fetch("https://api.github.com/repos/" + user + "/" + repo.name + "/git/trees/" + (repo.defaultBranch || "main") + "?recursive=1", { headers: ghHeaders() });
        readRate(tr); if (tr.ok) { const tj = await tr.json(); fileTree = (tj.tree || []).filter(n => n.type === "blob").map(n => n.path); truncated = !!tj.truncated; }
        let readme = "";
        const rm = await fetch("https://api.github.com/repos/" + user + "/" + repo.name + "/readme", { headers: ghHeaders() });
        readRate(rm); if (rm.ok) { const rj = await rm.json(); readme = decodeB64(rj.content || "").slice(0, 8000); }
        const signalFiles = {}; const sigPaths = fileTree.filter(p => SIGSET.has(p.split("/").pop()));
        for (const p of sigPaths.slice(0, 12)) { const cf = await fetch("https://api.github.com/repos/" + user + "/" + repo.name + "/contents/" + p.split("/").map(encodeURIComponent).join("/"), { headers: ghHeaders() }); readRate(cf); if (cf.ok) { const cj = await cf.json(); if (cj.content) signalFiles[p.split("/").pop()] = decodeB64(cj.content).slice(0, 4000); } }
        const dependencies = parseDeps(signalFiles);
        const names = allNames || (dataRef.current.repos || []).map(x => x.name);
        const mentionsRepos = names.filter(nm => nm !== repo.name && new RegExp("\\b" + escapeReg(nm) + "\\b").test(readme));
        return { ...repo, fileTree, readme, signalFiles, dependencies, mentionsRepos, truncated, enriched: true, enrichError: null };
      } catch (e) { return { ...repo, enrichError: String(e) }; }
    };
    const applyRepo = (enr, recompute) => { setData(prev => { const repos = prev.repos.map(x => x.id === enr.id ? enr : x); return { ...prev, repos, edges: recompute === false ? prev.edges : computeEdges(repos) }; }); persistRepo(enr); };
    const triggerEnrich = async (repo) => { if (enrichingIds[repo.id]) return; setEnrichingIds(p => ({ ...p, [repo.id]: true })); const enr = await enrichRepo(repo); applyRepo(enr); setEnrichingIds(p => { const n = { ...p }; delete n[repo.id]; return n; }); };
    const enrichAll = async () => {
      if (enrichRunningRef.current) return;
      const todo = (dataRef.current.repos || []).filter(r => !r.enriched && (r._user || (dataRef.current.githubUser && dataRef.current.githubUser !== "demo" && dataRef.current.githubUser !== "brain")));
      if (!todo.length) { setFetchState(s => ({ ...(s || {}), msg: "All repos already enriched." })); return; }
      enrichRunningRef.current = true; enrichCancelRef.current = false; setEnrichProg({ done: 0, total: todo.length, running: true });
      const names = (dataRef.current.repos || []).map(x => x.name); let idx = 0, done = 0; let paused = false;
      const worker = async () => {
        while (idx < todo.length && !enrichCancelRef.current && !paused) {
          const r = todo[idx++];
          const enr = await enrichRepo(r, names); applyRepo(enr, false); done++; setEnrichProg(p => p ? { ...p, done } : p);
          const rc = rateRef.current; if (rc && rc.remaining != null && rc.remaining <= 2) { paused = true; setEnrichProg(p => p ? { ...p, paused: true, resetAt: rc.reset } : p); scheduleResume(rc.reset); }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      setData(prev => ({ ...prev, edges: computeEdges(prev.repos) }));
      enrichRunningRef.current = false;
      setEnrichProg(p => p ? { ...p, running: false } : null);
    };
    enrichAllRef.current = enrichAll;
    const scheduleResume = (reset) => { if (!reset) return; const ms = Math.max(3000, (reset * 1000) - Date.now() + 1500); setTimeout(() => { enrichRunningRef.current = false; enrichAllRef.current && enrichAllRef.current(); }, Math.min(ms, 3600000)); };

    // ---------- related repos (Phase C) ----------
    const findRelated = async (node) => {
      let q = "";
      if (node.kind === "synth") q = (node.synth.combination || "").split(/\s+/).slice(0, 3).map(t => t.replace(/[^a-z0-9]/gi, "")).filter(Boolean).join(" ");
      else { const r = node.repo; const tps = (r.topics || []).slice(0, 2); if (tps.length) q = tps.map(t => "topic:" + t).join(" "); else if (r.dependencies && r.dependencies[0]) q = r.dependencies[0]; else q = (r.language || r.name); }
      if (!q) { setRelated({ error: "No topic/keyword to seed a search.", forId: node.id }); return; }
      setRelated({ loading: true, forId: node.id, q });
      try {
        const res = await fetch("https://api.github.com/search/repositories?q=" + encodeURIComponent(q) + "&per_page=12&sort=stars", { headers: ghHeaders() });
        const rr = readRate(res);
        if (res.status === 403 && rr.rem === 0) { setRelated({ error: rateMsg(rr.rst) + " (search limit: ~10/min anon, ~30/min with token)", forId: node.id, q }); return; }
        if (!res.ok) { setRelated({ error: "Search error " + res.status, forId: node.id, q }); return; }
        const j = await res.json(); const have = new Set((dataRef.current.repos || []).map(x => x.id));
        const items = (j.items || []).filter(it => !have.has(it.name) && !have.has(it.full_name)).slice(0, 8);
        setRelated({ items, forId: node.id, q });
      } catch (e) { setRelated({ error: "Related search blocked: " + e.message, forId: node.id, q }); }
    };
    const addRelated = async (it) => {
      const owner = it.owner && it.owner.login; const have = new Set((dataRef.current.repos || []).map(x => x.id));
      const id = have.has(it.name) ? it.full_name : it.name;
      const r = { id, name: it.name, description: it.description || "", topics: it.topics || [], language: it.language || null, stars: it.stargazers_count || 0, updatedAt: it.updated_at, defaultBranch: it.default_branch || "main", dependencies: [], readme: "", fileTree: [], signalFiles: {}, mentionsRepos: [], enriched: false, _user: owner, _external: true };
      setData(prev => { if (prev.repos.some(x => x.id === r.id)) return prev; const repos = [...prev.repos, r]; return { ...prev, repos, edges: computeEdges(repos) }; });
      persistRepo(r); setRelated(null); setEnrichingIds(p => ({ ...p, [r.id]: true }));
      const enr = await enrichRepo(r, [...(dataRef.current.repos || []).map(x => x.name), r.name]); applyRepo(enr);
      setEnrichingIds(p => { const n = { ...p }; delete n[r.id]; return n; }); setSel(r.id);
    };

    // ---------- bulk discovery (topic-seeded public search, deep-paginated) ----------
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const discoverRepos = async (queries, pages) => {
      queries = (queries || []).filter(Boolean); if (!queries.length) return;
      if (discoverBusyRef.current) { setDiscoverState(s => ({ ...(s || {}), error: "A discovery run is already in progress — Stop it before starting another." })); return; }
      discoverBusyRef.current = true;
      discoverCancelRef.current = false;
      const NODE_CAP = 6000;
      const hasTok = !!ghToken.trim();
      const maxPages = Math.max(1, Math.min(10, pages || 1)); // GitHub search caps at 1000 results (10×100)
      setDiscoverState({ running: true, found: 0, added: 0, total: queries.length, done: 0 });
      const seen = new Set((dataRef.current.repos || []).map(x => x.id));
      let added = 0;
      for (let qi = 0; qi < queries.length; qi++) {
        if (discoverCancelRef.current) break;
        if ((dataRef.current.repos || []).length >= NODE_CAP) { setDiscoverState(s => ({ ...(s || {}), capped: true })); break; }
        const q = queries[qi]; let qStop = false;
        for (let pg = 1; pg <= maxPages && !qStop && !discoverCancelRef.current; pg++) {
          try {
            const res = await fetch("https://api.github.com/search/repositories?q=" + encodeURIComponent(q) + "&sort=stars&order=desc&per_page=100&page=" + pg, { headers: ghHeaders() });
            const rr = readRate(res);
            if (res.status === 403 && rr.rem === 0) { discoverBusyRef.current = false; setDiscoverState(s => ({ ...(s || {}), running: false, paused: true, resetAt: rr.rst, added, done: qi })); const ms = Math.max(3000, ((rr.rst || 0) * 1000) - Date.now() + 1500); setTimeout(() => discoverRepos(queries.slice(qi), maxPages), Math.min(ms, 3600000)); return; }
            if (res.ok) {
              const j = await res.json(); const items = j.items || []; const batch = [];
              items.forEach(it => { const id = seen.has(it.name) ? it.full_name : it.name; if (seen.has(id)) return; seen.add(id); batch.push({ id, name: it.name, description: it.description || "", topics: it.topics || [], language: it.language || null, stars: it.stargazers_count || 0, updatedAt: it.updated_at, defaultBranch: it.default_branch || "main", dependencies: [], readme: "", fileTree: [], signalFiles: {}, mentionsRepos: [], enriched: false, _user: it.owner && it.owner.login, _external: true, _seed: q }); });
              if (batch.length) { added += batch.length; setData(prev => { const have = new Set(prev.repos.map(x => x.id)); const add = batch.filter(b => !have.has(b.id)); const repos = [...prev.repos, ...add]; return { ...prev, githubUser: (prev.githubUser && prev.githubUser !== "demo") ? prev.githubUser : "science-math", repoCount: repos.length, repos, edges: computeEdges(repos) }; }); batch.forEach(persistRepo); }
              if (items.length < 100) qStop = true; // exhausted this query
            } else { qStop = true; }
            setDiscoverState(s => ({ ...(s || {}), found: seen.size, added, done: qi, q: q + " · p" + pg }));
          } catch (e) { setDiscoverState(s => ({ ...(s || {}), error: "search blocked: " + e.message })); qStop = true; }
          if (!discoverCancelRef.current && !(qStop && pg === 1)) await sleep(hasTok ? 2400 : 6500);
        }
        setDiscoverState(s => ({ ...(s || {}), found: seen.size, added, done: qi + 1, q }));
      }
      discoverBusyRef.current = false;
      setDiscoverState(s => ({ ...(s || {}), running: false, added, done: queries.length }));
    };
    discoverRunRef.current = discoverRepos;
    window.__gbDiscover = (qs, pages) => discoverRunRef.current && discoverRunRef.current((qs && qs.length) ? qs : this.SCIENCE_QUERIES, pages || 1);
    window.__gbEnrichAll = () => enrichAllRef.current && enrichAllRef.current();
    window.__gbEnrichCancel = () => { enrichCancelRef.current = true; };
    window.__gbStats = () => { const r = dataRef.current.repos || []; return { repos: r.length, enriched: r.filter(x => x.enriched).length, pending: r.filter(x => !x.enriched && x._user).length, edges: (dataRef.current.edges || []).length, rate: rateRef.current }; };

    // ---------- file load / export ----------
    const onFile = (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(rd.result); if (!j || !Array.isArray(j.repos)) throw new Error("missing repos[] array");
          j.edges = Array.isArray(j.edges) ? j.edges : computeEdges(j.repos);
          nodeMapRef.current = new Map(); centeredRef.current = false;
          setData(j); setErr(""); setSel(null); setCombo([]); setExpanded({}); setSynth(null); setShowSynth(false); setEdgeInfo(null);
          if (Array.isArray(j.synthesisNodes)) { setSynthNodes(j.synthesisNodes); j.synthesisNodes.forEach(s => sset(s.id, s)); }
          if (Array.isArray(j.manualLinks)) { setManualLinks(j.manualLinks); j.manualLinks.forEach(l => sset(l.id, l)); }
          if (Array.isArray(j.negatives)) { setNegatives(j.negatives); j.negatives.forEach(nn => sset(nn.id, nn)); }
          if (Array.isArray(j.notes)) { const o = {}; j.notes.forEach(nt => { if (nt && nt.id) { o[nt.id] = nt.text; sset("note:" + nt.id, nt); } }); setNotes(o); }
          if (Array.isArray(j.preregs)) { setPreregs(j.preregs); j.preregs.forEach(p => sset(p.id, p)); }
          if (Array.isArray(j.prizeCandidates)) { setCandidates(j.prizeCandidates); j.prizeCandidates.forEach(c => sset(c.id, c)); }
          if (Array.isArray(j.ledger)) setProbeLog(j.ledger);
          if (Array.isArray(j.calibration)) { setCalibration(j.calibration); j.calibration.forEach(c => sset(c.id, c)); }
          if (Array.isArray(j.mechCalibration)) { const mc = {}; j.mechCalibration.forEach(m => { if (m && m.sourceKind && m.targetKind) { const k = m.sourceKind + ">" + m.targetKind; mc[k] = m; sset("mech:" + k, m); } }); setMechCal(mc); }
          if (j.prizeCandidates && j.prizeCandidates.length) firstPrizeRef.current = true;
          (j.repos || []).forEach(persistRepo);
        } catch (ex) { setErr("Could not parse JSON: " + ex.message); }
      };
      rd.onerror = () => setErr("Could not read file."); rd.readAsText(f); e.target.value = "";
    };
    const exportBrain = () => doExport([]);
    const recordOutcome = (pred, outcome, note) => {
      const entry = { id: (calibration.find(c => c.targetId === pred.id) || {}).id || ("cal:" + uid()), targetId: pred.id, kind: pred.kind, label: pred.label, predicted: pred.predicted, confidence: pred.confidence != null ? pred.confidence : null, outcome, note: note || "", evaluatedAt: new Date().toISOString() };
      setCalibration(p => [...p.filter(c => c.targetId !== pred.id), entry]); sset(entry.id, entry);
      // Ω5→Ω3: propagate a candidate's reality outcome into its mechanism-class prior
      const cand = candidatesRef.current.find(c => c.id === pred.id); const key = cand && mechKey(cand.mechClass);
      if (key) { const prevOut = (calibration.find(c => c.targetId === pred.id) || {}).outcome; bumpMech(key, c => ({ confirmed: c.confirmed + (outcome === "CONFIRMED" ? 1 : 0) - (prevOut === "CONFIRMED" ? 1 : 0), refuted: c.refuted + (outcome === "REFUTED" ? 1 : 0) - (prevOut === "REFUTED" ? 1 : 0) })); }
    };
    const clearOutcome = (targetId) => { const e = calibration.find(c => c.targetId === targetId); setCalibration(p => p.filter(c => c.targetId !== targetId)); if (e) sdel(e.id); const cand = candidatesRef.current.find(c => c.id === targetId); const key = cand && mechKey(cand.mechClass); if (key && e) bumpMech(key, c => ({ confirmed: c.confirmed - (e.outcome === "CONFIRMED" ? 1 : 0), refuted: c.refuted - (e.outcome === "REFUTED" ? 1 : 0) })); };
    // ---------- U2: mechanism-class calibration — structural priors that alter skepticism, never prohibit ----------
    const MIN_SAMPLE = 4;
    const mechKey = (mc) => (mc && mc.sourceKind && mc.targetKind) ? mc.sourceKind + ">" + mc.targetKind : null;
    const bumpMech = (key, patch) => { setMechCal(prev => { const cur = prev[key] || { sourceKind: key.split(">")[0], targetKind: key.split(">")[1], proposed: 0, typeKilled: 0, litKnown: 0, litUnexplored: 0, confirmed: 0, refuted: 0 }; const p = patch(cur); const next = { ...cur, ...p, lastUpdatedAt: new Date().toISOString() }; Object.keys(next).forEach(k => { if (typeof next[k] === "number" && next[k] < 0) next[k] = 0; }); sset("mech:" + key, next); return { ...prev, [key]: next }; }); };
    const recordMechOutcomes = (items) => { (items || []).forEach(it => { const key = mechKey(it.mechClass); if (!key) return; bumpMech(key, c => ({ proposed: c.proposed + 1, typeKilled: c.typeKilled + (it.typeCheck && !it.typeCheck.pass ? 1 : 0), litKnown: c.litKnown + (it.litClass === "KNOWN" ? 1 : 0), litUnexplored: c.litUnexplored + (it.litClass === "UNEXPLORED" ? 1 : 0) })); }); };
    const mechMultiplier = (c) => { const resolved = (c.confirmed || 0) + (c.refuted || 0); if (resolved < MIN_SAMPLE) return { m: 1, resolved, reason: "insufficient outcomes (" + resolved + "/" + MIN_SAMPLE + ") — neutral, still exploring" }; const hit = c.confirmed / resolved; const m = Math.max(0.3, Math.min(1.6, 0.4 + 1.2 * hit)); return { m: Math.round(m * 100) / 100, resolved, reason: c.confirmed + "/" + resolved + " confirmed → ×" + (Math.round(m * 100) / 100) }; };
    const mechPriorsText = () => { const cal = mechCalRef.current || {}; const weak = [], strong = []; Object.values(cal).forEach(c => { const mm = mechMultiplier(c); if (mm.resolved >= MIN_SAMPLE && mm.m < 0.7) weak.push(c.sourceKind + "→" + c.targetKind + " (" + c.confirmed + "/" + mm.resolved + ")"); if (mm.resolved >= MIN_SAMPLE && mm.m > 1.1) strong.push(c.sourceKind + "→" + c.targetKind + " (" + c.confirmed + "/" + mm.resolved + ")"); }); const tk = {}; (negatives || []).forEach(n => { if (n.killedBy === "typecheck" && n.mechClass) { const k = n.mechClass.sourceKind + "→" + n.mechClass.targetKind; tk[k] = (tk[k] || 0) + 1; } }); const tkTop = Object.entries(tk).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => k + " ×" + n); let s = ""; if (strong.length) s += "\nHistorically PRODUCTIVE mechanism-kind pairings (favor when genuinely apt): " + strong.join("; ") + "."; if (weak.length) s += "\nHistorically WEAK pairings (down-weighted priors — propose only with an unusually specific, defensible mechanism; you are NOT forbidden from them): " + weak.join("; ") + "."; if (tkTop.length) s += "\nRecurring type-kill causes (pairings that keep failing the structural check): " + tkTop.join("; ") + "."; return s; };
    const doExport = (extraNodes, extraCandidates) => {
      const d = dataRef.current || data;
      const allSynth = [...synthNodes, ...(extraNodes || [])];
      const out = { schemaVersion: 7, product: "OpenSource Cortex v0.5.1 (instantiated contract gate)", generatedAt: new Date().toISOString(), githubUser: d.githubUser, repoCount: (d.repos || []).length, repos: d.repos, edges: d.edges, synthesisNodes: allSynth, notes: Object.entries(notes).map(([id, text]) => ({ id, text })), manualLinks, negatives, preregs, prizeCandidates: [...candidates, ...(extraCandidates || [])], ledger: probeLog, calibration, mechCalibration: Object.values(mechCal) };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "brain-index.json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    };

    // ---------- synthesis ----------
    const parseCombos = (txt) => {
      let t = String(txt || "").trim().replace(/```json/gi, "").replace(/```/g, "").trim();
      const i = t.indexOf("["); if (i >= 0) t = t.slice(i);
      try { const r = JSON.parse(t); if (Array.isArray(r)) return r; } catch (e) {}
      let depth = 0, inStr = false, esc = false, last = -1;
      for (let j = 0; j < t.length; j++) { const c = t[j]; if (esc) { esc = false; continue; } if (c === "\\") { esc = true; continue; } if (c === '"') { inStr = !inStr; continue; } if (inStr) continue; if (c === "{") depth++; else if (c === "}") { depth--; if (depth === 0) last = j; } }
      if (last > 0) { try { const r = JSON.parse(t.slice(0, last + 1) + "]"); if (Array.isArray(r)) return r; } catch (e) {} }
      throw new Error("Model did not return valid JSON.");
    };
    const runSynth = async (more) => {
      const chosen = combo.map(id => byId[id] || synthById[id]).filter(Boolean);
      if (chosen.length < 2) { setSynth({ error: "Select at least 2 nodes (shift-click)." }); setShowSynth(true); return; }
      setShowSynth(true);
      const prev = more && synth && synth.items ? synth.items : []; const parents = [...combo]; const n = more ? 2 : 3;
      setSynth({ loading: true, items: prev, parents });
      if (!window.claude || !window.claude.complete) { setSynth({ error: "In-artifact model unavailable in this preview.", items: prev, parents }); return; }
      const payload = chosen.map(node => node.combination ? { id: node.id, type: "validated-synthesis", depth: node.depth, combination: node.combination, sharedMechanism: node.sharedMechanism, verdict: node.verdict } : { id: node.id, description: node.description || "", topics: node.topics || [], language: node.language || null, readme: (node.readme || "").slice(0, 600), signalFiles: Object.keys(node.signalFiles || {}) });
      const maxDepth = Math.max(0, ...chosen.map(c => c.depth || 0));
      let user = SYS + "\n\nNodes:\n" + JSON.stringify(payload) + "\n\nPropose at most " + n + " possible combinations across these nodes. Return ONLY the JSON array.";
      if (maxDepth > 0) user += "\nProvenance note: some inputs are previously-validated syntheses at depth up to " + maxDepth + ". Apply INCREASING skepticism with depth — a deep combination resting on shallow validated work should be rated more conservatively; prefer SPECULATIVE or LIKELY-HOLLOW unless the shared mechanism is exceptionally concrete.";
      if (negatives.length) user += "\nDo NOT re-propose these already-archived dead-end combinations: " + negatives.map(x => x.combination).slice(0, 12).join("; ");
      if (more && prev.length) user += "\nAlso do not repeat: " + prev.map(c => c.combination).join("; ");
      try { const out = await window.claude.complete({ messages: [{ role: "user", content: user }] }); const items = parseCombos(out); setSynth({ items: [...prev, ...items], parents }); }
      catch (ex) { setSynth({ error: "Synthesis failed: " + ex.message + (more ? "" : " Try again, or fewer nodes."), items: prev, parents }); }
    };

    // ---------- literature grounding (OpenAlex; keyless, CORS-friendly) ----------
    const LIT_KNOWN = 300, LIT_EMERGING = 25; // count thresholds
    const openAlexCount = async (terms) => {
      try {
        const res = await fetch("https://api.openalex.org/works?search=" + encodeURIComponent(terms) + "&per_page=3&mailto=githubbrain@local");
        if (!res.ok) return { count: null, blocked: false, err: "status " + res.status };
        const j = await res.json();
        const count = j && j.meta && typeof j.meta.count === "number" ? j.meta.count : null;
        const top = ((j && j.results) || []).slice(0, 2).map(w => ({ title: (w.title || "").slice(0, 90), year: w.publication_year }));
        return { count, top };
      } catch (e) { return { count: null, blocked: true, err: String(e) }; }
    };
    const litEstimateViaModel = async (terms) => {
      try {
        const out = await window.claude.complete({ messages: [{ role: "user", content: "Estimate, from your training knowledge only (this is NOT a literature search), roughly how many peer-reviewed papers exist combining: " + terms + ". Reply ONLY a JSON object {\"estimate\": <integer>, \"note\": \"<one short phrase>\"}." }] });
        const m = String(out).replace(/```json/gi, "").replace(/```/g, "").match(/\{[\s\S]*\}/); if (!m) return { count: null };
        const j = JSON.parse(m[0]); return { count: typeof j.estimate === "number" ? j.estimate : null, note: j.note, modelEstimated: true };
      } catch (e) { return { count: null }; }
    };
    const classifyLit = (count) => count == null ? "UNVERIFIED" : (count > LIT_KNOWN ? "KNOWN" : (count >= LIT_EMERGING ? "EMERGING" : "UNEXPLORED"));

    // ---------- MECHANISM-IR COMPILER: deterministic structural compatibility, obligations, adapter synthesis ----------
    // The compatibility VERDICT is code, not model judgment: BFS over a curated admissible-conversion graph.
    // Min-RISK typed search (uniform-cost) over CONTRACTED conversion rules — not merely shortest path.
    const edgeCost = (e) => 1 + (e.lossy ? 2 : 0) + ((e.auth || "cur") === "cur" ? 1 : 0) + ((e.lose || []).length) * 0.5;
    // return up to K least-risk registered paths (MULTIPATH) — each step carries a stable ruleId + contract metadata
    const adaptersFor = (from, to, K) => {
      if (from === to) return [{ path: [], exact: true, cost: 0 }];
      const results = []; const pq = [[0, from, []]]; let guard = 0;
      while (pq.length && results.length < (K || 3) && guard++ < 4000) {
        pq.sort((a, b) => a[0] - b[0]); const [c, k, path] = pq.shift();
        if (k === to) { results.push({ path, exact: false, cost: c }); continue; }
        if (path.length > 4) continue;
        for (const e of (CONV_RULES[k] || [])) pq.push([c + edgeCost(e), e.to, [...path, { from: k, to: e.to, op: e.op, ruleId: k + ">" + e.to + ":" + e.op, lossy: !!e.lossy, auth: e.auth || "cur", pre: e.pre || "", lose: e.lose || [] }]]);
      }
      return results;
    };
    const pairCompat = (po, ci) => { const rs = adaptersFor(po.kind, ci.kind, 3); if (!rs.length) return { compatibility: "incompatible", options: [], adapter: null, lossy: false, cost: 99 }; const a = rs[0]; return { compatibility: a.exact ? "exact" : "convertible", options: rs, adapter: a.path, lossy: a.path.some(s => s.lossy), cost: a.cost }; };
    const _wild = (s) => /[*?]|\bn\b|any|var|dynamic|batch|unspecified/i.test(s || "");
    const shapeCompat = (a, b) => { if (!a.shape || !b.shape) return "unresolved"; const x = a.shape.trim().toLowerCase(), y = b.shape.trim().toLowerCase(); return (x === y || _wild(x) || _wild(y)) ? "proved" : "unresolved"; };
    const unitCompat = (a, b) => { if (!a.units || !b.units) return "unresolved"; const x = a.units.trim().toLowerCase(), y = b.units.trim().toLowerCase(); if (x === y) return "proved"; if (x === "dimensionless" || y === "dimensionless") return "unresolved"; return "refuted"; };
    const COPYLEFT = ["gpl", "agpl", "lgpl"];
    const licKey = (r) => { const l = r && r.license; if (!l) return null; return String(typeof l === "object" ? (l.spdx_id || l.key || l.name) : l).toLowerCase(); };
    const licenseCompat = (a, b) => { const la = licKey(a), lb = licKey(b); if (!la || !lb) return { status: "UNRESOLVED", detail: (la || "?") + " / " + (lb || "?") + " — license metadata absent" }; const cl = (x) => COPYLEFT.some(c => x.includes(c)); if (cl(la) && cl(lb) && la !== lb) return { status: "CONDITIONALLY-SATISFIED", detail: "distinct copyleft (" + la + "/" + lb + ") — combined distribution needs review" }; return { status: "PROVED", detail: la + " + " + lb + " combinable" }; };
    const synthTest = (po, ci, best) => { const chain = (best.adapter || []).map(s => s.op); const expr = chain.length ? chain.reduce((acc, op) => op + "(" + acc + ")", "x") : "x"; return "// generated property-test harness (unexecuted in-artifact — a RunPack for a real backend)\nproperty('" + po.kind + "\u2192" + ci.kind + " preserves semantics', () => {\n  const x = sample_" + po.kind + "();          // " + (po.semantics || po.name || po.kind) + "\n  const y = " + expr + ";\n  assert isValid_" + ci.kind + "(y);            // " + (ci.semantics || ci.name || ci.kind) + "\n  assert approxPreserves(semantics(x), semantics(y), eps);\n});"; };

    // ---------- VERIFICATION CASCADE: type-check → preregistered literature → human ----------
    // Discipline: object extraction is blind to the bridges; the type-checker sees ONLY object lists,
    // never bridge prose; the lit query is committed (preregistered) before its count returns; and the
    // producer's prize is a CANDIDATE — preserved instantly, promotable only by a human.
    const verifyCascade = async (items, meta) => {
      const { cellName, density } = meta; const cell = meta.cell;
      items.forEach(it => { it._cellLabel = cellName; });
      // 1) formal-object extraction (blind to bridges) — resolve cited ids robustly first
      setGap(g => g ? { ...g, phase: "objects", items } : g);
      const idIndex = {}; Object.keys(byId).forEach(k => { idIndex[k.toLowerCase()] = k; });
      const resolveId = (raw) => { if (!raw) return null; const s = String(raw).trim().replace(/[`'"]/g, ""); if (byId[s]) return s; const head = s.split(/[:\s(,]/)[0]; if (head && byId[head]) return head; const lc = s.toLowerCase(); if (idIndex[lc]) return idIndex[lc]; if (head && idIndex[head.toLowerCase()]) return idIndex[head.toLowerCase()]; const keys = Object.keys(idIndex).sort((a, b) => b.length - a.length); const hit = keys.find(k => lc.startsWith(k + ":") || lc.startsWith(k + " ")) || keys.find(k => k.length > 3 && lc.includes(k)); return hit ? idIndex[hit] : null; };
      items.forEach(it => { it._ridA = resolveId(it.usesFromA); it._ridB = resolveId(it.usesFromB); });
      const citedIds = [...new Set(items.flatMap(it => [it._ridA, it._ridB]).filter(Boolean))];
      let schemas = {}; let extractErr = null;
      if (citedIds.length) {
        const basis = citedIds.map(id => { const r = byId[id]; return { id, description: (r.description || "").slice(0, 220), topics: r.topics || [], readme: (r.readme || "").slice(0, 320) }; });
        try {
          const out = await window.claude.complete({ messages: [{ role: "user", content: "You are a formal MECHANISM-SCHEMA extractor for software repositories (a compiler front-end producing a typed IR). For EACH repo emit the typed interface of its core mechanism. Every port has a 'kind' from EXACTLY this set: " + MECH_KINDS.join(", ") + ". Also give each port a 'shape' (dimensional/structural signature, e.g. '[batch,d]', 'DAG', 'scalar', or 'unspecified') and 'units' (e.g. 'probability', 'L2-radius', 'logits', 'dimensionless', or 'unspecified'). 'semantics' is a short precise structural phrase (e.g. 'certified L2 radius over a smoothed classifier'), NEVER a topic word. You see only repo metadata; there are no combinations to consider. Return ONLY JSON: {\"<repoId>\": {\"consumes\":[{\"name\":str,\"kind\":kind,\"shape\":str,\"units\":str,\"semantics\":str}], \"produces\":[{\"name\":str,\"kind\":kind,\"shape\":str,\"units\":str,\"semantics\":str}], \"certifies\":[str], \"assumptions\":[str], \"invariants\":[str]}, ...}.\n" + JSON.stringify(basis) }] });
          const m = String(out).replace(/```json/gi, "").replace(/```/g, "").match(/\{[\s\S]*\}/); if (m) schemas = JSON.parse(m[0]); else extractErr = "no JSON in extraction reply";
        } catch (e) { extractErr = String(e && e.message || e); }
      }
      const schIndex = {}; Object.keys(schemas).forEach(k => { schIndex[k.toLowerCase()] = schemas[k]; });
      const normSchema = (s) => { if (!s || typeof s !== "object") return null; const norm = (arr) => (Array.isArray(arr) ? arr : []).slice(0, 4).map(p => ({ name: (p && p.name) || "", kind: (p && MECH_KINDS.includes(p.kind)) ? p.kind : "claim", shape: (p && p.shape && p.shape !== "unspecified") ? String(p.shape) : "", units: (p && p.units && p.units !== "unspecified") ? String(p.units) : "", semantics: (p && p.semantics) || "" })); const strs = (arr) => (Array.isArray(arr) ? arr : []).map(String); return { consumes: norm(s.consumes), produces: norm(s.produces), certifies: strs(s.certifies), assumptions: strs(s.assumptions), invariants: strs(s.invariants) }; };
      items.forEach(it => { it.schemaA = normSchema(schemas[it._ridA] || schIndex[(it._ridA || "").toLowerCase()]); it.schemaB = normSchema(schemas[it._ridB] || schIndex[(it._ridB || "").toLowerCase()]); it._extractionStatus = "model_inferred"; });
      // pre-fail items whose cited ids never resolved, or whose schema is missing — the precise reason, fail-closed
      items.forEach(it => { if (!it._ridA || !it._ridB) it.typeCheck = { pass: false, sharedObject: null, verdict: "type_killed", reason: "producer cited a repo id not in the corpus (" + (!it._ridA ? String(it.usesFromA) : String(it.usesFromB)) + ") — fail-closed" }; });
      // 2) MECHANISM-IR COMPILER — compatibility is DETERMINISTIC (BFS over admissible conversions), not model-judged.
      //    The model contributes only soft obligations (assumptions/invariants/metric), always labeled model-assisted.
      setGap(g => g ? { ...g, phase: "typecheck" } : g);
      const portPairsFor = (it) => { const pairs = []; const add = (src, dst, dir) => (src.produces || []).forEach(po => (dst.consumes || []).forEach(ci => pairs.push({ dir, sourceOutput: po, targetInput: ci }))); if (it.schemaA && it.schemaB) { add(it.schemaA, it.schemaB, "A→B"); add(it.schemaB, it.schemaA, "B→A"); } return pairs.slice(0, 24); };
      // multipath candidate options per item (top-3 min-risk registered paths per port pair, flattened)
      items.forEach(it => {
        if (it.typeCheck) return;
        it._candPairs = portPairsFor(it);
        const opts = [];
        it._candPairs.forEach(p => { const c = pairCompat(p.sourceOutput, p.targetInput); p.compatibility = c.compatibility; if (c.compatibility === "incompatible") return; const u = unitCompat(p.sourceOutput, p.targetInput), sh = shapeCompat(p.sourceOutput, p.targetInput); (c.options || []).forEach(o => opts.push({ dir: p.dir, sourceOutput: p.sourceOutput, targetInput: p.targetInput, exact: o.exact, adapters: o.path, staticRisk: o.cost, risk: o.cost + (sh === "proved" ? 0 : 0.5) + (u === "refuted" ? 90 : (u === "proved" ? 0 : 0.5)), unit: u })); });
        opts.sort((a, b) => a.risk - b.risk);
        it._options = opts.slice(0, 3); it._best = it._options[0] || null;
        if (!it._best) { const hasPorts = it._candPairs.length > 0; it.stage = "PROPOSED"; it.obligations = []; it.impossibility = { code: (it.schemaA && it.schemaB) ? (hasPorts ? "NO_KIND_PATH" : "NO_SHARED_PORTS") : "NO_SCHEMA", from: null, to: null, detail: (it.schemaA && it.schemaB) ? (hasPorts ? "no admissible conversion between any shared ports" : "no output→input port pairing between these mechanisms") : "mechanism schema unavailable — fail-closed" }; it.typeCheck = { pass: false, verdict: "type_killed", stage: "PROPOSED", sharedObject: null, reason: "structurally impossible [" + it.impossibility.code + "] — " + it.impossibility.detail }; }
      });
      // ONE blind model call: per-edge preconditions (by ruleId) + invariant/metric, evaluated in the item's port context
      const softPending = items.filter(it => !it.typeCheck && it._best);
      const soft = {};
      if (softPending.length) {
        try {
          const inp = softPending.map((it, ix) => { const preSet = {}; it._options.forEach(o => o.adapters.forEach(s => { if (s.auth === "cur" && s.pre) preSet[s.ruleId] = s.pre; })); return { ix, producerOutput: it._best.sourceOutput.semantics, consumerInput: it._best.targetInput.semantics, preconditions: Object.keys(preSet).map(id => ({ id, text: preSet[id] })) }; });
          const out = await window.claude.complete({ messages: [{ role: "user", content: "For each entry an OUTPUT of one mechanism feeds an INPUT of another. (1) For EACH listed conversion precondition judge whether it holds in THIS output→input context: 'satisfied'|'conditional'|'violated'|'unknown'. (2) invariantPreserved and (3) metricMeaningful on the same scale. You judge only these ports, never any proposed combination. Return ONLY JSON array [{\"ix\":n,\"preconditions\":{\"<id>\":status,...},\"invariantPreserved\":status,\"metricMeaningful\":status,\"note\":str}].\n" + JSON.stringify(inp) }] });
          parseCombos(out).forEach(e => { if (e && e.ix != null) soft[e.ix] = e; });
        } catch (e) {}
      }
      // instantiate contracts per option, PRUNE refuted paths, pick lowest residual-uncertainty survivor, build obligation vector + strict ladder
      const mapSoft = (v) => ({ satisfied: "CONDITIONALLY-SATISFIED", conditional: "CONDITIONALLY-SATISFIED", violated: "REFUTED", unknown: "UNRESOLVED" }[v] || "UNRESOLVED");
      items.forEach(it => {
        if (it.typeCheck) return;
        const sf = soft[softPending.indexOf(it)] || {}, preStatus = sf.preconditions || {};
        const instantiate = (opt) => opt.adapters.filter(s => s.auth === "cur" && s.pre).map(s => ({ ruleId: s.ruleId, op: s.op, pre: s.pre, status: mapSoft(preStatus[s.ruleId]) }));
        const scored = it._options.map(o => { const inst = instantiate(o); const refuted = inst.some(x => x.status === "REFUTED"); const unresolved = inst.filter(x => x.status === "UNRESOLVED").length; return { o, inst, refuted, unresolved, score: o.risk + unresolved * 10 + (refuted ? 1000 : 0) }; });
        const survivors = scored.filter(s => !s.refuted).sort((a, b) => a.score - b.score);
        const chosen = survivors[0] || scored.slice().sort((a, b) => a.score - b.score)[0];
        const best = chosen.o, inst = chosen.inst, po = best.sourceOutput, ci = best.targetInput, adapters = best.adapters || [];
        const srcRepo = byId[best.dir === "A→B" ? it._ridA : it._ridB], dstRepo = byId[best.dir === "A→B" ? it._ridB : it._ridA];
        const uc = best.unit, sc = shapeCompat(po, ci);
        const O = [];
        O.push({ id: "PO-1", name: "Kind path", method: "deterministic", status: "PROVED", detail: adapters.length ? (po.kind + " → " + ci.kind + " via " + adapters.map(s => s.op).join(" → ")) : (po.kind + " ≡ " + ci.kind) });
        O.push({ id: "PO-2", name: "Shape compatibility", method: "deterministic", status: sc.toUpperCase(), detail: (po.shape || "unspecified") + " ⟶ " + (ci.shape || "unspecified") });
        O.push({ id: "PO-3", name: "Unit preservation", method: "deterministic", status: uc.toUpperCase(), detail: (po.units || "unspecified") + " ⟶ " + (ci.units || "unspecified") + (uc === "unresolved" && /dimensionless/i.test((po.units || "") + (ci.units || "")) ? " (dimensionless ≠ dimensional — not auto-proved)" : "") });
        const lc = licenseCompat(srcRepo, dstRepo); O.push({ id: "PO-4", name: "License metadata screening", method: "deterministic", status: lc.status === "PROVED" ? "CONDITIONALLY-SATISFIED" : lc.status, detail: lc.detail + (lc.status === "PROVED" ? " (metadata screen only — not a legal proof)" : "") });
        if (inst.length) inst.forEach((x, xi) => O.push({ id: "PO-5." + (xi + 1), name: "Precondition · " + x.op, method: "model-assisted", status: x.status, detail: x.pre })); else O.push({ id: "PO-5", name: "Preconditions", method: "deterministic", status: "PROVED", detail: "path is fully axiomatic — no semantic precondition" });
        O.push({ id: "PO-6", name: "Invariant preservation", method: "model-assisted", status: mapSoft(sf.invariantPreserved), detail: adapters.some(s => (s.lose || []).length) ? ("destroys: " + adapters.flatMap(s => s.lose || []).join(", ")) : "no properties destroyed on path" });
        O.push({ id: "PO-7", name: "Metric measures outcome", method: "model-assisted", status: mapSoft(sf.metricMeaningful), detail: sf.note || "" });
        if (adapters.some(s => s.lossy)) O.push({ id: "PO-8", name: "Bounded information loss", method: "deterministic", status: "CONDITIONALLY-SATISFIED", detail: "lossy hops: " + adapters.filter(s => s.lossy).map(s => s.op).join(", ") + " — adapter must bound loss" });
        const po6 = O.find(o => o.id === "PO-6"), po7 = O.find(o => o.id === "PO-7");
        const unitContra = uc === "refuted", typeComposable = !unitContra;
        const anyRefutedPre = inst.some(x => x.status === "REFUTED"), anyUnresolvedPre = inst.some(x => x.status === "UNRESOLVED");
        const preconditionsSatisfied = inst.length === 0 || inst.every(x => x.status === "CONDITIONALLY-SATISFIED" || x.status === "PROVED");
        const contractOK = typeComposable && preconditionsSatisfied;
        const epistemicOK = contractOK && po6.status === "CONDITIONALLY-SATISFIED" && po7.status === "CONDITIONALLY-SATISFIED";
        let stage = !typeComposable ? "PATH_FOUND" : (!contractOK ? "TYPE_COMPOSABLE" : (!epistemicOK ? "CONTRACT_ADMISSIBLE" : "EPISTEMICALLY_SUPPORTED"));
        it.stage = stage; it.obligations = O; it.mechClass = { sourceKind: po.kind, targetKind: ci.kind };
        it.mechCompat = { matchedPorts: it._options.map(o => ({ dir: o.dir, sourceOutput: o.sourceOutput, targetInput: o.targetInput, compatibility: o.exact ? "exact" : "convertible", adapter: o.adapters, lossy: o.adapters.some(s => s.lossy) })), sharedFormalObject: best.exact, verdict: null, consideredPaths: scored.length, prunedPaths: scored.filter(s => s.refuted).length };
        if (unitContra) {
          it.bridge = null; it.mechCompat.verdict = "type_killed";
          it.impossibility = { code: "UNIT_CONTRADICTION", from: po.kind, to: ci.kind, detail: "units " + po.units + " ⟶ " + ci.units + " cannot compose" };
          it.typeCheck = { pass: false, verdict: "type_killed", stage, sharedObject: null, reason: "structurally impossible [UNIT_CONTRADICTION] — " + it.impossibility.detail };
        } else {
          const verdict = best.exact ? "type_valid" : "conversion_required";
          it.mechCompat.verdict = verdict;
          const so = best.dir === "A→B" ? it.schemaA : it.schemaB, si = best.dir === "A→B" ? it.schemaB : it.schemaA;
          it.bridge = { sourcePort: po, targetPort: ci, dir: best.dir, adapters, riskCost: Math.round(best.risk * 10) / 10, ruleInstantiations: inst, requiredAssumptions: so.assumptions || [], preservedInvariants: si.invariants || [], destroyedProperties: adapters.flatMap(s => s.lose || []), executableTest: synthTest(po, ci, { adapter: adapters }), proofObligations: O };
          it.impossibility = null;
          it.blockReason = stage === "EPISTEMICALLY_SUPPORTED" ? null : (anyRefutedPre ? "PRECONDITION_UNSATISFIED" : (anyUnresolvedPre ? "PRECONDITION_UNRESOLVED" : (po6.status === "REFUTED" ? "INVARIANT_VIOLATION" : (po7.status === "REFUTED" ? "POSTCONDITION_INSUFFICIENT" : "EVIDENCE_PENDING"))));
          it.typeCheck = { pass: true, verdict, stage, sharedObject: best.exact ? (po.kind + ": " + (po.semantics || ci.semantics)) : (po.kind + " → " + ci.kind + " (" + adapters.map(s => s.op).join(" → ") + ")"), reason: (verdict === "type_valid" ? "shared formal object" : "composable via adapter") + " — reached " + stage + (scored.length > 1 ? " · " + scored.length + " paths considered, " + scored.filter(s => s.refuted).length + " pruned" : "") };
        }
      });
      // 3) preregistered literature probe — failed type-checks never reach it
      setGap(g => g ? { ...g, phase: "literature", litDone: 0, litTotal: items.length } : g);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        it.mechanismGrounded = it.verdict !== "LIKELY-HOLLOW";
        if (!it.typeCheck.pass) { it.litClass = "SKIPPED"; it.finalVerdict = "INCOHERENT"; it.verifications = [{ instrument: "typecheck", result: "fail", reason: it.typeCheck.reason, at: new Date().toISOString() }]; continue; }
        const terms = it.litQuery || ((it.sharedMechanism || "").split(/\s+/).slice(0, 6).join(" ") || cellName);
        const prereg = { id: "prereg:" + uid(), at: new Date().toISOString(), cell: cellName, bridge: (it.combination || "").slice(0, 140), litQuery: terms, thresholds: "UNEXPLORED<" + LIT_EMERGING + " EMERGING<=" + LIT_KNOWN + " KNOWN>" + LIT_KNOWN, rule: "PRIZE iff typecheck.pass AND litClass=UNEXPLORED AND mechanism-grounded" };
        setPreregs(p => [...p, prereg]); sset(prereg.id, prereg);
        it.preregId = prereg.id; it.preregAt = prereg.at;
        let lit = litGround ? await openAlexCount(terms) : { count: null, skipped: true };
        if (lit.blocked) { litBlockedRef.current = true; lit = await litEstimateViaModel(terms); lit.unverified = true; }
        it._litQuery = terms; it.litCount = lit.count; it.litTop = lit.top || []; it.litNote = lit.note; it.modelEstimated = !!lit.modelEstimated;
        it.litClass = lit.skipped ? "OFF" : classifyLit(lit.count);
        it.finalVerdict = !it.mechanismGrounded ? "INCOHERENT" : (it.litClass === "OFF" ? it.verdict : (it.litClass === "UNEXPLORED" ? "PROMISING" : it.litClass));
        it.verifications = [{ instrument: "typecheck", result: "pass", sharedObject: it.typeCheck.sharedObject, at: new Date().toISOString() }, { instrument: it.modelEstimated ? "model-estimate (UNVERIFIED)" : "openalex", result: it.litClass, count: it.litCount, preregId: it.preregId, at: new Date().toISOString() }];
        setGap(g => g && g.cellName === cellName ? { ...g, litDone: k + 1 } : g);
      }
      // 4) prize → CANDIDATE only (producer cannot verify its own prize); preserved by instant export
      const prize = items.find(it => it.typeCheck.pass && it.stage === "EPISTEMICALLY_SUPPORTED" && it.mechanismGrounded && it.litClass === "UNEXPLORED" && !it.modelEstimated);
      let cand = null;
      if (prize) {
        cand = { id: "cand:" + uid(), at: new Date().toISOString(), cell: cellName, combination: prize.combination, usesFromA: prize.usesFromA, usesFromB: prize.usesFromB, sharedMechanism: prize.sharedMechanism, hollowCheck: prize.hollowCheck, typeCheck: prize.typeCheck, mechCompat: prize.mechCompat, mechClass: prize.mechClass, bridge: prize.bridge, obligations: prize.obligations, impossibility: prize.impossibility, schemaA: prize.schemaA, schemaB: prize.schemaB, litQuery: prize._litQuery, litCount: prize.litCount, litTop: prize.litTop, preregId: prize.preregId, producedBy: "model:in-artifact", status: "candidate-awaiting-independent-verification" };
        setCandidates(p => [...p, cand]); sset(cand.id, cand);
        setTimeout(() => doExport([], [cand]), 400);
      }
      const killedByType = items.filter(x => x.typeCheck && !x.typeCheck.pass).length;
      const known = items.filter(it => it.litClass === "KNOWN").length, emerging = items.filter(it => it.litClass === "EMERGING").length;
      const bestCount = Math.min(...items.filter(it => it.litCount != null).map(it => it.litCount).concat([Infinity]));
      setProbeLog(p => [...p.filter(x => x.cellName !== cellName), { cellName, density, paperCount: bestCount === Infinity ? null : bestCount, verdict: cand ? "CANDIDATE" : (emerging ? "EMERGING" : (known ? "KNOWN" : "INCOHERENT")), prize: !!cand, killedByType, mechClasses: items.map(it => it.mechClass).filter(Boolean), at: new Date().toISOString() }]);
      recordMechOutcomes(items);
      setGap(g => ({ cell, cellName, density, items, generated: !cell, sideA: g && g.sideA, sideB: g && g.sideB, prizeCandidate: cand, litBlocked: litBlockedRef.current }));
    };

    // ---------- gap exploration: sparse-cell probe → JIT-enrich → bridge → literature grounding ----------
    const exploreGap = async (i, j) => {
      const di = DOMAINS[i], dj = DOMAINS[j];
      const cellName = di.key + "×" + dj.key, density = matrix.M[i][j];
      const bridgeRepos = (matrix.cellRepos[Math.min(i, j) + "_" + Math.max(i, j)] || []);
      const bridgeIds = new Set(bridgeRepos.map(r => r.id));
      const pick = (idx, exclude) => (classify.members[idx] || []).filter(r => !exclude.has(r.id)).slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 9);
      const sideA = pick(i, bridgeIds), sideB = pick(j, new Set([...bridgeIds, ...sideA.map(r => r.id)]));
      // include existing bridge repo(s) for sparse cells
      const enrichFlank = [...bridgeRepos.slice(0, 4), ...sideA, ...sideB];
      if (sideA.length < 2 || sideB.length < 2) { setGap({ cell: [i, j], cellName, density, error: "Not enough repos on one side to bridge (" + di.key + ": " + sideA.length + ", " + dj.key + ": " + sideB.length + "). Pull more via ✦ Discover." }); return; }
      const hasTok = !!ghToken.trim();
      setGap({ cell: [i, j], cellName, density, loading: true, phase: hasTok ? "enrich" : "synth", enrichDone: 0, enrichTotal: enrichFlank.length, noToken: !hasTok, sideA: sideA.map(r => r.id), sideB: sideB.map(r => r.id) });
      if (hasTok) { let done = 0; for (const r of enrichFlank) { if (!r.enriched && r._user) { const enr = await enrichRepo(r, (dataRef.current.repos || []).map(x => x.name)); applyRepo(enr, false); Object.assign(r, enr); } done++; setGap(g => g && g.cellName === cellName ? { ...g, enrichDone: done } : g); const rc = rateRef.current; if (rc && rc.remaining != null && rc.remaining <= 1) break; } }
      setGap(g => g ? { ...g, phase: "synth" } : g);
      if (!window.claude || !window.claude.complete) { setGap(g => ({ ...(g || {}), loading: false, error: "In-artifact model unavailable in this preview." })); return; }
      const compact = (r) => ({ id: r.id, description: (r.description || "").slice(0, 200), topics: r.topics || [], language: r.language || null, readme: (r.readme || "").slice(0, 400), signalFiles: Object.keys(r.signalFiles || {}) });
      const payload = { domainA: di.key, reposA: sideA.map(compact), domainB: dj.key, reposB: sideB.map(compact), existingBridges: bridgeRepos.slice(0, 4).map(compact) };
      let user = SYS + "\n\nGAP-EXPLORATION TASK. Fusion-matrix cell " + cellName + " has only " + density + " bridging repo(s) — these two domains have barely started fusing in open source.\n" + JSON.stringify(payload) + "\n\nFor at most 3 proposals: given these SPECIFIC repos from each side, propose what a bridge between " + di.key + " and " + dj.key + " would concretely be — name the exact capability drawn from a repo on each side (cite the repo id) and the shared mechanism. Also add a field \"litQuery\": a TIGHT, mechanism-specific phrase (4-8 words) naming the SPECIFIC technique being bridged, suitable for a precise literature search — NOT broad domain words. Bad (too broad): 'brain computer interface trading'. Good (specific): 'spiking network certified adversarial robustness bounds'. Judge whether the mechanism is real (PROMISING/SPECULATIVE) or absent (LIKELY-HOLLOW). usesFromA/usesFromB must cite a specific repo id. Return ONLY the JSON array; each object also includes \"litQuery\".";
      if (negatives.length) user += "\nAlready-archived dead-ends, do not re-propose: " + negatives.map(x => x.combination).slice(0, 10).join("; ");
      user += mechPriorsText();
      let items;
      try { const out = await window.claude.complete({ messages: [{ role: "user", content: user }] }); items = parseCombos(out); }
      catch (ex) { setGap(g => ({ ...(g || { cell: [i, j], cellName, density }), loading: false, error: "Bridge synthesis failed: " + ex.message })); return; }
      await verifyCascade(items, { cell: [i, j], cellName, density });
    };
    // ---------- GENERATE-AND-VERIFY: the matrix is one generator among several; this is the other ----------
    const generateAndVerify = async () => {
      if (!window.claude || !window.claude.complete) { setGap({ cell: null, cellName: "⚡ generated", density: null, error: "In-artifact model unavailable." }); return; }
      const sample = [];
      DOMAINS.forEach((d, idx) => { (classify.members[idx] || []).slice().sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 4).forEach(r => { if (!sample.some(s => s.id === r.id)) sample.push({ id: r.id, domain: d.key, description: (r.description || "").slice(0, 140), topics: (r.topics || []).slice(0, 6) }); }); });
      if (sample.length < 6) { setGap({ cell: null, cellName: "⚡ generated", density: null, error: "Not enough classified repos — run ✦ Discover first." }); return; }
      const label = "⚡ gen-" + (genCounterRef.current += 1);
      setGap({ cell: null, cellName: label, density: null, loading: true, phase: "synth", generated: true });
      let user = SYS + "\n\nGENERATE-AND-VERIFY TASK. Below is a cross-domain sample of repositories. Propose at most 3 bridges, each combining repos from two DIFFERENT domains, unconstrained by any gap map. Your proposals will be independently type-checked on formal objects extracted from each repo (without seeing your proposal) and literature-checked with a preregistered query — only propose mechanisms precise enough to survive both. Fields per proposal: combination, usesFromA (repo id), usesFromB (repo id), sharedMechanism, hollowCheck, verdict, litQuery (TIGHT 4-8 word mechanism-specific phrase). Return ONLY the JSON array.\n" + JSON.stringify(sample);
      if (negatives.length) user += "\nAlready-archived dead-ends, do not re-propose: " + negatives.map(x => x.combination).slice(0, 10).join("; ");
      user += mechPriorsText();
      let items;
      try { const out = await window.claude.complete({ messages: [{ role: "user", content: user }] }); items = parseCombos(out); }
      catch (ex) { setGap({ cell: null, cellName: label, density: null, error: "Generation failed: " + ex.message }); return; }
      await verifyCascade(items, { cell: null, cellName: label, density: null });
    };
    generateRef.current = generateAndVerify;

    // ---------- promotion gate: fail-closed — both instruments must pass, and only a human promotes ----------
    const STAGE_RANK = { PROPOSED: 0, PATH_FOUND: 1, TYPE_COMPOSABLE: 2, CONTRACT_ADMISSIBLE: 3, EPISTEMICALLY_SUPPORTED: 4, VERIFIED: 5 };
    const gateOK = (it) => !!(it && it.typeCheck && it.typeCheck.pass && (STAGE_RANK[it.stage] || 0) >= 3 && (it.litClass === "UNEXPLORED" || it.litClass === "EMERGING") && it.finalVerdict !== "INCOHERENT" && !it.modelEstimated);
    const promoteGap = (it, cell) => {
      if (!gateOK(it)) return;
      const cellLabel = it._cellLabel || (cell ? DOMAINS[cell[0]].key + "×" + DOMAINS[cell[1]].key : "generated");
      const parents = [...new Set([it._ridA, it._ridB].filter(p => p && byId[p]))];
      const node = { id: "synth:" + uid(), kind: "synth", combination: it.combination, usesFromA: it.usesFromA, usesFromB: it.usesFromB, ridA: it._ridA, ridB: it._ridB, sharedMechanism: it.sharedMechanism, hollowCheck: it.hollowCheck, verdict: it.finalVerdict || it.verdict, parents, createdAt: new Date().toISOString(), status: "validated", depth: 1, gapCell: cellLabel, isGapBridge: true, producedBy: "model:in-artifact", typeCheck: it.typeCheck, preregId: it.preregId, litQuery: it._litQuery, litCount: it.litCount, litClass: it.litClass, verifications: [...(it.verifications || []), { instrument: "human", result: "promoted", at: new Date().toISOString() }] };
      setSynthNodes(p => [...p, node]); sset(node.id, node);
      setGap(g => g ? { ...g, items: g.items.filter(x => x !== it) } : g);
    };
    const archiveGap = (it, cell) => {
      const cellLabel = it._cellLabel || (cell ? DOMAINS[cell[0]].key + "×" + DOMAINS[cell[1]].key : "generated");
      const neg = { id: "neg:" + uid(), combination: it.combination, why: it.hollowCheck || it.sharedMechanism || "", parents: [it._ridA || it.usesFromA, it._ridB || it.usesFromB].filter(Boolean), createdAt: new Date().toISOString(), gapCell: cellLabel, killedBy: it.impossibility ? it.impossibility.code : (it.blockReason || (it.litClass === "KNOWN" ? "LITERATURE_KNOWN" : "human")), mechClass: it.mechClass, verifications: it.verifications || [] };
      setNegatives(p => [...p, neg]); sset(neg.id, neg);
      setGap(g => g ? { ...g, items: g.items.filter(x => x !== it) } : g);
    };
    exploreGapRef.current = exploreGap;
    useEffect(() => { gapRef.current = gap; }, [gap]);
    // sparse cells (off-diagonal, 1..3) ranked ascending — the probe target
    const sparseCells = useMemo(() => { const out = []; for (let i = 0; i < matrix.N; i++) for (let j = i + 1; j < matrix.N; j++) { const v = matrix.M[i][j]; if (v >= 1 && v <= 3) out.push({ i, j, v, name: DOMAINS[i].key + "×" + DOMAINS[j].key }); } return out.sort((a, b) => a.v - b.v); }, [matrix]);
    const sparseCellsRef = useRef(sparseCells); useEffect(() => { sparseCellsRef.current = sparseCells; }, [sparseCells]);
    window.__gbSparseCells = () => sparseCellsRef.current.map(c => ({ name: c.name, density: c.v }));
    window.__gbProbe = (i, j) => exploreGapRef.current && exploreGapRef.current(i, j);
    window.__gbProbeByName = (name) => { const c = sparseCellsRef.current.find(x => x.name === name); if (c) return exploreGapRef.current(c.i, c.j); console.warn("[gb] probeByName: cell '" + name + "' not in current sparse list — use __gbProbe(i,j)"); return null; };
    window.__gbProbeLog = () => probeLogRef.current;
    window.__gbGap = () => { const g = gapRef.current; if (!g) return null; return { cellName: g.cellName, density: g.density, loading: !!g.loading, phase: g.phase, prize: g.prizeCandidate ? g.prizeCandidate.combination : null, items: (g.items || []).map(it => ({ combination: it.combination, usesFromA: it.usesFromA, usesFromB: it.usesFromB, ridA: it._ridA, ridB: it._ridB, verdict: it.verdict, typeCheck: it.typeCheck, litClass: it.litClass, litCount: it.litCount, litQuery: it._litQuery, preregId: it.preregId, finalVerdict: it.finalVerdict, modelEstimated: it.modelEstimated })) }; };
    window.__gbGenerate = () => generateRef.current && generateRef.current();
    window.__gbPreregs = () => preregsRef.current;
    window.__gbCandidates = () => candidatesRef.current;

    // ---------- LOW-LOW frontier scan: rank sparse cells by OpenAlex paper-density; flag implementation gaps ----------
    // OpenAlex uses relevance search over a natural-language phrase (litTerm) — that works.
    const litPairQuery = (i, j) => DOMAINS[i].litTerm + " " + DOMAINS[j].litTerm;
    // GitHub repo search must use precise topic: qualifiers (a long word-AND returns ~0 => false gaps).
    const GH_TOPICS = { "Alignment": ["alignment", "rlhf"], "Interp": ["interpretability", "mechanistic-interpretability"], "Evals": ["llm-evaluation", "benchmark"], "RedTeam": ["red-teaming", "jailbreak"], "Robustness": ["adversarial-robustness", "adversarial-examples"], "Verification": ["formal-verification", "neural-network-verification"], "Governance": ["ai-governance", "responsible-ai"], "Epistemics": ["calibration", "uncertainty-quantification"], "Oversight": ["guardrails", "ai-safety"] };
    const ghPairQueries = (i, j) => { const A = GH_TOPICS[DOMAINS[i].key] || [DOMAINS[i].topics[0]]; const B = GH_TOPICS[DOMAINS[j].key] || [DOMAINS[j].topics[0]]; const combos = [[A[0], B[0]]]; if (A[1] && B[1]) combos.push([A[1], B[1]]); return combos.filter(([a, b]) => a && b).map(([a, b]) => "topic:" + a + " topic:" + b); };
    // repos tagged BOTH domains; take the MAX over topic combos so we never under-count into a false gap
    const ghRepoCountForPair = async (i, j) => { let best = null, bestQ = null; for (const q of ghPairQueries(i, j)) { try { const res = await fetch("https://api.github.com/search/repositories?q=" + encodeURIComponent(q) + "&per_page=1", { headers: ghHeaders() }); readRate(res); if (res.ok) { const jj = await res.json(); const tc = typeof jj.total_count === "number" ? jj.total_count : null; if (tc != null && (best == null || tc > best)) { best = tc; bestQ = q; } } else if (res.status === 403) break; } catch (e) {} await new Promise(r => setTimeout(r, 6500)); } return { count: best, query: bestQ }; };
    const scanFrontier = async () => {
      const N = matrix.N, cells = [];
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const v = matrix.M[i][j]; if (v >= 1 && v <= 4) cells.push({ i, j, v, name: DOMAINS[i].key + "×" + DOMAINS[j].key }); }
      if (!cells.length) { setFrontier({ running: false, cells: [], empty: true }); return; }
      setFrontier({ running: true, phase: "papers", total: cells.length, done: 0, cells: [] });
      const out = [];
      for (let k = 0; k < cells.length; k++) {
        const c = cells[k], q = litPairQuery(c.i, c.j);
        let lit = litGround ? await openAlexCount(q) : { count: null };
        if (lit.blocked) { litBlockedRef.current = true; lit = await litEstimateViaModel(q); lit.unverified = true; }
        out.push({ ...c, q, paperCount: lit.count, litClass: classifyLit(lit.count), modelEstimated: !!lit.modelEstimated });
        setFrontier(f => ({ ...(f || {}), running: true, phase: "papers", total: cells.length, done: k + 1, cells: [...out] }));
      }
      const ranked = [...out].sort((a, b) => ((a.paperCount == null ? 1e12 : a.paperCount) - (b.paperCount == null ? 1e12 : b.paperCount)) || (a.v - b.v));
      const implCandidates = out.filter(c => c.paperCount != null && c.paperCount >= 150 && c.v <= 2).sort((a, b) => b.paperCount - a.paperCount).slice(0, 5);
      setFrontier(f => ({ ...(f || {}), running: true, phase: "implverify", ranked, cells: out, implTotal: implCandidates.length, implDone: 0 }));
      const impl = [];
      for (const c of implCandidates) {
        const gh = await ghRepoCountForPair(c.i, c.j);
        impl.push({ ...c, ghRepoCount: gh.count, ghQuery: gh.query, realGap: gh.count != null && gh.count < 25 });
        setFrontier(f => ({ ...(f || {}), impl: [...impl], implDone: impl.length }));
      }
      setFrontier(f => ({ ...(f || {}), running: false, phase: "done", ranked, cells: out, impl }));
    };
    scanFrontierRef.current = scanFrontier;
    window.__gbScanFrontier = () => scanFrontierRef.current && scanFrontierRef.current();
    window.__gbFrontier = () => { const f = frontierRef.current; if (!f) return null; return { running: f.running, phase: f.phase, done: f.done, total: f.total, implDone: f.implDone, implTotal: f.implTotal, ranked: (f.ranked || f.cells || []).map(c => ({ name: c.name, repoDensity: c.v, paperCount: c.paperCount, litClass: c.litClass, modelEstimated: c.modelEstimated })), impl: (f.impl || []).map(c => ({ name: c.name, paperCount: c.paperCount, ghRepoCount: c.ghRepoCount, ghQuery: c.ghQuery, realGap: c.realGap })) }; };

    // ================= RENDER =================
    const card = { background: "#161922", border: "1px solid #262b36", borderRadius: 10 };
    const chip = (txt, c) => h("span", { key: txt + Math.random(), style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#0c0e13", border: "1px solid #2b313d", color: c || "#aeb4be" } }, txt);
    const hbtn = (label, onClick, primary) => h("button", { onClick, style: { cursor: "pointer", fontSize: 12.5, fontWeight: 500, padding: "7px 12px", borderRadius: 8, whiteSpace: "nowrap", background: primary ? "#f0a868" : "transparent", color: primary ? "#1a1206" : "#cdd3dd", border: primary ? "none" : "1px solid #2b313d" } }, label);

    const header = h("div", { style: { display: "flex", alignItems: "center", gap: 16, rowGap: 8, flexWrap: "wrap", padding: "10px 16px", borderBottom: "1px solid #20242e", background: "#101319", flex: "0 0 auto" } },
      h("div", { style: { display: "flex", alignItems: "baseline", gap: 9 } }, h("div", { style: { fontWeight: 700, fontSize: 17, letterSpacing: -0.3 } }, "OpenSource Cortex"), h("div", { style: { fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", color: "#9a6cff", border: "1px solid #3a2f5a", borderRadius: 5, padding: "1px 5px" } }, "v0.5.1"), h("div", { style: { width: 7, height: 7, borderRadius: 9, background: STORE ? "#43C6AC" : "#E8924A" }, title: STORE ? "persistence on" : "persistence off" })),
      h("div", { style: { display: "flex", gap: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#9aa1ad", flexWrap: "wrap" } },
        h("span", null, h("b", { style: { color: "#e6e8ec" } }, "@" + (data.githubUser || "—"))),
        h("span", null, h("b", { style: { color: "#e6e8ec" } }, repos.length), " repos"),
        synthNodes.length > 0 && h("span", null, h("b", { style: { color: "#E8C24A" } }, synthNodes.length), " syntheses"),
        h("span", null, h("b", { style: { color: "#e6e8ec" } }, (data.edges || []).length + (edgeTypes.provenance ? synthNodes.reduce((a, s) => a + (s.parents || []).length, 0) : 0) + manualLinks.length), " edges")),
      h("div", { style: { flex: 1 } }),
      h("div", { style: { display: "flex", border: "1px solid #2b313d", borderRadius: 8, overflow: "hidden", marginRight: 2, flexShrink: 0 } }, ...[["galaxy", "Galaxy"], ["matrix", "Fusion matrix"]].map(([v, lbl]) => h("button", { key: v, onClick: () => setView(v), style: { padding: "7px 12px", border: "none", background: view === v ? "#2b313d" : "transparent", color: view === v ? "#e6e8ec" : "#9aa1ad", cursor: "pointer", fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap" } }, lbl))),
      hbtn("✦ Absorb", () => setShowFetch(true), true),
      hbtn("✦ Discover", () => setShowDiscover(true), true),
      hbtn("◈ Cortex", () => setShowCortex(true)),
      hbtn("Export", exportBrain),
      h("label", { style: { cursor: "pointer", fontSize: 12.5, fontWeight: 500, padding: "7px 12px", borderRadius: 8, border: "1px solid #2b313d", color: "#cdd3dd" } }, "Load", h("input", { type: "file", accept: "application/json,.json", onChange: onFile, style: { display: "none" } })),
      hbtn("Reset", resetBrain));

    const Toggle = (key, label, color, on, onClick) => h("button", { key, onClick, style: { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "4px 8px", borderRadius: 7, border: "1px solid transparent", background: "transparent", color: on ? "#e6e8ec" : "#6b7280", cursor: "pointer", fontSize: 12.5, lineHeight: 1.15, font: "inherit", opacity: on ? 1 : 0.6 } }, h("span", { style: { width: 11, height: 11, borderRadius: color ? 3 : 9, background: on ? color : "transparent", border: "1.5px solid " + color, flex: "0 0 auto" } }), h("span", null, label));

    const controls = h("div", { style: { ...card, position: "absolute", left: 14, top: 14, width: 250, maxHeight: "calc(100% - 28px)", overflowY: "auto", padding: 13, zIndex: 5, backdropFilter: "blur(6px)" } },
      h("div", { style: { position: "relative", marginBottom: 12 } }, h("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: "Search name · topic · note", style: { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #2b313d", background: "#0c0e13", color: "#e6e8ec", fontSize: 12.5, outline: "none" } }), search && h("button", { onClick: () => setSearch(""), style: { position: "absolute", right: 7, top: 6, background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 15 } }, "×")),
      focusNode && h("button", { onClick: () => setFocusNode(null), style: { width: "100%", marginBottom: 10, padding: "6px", borderRadius: 7, border: "1px solid #E8C24A55", background: "rgba(232,194,74,0.1)", color: "#E8C24A", cursor: "pointer", fontSize: 12 } }, "◆ Provenance focus — clear"),
      h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", margin: "4px 0 5px" } }, "Connections"),
      ...Object.keys(EDGEL).map(t => Toggle(t, EDGES[t], EDGEC[t], edgeTypes[t], () => setEdgeTypes(p => ({ ...p, [t]: !p[t] })))),
      h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", margin: "12px 0 5px" } }, "Languages"),
      ...langs.map(l => Toggle("l-" + l, l, langColor(l), !langOff[l], () => setLangOff(p => ({ ...p, [l]: !p[l] })))),
      h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", margin: "12px 0 5px" } }, "Recency"),
      h("input", { type: "range", min: 5, max: 100, value: recency, onChange: e => setRecency(+e.target.value), style: { width: "100%", accentColor: "#f0a868" } }),
      h("div", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9aa1ad" } }, recency >= 100 ? "all repos" : "most recent " + recency + "%"),
      h("div", { style: { marginTop: 12, paddingTop: 11, borderTop: "1px solid #20242e", display: "flex", flexDirection: "column", gap: 6 } },
        h("button", { onClick: () => { setCluster(c => !c); setExpanded({}); }, style: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid " + (cluster ? "#f0a868" : "#2b313d"), background: cluster ? "rgba(240,168,104,0.12)" : "transparent", color: "#e6e8ec", cursor: "pointer", fontSize: 12.5 } }, h("span", { style: { width: 11, height: 11, borderRadius: 3, background: cluster ? "#f0a868" : "transparent", border: "1.5px solid #f0a868" } }), "Cluster by naming family"),
        h("button", { onClick: () => setOnlySynth(o => !o), style: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid " + (onlySynth ? "#E8C24A" : "#2b313d"), background: onlySynth ? "rgba(232,194,74,0.12)" : "transparent", color: "#e6e8ec", cursor: "pointer", fontSize: 12.5 } }, h("span", { style: { width: 11, height: 11, borderRadius: 3, background: onlySynth ? "#E8C24A" : "transparent", border: "1.5px solid #E8C24A" } }), "Show only syntheses")));

    const legend = h("div", { style: { ...card, position: "absolute", left: 14, bottom: 14, padding: "9px 12px", zIndex: 4, fontSize: 11, color: "#9aa1ad", maxWidth: 250 } },
      h("div", { style: { display: "flex", gap: 12, marginBottom: 5 } }, h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 } }, h("span", { style: { width: 9, height: 9, borderRadius: 9, background: "#5B8FF9" } }), "repo"), h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 } }, h("span", { style: { width: 9, height: 9, background: "#E8C24A", transform: "rotate(45deg)" } }), "synthesis")),
      h("div", { style: { fontFamily: "'JetBrains Mono',monospace", marginBottom: 4, fontSize: 10.5 } }, "size = file count · color = language"),
      h("div", { style: { display: "flex", flexWrap: "wrap", gap: "3px 10px" } }, ...langs.filter(l => !langOff[l]).slice(0, 8).map(l => h("span", { key: l, style: { display: "inline-flex", alignItems: "center", gap: 5 } }, h("span", { style: { width: 8, height: 8, borderRadius: 8, background: langColor(l) } }), l))));

    const zoomBtns = h("div", { style: { position: "absolute", right: 14, bottom: 14, display: "flex", flexDirection: "column", gap: 6, zIndex: 4 } }, ...[["+", () => zoomBy(1.3)], ["−", () => zoomBy(1 / 1.3)], ["⤢", () => fitView()]].map(([t, fn]) => h("button", { key: t, onClick: fn, style: { width: 34, height: 34, borderRadius: 8, border: "1px solid #2b313d", background: "#161922", color: "#cdd3dd", fontSize: 17, cursor: "pointer", lineHeight: "30px" } }, t)));

    const linkBanner = linking && h("div", { style: { position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 8, background: "#2a2030", border: "1px solid #E86A9E", color: "#f2b8d2", padding: "8px 14px", borderRadius: 8, fontSize: 12.5 } }, "Drawing see-also link from ", h("b", null, linking), " — click a target node (Esc to cancel)");

    const cellHiBanner = view === "galaxy" && cellHi && !linking && (() => { const parts = cellHi.split("_").map(Number); const lbl = (DOMAINS[parts[0]] && DOMAINS[parts[1]]) ? (DOMAINS[parts[0]].key + " × " + DOMAINS[parts[1]].key) : "cell"; const cnt = (matrix.cellRepos[cellHi] || []).length; return h("div", { style: { position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 8, ...card, padding: "7px 13px", display: "flex", gap: 12, alignItems: "center", fontSize: 12.5 } }, h("span", { style: { color: "#36e0ff", fontFamily: "'JetBrains Mono',monospace" } }, "lit: " + lbl + " · " + cnt + " repos"), h("button", { onClick: () => setCellHi(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13 } }, "clear")); })();

    const edgePop = edgeInfo && h("div", { style: { ...card, position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 6, padding: "10px 14px", maxWidth: 460, borderColor: EDGEC[edgeInfo.type] } },
      h("div", { style: { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" } }, h("b", { style: { color: EDGEC[edgeInfo.type], fontFamily: "'JetBrains Mono',monospace", fontSize: 12 } }, EDGEL[edgeInfo.type] + " · weight " + edgeInfo.weight), h("button", { onClick: () => setEdgeInfo(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 } }, "×")),
      h("div", { style: { fontSize: 12.5, color: "#cdd3dd", marginTop: 4 } }, edgeInfo.source.id + "  ⟷  " + edgeInfo.target.id),
      ...edgeInfo.evidence.map((ev, i) => h("div", { key: i, style: { fontSize: 12, color: "#9aa1ad", marginTop: 3 } }, "• " + ev)),
      edgeInfo.linkId && h("button", { onClick: () => delLink(edgeInfo.linkId), style: { marginTop: 8, padding: "5px 10px", borderRadius: 6, border: "1px solid #E86A9E55", background: "transparent", color: "#E86A9E", cursor: "pointer", fontSize: 12 } }, "Delete this link"));

    const md = (src) => {
      const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const inl = s => esc(s).replace(/`([^`]+)`/g, "<code style='background:#0c0e13;padding:1px 5px;border-radius:4px;font-size:11.5px;color:#7fd4c0'>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href='$2' target='_blank'>$1</a>");
      const lines = String(src || "").split("\n"); let out = "", inCode = false, inList = false; const closeList = () => { if (inList) { out += "</ul>"; inList = false; } };
      for (let ln of lines) {
        if (ln.trim().startsWith("```")) { if (inCode) { out += "</pre>"; inCode = false; } else { closeList(); out += "<pre style='background:#0c0e13;border:1px solid #20242e;border-radius:7px;padding:9px;overflow:auto;font-family:JetBrains Mono,monospace;font-size:11.5px;color:#9aa1ad'>"; inCode = true; } continue; }
        if (inCode) { out += esc(ln) + "\n"; continue; }
        const hm = ln.match(/^(#{1,4})\s+(.*)/); if (hm) { closeList(); const sz = [0, 16, 14.5, 13, 12.5][hm[1].length]; out += "<div style='font-weight:700;font-size:" + sz + "px;margin:9px 0 3px;color:#e6e8ec'>" + inl(hm[2]) + "</div>"; continue; }
        if (/^\s*[-*]\s+/.test(ln)) { if (!inList) { out += "<ul style='margin:3px 0;padding-left:18px'>"; inList = true; } out += "<li style='margin:1px 0'>" + inl(ln.replace(/^\s*[-*]\s+/, "")) + "</li>"; continue; }
        closeList(); if (ln.trim() === "") out += "<div style='height:6px'></div>"; else out += "<div style='margin:2px 0'>" + inl(ln) + "</div>";
      }
      closeList(); if (inCode) out += "</pre>"; return out;
    };

    const noteEditor = (id) => h("div", { style: { marginTop: 12 } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 5 } }, "Note"), h("textarea", { value: notes[id] || "", onChange: e => setNote(id, e.target.value), placeholder: "Attach a persistent note…", rows: 3, style: { width: "100%", padding: "7px 9px", borderRadius: 7, border: "1px solid #2b313d", background: "#0c0e13", color: "#e6e8ec", fontSize: 12, resize: "vertical", outline: "none" } }));

    const selRepo = sel && byId[sel];
    const selSynth = sel && synthById[sel];
    const inCombo = sel && combo.includes(sel);
    const comboBtn = (id) => h("button", { onClick: () => setCombo(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]), style: { flex: 1, padding: "7px", borderRadius: 7, border: "1px solid " + (combo.includes(id) ? "#f0a868" : "#2b313d"), background: combo.includes(id) ? "rgba(240,168,104,0.14)" : "transparent", color: combo.includes(id) ? "#f0a868" : "#cdd3dd", cursor: "pointer", fontSize: 12.5 } }, combo.includes(id) ? "✓ In synthesis set" : "+ Add to synthesis");

    const repoPanel = selRepo && h("div", { style: { ...card, position: "absolute", right: 14, top: 14, width: 344, maxHeight: "calc(100% - 28px)", overflowY: "auto", zIndex: 6, padding: 0 } },
      h("div", { style: { padding: "13px 15px 0" } },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } }, h("div", { style: { fontWeight: 700, fontSize: 16, wordBreak: "break-word" } }, selRepo.name, selRepo._external && h("span", { style: { fontSize: 10, color: "#E8C24A", marginLeft: 6 } }, "related")), h("button", { onClick: () => setSel(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1 } }, "×")),
        h("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9aa1ad" } }, selRepo.language && h("span", { style: { color: langColor(selRepo.language) } }, "● " + selRepo.language), h("span", null, "★ " + (selRepo.stars || 0)), h("span", null, "updated " + fmtDate(selRepo.updatedAt)), h("span", null, (selRepo.fileTree || []).length + " files"), !selRepo.enriched && h("span", { style: { color: "#E8924A" } }, enrichingIds[selRepo.id] ? "enriching…" : "not enriched")),
        selRepo.description && h("div", { style: { fontSize: 13, color: "#cdd3dd", marginTop: 9, lineHeight: 1.45 } }, selRepo.description),
        h("div", { style: { display: "flex", gap: 8, marginTop: 11 } }, comboBtn(selRepo.id), h("a", { href: "https://github.com/" + (selRepo._user || data.githubUser || "") + "/" + selRepo.name, target: "_blank", style: { padding: "7px 11px", borderRadius: 7, border: "1px solid #2b313d", color: "#cdd3dd", textDecoration: "none", fontSize: 12.5 } }, "GitHub ↗")),
        h("div", { style: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" } },
          !selRepo.enriched && h("button", { onClick: () => triggerEnrich(selRepo), disabled: !!enrichingIds[selRepo.id], style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12 } }, enrichingIds[selRepo.id] ? "enriching…" : "Enrich now"),
          h("button", { onClick: () => setLinking(selRepo.id), style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #E86A9E55", background: "transparent", color: "#E86A9E", cursor: "pointer", fontSize: 12 } }, "Draw see-also link"),
          h("button", { onClick: () => findRelated({ kind: "repo", id: selRepo.id, repo: selRepo }), style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12 } }, "Find related repos"),
          h("button", { onClick: () => setFocusNode(selRepo.id), style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12 } }, "Focus provenance")),
        (selRepo.topics || []).length > 0 && h("div", { style: { marginTop: 12 } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 5 } }, "Topics"), h("div", { style: { display: "flex", flexWrap: "wrap", gap: 5 } }, ...(selRepo.topics || []).map(t => chip(t, "#9fb6e8")))),
        (selRepo.dependencies || []).length > 0 && h("div", { style: { marginTop: 11 } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 5 } }, "Dependencies"), h("div", { style: { display: "flex", flexWrap: "wrap", gap: 5 } }, ...(selRepo.dependencies || []).map(d => chip(d, "#7fd4c0")))),
        noteEditor(selRepo.id)),
      (() => { const conns = (data.edges || []).filter(e => e.source === selRepo.id || e.target === selRepo.id); return conns.length > 0 && h("div", { style: { padding: "12px 15px 0" } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 } }, "Connections (" + conns.length + ")"), ...conns.slice(0, 30).map((e, i) => h("div", { key: i, style: { display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, fontSize: 12 } }, h("span", { style: { width: 7, height: 7, borderRadius: 7, background: EDGEC[e.type], marginTop: 4, flex: "0 0 auto" } }), h("div", null, h("span", { style: { color: "#cdd3dd", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#3a4150" }, onClick: () => { const o = e.source === selRepo.id ? e.target : e.source; if (byId[o]) setSel(o); } }, e.source === selRepo.id ? e.target : e.source), h("div", { style: { color: "#8a8f98", fontSize: 11 } }, e.evidence))))); })(),
      selRepo.readme && h("div", { style: { padding: "12px 15px 0" } }, h("button", { onClick: () => setReadmeOpen(o => !o), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", padding: 0 } }, (readmeOpen ? "▾ " : "▸ ") + "README"), readmeOpen && h("div", { style: { fontSize: 12.5, color: "#bcc2cc", lineHeight: 1.5, marginTop: 6, borderLeft: "2px solid #20242e", paddingLeft: 11, maxHeight: 280, overflowY: "auto" }, dangerouslySetInnerHTML: { __html: md(selRepo.readme) } })),
      (selRepo.fileTree || []).length > 0 && h("div", { style: { padding: "12px 15px 0" } }, h("button", { onClick: () => setTreeOpen(o => !o), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", padding: 0 } }, (treeOpen ? "▾ " : "▸ ") + "File tree (" + (selRepo.fileTree || []).length + ")" + (selRepo.truncated ? " · partial" : "")), treeOpen && h("div", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9aa1ad", marginTop: 6, maxHeight: 200, overflowY: "auto" } }, ...(selRepo.fileTree || []).slice(0, 400).map((f, i) => h("div", { key: i, style: { padding: "1px 0", whiteSpace: "nowrap" } }, f)))),
      Object.keys(selRepo.signalFiles || {}).length > 0 && h("div", { style: { padding: "12px 15px 16px" } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 } }, "Signal files"), ...Object.keys(selRepo.signalFiles || {}).map(fn => h("div", { key: fn, style: { marginBottom: 5 } }, h("button", { onClick: () => setOpenSig(openSig === selRepo.id + fn ? null : selRepo.id + fn), style: { width: "100%", textAlign: "left", padding: "5px 9px", borderRadius: 6, border: "1px solid #2b313d", background: "#0c0e13", color: "#cdd3dd", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5 } }, (openSig === selRepo.id + fn ? "▾ " : "▸ ") + fn), openSig === selRepo.id + fn && h("pre", { style: { background: "#0c0e13", border: "1px solid #20242e", borderTop: "none", borderRadius: "0 0 6px 6px", margin: 0, padding: 9, fontSize: 11, color: "#9aa1ad", whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", fontFamily: "'JetBrains Mono',monospace" } }, selRepo.signalFiles[fn])))));

    const vmeta = { "PROMISING": { c: "#43C6AC", bg: "rgba(67,198,172,0.12)" }, "SPECULATIVE": { c: "#E8924A", bg: "rgba(232,146,74,0.12)" }, "LIKELY-HOLLOW": { c: "#8a8f98", bg: "rgba(138,143,152,0.08)" } };
    const synthPanel = selSynth && h("div", { style: { ...card, position: "absolute", right: 14, top: 14, width: 344, maxHeight: "calc(100% - 28px)", overflowY: "auto", zIndex: 6, padding: "13px 15px", borderColor: "#E8C24A55" } },
      h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } }, h("div", { style: { fontWeight: 700, fontSize: 15, color: "#E8C24A", lineHeight: 1.3 } }, "◆ " + selSynth.combination), h("button", { onClick: () => setSel(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1, flex: "0 0 auto" } }, "×")),
      h("div", { style: { display: "flex", gap: 10, marginTop: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#9aa1ad" } }, h("span", { style: { color: (vmeta[selSynth.verdict] || vmeta.SPECULATIVE).c } }, selSynth.verdict), h("span", null, "depth " + (selSynth.depth || 1)), h("span", null, "validated " + fmtDate(selSynth.createdAt))),
      h("div", { style: { display: "flex", gap: 8, marginTop: 11 } }, comboBtn(selSynth.id), h("button", { onClick: () => setFocusNode(selSynth.id), style: { padding: "7px 11px", borderRadius: 7, border: "1px solid #2b313d", color: "#cdd3dd", background: "transparent", cursor: "pointer", fontSize: 12.5 } }, "Focus")),
      h("div", { style: { display: "flex", gap: 8, marginTop: 8 } }, h("button", { onClick: () => setLinking(selSynth.id), style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #E86A9E55", background: "transparent", color: "#E86A9E", cursor: "pointer", fontSize: 12 } }, "Draw see-also link"), h("button", { onClick: () => delSynthNode(selSynth.id), style: { padding: "6px 10px", borderRadius: 7, border: "1px solid #5a3a3a", background: "transparent", color: "#e0a0a0", cursor: "pointer", fontSize: 12 } }, "Delete node")),
      h("div", { style: { marginTop: 12, display: "flex", flexDirection: "column", gap: 9, fontSize: 12.5, lineHeight: 1.45 } },
        h("div", null, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Shared mechanism"), h("div", { style: { color: "#cdd3dd" } }, selSynth.sharedMechanism)),
        h("div", null, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Uses from A"), h("div", { style: { color: "#cdd3dd" } }, selSynth.usesFromA)),
        h("div", null, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Uses from B"), h("div", { style: { color: "#cdd3dd" } }, selSynth.usesFromB)),
        h("div", { style: { background: "#0c0e13", border: "1px solid #20242e", borderRadius: 7, padding: 9 } }, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 } }, "Hollow-check (survived)"), h("div", { style: { color: "#bcc2cc" } }, selSynth.hollowCheck))),
      h("div", { style: { marginTop: 12 } }, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 5 } }, "Provenance (" + (selSynth.parents || []).length + ")"), ...(selSynth.parents || []).map((p, i) => h("div", { key: i, style: { fontSize: 12, color: "#cdd3dd", cursor: byId[p] || synthById[p] ? "pointer" : "default", padding: "2px 0", textDecoration: byId[p] || synthById[p] ? "underline" : "none", textDecorationColor: "#3a4150" }, onClick: () => { if (byId[p] || synthById[p]) setSel(p); } }, (synthById[p] ? "◆ " : "") + p))),
      noteEditor(selSynth.id));

    const comboBar = combo.length > 0 && h("div", { style: { position: "absolute", left: "50%", bottom: 14, transform: "translateX(-50%)", zIndex: 7, ...card, padding: "9px 11px", display: "flex", alignItems: "center", gap: 10, maxWidth: "72%", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" } },
      h("span", { style: { fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono',monospace" } }, "SYNTHESIS SET"),
      h("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", maxWidth: 380 } }, ...combo.map(id => h("span", { key: id, style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, padding: "2px 4px 2px 8px", borderRadius: 6, background: "#0c0e13", border: "1px solid " + (synthById[id] ? "#E8C24A55" : "#2b313d"), fontFamily: "'JetBrains Mono',monospace", color: synthById[id] ? "#E8C24A" : "#cdd3dd" } }, (synthById[id] ? "◆ " : "") + (synthById[id] ? (synthById[id].combination || id).slice(0, 16) : id), h("button", { onClick: () => setCombo(p => p.filter(i => i !== id)), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 13 } }, "×")))),
      h("button", { onClick: () => setCombo([]), style: { fontSize: 11.5, background: "none", border: "none", color: "#6b7280", cursor: "pointer" } }, "clear"),
      h("button", { onClick: () => runSynth(false), disabled: combo.length < 2, style: { padding: "7px 14px", borderRadius: 7, border: "none", background: combo.length < 2 ? "#2b313d" : "#f0a868", color: combo.length < 2 ? "#6b7280" : "#1a1206", cursor: combo.length < 2 ? "default" : "pointer", fontSize: 12.5, fontWeight: 600 } }, "Find combinations"));

    const vrank = { "PROMISING": 0, "SPECULATIVE": 1, "LIKELY-HOLLOW": 2 };
    const sortedItems = synth && synth.items ? [...synth.items].sort((a, b) => (vrank[a.verdict] ?? 1) - (vrank[b.verdict] ?? 1)) : [];
    const synthDrawer = showSynth && h("div", { style: { position: "absolute", right: 0, top: 0, bottom: 0, width: 424, maxWidth: "90%", background: "#101319", borderLeft: "1px solid #262b36", zIndex: 9, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.45)" } },
      h("div", { style: { padding: "13px 16px", borderBottom: "1px solid #20242e", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } }, h("div", { style: { minWidth: 0 } }, h("div", { style: { fontWeight: 700, fontSize: 15, lineHeight: 1.2 } }, "Adversarial synthesis"), h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 3, fontFamily: "'JetBrains Mono',monospace", wordBreak: "break-word" } }, combo.map(id => synthById[id] ? "◆" + (synthById[id].combination || id).slice(0, 12) : id).join(" · "))), h("button", { onClick: () => setShowSynth(false), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19, flex: "0 0 auto", lineHeight: 1 } }, "×")),
      h("div", { style: { padding: 16, overflowY: "auto", flex: 1 } },
        synth && synth.loading && h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", padding: 30, gap: 12, color: "#9aa1ad" } }, h("div", { style: { width: 26, height: 26, border: "3px solid #2b313d", borderTopColor: "#f0a868", borderRadius: "50%", animation: "gbspin 0.8s linear infinite" } }), "Probing for real shared mechanisms…"),
        synth && synth.error && h("div", { style: { ...card, padding: 13, borderColor: "#5a3a3a", color: "#e0a0a0", fontSize: 13 } }, synth.error, h("div", { style: { marginTop: 9 } }, h("button", { onClick: () => runSynth(false), style: { padding: "6px 12px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12.5 } }, "Retry"))),
        negatives.length > 0 && h("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 10, fontStyle: "italic" } }, negatives.length + " archived dead-end" + (negatives.length > 1 ? "s" : "") + " are being fed back to suppress re-proposal."),
        sortedItems.map((it, i) => {
          const m = vmeta[it.verdict] || vmeta.SPECULATIVE; const hollow = it.verdict === "LIKELY-HOLLOW"; const open = expandCard[i];
          return h("div", { key: i, style: { ...card, padding: 13, marginBottom: 11, opacity: hollow ? 0.62 : 1, borderColor: hollow ? "#262b36" : m.c + "55" } },
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" } }, h("div", { style: { fontWeight: 600, fontSize: 13.5, lineHeight: 1.35, color: "#e6e8ec" } }, it.combination || "(untitled)"), h("span", { style: { flex: "0 0 auto", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "3px 7px", borderRadius: 20, color: m.c, background: m.bg, border: "1px solid " + m.c + "55", fontFamily: "'JetBrains Mono',monospace" } }, it.verdict || "—")),
            h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 8, lineHeight: 1.45 } }, h("b", { style: { color: "#bcc2cc" } }, "Shared mechanism: "), it.sharedMechanism || "—"),
            h("button", { onClick: () => setExpandCard(p => ({ ...p, [i]: !p[i] })), style: { marginTop: 9, background: "none", border: "none", color: m.c, cursor: "pointer", fontSize: 11.5, padding: 0 } }, open ? "− hide cited capabilities & hollow-check" : "+ cited capabilities & hollow-check"),
            open && h("div", { style: { marginTop: 9, paddingTop: 9, borderTop: "1px solid #20242e", display: "flex", flexDirection: "column", gap: 8, fontSize: 12, lineHeight: 1.45 } }, h("div", null, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Uses from A"), h("div", { style: { color: "#cdd3dd" } }, it.usesFromA || "—")), h("div", null, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Uses from B"), h("div", { style: { color: "#cdd3dd" } }, it.usesFromB || "—")), h("div", { style: { background: "#0c0e13", border: "1px solid #20242e", borderRadius: 7, padding: 9 } }, h("div", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 3 } }, "Hollow-check · how to falsify"), h("div", { style: { color: "#bcc2cc" } }, it.hollowCheck || "—"))),
            h("div", { style: { display: "flex", gap: 8, marginTop: 11, paddingTop: 10, borderTop: "1px solid #20242e" } }, h("button", { onClick: () => promote(it), style: { flex: 1, padding: "7px", borderRadius: 7, border: "1px solid #43C6AC", background: "rgba(67,198,172,0.12)", color: "#43C6AC", cursor: "pointer", fontSize: 12.5, fontWeight: 600 } }, "Promote → brain"), h("button", { onClick: () => archive(it), style: { flex: 1, padding: "7px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#8a8f98", cursor: "pointer", fontSize: 12.5 } }, "Archive (hollow)")));
        }),
        synth && !synth.loading && synth.items && synth.items.length > 0 && h("button", { onClick: () => runSynth(true), style: { width: "100%", padding: "9px", borderRadius: 7, border: "1px dashed #2b313d", background: "transparent", color: "#9aa1ad", cursor: "pointer", fontSize: 12.5, marginTop: 4 } }, "Generate more"),
        synth && !synth.loading && synth.items && synth.items.length > 0 && h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 12, lineHeight: 1.5, fontStyle: "italic" } }, "Promote a combination only after it survives its hollow-check — it then becomes a persistent ◆ synthesis node you can combine further. Archive the hollow ones; they're kept as negatives and suppressed next run.")));

    const fetchPanel = showFetch && h("div", { style: { position: "absolute", inset: 0, zIndex: 11, background: "rgba(8,10,14,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 }, onClick: () => setShowFetch(false) },
      h("div", { style: { ...card, width: 460, maxWidth: "92%", maxHeight: "82%", overflowY: "auto", padding: 18 }, onClick: e => e.stopPropagation() },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("div", { style: { fontWeight: 700, fontSize: 16 } }, "✦ Absorb your GitHub"), h("button", { onClick: () => setShowFetch(false), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19 } }, "×")),
        h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 4, lineHeight: 1.45 } }, "One click lists every public repo (cheap, tokenless) and then auto-enriches all of them in the background — the galaxy lights up as it fills. A no-scope token raises the limit to 5,000/hr."),
        h("div", { style: { marginTop: 14, display: "flex", flexDirection: "column", gap: 9 } },
          h("input", { value: ghUser, onChange: e => setGhUser(e.target.value), placeholder: "GitHub username", style: { padding: "9px 11px", borderRadius: 8, border: "1px solid #2b313d", background: "#0c0e13", color: "#e6e8ec", fontSize: 13, outline: "none" } }),
          h("div", { style: { position: "relative" } }, h("input", { value: ghToken, onChange: e => setGhToken(e.target.value), type: "password", placeholder: "Token (optional, recommended)", style: { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #2b313d", background: "#0c0e13", color: "#e6e8ec", fontSize: 13, outline: "none" } }), ghToken && h("button", { onClick: () => setGhToken(""), style: { position: "absolute", right: 8, top: 7, background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 12 } }, "Clear token")),
          h("div", { style: { fontSize: 11, color: "#E8924A", lineHeight: 1.45 } }, "Stored in memory for this session only — never saved or exported. Don't share this artifact while a token is entered. Tip: use a classic token with NO scopes (public read, 5,000/hr, harmless if leaked)."),
          h("button", { onClick: () => setIncludeForks(v => !v), style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", background: "none", border: "none", color: "#cdd3dd", cursor: "pointer", fontSize: 12.5 } }, h("span", { style: { width: 11, height: 11, borderRadius: 3, background: includeForks ? "#f0a868" : "transparent", border: "1.5px solid #f0a868" } }), "Include forks"),
          h("button", { onClick: fetchRepos, disabled: fetchState && fetchState.listing, style: { padding: "9px", borderRadius: 8, border: "none", background: "#f0a868", color: "#1a1206", cursor: "pointer", fontSize: 13, fontWeight: 600 } }, fetchState && fetchState.listing ? "Listing…" : "✦ Absorb repos")),
        rate && h("div", { style: { marginTop: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: rate.remaining <= 5 ? "#E8924A" : "#9aa1ad" } }, "Rate limit: " + rate.remaining + " calls remaining" + (rate.reset ? " · resets " + fmtTime(rate.reset) : "")),
        fetchState && fetchState.error && h("div", { style: { marginTop: 12, padding: 11, borderRadius: 8, background: "#2a1717", border: "1px solid #5a3a3a", color: "#e0a0a0", fontSize: 12.5, lineHeight: 1.45 } }, fetchState.error),
        fetchState && fetchState.listed != null && h("div", { style: { marginTop: 12, padding: 11, borderRadius: 8, background: "#0c0e13", border: "1px solid #20242e" } },
          h("div", { style: { fontSize: 13, color: "#43C6AC", fontWeight: 600 } }, "Listed " + fetchState.listed + " repos."),
          h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 4, lineHeight: 1.45 } }, "Graph is live. Enrich repos to fill side panels and feed synthesis."),
          h("div", { style: { display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" } },
            h("button", { onClick: () => setEnrichMode(m => m === "click" ? "click" : "click"), style: { display: "none" } }),
            h("div", { style: { display: "flex", border: "1px solid #2b313d", borderRadius: 7, overflow: "hidden" } }, ...[["click", "Enrich on click"], ["bulk", "Bulk"]].map(([v, lbl]) => h("button", { key: v, onClick: () => setEnrichMode(v), style: { padding: "6px 10px", border: "none", background: enrichMode === v ? "#2b313d" : "transparent", color: enrichMode === v ? "#e6e8ec" : "#9aa1ad", cursor: "pointer", fontSize: 12 } }, lbl))),
            enrichMode === "bulk" && !(enrichProg && enrichProg.running) && h("button", { onClick: enrichAll, style: { padding: "6px 12px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12 } }, "Enrich all"),
            enrichProg && enrichProg.running && h("button", { onClick: () => { enrichCancelRef.current = true; }, style: { padding: "6px 12px", borderRadius: 7, border: "1px solid #5a3a3a", background: "transparent", color: "#e0a0a0", cursor: "pointer", fontSize: 12 } }, "Cancel")),
          enrichProg && h("div", { style: { marginTop: 10 } }, h("div", { style: { height: 6, background: "#0c0e13", borderRadius: 6, overflow: "hidden", border: "1px solid #20242e" } }, h("div", { style: { height: "100%", width: (enrichProg.total ? Math.round(100 * enrichProg.done / enrichProg.total) : 0) + "%", background: "#43C6AC", transition: "width 0.2s" } })), h("div", { style: { fontSize: 11, color: "#9aa1ad", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" } }, "enriched " + enrichProg.done + " / " + enrichProg.total + (enrichProg.paused ? " · PAUSED (rate limit" + (enrichProg.resetAt ? ", resets " + fmtTime(enrichProg.resetAt) : "") + ") — add a token & Enrich all again" : ""))))));

    const relatedModal = related && h("div", { style: { position: "absolute", inset: 0, zIndex: 11, background: "rgba(8,10,14,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 60 }, onClick: () => setRelated(null) },
      h("div", { style: { ...card, width: 460, maxWidth: "92%", maxHeight: "82%", overflowY: "auto", padding: 18 }, onClick: e => e.stopPropagation() },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("div", { style: { fontWeight: 700, fontSize: 15 } }, "Related repos"), h("button", { onClick: () => setRelated(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19 } }, "×")),
        related.q && h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" } }, "search: " + related.q),
        rate && h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" } }, "search limit ~10/min anon (~30 with token) · " + rate.remaining + " core calls left"),
        related.loading && h("div", { style: { padding: 24, textAlign: "center", color: "#9aa1ad", fontSize: 13 } }, "Searching GitHub…"),
        related.error && h("div", { style: { marginTop: 12, padding: 11, borderRadius: 8, background: "#2a1717", border: "1px solid #5a3a3a", color: "#e0a0a0", fontSize: 12.5 } }, related.error),
        related.items && related.items.length === 0 && h("div", { style: { marginTop: 12, color: "#9aa1ad", fontSize: 13 } }, "No new candidates found."),
        related.items && related.items.map((it, i) => h("div", { key: i, style: { ...card, padding: 11, marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" } }, h("div", { style: { minWidth: 0 } }, h("div", { style: { fontWeight: 600, fontSize: 13 } }, it.full_name || it.name), h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 2, lineHeight: 1.4 } }, it.description || "—"), h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" } }, (it.language || "?") + " · ★ " + (it.stargazers_count || 0))), h("button", { onClick: () => addRelated(it), style: { flex: "0 0 auto", padding: "6px 11px", borderRadius: 7, border: "1px solid #f0a868", background: "rgba(240,168,104,0.14)", color: "#f0a868", cursor: "pointer", fontSize: 12 } }, "Add")))));

    const discoverModal = showDiscover && h("div", { style: { position: "absolute", inset: 0, zIndex: 11, background: "rgba(8,10,14,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 54 }, onClick: () => setShowDiscover(false) },
      h("div", { style: { ...card, width: 480, maxWidth: "92%", maxHeight: "86%", overflowY: "auto", padding: 18 }, onClick: e => e.stopPropagation() },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("div", { style: { fontWeight: 700, fontSize: 16 } }, "✦ Discover public repos"), h("button", { onClick: () => setShowDiscover(false), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19 } }, "×")),
        h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 4, lineHeight: 1.45 } }, "Each line is a GitHub search (topic:… or keywords). Pulls the top repos per query and adds them as ghost stars — they connect by shared topic immediately and ignite as you enrich. Tokenless search is ~10/min, so it paces itself and auto-resumes on rate limits; a token speeds it up."),
        h("textarea", { value: discoverText, onChange: e => setDiscoverText(e.target.value), rows: 8, style: { width: "100%", marginTop: 10, padding: "9px 11px", borderRadius: 8, border: "1px solid #2b313d", background: "#0c0e13", color: "#e6e8ec", fontSize: 12, resize: "vertical", outline: "none" } }),
        h("div", { style: { display: "flex", gap: 8, marginTop: 10, alignItems: "center" } },
          !(discoverState && discoverState.running) && h("button", { onClick: () => discoverRepos(discoverText.split("\n").map(s => s.trim()).filter(Boolean), 3), style: { padding: "9px 14px", borderRadius: 8, border: "none", background: "#f0a868", color: "#1a1206", cursor: "pointer", fontSize: 13, fontWeight: 600 } }, "✦ Discover & absorb"),
          discoverState && discoverState.running && h("button", { onClick: () => { discoverCancelRef.current = true; }, style: { padding: "9px 14px", borderRadius: 8, border: "1px solid #5a3a3a", background: "transparent", color: "#e0a0a0", cursor: "pointer", fontSize: 13 } }, "Stop"),
          ghToken.trim() ? h("span", { style: { fontSize: 11, color: "#43C6AC", fontFamily: "'JetBrains Mono',monospace" } }, "token active · faster") : h("span", { style: { fontSize: 11, color: "#6b7280" } }, "no token · ~10 searches/min")),
        discoverState && h("div", { style: { marginTop: 12, padding: 11, borderRadius: 8, background: "#0c0e13", border: "1px solid #20242e", fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "#9aa1ad" } },
          h("div", { style: { height: 6, background: "#11141c", borderRadius: 6, overflow: "hidden", marginBottom: 6 } }, h("div", { style: { height: "100%", width: (discoverState.total ? Math.round(100 * (discoverState.done || 0) / discoverState.total) : 0) + "%", background: "#36e0ff" } })),
          "queries " + (discoverState.done || 0) + " / " + (discoverState.total || 0) + " · added " + (discoverState.added || 0) + " repos" + (discoverState.q ? " · last: " + discoverState.q : ""),
          discoverState.paused && h("div", { style: { color: "#E8924A", marginTop: 4 } }, "rate limit — auto-resuming" + (discoverState.resetAt ? " at " + fmtTime(discoverState.resetAt) : "")),
          discoverState.capped && h("div", { style: { color: "#E8924A", marginTop: 4 } }, "node cap reached (6,000) — stopped to keep the canvas interactive. Export, then enrich."),
          discoverState.error && h("div", { style: { color: "#e0a0a0", marginTop: 4 } }, discoverState.error),
          rate && h("div", { style: { color: "#6b7280", marginTop: 4 } }, "core quota " + rate.remaining)),
        h("div", { style: { marginTop: 12, fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 } }, "Added repos are ghost stars. Click one to enrich it (README, files, deps), or use ✦ Absorb’s bulk enrich. Enriching hundreds tokenless hits 60/hr — they ignite gradually."),
        (() => { const pend = (data.repos || []).filter(r => !r.enriched && r._user).length; const enr = (data.repos || []).filter(r => r.enriched).length; return pend > 0 && h("div", { style: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #20242e" } },
          h("div", { style: { fontSize: 12, color: "#9aa1ad", marginBottom: 8 } }, enr + " enriched · " + pend + " pending. " + (ghToken.trim() ? "Token active — 5,000/hr." : "No token — 60/hr (slow; paste a token in ✦ Absorb for 5,000/hr).")),
          !(enrichProg && enrichProg.running) ? h("button", { onClick: enrichAll, style: { width: "100%", padding: "9px", borderRadius: 8, border: "none", background: "#43C6AC", color: "#06241d", cursor: "pointer", fontSize: 13, fontWeight: 600 } }, "✦ Enrich all (" + pend + ")")
            : h("button", { onClick: () => { enrichCancelRef.current = true; }, style: { width: "100%", padding: "9px", borderRadius: 8, border: "1px solid #5a3a3a", background: "transparent", color: "#e0a0a0", cursor: "pointer", fontSize: 13 } }, "Cancel enrichment"),
          enrichProg && h("div", { style: { marginTop: 8 } }, h("div", { style: { height: 6, background: "#0c0e13", borderRadius: 6, overflow: "hidden", border: "1px solid #20242e" } }, h("div", { style: { height: "100%", width: (enrichProg.total ? Math.round(100 * enrichProg.done / enrichProg.total) : 0) + "%", background: "#43C6AC", transition: "width 0.2s" } })), h("div", { style: { fontSize: 11, color: "#9aa1ad", marginTop: 4, fontFamily: "'JetBrains Mono',monospace" } }, "enriched " + enrichProg.done + " / " + enrichProg.total + (enrichProg.paused ? " · PAUSED (rate limit" + (enrichProg.resetAt ? ", resets " + fmtTime(enrichProg.resetAt) : "") + ")" : "")))); })()));

    const storeErrBar = storeErr && h("div", { style: { position: "absolute", left: "50%", bottom: 70, transform: "translateX(-50%)", zIndex: 8, background: "#2a2417", border: "1px solid #5a4a2a", color: "#e0c98a", padding: "7px 13px", borderRadius: 8, fontSize: 12 } }, storeErr);
    const errBar = err && h("div", { style: { position: "absolute", left: "50%", top: 70, transform: "translateX(-50%)", zIndex: 8, background: "#2a1717", border: "1px solid #5a3a3a", color: "#e0a0a0", padding: "9px 14px", borderRadius: 8, fontSize: 13 } }, err);
    const absorbHud = enrichProg && enrichProg.running && h("div", { style: { position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", zIndex: 6, ...card, padding: "7px 14px", display: "flex", gap: 14, alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12 } },
      h("span", { style: { color: "#36e0ff" } }, "✦ absorbing " + enrichProg.done + " / " + enrichProg.total),
      rate && h("span", { style: { color: rate.remaining <= 5 ? "#E8924A" : "#6b7280" } }, rate.remaining + " quota" + (rate.reset && enrichProg.paused ? " · resets " + fmtTime(rate.reset) : "")),
      enrichProg.paused && h("span", { style: { color: "#E8924A" } }, "paused — add token"));
    const emptyState = repos.length === 0 && synthNodes.length === 0 && h("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: "#6b7280", zIndex: 3 } }, h("div", { style: { fontSize: 15, color: "#9aa1ad" } }, "Empty brain"), h("div", { style: { fontSize: 13 } }, "Load a brain-index.json, or ✦ Discover / ✦ Absorb to populate."));

    // ---------- FUSION MATRIX VIEW ----------
    const negCellSet = useMemo(() => { const s = new Set(); negatives.forEach(n => { if (n.gapCell) s.add(n.gapCell); }); return s; }, [negatives]);
    const bridgeCellSet = useMemo(() => { const s = new Set(); synthNodes.forEach(n => { if (n.gapCell) s.add(n.gapCell); }); return s; }, [synthNodes]);
    const matrixView = view === "matrix" && h("div", { style: { position: "absolute", inset: 0, overflow: "auto", background: "#06070a", zIndex: 5, padding: "20px 24px" } },
      h("div", { style: { maxWidth: 820, margin: "0 auto" } },
        h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 4 } },
          h("div", null, h("div", { style: { fontWeight: 700, fontSize: 18 } }, "Fusion matrix — the opportunity surface"),
            h("div", { style: { fontSize: 12.5, color: "#9aa1ad", marginTop: 4, lineHeight: 1.5, maxWidth: 560 } }, "Each cell counts repos in BOTH domains. The validated target is the LOW-LOW band — sparse on GitHub AND few papers (empty-corner hunting was falsified: empty repo cells are full in the literature). Scan ranks sparse cells by OpenAlex paper-density; probe the lowest.")),
          h("div", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#6b7280", textAlign: "right" } }, matrix.classified + " / " + repos.length + " classified", h("div", { style: { marginTop: 2 } }, "topics only · no enrichment"))),
        sparseCells.length > 0 && h("div", { style: { display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" } },
          h("button", { onClick: () => scanFrontier(), disabled: frontier && frontier.running, style: { padding: "8px 14px", borderRadius: 8, border: "none", background: "#36e0ff", color: "#04232b", cursor: "pointer", fontSize: 12.5, fontWeight: 600 } }, frontier && frontier.running ? ("Scanning… " + (frontier.phase === "implverify" ? ("impl " + (frontier.implDone || 0) + "/" + (frontier.implTotal || 0)) : ((frontier.done || 0) + "/" + (frontier.total || 0)))) : "✦ Scan frontier (OpenAlex low-low)"),
          h("button", { onClick: () => generateAndVerify(), style: { padding: "8px 14px", borderRadius: 8, border: "1px solid #ff5ec4", background: "rgba(255,94,196,0.12)", color: "#ff5ec4", cursor: "pointer", fontSize: 12.5, fontWeight: 600 } }, "⚡ Generate & verify"),
          frontier && frontier.ranked && frontier.ranked[0] && h("button", { onClick: () => { const c = frontier.ranked[0]; exploreGap(c.i, c.j); }, style: { padding: "8px 14px", borderRadius: 8, border: "1px solid #43C6AC", background: "rgba(67,198,172,0.12)", color: "#43C6AC", cursor: "pointer", fontSize: 12.5, fontWeight: 600 } }, "Probe lowest-paper cell (" + frontier.ranked[0].name + " · " + (frontier.ranked[0].paperCount == null ? "?" : frontier.ranked[0].paperCount) + "p)"),
          h("button", { onClick: () => setLitGround(v => !v), style: { display: "flex", alignItems: "center", gap: 7, padding: "7px 11px", borderRadius: 8, border: "1px solid " + (litGround ? "#43C6AC" : "#2b313d"), background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12 } }, h("span", { style: { width: 10, height: 10, borderRadius: 3, background: litGround ? "#43C6AC" : "transparent", border: "1.5px solid #43C6AC" } }), "Literature grounding"),
          probeLog.length > 0 && h("span", { style: { fontSize: 11.5, color: "#6b7280" } }, probeLog.length + " probed · " + probeLog.filter(p => p.prize).length + " prize")),
        // frontier scan results
        frontier && (frontier.ranked || (frontier.cells && frontier.cells.length)) && h("div", { style: { display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap", alignItems: "flex-start" } },
          h("div", { style: { ...card, padding: 12, flex: "1 1 340px", minWidth: 300 } },
            h("div", { style: { fontSize: 11, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 } }, "Low-low band — sparse repos, ranked by paper-density" + (frontier.running && frontier.phase === "papers" ? " (" + frontier.done + "/" + frontier.total + ")" : "")),
            h("div", { style: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "3px 12px", fontSize: 11.5, fontFamily: "'JetBrains Mono',monospace", alignItems: "center" } },
              h("div", { style: { color: "#6b7280" } }, "cell"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "repos"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "papers"),
              ...(frontier.ranked || frontier.cells || []).slice(0, 14).flatMap((c, ci) => { const lm = { "UNEXPLORED": "#43C6AC", "EMERGING": "#E8924A", "KNOWN": "#a06a6a", "UNVERIFIED": "#b8862a" }[c.litClass] || "#9aa1ad"; return [h("div", { key: "n" + ci, style: { color: "#cdd3dd", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#2b313d" }, onClick: () => exploreGap(c.i, c.j) }, c.name + " (" + c.v + ")"), h("div", { key: "r" + ci, style: { color: "#9aa1ad", textAlign: "right" } }, c.v), h("div", { key: "p" + ci, style: { color: lm, textAlign: "right" } }, (c.paperCount == null ? "—" : c.paperCount.toLocaleString()) + (c.modelEstimated ? "~" : ""))]; })),
            h("div", { style: { fontSize: 10.5, color: "#6b7280", marginTop: 8, lineHeight: 1.4 } }, "Click a cell to probe it. Lowest paper-count = closest to genuine frontier.")),
          frontier.impl && frontier.impl.length > 0 && h("div", { style: { ...card, padding: 12, flex: "1 1 300px", minWidth: 280, borderColor: "#3a4a5a" } },
            h("div", { style: { fontSize: 11, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 } }, "Implementation gaps" + (frontier.running && frontier.phase === "implverify" ? " (verifying " + (frontier.implDone || 0) + "/" + (frontier.implTotal || 0) + ")" : "")),
            h("div", { style: { fontSize: 11, color: "#9aa1ad", marginBottom: 8, lineHeight: 1.4 } }, "Researched in papers but un-coded — verified against live GitHub repo search using precise topic: queries. The tool's proven real value."),
            ...frontier.impl.map((c, ci) => { const unver = c.ghRepoCount == null; return h("div", { key: ci, style: { marginBottom: 7, paddingBottom: 7, borderBottom: ci < frontier.impl.length - 1 ? "1px solid #20242e" : "none" } },
              h("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 } }, h("span", { style: { fontSize: 12, color: c.realGap ? "#43C6AC" : "#cdd3dd", fontWeight: 600 } }, c.name), h("span", { style: { fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: c.realGap ? "#43C6AC" : (unver ? "#b8862a" : "#6b7280") } }, unver ? "unverified" : (c.realGap ? "REAL GAP" : "has repos"))),
              h("div", { style: { fontSize: 10.5, color: "#9aa1ad", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" } }, c.paperCount.toLocaleString() + " papers · " + (unver ? "?" : c.ghRepoCount.toLocaleString()) + " repos"),
              c.ghQuery && h("div", { style: { fontSize: 10, color: "#6b7280", marginTop: 1, fontFamily: "'JetBrains Mono',monospace" } }, "« " + c.ghQuery + " »")); })) ),
        matrix.classified === 0
          ? h("div", { style: { ...card, padding: 24, marginTop: 18, color: "#9aa1ad", fontSize: 13, textAlign: "center" } }, "No repos carry recognized domain topics yet. Use ✦ Discover to pull topic-tagged science/math repos, then the matrix fills in.")
          : h("div", { style: { marginTop: 18, display: "grid", gridTemplateColumns: "92px repeat(" + matrix.N + ", 1fr)", gap: 3 } },
            h("div", null),
            ...DOMAINS.map((d, j) => h("div", { key: "h" + j, style: { fontSize: 10.5, fontWeight: 600, color: d.color, textAlign: "center", padding: "0 0 4px", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" } }, d.key)),
            ...DOMAINS.map((di, i) => [
              h("div", { key: "r" + i, style: { fontSize: 10.5, fontWeight: 600, color: di.color, textAlign: "right", paddingRight: 8, alignSelf: "center", fontFamily: "'JetBrains Mono',monospace" } }, di.key),
              ...DOMAINS.map((dj, j) => {
                const v = matrix.M[i][j], diag = i === j;
                const ck = Math.min(i, j) + "×" + Math.max(i, j); const ckName = DOMAINS[Math.min(i, j)].key + "×" + DOMAINS[Math.max(i, j)].key;
                const isBridged = bridgeCellSet.has(ckName), isNeg = negCellSet.has(ckName);
                const t = diag ? v / matrix.maxDiag : v / matrix.maxOff;
                const empty = !diag && v === 0, sparse = !diag && v > 0 && v <= 2;
                let bg, bord = "transparent", txtc = "#e6e8ec";
                if (diag) { bg = hexA(di.color, 0.12 + 0.5 * t); }
                else if (empty) { bg = "#0b0d12"; bord = isNeg ? "#5a3a3a" : (isBridged ? "#43C6AC" : "#2a2f3a"); txtc = "#3a4150"; }
                else { const mix = i < j ? DOMAINS[i].color : DOMAINS[j].color; bg = hexA("#36e0ff", 0.06 + 0.55 * t); if (sparse) bord = isBridged ? "#43C6AC" : "#4a5a6a"; }
                const clickable = !diag;
                return h("div", { key: "c" + i + "_" + j, title: ckName + ": " + v + " repos" + (empty ? " — frontier" : ""), onClick: clickable ? () => { if (empty || sparse) exploreGap(Math.min(i, j), Math.max(i, j)); else { setCellHi(ck); setView("galaxy"); } } : null,
                  style: { aspectRatio: "1", minHeight: 44, borderRadius: 6, background: bg, border: "1.5px solid " + bord, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", cursor: clickable ? "pointer" : "default", position: "relative", transition: "transform 0.08s", fontFamily: "'JetBrains Mono',monospace" },
                  onMouseEnter: e => { if (clickable) e.currentTarget.style.transform = "scale(1.08)"; }, onMouseLeave: e => { e.currentTarget.style.transform = "scale(1)"; } },
                  h("span", { style: { fontSize: diag ? 13 : 12.5, fontWeight: 700, color: txtc } }, v),
                  empty && !isNeg && !isBridged && h("span", { style: { fontSize: 7.5, color: "#5566aa", letterSpacing: 0.5, marginTop: 1 } }, "FRONTIER"),
                  isBridged && h("span", { style: { fontSize: 8.5, color: "#43C6AC", marginTop: 1 } }, "◆ bridged"),
                  isNeg && !isBridged && h("span", { style: { fontSize: 7.5, color: "#a06a6a", marginTop: 1 } }, "dead-end"));
              })
            ]).flat()),
        // legend
        matrix.classified > 0 && h("div", { style: { display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap", fontSize: 11.5, color: "#9aa1ad", alignItems: "center" } },
          h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h("span", { style: { width: 13, height: 13, borderRadius: 3, background: hexA("#36e0ff", 0.5) } }), "crowded frontier (fused)"),
          h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h("span", { style: { width: 13, height: 13, borderRadius: 3, background: "#0b0d12", border: "1.5px solid #2a2f3a" } }), "empty = unexplored — click to probe"),
          h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h("span", { style: { width: 13, height: 13, borderRadius: 3, background: "#0b0d12", border: "1.5px solid #43C6AC" } }), "◆ promoted bridge"),
          h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, h("span", { style: { width: 13, height: 13, borderRadius: 3, background: "#0b0d12", border: "1.5px solid #5a3a3a" } }), "dead-end (archived)"))));

    // ---------- GAP DRAWER ----------
    const vmetaG = { "PROMISING": { c: "#43C6AC", bg: "rgba(67,198,172,0.12)" }, "SPECULATIVE": { c: "#E8924A", bg: "rgba(232,146,74,0.12)" }, "LIKELY-HOLLOW": { c: "#8a8f98", bg: "rgba(138,143,152,0.08)" } };
    const litMeta = { "UNEXPLORED": { c: "#43C6AC", t: "UNEXPLORED" }, "EMERGING": { c: "#E8924A", t: "EMERGING" }, "KNOWN": { c: "#a06a6a", t: "KNOWN (un-coded)" }, "UNVERIFIED": { c: "#b8862a", t: "UNVERIFIED" }, "SKIPPED": { c: "#8a8f98", t: "skipped — failed type-check" }, "OFF": { c: "#6b7280", t: "lit off" } };
    const fvMeta = { "PROMISING": { c: "#43C6AC", bg: "rgba(67,198,172,0.14)" }, "EMERGING": { c: "#E8924A", bg: "rgba(232,146,74,0.12)" }, "KNOWN": { c: "#a06a6a", bg: "rgba(160,106,106,0.12)" }, "INCOHERENT": { c: "#8a8f98", bg: "rgba(138,143,152,0.08)" }, "UNVERIFIED": { c: "#b8862a", bg: "rgba(184,134,42,0.1)" }, "SPECULATIVE": { c: "#E8924A", bg: "rgba(232,146,74,0.12)" }, "LIKELY-HOLLOW": { c: "#8a8f98", bg: "rgba(138,143,152,0.08)" } };
    const gapDrawer = gap && h("div", { style: { position: "absolute", right: 0, top: 0, bottom: 0, width: 446, maxWidth: "94%", background: "#101319", borderLeft: "1px solid #262b36", zIndex: 12, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.45)" } },
      h("div", { style: { padding: "13px 16px", borderBottom: "1px solid #20242e", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } },
        h("div", { style: { minWidth: 0 } }, h("div", { style: { fontWeight: 700, fontSize: 15 } }, "Bridge cascade — typed · preregistered · human-gated"), h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 2, fontFamily: "'JetBrains Mono',monospace" } }, gap.cellName + (gap.density == null ? " · generator (no cell)" : " · repo-density " + gap.density))),
        h("button", { onClick: () => setGap(null), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19, flex: "0 0 auto", lineHeight: 1 } }, "×")),
      h("div", { style: { padding: 16, overflowY: "auto", flex: 1 } },
        gap.noToken && h("div", { style: { ...card, padding: 10, marginBottom: 12, borderColor: "#5a4a2a", background: "#1f1c12", color: "#e0c98a", fontSize: 11.5, lineHeight: 1.45 } }, "⚠ No token — JIT enrichment skipped; bridges judged on topics + descriptions only. Add a no-scope token in ✦ Absorb for repo-enriched proposals. (Literature grounding via OpenAlex still runs.)"),
        gap.loading && h("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", padding: 24, gap: 10, color: "#9aa1ad", fontSize: 13, textAlign: "center" } }, h("div", { style: { width: 24, height: 24, border: "3px solid #2b313d", borderTopColor: "#36e0ff", borderRadius: "50%", animation: "gbspin 0.8s linear infinite" } }), gap.phase === "enrich" ? ("JIT-enriching flanking repos " + (gap.enrichDone || 0) + " / " + (gap.enrichTotal || "") + "…") : (gap.phase === "objects" ? "Extracting formal objects (blind to the bridges)…" : (gap.phase === "typecheck" ? "Compiling bridge — mechanism-IR port compatibility…" : (gap.phase === "literature" ? ("Preregistered literature probe " + (gap.litDone || 0) + " / " + (gap.litTotal || "") + "…") : "Proposing bridge mechanisms…")))),
        gap.error && h("div", { style: { ...card, padding: 13, borderColor: "#5a3a3a", color: "#e0a0a0", fontSize: 13 } }, gap.error, h("div", { style: { marginTop: 9 } }, h("button", { onClick: () => gap.cell ? exploreGap(gap.cell[0], gap.cell[1]) : generateAndVerify(), style: { padding: "6px 12px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#cdd3dd", cursor: "pointer", fontSize: 12.5 } }, "Retry"))),
        gap.prizeCandidate && h("div", { style: { ...card, padding: 13, marginBottom: 12, borderColor: "#43C6AC", background: "rgba(67,198,172,0.1)" } }, h("div", { style: { color: "#43C6AC", fontWeight: 700, fontSize: 13 } }, "★ Prize CANDIDATE — typed · preregistered · UNEXPLORED"), h("div", { style: { color: "#bcc2cc", fontSize: 12, marginTop: 4, lineHeight: 1.45 } }, "Auto-exported the instant it existed. NOT promoted: the producing instrument cannot verify its own prize. Verify independently — read the papers, test the shared object against the hollow-check — then Promote.")),
        gap.litBlocked && h("div", { style: { ...card, padding: 10, marginBottom: 12, borderColor: "#5a4a2a", background: "#1f1c12", color: "#e0c98a", fontSize: 11.5, lineHeight: 1.45 } }, "OpenAlex fetch was blocked — prior-art shown is MODEL-ESTIMATED, not a real literature search. For rigorous lit-checking use the standalone-script path."),
        (gap.items || []).slice().sort((a, b) => ({ "PROMISING": 0, "EMERGING": 1, "UNVERIFIED": 2, "KNOWN": 3, "SPECULATIVE": 2, "INCOHERENT": 4 }[a.finalVerdict] ?? 2) - ({ "PROMISING": 0, "EMERGING": 1, "UNVERIFIED": 2, "KNOWN": 3, "SPECULATIVE": 2, "INCOHERENT": 4 }[b.finalVerdict] ?? 2)).map((it, idx) => {
          const fv = it.finalVerdict || it.verdict, m = fvMeta[fv] || fvMeta.SPECULATIVE, dim = fv === "INCOHERENT" || fv === "KNOWN", lm = litMeta[it.litClass] || litMeta.OFF;
          return h("div", { key: idx, style: { ...card, padding: 13, marginBottom: 11, opacity: dim ? 0.66 : 1, borderColor: fv === "PROMISING" ? "#43C6AC" : (dim ? "#262b36" : m.c + "55") } },
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" } }, h("div", { style: { fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 } }, it.combination || "(untitled)"), h("span", { style: { flex: "0 0 auto", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 20, color: m.c, background: m.bg, border: "1px solid " + m.c + "55", fontFamily: "'JetBrains Mono',monospace" } }, fv)),
            h("div", { style: { fontSize: 12, color: "#9aa1ad", marginTop: 8, lineHeight: 1.45 } }, h("b", { style: { color: "#bcc2cc" } }, "Shared mechanism: "), it.sharedMechanism || "—"),
            h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, lineHeight: 1.4 } },
              h("div", null, h("span", { style: { color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5 } }, (gap.cell ? DOMAINS[gap.cell[0]].key : "A") + " ← "), h("span", { style: { color: "#cdd3dd" } }, it.usesFromA || "—")),
              h("div", null, h("span", { style: { color: "#6b7280", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5 } }, (gap.cell ? DOMAINS[gap.cell[1]].key : "B") + " ← "), h("span", { style: { color: "#cdd3dd" } }, it.usesFromB || "—"))),
            // instrument 1: type-check on independently-extracted formal objects
            it.typeCheck && h("div", { style: { marginTop: 9, background: "#0c0e13", border: "1px solid " + (it.typeCheck.pass ? "#2a5048" : "#4a2a2a"), borderRadius: 7, padding: 9 } },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("span", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Bridge planner · contracted IR"), h("span", { style: { fontSize: 10, fontWeight: 700, color: it.typeCheck.pass ? "#43C6AC" : "#e0a0a0", fontFamily: "'JetBrains Mono',monospace" } }, (it.typeCheck.verdict || (it.typeCheck.pass ? "type_valid" : "type_killed")).toUpperCase())),
              // five-stage verdict ladder (VERIFIED is backend-only — always shown unreachable here)
              h("div", { style: { display: "flex", gap: 3, marginTop: 7, flexWrap: "wrap" } }, ...["PATH_FOUND", "TYPE_COMPOSABLE", "CONTRACT_ADMISSIBLE", "EPISTEMICALLY_SUPPORTED", "VERIFIED"].map((st, si) => { const rank = { PROPOSED: 0, PATH_FOUND: 1, TYPE_COMPOSABLE: 2, CONTRACT_ADMISSIBLE: 3, EPISTEMICALLY_SUPPORTED: 4, VERIFIED: 5 }; const reached = (rank[it.stage] || 0) >= (si + 1); const isV = st === "VERIFIED"; return h("span", { key: st, style: { fontSize: 8.5, fontFamily: "'JetBrains Mono',monospace", padding: "2px 5px", borderRadius: 4, background: reached && !isV ? "rgba(67,198,172,0.14)" : "#0c0e13", color: reached && !isV ? "#43C6AC" : "#4a5058", border: "1px solid " + (reached && !isV ? "#2a5048" : "#20242e") } }, st.replace(/_/g, " ").toLowerCase() + (isV ? " ·backend" : "")); })),
              it.blockReason && h("div", { style: { fontSize: 10, color: "#E8924A", marginTop: 5, fontFamily: "'JetBrains Mono',monospace" } }, "⚠ type-composable but not promotable: " + it.blockReason),
              h("div", { style: { fontSize: 11.5, color: it.typeCheck.pass ? "#cdd3dd" : "#9aa1ad", marginTop: 3, lineHeight: 1.4 } }, it.typeCheck.pass ? (it.typeCheck.sharedObject || "—") : (it.typeCheck.reason || "no shared object")),
              // adapter chain (bridge compiler output)
              it.bridge && it.bridge.adapters && it.bridge.adapters.length > 0 && h("div", { style: { marginTop: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#9aa1ad", display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" } }, h("b", { style: { color: "#7fb0e0" } }, it.bridge.sourcePort.kind), ...it.bridge.adapters.flatMap((s, si) => [h("span", { key: "o" + si, style: { color: s.lossy ? "#E8924A" : "#43C6AC" } }, " ―" + s.op + (s.lossy ? "⚠" : "") + (s.auth === "cur" ? "ᶜ" : "ᵃ") + "→ "), h("b", { key: "k" + si, style: { color: "#7fb0e0" } }, s.to)]), it.bridge.riskCost != null ? h("span", { style: { color: "#5a6472", marginLeft: 4 } }, "risk " + it.bridge.riskCost) : null),
              it.bridge && (!it.bridge.adapters || !it.bridge.adapters.length) && h("div", { style: { marginTop: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#43C6AC" } }, "≡ identity — " + it.bridge.sourcePort.kind + " shared directly"),
              // machine-readable impossibility (the success criterion)
              it.impossibility && h("div", { style: { marginTop: 7, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: "#e0a0a0", background: "#1a1013", border: "1px solid #4a2a2a", borderRadius: 5, padding: "5px 7px" } }, "⛔ " + it.impossibility.code + (it.impossibility.from ? " (" + it.impossibility.from + "→" + it.impossibility.to + ")" : "")),
              // proof-obligation vector
              it.obligations && it.obligations.length > 0 && h("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", gap: 2 } }, h("div", { style: { fontSize: 9.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 } }, "Proof obligations"), ...it.obligations.map((o, oi) => { const sc = { "PROVED": "#43C6AC", "REFUTED": "#e0556b", "CONDITIONALLY-SATISFIED": "#E8C24A", "UNRESOLVED": "#6b7280" }[o.status] || "#6b7280"; return h("div", { key: oi, style: { display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 6, alignItems: "baseline", fontSize: 10.5 } }, h("span", { style: { fontFamily: "'JetBrains Mono',monospace", color: "#6b7280" } }, o.id), h("span", { style: { color: "#9aa1ad" } }, o.name, o.method === "deterministic" ? h("span", { style: { color: "#5a6472", fontSize: 9 } }, "  ⚙ code") : h("span", { style: { color: "#5a6472", fontSize: 9 } }, "  ~model"), o.detail ? h("div", { style: { color: "#5a6472", fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.3 } }, o.detail) : null), h("span", { style: { fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: sc, fontSize: 9.5, textAlign: "right" } }, o.status === "CONDITIONALLY-SATISFIED" ? "COND" : o.status)); }))),
            // literature evidence
            h("div", { style: { marginTop: 9, background: "#0c0e13", border: "1px solid " + (it.litClass === "UNEXPLORED" ? "#2a5048" : "#20242e"), borderRadius: 7, padding: 9 } },
              h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, h("span", { style: { fontSize: 10, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase" } }, "Literature · " + (it.modelEstimated ? "model-estimated" : "OpenAlex") + (it.preregId ? " · preregistered" : "")), h("span", { style: { fontSize: 10, fontWeight: 700, color: lm.c, fontFamily: "'JetBrains Mono',monospace" } }, lm.t)),
              h("div", { style: { fontSize: 12, color: "#cdd3dd", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" } }, it.litCount == null ? "no count" : (it.litCount.toLocaleString() + " papers"), it._litQuery && h("span", { style: { color: "#6b7280" } }, "  «" + it._litQuery + "»")),
              ...(it.litTop || []).map((p, pi) => h("div", { key: pi, style: { fontSize: 11, color: "#8a8f98", marginTop: 3, lineHeight: 1.35 } }, "• " + p.title + (p.year ? " (" + p.year + ")" : ""))),
              it.modelEstimated && h("div", { style: { fontSize: 10.5, color: "#b8862a", marginTop: 4, fontStyle: "italic" } }, "UNVERIFIED — model guess, not a literature search.")),
            h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 9, lineHeight: 1.4 } }, h("span", { style: { color: "#6b7280" } }, "Hollow-check: "), it.hollowCheck || "—"),
            h("div", { style: { display: "flex", gap: 8, marginTop: 11, paddingTop: 10, borderTop: "1px solid #20242e" } }, (() => { const ok = gateOK(it); return h("button", { onClick: () => promoteGap(it, gap.cell), disabled: !ok, title: ok ? "Adds your human verification and promotes to a ◆ node" : "Gates not met: requires type-check PASS + UNEXPLORED/EMERGING literature (verified, not model-estimated)", style: { flex: 1, padding: "7px", borderRadius: 7, border: "1px solid " + (ok ? "#43C6AC" : "#2b313d"), background: ok ? "rgba(67,198,172,0.12)" : "transparent", color: ok ? "#43C6AC" : "#4a5058", cursor: ok ? "pointer" : "default", fontSize: 12.5, fontWeight: 600 } }, ok ? "Promote (adds human verification)" : "Promote — gates not met"); })(), h("button", { onClick: () => archiveGap(it, gap.cell), style: { flex: 1, padding: "7px", borderRadius: 7, border: "1px solid #2b313d", background: "transparent", color: "#8a8f98", cursor: "pointer", fontSize: 12.5 } }, "Archive")));
        }),
        gap.items && h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 8, lineHeight: 1.5, fontStyle: "italic" } }, "Proof-obligation-carrying bridge planning: multipath min-risk compiler (top-3 routes) → per-edge precondition instantiation → refuted paths pruned, unresolved held at TYPE_COMPOSABLE → preregistered OpenAlex probe → your promotion. CONTRACT_ADMISSIBLE needs every precondition ≥ conditionally-satisfied; VERIFIED is backend-only."),
        // falsification table across probed cells
        probeLog.length > 0 && h("div", { style: { ...card, padding: 12, marginTop: 14 } },
          h("div", { style: { fontSize: 11, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 } }, "Ledger — probes, kills, survivals (" + probeLog.length + ")"),
          h("div", { style: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "4px 10px", fontSize: 11.5, fontFamily: "'JetBrains Mono',monospace", alignItems: "center" } },
            h("div", { style: { color: "#6b7280" } }, "cell"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "papers"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "verdict"),
            ...probeLog.flatMap((p, pi) => [h("div", { key: "n" + pi, style: { color: "#cdd3dd" } }, p.cellName + (p.density == null ? "" : " (" + p.density + ")") + (p.killedByType ? " ·†" + p.killedByType : "")), h("div", { key: "c" + pi, style: { color: "#9aa1ad", textAlign: "right" } }, p.paperCount == null ? "—" : p.paperCount.toLocaleString()), h("div", { key: "v" + pi, style: { textAlign: "right", color: p.prize ? "#43C6AC" : (p.verdict === "EMERGING" ? "#E8924A" : "#a06a6a") } }, p.prize ? "★ PRIZE" : p.verdict)])),
          h("div", { style: { fontSize: 11, color: probeLog.some(p => p.prize) ? "#43C6AC" : "#a06a6a", marginTop: 9, lineHeight: 1.45 } }, probeLog.some(p => p.prize) ? "≥1 PROMISING+UNEXPLORED bridge found — premise holds for at least one cell." : (probeLog.length >= 5 ? "No UNEXPLORED bridge across " + probeLog.length + " sparse cells — so far this falsifies ‘empty cell = opportunity’: the tool is surfacing open-source gaps, not literature frontiers." : "Probe more sparse cells to test the premise (need a dozen for a real falsification)."))))); 

    // ---------- ◈ Cortex governance drawer: Constitution · Calibration (Ω5) · Operational policies ----------
    const predictions = [
      ...candidates.map(c => ({ id: c.id, kind: "candidate", label: c.combination, predicted: "PROMISING+UNEXPLORED", cell: c.cell, litCount: c.litCount })),
      ...probeLog.filter(p => p.verdict && p.verdict !== "INCOHERENT").map((p, i) => ({ id: "ledger:" + (p.at || (p.cellName + i)), kind: "probe", label: p.cellName + (p.density == null ? "" : " (" + p.density + ")"), predicted: p.prize ? "PRIZE" : p.verdict, litCount: p.paperCount }))
    ];
    const calById = {}; calibration.forEach(c => { calById[c.targetId] = c; });
    const scored = calibration.filter(c => c.outcome === "CONFIRMED" || c.outcome === "REFUTED");
    const calByClass = {}; scored.forEach(c => { const k = c.predicted || "—"; (calByClass[k] = calByClass[k] || { confirmed: 0, refuted: 0 })[c.outcome === "CONFIRMED" ? "confirmed" : "refuted"]++; });
    const totalConfirmed = scored.filter(c => c.outcome === "CONFIRMED").length;
    const CONSTITUTION = [
      ["Preserve provenance", "Every synthesis stores parents[] and a verifications[] trail; edges carry evidence."],
      ["Never hide uncertainty", "Model-estimated literature is labelled UNVERIFIED; paper counts and confidence are always shown."],
      ["Never auto-promote unverified capability", "The producing model cannot promote its own output — a prize is a CANDIDATE until a human acts."],
      ["Fail closed", "Missing formal objects or an unavailable type-check resolve to FAIL, never to pass."],
      ["Retain negatives", "Archived dead-ends are kept (with the instrument that killed them) and fed back to suppress re-proposal."],
      ["Human-authority gate", "Promotion requires type-PASS + verified UNEXPLORED/EMERGING and a human click, recorded as the final instrument."],
      ["Preserve the snapshot", "A prize auto-exports the instant it exists; the export round-trips all governance state."]
    ];
    const POLICIES = [
      ["UNEXPLORED threshold", "< " + LIT_EMERGING + " papers", "Below this OpenAlex count a bridge is a genuine frontier candidate."],
      ["KNOWN threshold", "> " + LIT_KNOWN + " papers", "Above this the fusion is prior-art — demoted, not novel."],
      ["Enrichment concurrency", "~4 parallel", "Balances fill speed against the GitHub rate wall."],
      ["Rate pause", "auto at remaining ≈ 0", "Pauses near the limit and resumes at reset."]
    ];
    const cortexTabBtn = (k, lbl) => h("button", { key: k, onClick: () => setCortexTab(k), style: { flex: 1, padding: "8px", border: "none", background: cortexTab === k ? "#1a1f29" : "transparent", color: cortexTab === k ? "#e6e8ec" : "#9aa1ad", cursor: "pointer", fontSize: 12, fontWeight: 600, borderBottom: "2px solid " + (cortexTab === k ? "#9a6cff" : "transparent") } }, lbl);
    const outcomeBtn = (pred, val, cur, col) => h("button", { onClick: () => cur === val ? clearOutcome(pred.id) : recordOutcome(pred, val), style: { padding: "3px 9px", borderRadius: 6, border: "1px solid " + (cur === val ? col : "#2b313d"), background: cur === val ? hexA(col, 0.16) : "transparent", color: cur === val ? col : "#9aa1ad", cursor: "pointer", fontSize: 11, fontWeight: 600 } }, val);
    const cortexDrawer = showCortex && h("div", { style: { position: "absolute", right: 0, top: 0, bottom: 0, width: 448, maxWidth: "94%", background: "#101319", borderLeft: "1px solid #262b36", zIndex: 13, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.45)" } },
      h("div", { style: { padding: "13px 16px", borderBottom: "1px solid #20242e", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } },
        h("div", null, h("div", { style: { fontWeight: 700, fontSize: 15 } }, "◈ Cortex governance"), h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 2, lineHeight: 1.4 } }, "The observe → verify → learn loop, made inspectable.")),
        h("button", { onClick: () => setShowCortex(false), style: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 19 } }, "×")),
      h("div", { style: { display: "flex", borderBottom: "1px solid #20242e" } }, cortexTabBtn("calibration", "Calibration"), cortexTabBtn("constitution", "Constitution"), cortexTabBtn("policies", "Policies"), cortexTabBtn("rules", "Rules")),
      h("div", { style: { padding: 16, overflowY: "auto", flex: 1 } },
        // ---- CALIBRATION (Ω5) ----
        cortexTab === "calibration" && h("div", null,
          h("div", { style: { fontSize: 12, color: "#9aa1ad", lineHeight: 1.5, marginBottom: 12 } }, "The producer cannot verify its own prize. When reality arrives — you read the papers, test the shared object — record the outcome here. The system does not claim success until an outcome exists."),
          scored.length > 0 && h("div", { style: { ...card, padding: 12, marginBottom: 14 } },
            h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 } }, "Calibration — hit rate by predicted class (" + scored.length + " evaluated)"),
            h("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #20242e" } }, h("span", { style: { color: "#cdd3dd" } }, "Overall confirmed"), h("b", { style: { color: totalConfirmed / scored.length >= 0.5 ? "#43C6AC" : "#E8924A", fontFamily: "'JetBrains Mono',monospace" } }, totalConfirmed + "/" + scored.length + "  (" + Math.round(100 * totalConfirmed / scored.length) + "%)")),
            ...Object.entries(calByClass).map(([k, v]) => h("div", { key: k, style: { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", fontFamily: "'JetBrains Mono',monospace" } }, h("span", { style: { color: "#9aa1ad" } }, k), h("span", null, h("span", { style: { color: "#43C6AC" } }, v.confirmed + "✓"), " ", h("span", { style: { color: "#a06a6a" } }, v.refuted + "✗"))))),
          Object.keys(mechCal).length > 0 && h("div", { style: { ...card, padding: 12, marginBottom: 14 } },
            h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 } }, "Mechanism-class priors → generation (Ω5→Ω3)"),
            h("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 8, lineHeight: 1.45 } }, "Priors alter skepticism, never prohibit. A multiplier only leaves 1.0 after ≥" + MIN_SAMPLE + " resolved outcomes; the floor is 0.3 (no hard rejection)."),
            h("div", { style: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "3px 10px", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", alignItems: "center" } },
              h("div", { style: { color: "#6b7280" } }, "kind → kind"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "prop/kill/resolved"), h("div", { style: { color: "#6b7280", textAlign: "right" } }, "×prior"),
              ...Object.values(mechCal).sort((a, b) => mechMultiplier(a).m - mechMultiplier(b).m).slice(0, 12).flatMap((c, ci) => { const mm = mechMultiplier(c); const col = mm.resolved < MIN_SAMPLE ? "#6b7280" : (mm.m < 0.7 ? "#a06a6a" : (mm.m > 1.1 ? "#43C6AC" : "#cdd3dd")); return [h("div", { key: "k" + ci, style: { color: "#cdd3dd" }, title: mm.reason }, c.sourceKind + "→" + c.targetKind), h("div", { key: "s" + ci, style: { color: "#9aa1ad", textAlign: "right" } }, c.proposed + "/" + c.typeKilled + "/" + mm.resolved), h("div", { key: "m" + ci, style: { color: col, textAlign: "right" } }, "×" + mm.m)]; }))),
          predictions.length === 0 ? h("div", { style: { fontSize: 12.5, color: "#6b7280", fontStyle: "italic", padding: "10px 0" } }, "No predictions yet. Probe a sparse cell or run ⚡ Generate & verify to produce falsifiable predictions.") :
          h("div", null, h("div", { style: { fontSize: 10.5, letterSpacing: 1, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 } }, "Predictions ledger (" + predictions.length + ")"),
            ...predictions.map((p, i) => { const cur = (calById[p.id] || {}).outcome; return h("div", { key: p.id, style: { ...card, padding: 10, marginBottom: 8, borderColor: cur === "CONFIRMED" ? "#2a5048" : (cur === "REFUTED" ? "#4a2a2a" : "#262b36") } },
              h("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" } }, h("span", { style: { fontSize: 12, color: "#e6e8ec", lineHeight: 1.35 } }, p.label), h("span", { style: { flex: "0 0 auto", fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", color: p.kind === "candidate" ? "#43C6AC" : "#6b7280", textTransform: "uppercase" } }, p.kind)),
              h("div", { style: { fontSize: 11, color: "#9aa1ad", marginTop: 3, fontFamily: "'JetBrains Mono',monospace" } }, "predicted " + p.predicted + (p.litCount != null ? " · " + p.litCount.toLocaleString() + "p" : "")),
              h("div", { style: { display: "flex", gap: 6, marginTop: 8, alignItems: "center" } }, h("span", { style: { fontSize: 10.5, color: "#6b7280" } }, "outcome:"), outcomeBtn(p, "CONFIRMED", cur, "#43C6AC"), outcomeBtn(p, "REFUTED", cur, "#a06a6a"), cur && h("span", { style: { fontSize: 10, color: "#6b7280", marginLeft: "auto" } }, "scored " + ((calById[p.id] || {}).evaluatedAt || "").slice(0, 10))) ); }))),
        // ---- CONSTITUTION ----
        cortexTab === "constitution" && h("div", null,
          h("div", { style: { fontSize: 12, color: "#9aa1ad", lineHeight: 1.5, marginBottom: 12 } }, "Immutable constraints the kernel enforces in code. These are not tunable from the UI — changing them is a human governance act, by design."),
          ...CONSTITUTION.map(([t, d], i) => h("div", { key: i, style: { ...card, padding: 11, marginBottom: 8, borderLeft: "3px solid #9a6cff" } }, h("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#e6e8ec" } }, "§ " + t), h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 3, lineHeight: 1.45 } }, d)))),
        // ---- POLICIES ----
        cortexTab === "policies" && h("div", null,
          h("div", { style: { fontSize: 12, color: "#9aa1ad", lineHeight: 1.5, marginBottom: 12 } }, "Revisable operational parameters — evidence may justify tuning these; they are not constitutional. Current operative values:"),
          ...POLICIES.map(([t, val, d], i) => h("div", { key: i, style: { ...card, padding: 11, marginBottom: 8 } }, h("div", { style: { display: "flex", justifyContent: "space-between", gap: 10 } }, h("span", { style: { fontSize: 12.5, fontWeight: 600, color: "#e6e8ec" } }, t), h("span", { style: { fontSize: 12, color: "#9a6cff", fontFamily: "'JetBrains Mono',monospace" } }, val)), h("div", { style: { fontSize: 11.5, color: "#9aa1ad", marginTop: 3, lineHeight: 1.45 } }, d))),
          h("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 10, fontStyle: "italic", lineHeight: 1.5 } }, "Threshold tuning is a tracked next step — a change here should itself be logged as a prediction and calibrated against outcomes.")), cortexTab === "rules" && (() => { const rules = []; Object.keys(CONV_RULES).forEach(k => (CONV_RULES[k] || []).forEach(e => rules.push({ from: k, to: e.to, op: e.op, auth: e.auth || "cur", pre: e.pre || "", lossy: !!e.lossy }))); const ax = rules.filter(r => r.auth === "ax").length; return h("div", null, h("div", { style: { fontSize: 12, color: "#9aa1ad", lineHeight: 1.5, marginBottom: 10 } }, "The conversion graph is part of the epistemic constitution — one bad edge fabricates bridges corpus-wide, so every rule is governed. ", h("b", { style: { color: "#43C6AC" } }, ax + " axiomatic"), " (structurally always valid) · ", h("b", { style: { color: "#E8C24A" } }, (rules.length - ax) + " curated"), " (valid only under a stated precondition, model-checked per bridge). No edge is source-verified or empirically-validated in-artifact."), h("div", { style: { display: "flex", flexDirection: "column", gap: 4 } }, ...rules.sort((a, b) => a.auth.localeCompare(b.auth) || a.from.localeCompare(b.from)).map((r, i) => h("div", { key: i, style: { ...card, padding: "7px 9px", borderLeft: "3px solid " + (r.auth === "ax" ? "#43C6AC" : "#E8C24A") } }, h("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" } }, h("span", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#cdd3dd" } }, r.from + " ―" + r.op + (r.lossy ? "⚠" : "") + "→ " + r.to), h("span", { style: { fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: r.auth === "ax" ? "#43C6AC" : "#E8C24A" } }, r.auth === "ax" ? "AXIOMATIC" : "CURATED")), r.pre ? h("div", { style: { fontSize: 10.5, color: "#6b7280", marginTop: 2, lineHeight: 1.35 } }, "requires: " + r.pre) : null))), h("div", { style: { fontSize: 10.5, color: "#6b7280", marginTop: 10, fontStyle: "italic", lineHeight: 1.5 } }, "Next: each edge should carry provenance, version, author, tests, and counterexamples — the backend milestone where rules become as auditable as the syntheses they judge.")); })()));

    return h("div", { className: "gb", style: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#0c0e13" } },
      header,
      h("div", { ref: wrapRef, style: { position: "relative", flex: 1, overflow: "hidden", background: "#06070a" } },
        h("canvas", { ref: canvasRef, style: { position: "absolute", inset: 0, display: "block" } }),
        h("div", { ref: tipRef, style: { position: "absolute", display: "none", pointerEvents: "none", zIndex: 10, background: "rgba(16,19,25,0.96)", border: "1px solid #2b313d", borderRadius: 7, padding: "6px 9px", fontSize: 12, lineHeight: 1.35, maxWidth: 280 } }),
        !d3ready && h("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 13 } }, "loading graph engine…"),
        emptyState, controls, legend, zoomBtns, absorbHud, linkBanner, cellHiBanner, edgePop, errBar, storeErrBar, repoPanel, synthPanel, comboBar, synthDrawer, fetchPanel, relatedModal, discoverModal, matrixView, gapDrawer, cortexDrawer));
  };

  renderVals() { return { app: React.createElement(this.App) }; }
}
