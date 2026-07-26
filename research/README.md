# Research modules — advisory, parity-isolated

Working implementations of frontier-backlog proposals. Every module here is
**advisory** and **read-only** with respect to the deterministic kernel:

- nothing in `packages/cortex-kernel/` imports from this directory (enforced by
  a test in the kernel's smoke suite);
- modules plan over **copies** of the frozen registry and never mutate it;
- no output here participates in a canonical decision or any corpus hash.

| Module | Frontier item | What it answers |
|---|---|---|
| `counterfactual.mjs` | #2 Counterfactual discovery | Which missing conversion rule would unlock the most currently-impossible bridges? |
| `negative-knowledge.mjs` | #3 Negative knowledge substrate | What failed, why, and under what condition should it be reconsidered? |
| `minimal-assumption.mjs` | #7 Minimal-assumption path search | Where do "cheapest" and "least assuming" disagree? |

```bash
node research/counterfactual.mjs
node research/negative-knowledge.mjs
node research/minimal-assumption.mjs --survey
node research/minimal-assumption.mjs tensor certificate
```

## Findings so far

Running these against the frozen v0.5.1 registry surfaced three properties that
were not previously written down anywhere:

1. **The registry reaches 197 of 240 ordered kind pairs; 43 are structurally
   impossible.**
2. **`graph` and `subgraph` form a sink group.** No kind outside that pair can
   reach either one, so *any* single inbound rule unlocks 28 pairs at once —
   by a wide margin the highest-leverage gap in the registry. (`policy` is
   similarly unreachable, with no inbound rule at all.)
3. **Min-risk is almost never the most reversible or most falsifiable path.**
   Of 160 kind pairs with more than one candidate, 154 show the frozen
   selection differing from at least one alternative objective. For example
   `tensor→scalar`: min-risk selects the lossy `reduce`, while the
   most-reversible route is `observe→aggregate`.

These are **structural observations, not recommendations**. That a rule would
increase reachability says nothing about whether the conversion is sound; any
addition needs an authority tier, a precondition, and human review. See
`docs/research/frontier-backlog.md` for the evidence each proposal must produce
before it graduates.
