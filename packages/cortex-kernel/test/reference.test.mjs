import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Reference-integrity gate (ported to ESM JS). The frozen artifact is
// published under several names and the reference sources claim verbatim
// extraction from the bundles; any drift silently forks the contract, so
// every alias and extraction is pinned byte-for-byte.

// packages/cortex-kernel/test → repo root is three levels up.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

test("index.html is byte-identical to the v0.5.1 reference standalone", () => {
  assert.ok(read("index.html") === read("reference/standalones/OpenSource_Cortex_v0.5.1_standalone.html"));
});

test("docs/backend-handoff.html is byte-identical to the handoff standalone", () => {
  assert.ok(read("docs/backend-handoff.html") === read("reference/standalones/Cortex_Backend_Handoff_standalone.html"));
});

const extractEmbeddedSource = (standalone) => {
  const tpl = read(standalone).match(/<script type="__bundler\/template">\n?([\s\S]*?)<\/script>/);
  assert.ok(tpl, standalone + ": no __bundler/template block");
  const payload = JSON.parse(tpl[1]);
  const dc = payload.match(/<script type="text\/x-dc" data-dc-script="">([\s\S]*?)<\/script>/);
  assert.ok(dc, standalone + ": no text/x-dc script in template payload");
  return dc[1];
};

const extractions = [
  ["reference/src/github-brain.jsx", "reference/standalones/GitHub_Brain_standalone.html"],
  ["reference/src/cortex-v0.4.jsx", "reference/standalones/OpenSource_Cortex_v0.4_standalone.html"],
  ["reference/src/cortex-v0.5.jsx", "reference/standalones/OpenSource_Cortex_v0.5_standalone.html"],
  ["reference/src/cortex-v0.5.1.jsx", "reference/standalones/OpenSource_Cortex_v0.5.1_standalone.html"],
];

for (const [src, standalone] of extractions) {
  test(src + " matches the source embedded in its standalone", () => {
    assert.ok(read(src) === extractEmbeddedSource(standalone));
  });
}
