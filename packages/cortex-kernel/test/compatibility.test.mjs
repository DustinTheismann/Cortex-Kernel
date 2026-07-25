import test from "node:test";
import assert from "node:assert/strict";
import { shapeCompat, unitCompat, licenseCompat, licKey, mapSoft } from "../src/compatibility.js";

test("shapeCompat: absent, exact, wildcard", () => {
  assert.equal(shapeCompat({ shape: "" }, { shape: "[n]" }), "unresolved");
  assert.equal(shapeCompat({ shape: "[b,d]" }, { shape: "[b,d]" }), "proved");
  assert.equal(shapeCompat({ shape: "DAG" }, { shape: "any" }), "proved");   // wildcard
  assert.equal(shapeCompat({ shape: "3x3" }, { shape: "[n]" }), "proved");   // \bn\b wildcard
  assert.equal(shapeCompat({ shape: "3x3" }, { shape: "scalar" }), "unresolved");
});

test("unitCompat: match, dimensionless, contradiction", () => {
  assert.equal(unitCompat({ units: "probability" }, { units: "Probability" }), "proved"); // case-insensitive
  assert.equal(unitCompat({ units: "dimensionless" }, { units: "seconds" }), "unresolved");
  assert.equal(unitCompat({ units: "probability" }, { units: "seconds" }), "refuted");
  assert.equal(unitCompat({ units: "" }, { units: "x" }), "unresolved");
});

test("licenseCompat + licKey: object/string forms, copyleft", () => {
  assert.equal(licKey({ license: { spdx_id: "MIT" } }), "mit");
  assert.equal(licKey({ license: "GPL-3.0" }), "gpl-3.0");
  assert.equal(licKey({}), null);
  assert.equal(licenseCompat({ license: "MIT" }, { license: "Apache-2.0" }).status, "PROVED");
  assert.equal(licenseCompat({}, { license: "MIT" }).status, "UNRESOLVED");
  assert.equal(licenseCompat({ license: "GPL-3.0" }, { license: "AGPL-3.0" }).status, "CONDITIONALLY-SATISFIED");
});

test("mapSoft: fail-closed", () => {
  assert.equal(mapSoft("satisfied"), "CONDITIONALLY-SATISFIED");
  assert.equal(mapSoft("conditional"), "CONDITIONALLY-SATISFIED");
  assert.equal(mapSoft("violated"), "REFUTED");
  assert.equal(mapSoft("unknown"), "UNRESOLVED");
  assert.equal(mapSoft(undefined), "UNRESOLVED");
  assert.equal(mapSoft("nonsense"), "UNRESOLVED");
});
