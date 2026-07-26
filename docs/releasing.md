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
| `npm run certify:check` | The committed certificate still describes this repository. |

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
npm run certify -- --merge-commit=<sha> --run-id=<id> --conclusion=success
npm run certify:check
```

`evidence` is re-derived from the repository. `release` facts (merge commit,
workflow run, timestamp) are historical: supplied once and carried forward, never
invented. Commit the updated certificate.

## 4. Merge and confirm CI

- Open a PR; require all CI gates green:
  `reference-integrity`, `oracle-check`, `kernel-unit`, `kernel-golden`,
  `kernel-differential`, `package-smoke`, `determinism`, `certification`.
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
