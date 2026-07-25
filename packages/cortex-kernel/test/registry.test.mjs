import test from "node:test";
import assert from "node:assert/strict";
import { MECH_KINDS, STAGES, SCHEMA_VERSION, assertDefinitionsIntegrity } from "../src/types.js";
import { CONV_RULES, createRegistry, edgeCost, ruleId } from "../src/registry.js";
import { RegistryIntegrityError } from "../src/errors.js";

test("definitions integrity holds for valid v0.5.1 material", () => {
  assert.doesNotThrow(assertDefinitionsIntegrity);
  assert.equal(MECH_KINDS.length, 16);
  assert.equal(STAGES.length, 6);
  assert.equal(SCHEMA_VERSION, 7);
  assert.equal(MECH_KINDS[0], "tensor");
  assert.equal(MECH_KINDS[MECH_KINDS.length - 1], "measurement");
});

test("createRegistry validates and exposes ordered rules", () => {
  const reg = createRegistry();
  assert.equal(reg.rulesFrom("tensor")[0].op, "normalize"); // order preserved
  assert.equal(reg.rulesFrom("policy").length, 2);
  assert.deepEqual(reg.rulesFrom("nonexistent-kind"), []);
});

test("edgeCost matches the frozen formula", () => {
  // normalize: curated, not lossy, 1 destroyed → 1 + 0 + 1 + 0.5 = 2.5
  assert.equal(edgeCost(CONV_RULES.tensor[0]), 2.5);
  // reduce: axiomatic, lossy, 1 destroyed → 1 + 2 + 0 + 0.5 = 3.5
  assert.equal(edgeCost(CONV_RULES.tensor[2]), 3.5);
  // materialize: axiomatic, not lossy, none → 1 + 0 + 0 + 0 = 1
  assert.equal(edgeCost(CONV_RULES.tensor[3]), 1);
  assert.equal(ruleId("tensor", CONV_RULES.tensor[0]), "tensor>distribution:normalize");
});

test("integrity assertions fail-close on corrupt registries", () => {
  assert.throws(() => createRegistry({ "not-a-kind": [{ to: "tensor", op: "x", auth: "ax" }] }), RegistryIntegrityError);
  assert.throws(() => createRegistry({ tensor: [{ to: "ghost-kind", op: "x", auth: "ax" }] }), RegistryIntegrityError);
  assert.throws(() => createRegistry({ tensor: [{ to: "scalar", op: "x", auth: "bogus" }] }), RegistryIntegrityError);
  // duplicate rule id
  assert.throws(() => createRegistry({ tensor: [{ to: "scalar", op: "d", auth: "ax" }, { to: "scalar", op: "d", auth: "ax" }] }), RegistryIntegrityError);
});
