# Contributing to brightspace-lms

Thanks for your interest in contributing. This library was built by a solo developer to fill a real gap in the Brightspace ecosystem — a gap D2L knows about but hasn't prioritized closing. The long-term goal is to build enough community adoption and code quality to make this the natural choice for any developer building on Brightspace, and eventually to offer co-maintenance or transfer to D2L's developer platform team.

That context shapes what "a good contribution" looks like here: production-quality, grounded in D2L's actual API docs, and built to last rather than built to ship fast.

---

## What to contribute

The highest-value contributions, in order:

**1. New resource coverage.** The library currently covers `users`, `enrollments`, `courses`, `grades`, and `versions`. D2L's API includes discussions, quizzes, dropboxes, content, org units, awards, ePortfolio, and more. Each of these needs the same treatment as the existing resources: wire types matched exactly to the Valence docs, full CRUD coverage, pagination where applicable, and JSDoc linking to the relevant D2L reference page.

**2. Institution compatibility reports.** D2L is deployed differently at every institution. If you've tested this library against a real Brightspace host, open a PR to add your institution to [INSTITUTIONS.md](./INSTITUTIONS.md) (institution name, LMS version, D2L API component versions confirmed working). This is genuinely useful signal for other developers and for D2L.

**3. Bug reports with reproduction cases.** Especially around version negotiation edge cases, auth token refresh behavior, or unexpected D2L response shapes. A failing test is ideal; a clear description with the response body is sufficient.

**4. Documentation improvements.** Corrections to JSDoc, improvements to code examples, or clarifications about D2L behavior that isn't obvious from the docs.

**What we're not looking for right now:** changes to core architecture (HTTP client, auth layer, version resolver, pagination), new auth methods, or breaking changes to the public API. These require broader discussion before implementation.

---

## Before you start

For anything beyond a small bug fix or typo correction, open an issue first. Describe what you want to add and why. This avoids duplicate effort and surfaces any design concerns early.

For new resource implementations, comment on the relevant tracking issue (or open one) before starting work. This prevents two people implementing the same resource simultaneously.

---

## Development setup

```bash
git clone https://github.com/richardantao/brightspace-lms
cd brightspace-lms
pnpm install
pnpm build
pnpm test
```

Node 18+ is required. The project uses `pnpm` for package management.

Available scripts:

| Script | What it does |
|---|---|
| `pnpm build` | Bundle JS via tsdown + emit declarations via tsc |
| `pnpm dev` | Watch mode bundling |
| `pnpm test` | Run Vitest test suite |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm typecheck` | TypeScript no-emit check |

---

## Adding a new resource

New resources follow a strict pattern. Read the existing implementations (`src/resources/users.ts`, `src/resources/grades.ts`) before writing anything.

**Step 1 — Read the D2L docs for that resource.** Every type, field, and method must be grounded in the Valence reference, not inferred from guesswork. The docs are at `https://docs.valence.desire2learn.com/res/{resource}.html`. Pay particular attention to:
  - Which fields are nullable vs required
  - Which fields are read-only (not on input actions)
  - Whether the endpoint returns a paged response (`Objects` / `HasMoreItems` / `Bookmark`) or a plain array
  - Which D2L product component the routes belong to (`lp` vs `le` vs `ep`)

