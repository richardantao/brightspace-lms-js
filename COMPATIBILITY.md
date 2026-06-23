# Compatibility

This document tracks the D2L Brightspace API component versions that `brightspace-lms` targets, and the LMS platform versions they have been tested against.

---

## Version matrix

| `brightspace-lms` | D2L `lp` | D2L `le` | D2L `ep` | D2L `bas` | Oldest supported LMS |
|---|---|---|---|---|---|
| `1.x` | `≥ 1.49` | `≥ 1.82` | `≥ 2.5` | `≥ 1.4` | 20.25.x |

The library targets the **oldest fully supported** contract version per D2L's deprecation table — not the latest. This maximises host compatibility across institutions while avoiding deprecated contracts that D2L no longer prioritises for fixes.

---

## D2L deprecation table

Reproduced from [D2L's API about page](https://docs.valence.desire2learn.com/about.html) as of **June 2026 (Brightspace 20.26.6)**:

| Product | Oldest fully supported | Deprecated | Obsolete |
|---|---|---|---|
| `lp` | 1.49 | 1.46–1.48 | 1.45 and older |
| `le` | 1.82 | 1.75–1.81 | 1.74 and older |
| `ep` | 2.5 | — | 2.4 and older |
| `bas` | 1.4 | 1.3 | 1.2 and older |
| `lr` | 1.3 | — | 1.2 and older |

**Forward notice:** As of Brightspace 20.27.1 (January 2027), contracts from Learning Suite v20.24 and earlier become obsolete — routes may be removed entirely and return 404.

---

## Updating this file

When D2L publishes new release notes:

1. Check [https://docs.valence.desire2learn.com/about.html](https://docs.valence.desire2learn.com/about.html) for the updated deprecation table.
2. Update `src/core/constants.ts` — `KNOWN_VERSIONS` and `MIN_TESTED_VERSIONS` — to reflect the new oldest fully supported versions.
3. Update the deprecation table above.
4. Update the version matrix with the new `brightspace-lms` release row.
5. Run the integration test suite against a real Brightspace host to confirm the updated versions work as expected before publishing.

---

## Notes on `lti` and `ext`

`lti` and `ext` are present in the `D2LProduct` type for route path construction but are **not included in version check specs** (`POST /d2l/api/versions/check`):

- **`lti`** — LTI routes exist under `/d2l/api/lti/...` but LTI is handled via LTI Advantage asset routes, not as an independently versioned component in the versions check endpoint.
- **`ext`** — Extensibility routes are versioned per Learning Suite release, not independently negotiated.

If you need to call routes under these products, use `client.extend()` or `client.raw` and construct the path manually.
