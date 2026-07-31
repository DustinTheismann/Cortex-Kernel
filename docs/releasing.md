# Release checklist

A permanent procedure so releases do not drift. Every step is mechanical and
most are enforced by CI; the list exists so nothing is skipped when the CI
result is green for the wrong reason.

## 1. Pre-flight (local)

```bash
npm run verify
```

Runs, in order: the oracle self-check, the kernel unit suite, the golden parity
gate, and the certification check. All four must pass before anything else.

Individually:

| Command | Asserts |
|---|---|
| `npm run oracle:check` | The oracle corpus still matches the frozen source; deterministic double-build. |
| `npm run kernel:test` | Unit, metamorphic, reference-integrity, and trace-invariance tests. |
| `npm run kernel:golden` | The extracted kernel reproduces **every** manifest hash. |
| `npm run certify:check` | The candidate describes this tree; every release record still describes the tree at its own tag. |
| `npm run release:integrity` | Every release-identity rejection is negative-tested. |

## 2. Version

- Decide the version per [`docs/versioning.md`](versioning.md). A changed golden
  hash is a version event, never a fixture regeneration.
- Update `packages/cortex-kernel/package.json` `version` if the package changed.
- Add a `CHANGELOG.md` entry: **Added / Changed / Verified / Certification /
  Known limitations**.

## 3. Certification

Regenerate only when the evidence legitimately changed (new oracle version,
new fixtures, new canonicalization):

```bash
npm run certify -- --run-id=<id>
npm run certify:check
```

This regenerates the **candidate only**. `evidence` is re-derived from the tree;
`provenance` is historical, supplied once and carried forward, never invented.
Release records are not written here — they are written once, by
`ledger --release`, and are immutable thereafter. Commit the updated candidate.

## 4. Merge and confirm CI

- Open a PR; require all CI gates green:
  `reference-integrity`, `oracle-check`, `kernel-unit`, `kernel-golden`,
  all of them (`npm run gates` enumerates the current set from the workflow).
- Merge with a **merge commit** (not squash) so the extraction/verification
  sequence stays traceable.
- Confirm `main` contains the merge before tagging.

