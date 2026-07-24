import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Reference-integrity pins: the repo publishes the same frozen artifact
// under several names, and reference/src claims verbatim extraction from
// the bundles. Any drift between copies silently forks the contract, so
// every alias and extraction is checked byte-for-byte.

// dist/test/reference.test.js → repo root is four levels up.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p: string): string => readFileSync(resolve(root, p), "utf8");

test("index.html is byte-identical to the v0.5.1 reference standalone", () => {
  assert.ok(read("index.html") === read("reference/standalones/OpenSource_Cortex_v0.5.1_standalone.html"));
});

test("docs/backend-handoff.html is byte-identical to the handoff standalone", () => {
  assert.ok(read("docs/backend-handoff.html") === read("reference/standalones/Cortex_Backend_Handoff_standalone.html"));
});

// The app source lives inside the bundle's JSON-encoded __bundler/template
// payload, in a <script type="text/x-dc" data-dc-script=""> block (see
// reference/README.md).
const extractEmbeddedSource = (standalone: string): string => {
  const tpl = read(standalone).match(/<script type="__bundler\/template">\n?([\s\S]*?)<\/script>/);
  assert.ok(tpl, standalone + ": no __bundler/template block");
  const payload = JSON.parse(tpl![1]) as string;
  const dc = payload.match(/<script type="text\/x-dc" data-dc-script="">([\s\S]*?)<\/script>/);
  assert.ok(dc, standalone + ": no text/x-dc script in template payload");
  return dc![1];
};

const extractions: Array<[string, string]> = [
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