**Step 2 — Define wire types.** Types must match the D2L response shapes exactly, including `PascalCase` field names (D2L's convention). Separate types for retrieve vs create/update where D2L has different shapes (common). Add JSDoc with `@see` links to the relevant D2L doc anchor.

**Step 3 — Implement the resource class** extending `BaseResource`. Follow the Stripe naming convention:
  - `retrieve(id)` — single resource by ID
  - `list(params)` — paginated collection
  - `create(data)` — POST
  - `update(id, data)` — PUT
  - `del(id)` — DELETE
  - `retrieveX` / `updateX` / `delX` for sub-resources
  - Descriptive verbs for non-CRUD actions

**Step 4 — Export from `src/index.ts`.** Both the resource class and all public wire types.

**Step 5 — Write tests.** See the testing section below. Unit tests are required. Contract tests using `msw` are strongly preferred for pagination and error handling paths.

**Step 6 — Mount on `BrightspaceClient`.** Add the resource as a `readonly` property in `src/client.ts`, injecting `http`, `versionsResolver`, and `ensureVersionsChecked`.

---

## Testing

The test suite has four layers. New contributions must cover at minimum the first two.

**Unit tests** mock `fetch` globally and assert on URL construction, request bodies, and error mapping. The key invariant to test for every resource method: does it hit the right path with the right HTTP method?

**Contract tests** use [msw](https://mswjs.io/) to intercept at the network level with real HTTP stack execution. Required for pagination (bookmark threading), error response parsing (ProblemDetails bodies), and retry behavior.

**Error scenario tests** are part of the contract layer — cover 400, 401, 403, 404, 429, and 5xx for each resource. D2L's error responses aren't always predictable; test that your code handles them gracefully.

**Integration tests** (optional, not run in CI) test against a real D2L host. See `test/integration/README.md` for setup. If you have access to a sandbox, running integration tests against your changes before submitting is appreciated.

Tests live alongside the source they test. New resource `src/resources/discussions.ts` gets `src/__tests__/resources/discussions.test.ts`.

---

## Code standards

**TypeScript strictness.** The project uses strict mode. No `any`, no non-null assertions (`!`) without a comment explaining why, no type casting that hides real errors.

**Wire types are D2L's types, not yours.** Don't rename, camelCase, or reshape D2L's field names in the wire types. `GradeObjectIdentifier` stays `GradeObjectIdentifier`. The consumer-facing abstraction is the method signature and the `PaginatedList` interface — the underlying types reflect the actual API.

**Every public method has a JSDoc comment** with the HTTP method and path it calls, and a `@see` link to the D2L Valence documentation for that action.

**Linting.** The project uses Biome. Run `pnpm lint` before submitting. CI will catch failures.

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat(grades): add listUserValues method`
- `fix(auth): null pending code after exchange`
- `docs(readme): add client credentials example`
- `test(enrollments): add pagination bookmark test`

---

## Submitting a pull request

1. Fork the repository and create a branch from `main`. Branch names should be descriptive: `feat/discussions-resource`, `fix/legacy-auth-timestamp`.

2. Make your changes. Keep commits focused — one logical change per commit.

3. Ensure `pnpm test`, `pnpm typecheck`, and `pnpm lint` all pass.

4. Update [CHANGELOG.md](./CHANGELOG.md) under the `[Unreleased]` section. Follow the existing format.

5. If you've tested against a real Brightspace instance, note the LMS version in your PR description.

6. Open a pull request against `main` with a clear description of what changed and why. Reference any related issues.

Pull requests are reviewed by the maintainer. Expect feedback focused on API correctness (grounding in D2L docs), type accuracy, test coverage, and consistency with existing patterns. Reviews are not personal — the bar is high because the goal is a library D2L's own team would be comfortable co-maintaining.

---

## Compatibility and versioning

This library follows [Semantic Versioning](https://semver.org/). Breaking changes to the public API (resource method signatures, exported types, error class structure) require a major version bump and must be discussed in an issue before implementation.

The library targets the oldest fully supported D2L API contract versions per D2L's published deprecation table. Do not add calls to deprecated or obsolete API contracts. When D2L releases new contract versions and marks old ones deprecated, update `src/core/constants.ts` and [COMPATIBILITY.md](./COMPATIBILITY.md) accordingly.

---

## Questions

Open a [GitHub Discussion](https://github.com/richardantao/brightspace-lms/discussions) for anything that isn't a bug or a feature request. For D2L API questions, the [D2L Community developer forum](https://community.d2l.com/brightspace/group/29-developers) is the right place.