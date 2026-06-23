# brightspace-lms

A community maintained TypeScript client for the [D2L Brightspace Valence REST API](https://docs.valence.desire2learn.com), encapsulating authentication, version checking and negotiation, and resource modifications.

```ts
const me = await client.users.whoami();
const courses = await client.enrollments.listMyCourses();
const grades = await client.grades.listObjects(courseId);
```

---

## Why this exists

This library exists to improve the usability of the D2L Valence API, by encapsulating the docs and the internal wiring in one place, so developers can call simple, typed methods in their apps while the client handles the underlying API mechanics.

It was originally built to power [Vita Learning](https://vitalearning.ca), an AI-native study platform for university students. The library is used in production and maintained accordingly.

---

## Installation

```bash
npm install brightspace-lms
# or
pnpm add brightspace-lms
```

**Requirements:** Node.js 18+ (uses native `fetch` and `crypto.randomUUID`)

---

## Quick start

```ts
import { BrightspaceClient, BearerTokenClient } from "brightspace-lms";

const client = new BrightspaceClient({
  host: "https://your-org.brightspace.com",
  auth: new BearerTokenClient({ token: process.env.BRIGHTSPACE_TOKEN! }),
});

const me = await client.users.whoami();
console.log(`Hello, ${me.FirstName}`);
```

---

## Authentication

### Bearer token

Use when you already have a valid access token — the simplest option for server-side scripts.

```ts
auth: new BearerTokenClient({ token: process.env.BRIGHTSPACE_TOKEN! })
```

### OAuth2 — Authorization Code Grant

For user-delegated access. Use `OAuth2AuthorizationCodeClient` — construct one instance per request. Do not share a single instance across users; credentials are stored on the instance and are user-specific.

**Returning session** — you have a `refreshToken` stored from a previous session:

```ts
import { OAuth2AuthorizationCodeClient, BrightspaceClient } from "brightspace-lms";

const auth = new OAuth2AuthorizationCodeClient({
  clientId: process.env.D2L_CLIENT_ID!,
  clientSecret: process.env.D2L_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/oauth/callback",
  scope: "core:*:*",
});

auth.setCredentials({ refreshToken: session.refreshToken });

const client = new BrightspaceClient({ host: process.env.D2L_HOST!, auth });
const me = await client.users.whoami();
```

**Fresh auth** — the user hasn't authorized yet:

```ts
import { OAuth2AuthorizationCodeClient, BrightspaceClient } from "brightspace-lms";

const authConfig = {
  clientId: process.env.D2L_CLIENT_ID!,
  clientSecret: process.env.D2L_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/oauth/callback",
  scope: "core:*:*",
};

// Login route — generate the redirect URL
const auth = new OAuth2AuthorizationCodeClient(authConfig);
const state = crypto.randomUUID();
session.oauthState = state;
res.redirect(auth.generateAuthUrl(state));

// Callback route — exchange the code
const auth = new OAuth2AuthorizationCodeClient(authConfig);
if (req.query.state !== session.oauthState) throw new Error("CSRF mismatch");
const { tokens } = await auth.getToken(req.query.code);
session.refreshToken = tokens.refreshToken; // persist for future requests

const client = new BrightspaceClient({ host: process.env.D2L_HOST!, auth });
const me = await client.users.whoami();
```

The shared thing across requests is the static config object — not the `OAuth2AuthorizationCodeClient` instance. Each request constructs a fresh instance and hydrates it with the user's stored `refreshToken`.

### OAuth2 — Client Credentials Grant

For server-to-server integrations. Use `OAuth2ClientCredentialsClient` — safe to construct once at module level and share across requests, since all credentials are static configuration.

D2L's client credentials flow uses JWT client assertions signed with a private key (not a client secret). Your JWKS URL must be publicly reachable over HTTPS.

```ts
import { OAuth2ClientCredentialsClient, BrightspaceClient } from "brightspace-lms";

// Module level — safe to share across requests
const auth = new OAuth2ClientCredentialsClient({
  clientId: process.env.D2L_CLIENT_ID!,
  privateKey: process.env.D2L_PRIVATE_KEY_PEM!,
  keyId: process.env.D2L_KEY_ID!,
  algorithm: "RS256",   // RS256 | RS384 | RS512 | ES256 | ES384 | ES512
  scope: "core:*:*",
});

const client = new BrightspaceClient({ host: process.env.D2L_HOST!, auth });
```

See [D2L's OAuth2 documentation](https://docs.valence.desire2learn.com/basic/oauth2.html) for application registration steps and JWKS requirements.

### Legacy ID-Key

Supported for compatibility. D2L deprecated this auth system in January 2023 — migrate to OAuth2 where possible.

```ts
auth: {
  type: "legacy",
  appId: "<app-id>",
  appKey: "<app-key>",
  userId: "<user-id>",
  userKey: "<user-key>",
}
```

---

## Version negotiation

Brightspace versions each API component independently (`lp`, `le`, etc.) via URL segments. On the first resource call, the client posts to `POST /d2l/api/versions/check` to confirm the host supports the required versions. Concurrent first calls are deduplicated into a single negotiation request.

```ts
// Trigger negotiation explicitly
const result = await client.versions.check();
console.log(result.Supported); // false if the host is too old

// Pin specific versions if needed
const client = new BrightspaceClient({
  host: "https://your-org.brightspace.com",
  auth: { ... },
  apiVersions: {
    lp: "1.49",
    le: "1.82",
  },
});
```

If the host cannot satisfy required versions, a `VersionError` is thrown on the first call and all subsequent calls short-circuit immediately without retrying.

The library targets the oldest fully supported contract versions per D2L's deprecation table. Deprecated and obsolete contracts are not used. See [COMPATIBILITY.md](./COMPATIBILITY.md) for the version matrix.

---

## Resources

| Namespace | D2L product | Coverage |
|---|---|---|
| `client.users` | `lp` | whoami, retrieve, list, create, update, del, activation, names, pronouns, password |
| `client.enrollments` | `lp` | listMyCourses, listOrgUnitUsers, listUserEnrollments, retrieveClasslist, create, del, completion |
| `client.orgUnits` | `lp` | retrieve, list, create, update, del, ancestors, descendants, parents, children, types, recycle bin |
| `client.courses` | `lp` | retrieve, list, create, update, del, templates, bulk updater |
| `client.grades` | `le` | objects, values, categories, schemes |
| `client.quizzes` | `le` | retrieve, list, create, update, del, attempts, categories |
| `client.dropboxes` | `le` | folders, submissions, feedback, categories |
| `client.assessments` | `le` | rubrics, assessments (LE API v1.93+) |
| `client.calendar` | `le` | events, occurrences, presenters |
| `client.discussions` | `le` | forums, topics, posts, statistics |
| `client.content` | `le` | modules, topics, table of contents, user progress |
| `client.groups` | `lp` | group categories, groups, enrollments, sections |
| `client.surveys` | `le` | surveys, attempts, categories, special access |
| `client.news` | `le` / `lp` | news items, user feed, sharing rules |
| `client.checklists` | `le` | checklists, categories, items |
| `client.outcomes` | `le` | org-level sets, org-unit sets, alignments, import/export |
| `client.awards` | `bas` | library, associations, issued awards |
| `client.releaseConditions` | `le` | conditions for content, discussions, quizzes, dropboxes |
| `client.demographics` | `lp` | fields, data types, user entries |
| `client.accommodations` | `le` | quizzing accommodations per user and org unit |
| `client.versions` | — | version check and negotiation |

```ts
// Users
const me = await client.users.whoami();
const user = await client.users.retrieve(12345);
const page = await client.users.list({ isActive: true });

// Enrollments
const courses = await client.enrollments.listMyCourses({ orgUnitTypeId: 3 });
const classlist = await client.enrollments.retrieveClasslist(orgUnitId);
await client.enrollments.create({ OrgUnitId: 9999, UserId: 12345, RoleId: 111 });

// Courses
const course = await client.courses.retrieve(9999);
await client.courses.update(9999, { Name: "Updated Name", ... });

// Grades
const objects = await client.grades.listObjects(9999);
await client.grades.updateValue(9999, gradeObjectId, userId, {
  Comments: { Content: "Well done", Type: "Text" },
  PointsNumerator: 92,
});
```

---

## Pagination

All list endpoints return a `PaginatedList<T>` backed by D2L's bookmark cursor. The cursor is handled internally — consumers never see `Bookmark` or `HasMoreItems`.

```ts
const page = await client.users.list({ isActive: true });

// Iterate all pages
for await (const user of page) {
  process(user);
}

// Collect everything
const all = await page.toArray();

// Manual page control
if (page.hasMore) {
  const next = await page.nextPage();
}
```

---

## Middleware

Register middleware to observe or transform requests, responses, and errors. Useful for logging, metrics, and custom headers.

```ts
client.use({
  onRequest(request) {
    request.headers.set("X-Correlation-Id", generateId());
    return request;
  },
  onResponse(ctx) {
    logger.info(ctx.request.method, ctx.request.path, ctx.response.status);
    return ctx;
  },
  onError(error) {
    metrics.increment("brightspace.error");
    throw error;
  },
});
```

Multiple middleware can be registered and are applied in registration order.

---

## Custom endpoints

For endpoints not yet covered by a named resource, use `extend()` for a typed helper or `raw` for direct HTTP access. Both retain auth and middleware handling.

```ts
// Typed helper
const custom = client.extend<{ Value: number }>("/d2l/api/le/1.82/123/custom");
const result = await custom.get();

// Direct HTTP
const result = await client.raw.get<{ Items: unknown[] }>(
  "/d2l/api/lp/1.49/some/endpoint"
);
```

---

## Error handling

All errors thrown by this library extend `BrightspaceError`. D2L's [Errors.ProblemDetails](https://docs.valence.desire2learn.com/res/apiprop.html#Errors.ProblemDetails) response bodies are parsed and surfaced in the error message automatically.

| Class | Trigger |
|---|---|
| `AuthError` | 401 / 403 — missing, expired, or insufficient-scope token |
| `ValidationError` | 400 — malformed request body or missing required fields |
| `NotFoundError` | 404 — resource not found, or obsolete API contract |
| `RateLimitError` | 429 — credit bucket exhausted; carries `retryAfter`, `creditsRemaining`, `requestCost` |
| `ServerError` | 5xx — D2L server-side error |
| `VersionError` | Host does not support the required API component version |
| `NetworkError` | Timeout, connection refused, or DNS failure |

```ts
import {
  isRateLimitError,
  isVersionError,
  BrightspaceError,
} from "brightspace-lms";

try {
  await client.users.whoami();
} catch (error) {
  if (isRateLimitError(error)) {
    console.warn(`Rate limited. Retry in ${error.retryAfter}s.`);
    return;
  }
  if (isVersionError(error)) {
    console.error(`Host too old: ${error.product} needs ${error.required}, has ${error.available}`);
    return;
  }
  if (error instanceof BrightspaceError) {
    console.error(error.status, error.message, error.rawBody);
    return;
  }
  throw error;
}
```

The client automatically retries 5xx and 429 responses with exponential backoff (default: 3 retries). Configure via `retries` and `timeout` in the client config.

---

## Compatibility

| `brightspace-lms` | D2L `lp` | D2L `le` | Oldest supported LMS |
|---|---|---|---|
| `1.x` | `≥ 1.49` | `≥ 1.82` | 20.25.x |

See [COMPATIBILITY.md](./COMPATIBILITY.md) for the full version matrix and deprecation tracking.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## API Coverage

Coverage of the D2L Brightspace Valence API. Resources marked out of scope are accessible via `client.raw` or `client.extend()`.

### Implemented

| Resource | Namespace | D2L docs |
|---|---|---|
| Users | `client.users` | [res/user.html](https://docs.valence.desire2learn.com/res/user.html) |
| Enrollments | `client.enrollments` | [res/enroll.html](https://docs.valence.desire2learn.com/res/enroll.html) |
| Org units & structure | `client.orgUnits` | [res/orgunit.html](https://docs.valence.desire2learn.com/res/orgunit.html) |
| Course offerings & templates | `client.courses` | [res/course.html](https://docs.valence.desire2learn.com/res/course.html) |
| Grades & schemes | `client.grades` | [res/grade.html](https://docs.valence.desire2learn.com/res/grade.html) |
| Quizzes & attempts | `client.quizzes` | [res/quiz.html](https://docs.valence.desire2learn.com/res/quiz.html) |
| Dropboxes & submissions | `client.dropboxes` | [res/dropbox.html](https://docs.valence.desire2learn.com/res/dropbox.html) |
| Assessments & rubrics | `client.assessments` | [res/assessment.html](https://docs.valence.desire2learn.com/res/assessment.html) |
| Calendar & events | `client.calendar` | [res/calendar.html](https://docs.valence.desire2learn.com/res/calendar.html) |
| Discussions & forums | `client.discussions` | [res/discuss.html](https://docs.valence.desire2learn.com/res/discuss.html) |
| Course content | `client.content` | [res/content.html](https://docs.valence.desire2learn.com/res/content.html) |
| Groups & sections | `client.groups` | [res/groups.html](https://docs.valence.desire2learn.com/res/groups.html) |
| Surveys | `client.surveys` | [res/survey.html](https://docs.valence.desire2learn.com/res/survey.html) |
| News & announcements | `client.news` | [res/news.html](https://docs.valence.desire2learn.com/res/news.html) |
| Checklists | `client.checklists` | [res/checklist.html](https://docs.valence.desire2learn.com/res/checklist.html) |
| Learning Outcomes | `client.outcomes` | [res/outcomes.html](https://docs.valence.desire2learn.com/res/outcomes.html) |
| Awards & badges | `client.awards` | [res/awards.html](https://docs.valence.desire2learn.com/res/awards.html) |
| Release conditions | `client.releaseConditions` | [res/releaseconditions.html](https://docs.valence.desire2learn.com/res/releaseconditions.html) |
| Demographics | `client.demographics` | [res/demographics.html](https://docs.valence.desire2learn.com/res/demographics.html) |
| Accommodations | `client.accommodations` | [res/accommodations.html](https://docs.valence.desire2learn.com/res/accommodations.html) |
| Version negotiation | `client.versions` | [basic/version.html](https://docs.valence.desire2learn.com/basic/version.html) |


---


---

### Out of scope

These resource groups are either highly institution-specific, require elevated admin access, or cover niche use cases unlikely to benefit from a typed SDK wrapper. They remain accessible via `client.raw` or `client.extend()`.

| Resource | D2L docs | Reason |
|---|---|---|
| ePortfolio | [res/epobject.html](https://docs.valence.desire2learn.com/res/epobject.html) | Large surface, niche use, separate `ep` product component |
| LTI Advantage assets | [res/ltiadvantage.html](https://docs.valence.desire2learn.com/res/ltiadvantage.html) | LTI tooling is a separate integration concern |
| LTI legacy assets | [res/lti.html](https://docs.valence.desire2learn.com/res/lti.html) | Deprecated protocol |
| Data Hub / Data Export | [res/dataExport.html](https://docs.valence.desire2learn.com/res/dataExport.html) | Bulk export, not a request/response API |
| IPSIS SIS integration | [res/ipsis.html](https://docs.valence.desire2learn.com/res/ipsis.html) | SIS-specific, institution-level admin only |
| Tools management | [res/tools.html](https://docs.valence.desire2learn.com/res/tools.html) | Platform admin surface, not course-level |
| Configuration variables | [res/config.html](https://docs.valence.desire2learn.com/res/config.html) | Platform admin surface |
| Permissions | [res/permissions.html](https://docs.valence.desire2learn.com/res/permissions.html) | Role permission management, admin-only |
| Learning repository | [res/lor.html](https://docs.valence.desire2learn.com/res/lor.html) | Separate `lr` product, limited adoption |
| Locales & time zones | [res/locale.html](https://docs.valence.desire2learn.com/res/locale.html) | Static reference data, not a resource API |

---

## License

MIT — © [Richard Antao](https://richardantao.com)