# Canonicalization specification — version 1

Language-neutral definition of how a decision is encoded before hashing. Any
implementation that follows this spec produces identical hashes for identical
decisions, which is what makes the corpus a portable contract rather than a
JavaScript test suite.

The normative JavaScript implementation is `test/oracle/canonicalize.mjs`. Where
this document and that file disagree, the file wins and this document is the bug.

## 1. Scope

Canonicalization is **deliberately narrow**. It exists to remove genuine
nondeterminism, never to normalize away behavior.

### Allowed

| Transformation | Rationale |
|---|---|
| Object keys sorted lexicographically by code unit | Encoding stability only; does not touch arrays |
| Timestamp keys excluded | Wall-clock, nondeterministic |
| Generated identifiers replaced by a scheme placeholder | `uid()`-minted; the scheme is behavior, the value is not |
| `undefined` represented by a sentinel | Distinguishes "present but undefined" from `null` and from absent |
| `-0` normalized to `0` | JavaScript serialization artifact |

### Forbidden

- Sorting or reordering **any** array. Array order encodes path preference and
  obligation order and is load-bearing.
- Collapsing alternate paths or deduplicating outputs.
- Turning an absent key into `null`.
- Rewriting verdict, reason, or detail text.
- Normalizing away contradictory or unexpected states.

## 2. Value mapping

Given a value `v`, `canonicalize(v)` is:

```
undefined            → "␀undefined"            (the undefined sentinel, U+2400 NULL SYMBOL + "undefined")
null                 → null
array                → array, element order preserved, each element canonicalized
object               → object with keys sorted ascending; excluded keys dropped;
                       transient id values replaced; each value canonicalized
number               → the number, with -0 mapped to 0
string | boolean     → unchanged
```

### 2.1 Excluded keys (timestamps)

Dropped wherever they appear, at any depth:

```
at, generatedAt, preregAt, evaluatedAt, lastUpdatedAt
```

### 2.2 Transient identifier replacement

A key is an *id key* if it is exactly `id` or `preregId`, or ends with `Id`.

If an id key's value is a string matching `^(cand|prereg|cal|note|synth|link|neg|mech):`,
the value is replaced with `<scheme>:<id>` — e.g. `cand:k3x9f2` → `cand:<id>`.

Deterministic identifiers are **not** transient and must survive unchanged. In
particular `ruleId` (`tensor>distribution:normalize`) has no scheme prefix from
the list above and is preserved verbatim.

### 2.3 Key ordering

Sort by **UTF-16 code-unit lexicographic order**, ascending — the default of
JavaScript's `Array.prototype.sort` on strings.

This is *not* code-point order and *not* byte order, and the difference is
observable. A non-BMP character is a surrogate pair whose leading unit is in
`U+D800..U+DBFF`, so it sorts **below** BMP characters above `U+DBFF`:

```
"z" (U+007A)  <  "𝄞" (U+1D11E → D834 DD1E)  <  "�" (U+FFFD)
```

In code-point order `U+1D11E` would sort *after* `U+FFFD`. Implementations that
sort by code point, by UTF-8 bytes, or by locale collation will disagree with the
reference on such keys. Pinned by the `unicode-bmp-vs-non-bmp` vector.

**No Unicode normalization is applied.** `U+00E9` and `e` + `U+0301` render
identically but are distinct keys and must remain distinct; the reference does
not normalize, so neither may any implementation. Likewise Latin `A`, Cyrillic
`А` and Greek `Α` are three different keys.

### 2.4 Unsupported values

Values JSON cannot represent are **rejected**, never silently encoded. Rejection
raises `CANONICALIZATION_UNSUPPORTED_NUMBER` with a path to the offending value.

| Value class | Behavior | Rationale |
|---|---|---|
| `NaN` | reject | `JSON.stringify` emits `null`, collapsing it into a state already used for explicit null |
| `Infinity` / `-Infinity` | reject | same collapse |
| BigInt | reject | no JSON representation; encode as a string if a schema needs it |
| Integral value outside `\|n\| ≤ 2^53−1` | reject | cannot round-trip through a double, so two distinct inputs could canonicalize identically |
| Non-integral finite double | accept | round-trips exactly under §3 |
| `-0` | normalize to `0` | JavaScript serialization artifact |

The safe-integer bound applies to **any** integral double, however large: `1e21`
and `1.5e300` are integral and therefore rejected, while `1.5e-300` and
`123456789.125` are accepted.

Rejecting rather than sentinel-encoding is deliberate. A sentinel would widen
the semantic domain, which is a `canonicalizationVersion` event; a schema that
genuinely needs these values must encode them explicitly as strings. Because no
value in the corpus is affected and every stored hash is unchanged, introducing
this rule was a tightening of previously-undefined behavior and remains
canonicalization **v1**.

## 3. Encoding

The hash preimage is the canonical value encoded as JSON with:

- no insignificant whitespace (equivalent to `JSON.stringify(value)`);
- UTF-8 output;
- strings escaped minimally: `"` and `\` escaped, control characters below
  `U+0020` as `\uXXXX`; all other characters, including non-ASCII, emitted raw;
- numbers in JavaScript's shortest round-trip form. Integral values carry no
  decimal point (`3`, not `3.0`).

Implementations that emit different but *semantically equal* JSON are still
conforming when verified through `conformance/verify.mjs`, because the verifier
re-parses and re-canonicalizes the payload. Direct hash computation inside an
implementation must follow this section exactly.

## 4. Hash

```
sha256(utf8(encoding))
```

lowercase hexadecimal.

## 5. Versioning

`canonicalizationVersion` is currently `1`. It versions the encoding
independently of kernel behavior. Any change to sections 2–4 invalidates every
stored hash and therefore requires a MAJOR release with full re-certification
(see `docs/versioning.md`).
