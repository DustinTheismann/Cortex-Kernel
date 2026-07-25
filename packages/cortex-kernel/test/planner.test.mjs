import test from "node:test";
import assert from "node:assert/strict";
import { adaptersFor, pairCompat } from "../src/planner.js";
import { CONV_RULES } from "../src/registry.js";

const ids = (result) => result.map((r) => r.path.map((s) => s.ruleId));
const clone = () => structuredClone(CONV_RULES);

test("identity and no-path behavior", () => {
  assert.deepEqual(adaptersFor("tensor", "tensor", 3), [{ path: [], exact: true, cost: 0 }]);
  assert.deepEqual(adaptersFor("tensor", "policy", 3), []);           // policy has no inbound rule
  assert.equal(pairCompat({ kind: "tensor" }, { kind: "policy" }).compatibility, "incompatible");
  assert.equal(pairCompat({ kind: "tensor" }, { kind: "policy" }).cost, 99);
});

test("metamorphic: identical input yields identical ordering", () => {
  assert.deepEqual(adaptersFor("tensor", "distribution", 3), adaptersFor("tensor", "distribution", 3));
});

test("metamorphic: alternate paths remain in ascending-cost order", () => {
  for (const [a, b] of [["tensor", "distribution"], ["graph", "certificate"], ["distribution", "dataset"]]) {
    const rs = adaptersFor(a, b, 3);
    for (let i = 1; i < rs.length; i++) assert.ok(rs[i].cost >= rs[i - 1].cost, `${a}>${b} not cost-ascending`);
  }
});

test("metamorphic: an irrelevant disconnected rule changes nothing", () => {
  const before = adaptersFor("tensor", "distribution", 3);
  const rules = clone();
  // policy is never reachable as an intermediate (no inbound), so a new edge
  // out of policy cannot lie on any tensor→distribution path.
  rules.policy.push({ to: "claim", op: "decree", auth: "ax" });
  assert.deepEqual(adaptersFor("tensor", "distribution", 3, rules), before);
});

test("metamorphic: permuting source rule order preserves a unique-cost selection", () => {
  // tensor→dataset has a unique cheapest path (materialize, cost 1); reversing
  // tensor's rule order must not change the selected top path.
  const top = adaptersFor("tensor", "dataset", 3)[0].path.map((s) => s.ruleId);
  const rules = clone();
  rules.tensor.reverse();
  assert.deepEqual(adaptersFor("tensor", "dataset", 3, rules)[0].path.map((s) => s.ruleId), top);
});

test("metamorphic: removing the selected rule selects the next oracle-ranked path", () => {
  const ranked = ids(adaptersFor("tensor", "distribution", 3));
  const rules = clone();
  // remove the top path's sole rule (tensor>distribution:normalize)
  rules.tensor = rules.tensor.filter((e) => !(e.to === "distribution" && e.op === "normalize"));
  const afterTop = adaptersFor("tensor", "distribution", 3, rules)[0].path.map((s) => s.ruleId);
  assert.deepEqual(afterTop, ranked[1]); // the previously second-ranked path
});
