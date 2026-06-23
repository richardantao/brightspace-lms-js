# Institutions

Community-reported Brightspace instances that have been tested with `brightspace-lms`. If you've successfully used this library against a real Brightspace host, open a PR to add your entry.

---

## How to add your institution

Add a row to the table below. You do not need to disclose the institution's name if you prefer — "Anonymous (Canadian university)" or similar is fine.

| Institution | LMS version | `lp` | `le` | `bas` | `ep` | Notes |
|---|---|---|---|---|---|---|
| _Your institution here_ | | | | | | |

**Columns:**
- **Institution** — Name or description of the institution. Anonymous entries are welcome.
- **LMS version** — The Brightspace platform version (e.g. `20.25.4`). Found in the LMS admin panel or from `GET /d2l/api/lp/(version)/organization/info`.
- **`lp` / `le` / `bas` / `ep`** — The highest API component version confirmed working on this host (e.g. `1.49`, `1.82`). Leave blank if untested.
- **Notes** — Anything worth knowing: custom auth configuration, known limitations, tested resource groups, etc.

---

## Tested instances

_No entries yet. Be the first — open a PR._

---

## Why this matters

D2L is deployed differently at every institution. LMS version, enabled features, and API component versions vary significantly. Community entries here help developers know whether the library will work on their institution's host before they invest time in an integration, and give `brightspace-lms` maintainers signal about which LMS versions are actively in use when updating `KNOWN_VERSIONS` in `src/core/constants.ts`.