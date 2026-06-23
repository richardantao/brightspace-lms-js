# Changelog

All notable changes to `brightspace-lms` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Breaking changes to the public API require a major version bump and must be
discussed in a GitHub issue before implementation.

---

## [Unreleased]

---

## [0.1.0] — 2026-06-22

Initial release.

### Added

**Auth**
- `OAuth2AuthorizationCodeClient` — OAuth2 authorization code grant with `generateAuthUrl()`, `getToken()`, `setCredentials()`, and `getCredentials()`. Handles token exchange, refresh, and in-flight deduplication.
- `OAuth2ClientCredentialsClient` — OAuth2 client credentials grant via JWT client assertion (RFC 7523). Supports RS256/384/512 and ES256/384/512. Handles token caching and refresh.
- `BearerTokenClient` — static bearer token auth.
- `LegacyIdKeyClient` — deprecated D2L ID-Key HMAC-SHA256 signing for legacy integrations.
- All four auth clients accept config without the `type` discriminant when constructed directly. The `type` field is only required when passing a plain config object to `BrightspaceClient`.

**HTTP core**
- `HttpClient` with exponential backoff retry for 5xx and 429 responses.
- Middleware hooks: `onRequest`, `onResponse`, `onError`.
- `mapHttpError` parses D2L `Errors.ProblemDetails` (RFC 7807) response bodies into error messages.
- Rate limit headers (`X-Rate-Limit-Remaining`, `X-Request-Cost`, `Retry-After`) extracted onto `RateLimitError`.

**Version negotiation**
- `VersionResolver` posts to `POST /d2l/api/versions/check` on first resource call.
- Concurrent first calls are deduplicated into a single negotiation request.
- Permanent `VersionError` (host too old) short-circuits all subsequent calls.
- Transient errors (network, auth) are retried on the next call.
- `unstablePath()` for experimental D2L API routes.
- Targets oldest fully supported contracts per D2L deprecation table as of June 2026 (`lp@1.49`, `le@1.82`, `ep@2.5`, `bas@1.4`).

**Pagination**
- `CursorPaginatedList<T>` implements `PaginatedList<T>` with `nextPage()`, `toArray()`, and async iteration.
- D2L's `Objects` / `HasMoreItems` / `Bookmark` wire format abstracted — consumers never see these fields.
- `fromD2LPage()` and `paginatedListFromD2L()` utilities for resource implementations.

**Error hierarchy**
- `BrightspaceError` (base)
- `AuthError` (401, 403)
- `ValidationError` (400)
- `NotFoundError` (404) — carries `.resource` and `.resourceId`
- `RateLimitError` (429) — carries `.retryAfter`, `.creditsRemaining`, `.requestCost`
- `ServerError` (5xx)
- `VersionError` — carries `.product`, `.required`, `.available`
- `NetworkError` — transport-level failures
- Type guards: `isBrightspaceError`, `isAuthError`, `isNotFoundError`, `isRateLimitError`, `isVersionError`

**Resources — `lp` product**
- `client.users` — whoami, retrieve, list, create, update, del, activation, names, pronouns, password reset
- `client.enrollments` — listMyCourses, listOrgUnitUsers, listUserEnrollments, retrieveClasslist, create, del, completion
- `client.orgUnits` — retrieve, list, create, update, del, ancestors, descendants, parents, children, childless, orphans, colour schemes, recycle bin, org unit types
- `client.courses` — retrieve, list, create, update, del, course templates, bulk date/status updater
- `client.groups` — group categories (async job), groups, group enrollments, sections, section settings
- `client.demographics` — fields, data types, user entries, org unit user entries
- `client.news` — list, retrieve, create, update, del, attachments, user news feed, activity feed, sharing rules

**Resources — `le` product**
- `client.grades` — grade objects, grade values, grade categories, grade schemes
- `client.quizzes` — quizzes, attempts, categories
- `client.dropboxes` — folders, submissions, feedback, folder categories
- `client.assessments` — rubrics, rubric assessments (LE API v1.93+ / LMS v20.26.4+)
- `client.calendar` — events, occurrences, event count, presenters
- `client.discussions` — forums, topics, posts, post approval, post flagging, topic statistics
- `client.content` — table of contents, root modules, modules, topics, user progress
- `client.surveys` — surveys, attempts, categories, special access
- `client.checklists` — checklists, categories, items
- `client.outcomes` — org-level outcome sets, org-unit outcome sets, alignments, import/export
- `client.releaseConditions` — conditions for content topics, discussion topics, quizzes, dropboxes
- `client.accommodations` — quizzing accommodations per user and org unit

**Resources — `bas` product**
- `client.awards` — library (org-level), associations (org-unit level), issued awards

**Client**
- `BrightspaceClient` accepts either a plain `AuthConfig` object or a pre-constructed auth client instance via `auth`.
- `client.raw` — direct HTTP access retaining auth and middleware.
- `client.extend<T>(path)` — typed helper for endpoints not yet covered by named resources.
- `client.use(middleware)` — chainable middleware registration.
- `client.versions.check()` — manual version negotiation trigger.

### D2L compatibility

| `brightspace-lms` | D2L `lp` | D2L `le` | D2L `ep` | D2L `bas` | Oldest supported LMS |
|---|---|---|---|---|---|
| `0.1.0` | `≥ 1.49` | `≥ 1.82` | `≥ 2.5` | `≥ 1.4` | 20.25.x |

---

[Unreleased]: https://github.com/richardantao/brightspace-lms/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/richardantao/brightspace-lms/releases/tag/v0.1.0