## 5. Tag

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git tag -a v<version>-kernel -m "Frozen v<reference> Cortex semantic kernel extraction"
git push origin v<version>-kernel
```

Prefer a **signed** tag (`git tag -s`) when a GPG or SSH signing key is
available — it adds cryptographic provenance to the release.

Tag the commit that contains the certification artifact and the CI configuration
the release was verified under.

### The tag must exist on the REMOTE before sealing

`ledger --release` checks the *local* tag. The `certification` gate on `main`
resolves `git show <tag>:…` on a CI runner. A tag that exists only in your
working copy therefore produces a green seal and a red `main` — the same
failure that took `c1334e1` down, where the tag the certificate named had
never been published.

Push the tag and confirm `git ls-remote --tags origin` lists it before
continuing. If the tag push is rejected, stop: do not seal, and do not
substitute a local-only tag. A release record naming a tag no third party can
resolve is not independently verifiable, which is the one property the record
exists to have.

### No commit may land on `main` between the tag and the seal

Sealing requires the tag to point at `HEAD`. Any commit merged to `main` after
tagging moves `HEAD` past the tag, and `--release` refuses with
`tag <t> points at <a>, but HEAD is <b>`. Recovering means retagging at the new
commit, which changes the release target that was reviewed and approved.

So between step 5 and step 5b, **every** pull request stays unmerged — not only
ones that touch release-sensitive files. Merge them after the seal commit is
pushed.

## 5a. Seal the ledger entry

Build the peer first. `--release` runs `npm run verify` then and there, and in
a fresh clone the Rust binary does not exist yet:

```bash
npm run conformance:build
npm run conformance      # require the expected N/43; never proceed past "binary not built"
```

Gate order currently makes this fail-closed — `mutants` exits 2 when the peer
is absent, before `conformance` is reached — and since the unbuilt case became
a hard failure, `conformance` refuses on its own rather than warning and
passing. Both matter, because the release statement asserts corroboration by an
independent implementation, and that sentence becomes immutable at sealing.

```bash
node scripts/ledger.mjs --release --tag=v<version>-kernel --statement="<release-specific wording>"
```

**Always pass `--statement` explicitly.** It falls back to the candidate's
wording, and a candidate's wording describes an *unreleased* state — ours
literally said `NOTHING HAS BEEN RELEASED: no git tag exists on the repository`.
Inheriting it freezes a sentence that is false the instant it becomes
immutable. The fallback exists for continuity, not as the intended path.

**A release identity is never reused.** Certification has two artifacts because
there are two claims:

| Artifact | Subject | Mutability |
|---|---|---|
| `docs/certification/candidate.json` | the *current* tree | regenerated by `npm run certify`; carries **no** release tag |
| `docs/certification/<tag>.json` | the tree **at `<tag>`** | written once at sealing; never regenerated |

The ledger mirrors this: a `candidate` entry carries `releaseTag: null` and may
be restated; a `released` entry names a tag that exists, binds the commit it
resolves to, and can only be succeeded.

These were once one artifact, and the result was a record with no unambiguous
temporal subject — named for a shipped tag while its evidence tracked `HEAD`,
which also made the ledger head permanently unsealable. Do not merge them again.

Sealing is the moment the chain's integrity claim becomes load-bearing, so it is
anchored rather than asserted. The command refuses unless **every** one holds:

- the tag is not already used by an entry or a release record;
- the working tree is clean (a release describes committed state, not a workspace);
- `HEAD` is on `main` (override deliberately with `--branch=`);
- the tag already exists and is **annotated** — a lightweight tag carries no
  tagger, date or message, so it cannot witness a release;
- the tag points at `HEAD`, so the sealed commit is unambiguous;
- `npm run verify` passes, run then and there rather than remembered.

Sealing writes `docs/certification/<tag>.json` from the candidate's evidence,
binds `releaseCommitSha` into the entry hash, records whether the tag was signed,
and opens a fresh candidate entry so the chain always has a moving head.

Thereafter `certify --check` verifies that record against `git show <tag>:…`,
not against `HEAD` — so a release record re-derived from later state fails
rather than silently rewriting history. `npm run release:integrity` negative-tests
every one of these rejections.

### 5b. The tag does not contain its own release record

This surprises every first reader, so it is stated plainly:

- the tag binds the **pre-seal** commit;
- `docs/certification/<tag>.json` and the sealed ledger entry are created
  *after* that commit, and land in the push that follows;
- `git show <tag>:docs/certification/` therefore lists only `candidate.json`.

That is structural, not an oversight. A record that binds a commit cannot be
inside the commit it binds — the record contains `releaseCommitSha`, and
writing it into the tree would change the tree, hence the SHA, hence the
record. Any scheme that tried would either loop or record a commit that is not
the released one.

Verification is arranged around this. `certify --check` reads a release record
from the working tree and checks it against the **hashed evidence files as they
existed at the tag** — the manifest, the frozen reference, the canonicalizer,
the invariant set — none of which the seal commit touches. So the record is
anchored to the tagged tree without needing to live in it. Do not "fix" this by
tagging the seal commit instead: that tag would name a tree whose certificate
describes a different commit.

```bash
git push origin main      # publishes the seal commit
```

Confirm `main` CI is green before merging anything else.

## 6. GitHub Release

Create a Release from the tag containing:

- summary of what shipped;
- the oracle parity statement (fixture count, acceptance command);
- links to the certification artifact and the verifying workflow run;
- compatibility guarantees and the stability policy;
- known limitations (link `docs/oracle-limitations.md`);
- upgrade guidance.

## 7. Publish (only if public distribution is intended)

```bash
npm --prefix packages/cortex-kernel run pack:smoke   # packed artifact imports cleanly
npm --prefix packages/cortex-kernel publish --access public
```

## Post-release

- Confirm the release page renders and the source archives download.
- Confirm Dependabot is opening PRs against the pinned action SHAs.
- Open follow-up issues for anything deferred during the release.
