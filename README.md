# brightspace-client

A typed TypeScript client for the [D2L Brightspace Valence REST API](https://docs.valence.desire2learn.com), built with the same design philosophy as the Stripe SDK — HTTP is an implementation detail, not your problem.

```ts
const me = await client.users.whoami();
const courses = await client.enrollments.listMyCourses();
const grades = await client.grades.listObjects(courseId);
```

---

## Why this exists

D2L's Valence API is capable but developer-unfriendly by modern standards: no typed SDK, manual pagination, version negotiation on every deployment, and auth complexity that varies by institution. This library closes that gap.

It was built to power [Vita Learning](https://vitalearning.ca), an AI-native study platform for university students. The library is used in production and maintained accordingly.

---

## Installation

```bash
npm install brightspace-client
# or
pnpm add brightspace-client
```

**Requirements:** Node.js 18+ (uses native `fetch` and `crypto.randomUUID`)

---

## Quick start

```ts
import { BrightspaceClient } from "brightspace-client";

const client = new BrightspaceClient({
  host: "https://your-org.brightspace.com",
  auth: {
    type: "bearer",
    token: process.env.BRIGHTSPACE_TOKEN!,
  },
});

const me = await client.users.whoami();
console.log(`Hello, ${me.FirstName}`);
```

---

## Authentication

### Bearer token

Use when you already have a valid access token — the simplest option for server-side scripts.

```ts
auth: {
  type: "bearer",
  token: process.env.BRIGHTSPACE_TOKEN!,
}
```

### OAuth2 — Authorization Code Grant

For user-delegated flows. Provide an initial `code` after the user completes the authorization redirect, or a `refreshToken` for long-lived access. The client handles token exchange and refresh automatically.

```ts
auth: {
  type: "oauth2_authorization_code",
  clientId: process.env.BRIGHTSPACE_CLIENT_ID!,
  clientSecret: process.env.BRIGHTSPACE_CLIENT_SECRET!,
  redirectUri: "https://app.example.com/oauth/callback",
  code: "<authorization-code>",       // from redirect
  // or: refreshToken: "<token>",      // for renewal
  scope: "core:*:*",
}
```

To generate the initial redirect URL:

```ts
import { OAuth2AuthProvider } from "brightspace-client";

const provider = new OAuth2AuthProvider({
  type: "oauth2_authorization_code",
  clientId: "...",
  clientSecret: "...",
  redirectUri: "https://app.example.com/oauth/callback",
  scope: "core:*:*",
});

const redirectUrl = provider.getAuthorizationUrl(stateToken);
// Redirect the user's browser to redirectUrl
// After consent, exchange the returned code:
await provider.exchangeCode(req.query.code);
```

### OAuth2 — Client Credentials Grant

For server-to-server integrations. D2L's client credentials flow uses JWT client assertions (not client secrets) — provide a PEM private key corresponding to a public key in your registered JWKS URL.

```ts
auth: {
  type: "oauth2_client_credentials",
  clientId: process.env.BRIGHTSPACE_CLIENT_ID!,
  privateKey: process.env.BRIGHTSPACE_PRIVATE_KEY_PEM!,
  keyId: process.env.BRIGHTSPACE_JWKS_KID!,
  algorithm: "RS256",   // RS256 | RS384 | RS512 | ES256 | ES384 | ES512
  scope: "core:*:*",
}
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
| `client.courses` | `lp` | retrieve, list, create, update, del, templates, bulk updater |
| `client.grades` | `le` | objects (retrieve/list/create/update/del), values (retrieve/list/update/del), categories, schemes |
| `client.versions` | — | check, getSupportedVersions |

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
} from "brightspace-client";

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

| `brightspace-client` | D2L `lp` | D2L `le` | Oldest supported LMS |
|---|---|---|---|
| `1.x` | `≥ 1.49` | `≥ 1.82` | 20.25.x |

See [COMPATIBILITY.md](./COMPATIBILITY.md) for the full version matrix and deprecation tracking.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT — © [Richard Antao](https://richardantao.com)