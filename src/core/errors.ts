/**
 * Error classes for brightspace-lms.
 *
 * Grounded in D2L Valence API calling conventions:
 * @see https://docs.valence.desire2learn.com/basic/apicall.html#disposition-and-error-handling
 *
 * D2L uses standard HTTP status codes for disposition. Rate limiting uses a
 * token-bucket credit scheme and surfaces credits via response headers:
 *   X-Rate-Limit-Remaining  — credits left after this call
 *   X-Request-Cost          — credits this call consumed
 *   X-Rate-Limit-Reset      — seconds until bucket fully replenishes
 *   Retry-After             — same value as X-Rate-Limit-Reset (industry standard)
 */

/**
 * All errors thrown by brightspace-lms extend BrightspaceError.
 * Consumers can use `instanceof BrightspaceError` to distinguish library
 * errors from unrelated runtime errors.
 */
export class BrightspaceError extends Error {
	/** HTTP status code returned by the D2L API, if applicable. */
	readonly status: number | undefined;
	/** Raw response body from D2L, if available. Useful for debugging. */
	readonly rawBody: string | undefined;

	constructor(
		message: string,
		options?: { status?: number; rawBody?: string; cause?: unknown }
	) {
		super(message, { cause: options?.cause });
		this.name = "BrightspaceError";
		this.status = options?.status;
		this.rawBody = options?.rawBody;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Thrown on 401 Unauthorized or 403 Forbidden responses.
 *
 * 401 — No valid token present, or the token has expired.
 *       The OAuth2 provider will attempt a refresh before surfacing this.
 *
 * 403 — Token is valid but the user context lacks the required permission
 *       or scope for the requested action.
 */
export class AuthError extends BrightspaceError {
	constructor(
		message: string,
		options?: { status?: 401 | 403; rawBody?: string; cause?: unknown }
	) {
		super(message, options);
		this.name = "AuthError";
	}
}

/**
 * Thrown on 404 Not Found responses.
 *
 * D2L returns 404 when:
 *   - The requested resource does not exist
 *   - An obsoleted API contract version is called (the route no longer exists)
 *   - The caller lacks permission to even know the resource exists (D2L may
 *     return 404 instead of 403 in some cases to avoid information disclosure)
 */
export class NotFoundError extends BrightspaceError {
	/** The resource type that was not found, e.g. "user", "course", "grade". */
	readonly resource: string | undefined;
	/** The identifier used in the request. */
	readonly resourceId: string | number | undefined;

	constructor(
		message: string,
		options?: {
			resource?: string;
			resourceId?: string | number;
			rawBody?: string;
			cause?: unknown;
		}
	) {
		super(message, {
			status: 404,
			rawBody: options?.rawBody,
			cause: options?.cause,
		});
		this.name = "NotFoundError";
		this.resource = options?.resource;
		this.resourceId = options?.resourceId;
	}
}

/**
 * Thrown on 400 Bad Request responses.
 *
 * D2L returns 400 when the request body or parameters are malformed or
 * fail validation. D2L requires complete JSON structures on POST/PUT — missing
 * required fields are a common cause.
 *
 * @see https://docs.valence.desire2learn.com/basic/apicall.html#request-body
 */
export class ValidationError extends BrightspaceError {
	constructor(
		message: string,
		options?: { rawBody?: string; cause?: unknown }
	) {
		super(message, {
			status: 400,
			rawBody: options?.rawBody,
			cause: options?.cause,
		});
		this.name = "ValidationError";
	}
}

/**
 * Thrown on 429 Too Many Requests responses.
 *
 * D2L uses a token-bucket credit scheme. Each call costs credits; when the
 * bucket is exhausted the service returns 429. The response headers describe
 * the current credit state.
 *
 * The http-client will automatically retry with backoff using `retryAfter`
 * before surfacing this error, if `retries` > 0 in client config.
 *
 * @see https://docs.valence.desire2learn.com/basic/apicall.html#rate-limiting
 */
export class RateLimitError extends BrightspaceError {
	/** Seconds until the credit bucket is fully replenished. From Retry-After / X-Rate-Limit-Reset. */
	readonly retryAfter: number | undefined;
	/** Credits remaining after this call. From X-Rate-Limit-Remaining. */
	readonly creditsRemaining: number | undefined;
	/** Credits this call consumed. From X-Request-Cost. */
	readonly requestCost: number | undefined;

	constructor(
		message: string,
		options?: {
			retryAfter?: number;
			creditsRemaining?: number;
			requestCost?: number;
			rawBody?: string;
			cause?: unknown;
		}
	) {
		super(message, {
			status: 429,
			rawBody: options?.rawBody,
			cause: options?.cause,
		});
		this.name = "RateLimitError";
		this.retryAfter = options?.retryAfter;
		this.creditsRemaining = options?.creditsRemaining;
		this.requestCost = options?.requestCost;
	}
}

/**
 * Thrown on 500, 502, 503, 504 responses.
 *
 * Indicates a problem on the D2L server side. The http-client will
 * automatically retry these (with backoff) before surfacing this error,
 * if `retries` > 0 in client config.
 */
export class ServerError extends BrightspaceError {
	constructor(
		message: string,
		options?: { status?: number; rawBody?: string; cause?: unknown }
	) {
		super(message, options);
		this.name = "ServerError";
	}
}

/**
 * Thrown when the D2L host does not support the API component version
 * required by this library or by the consumer's pinned version config.
 *
 * Surfaces during version negotiation at client init, or lazily on first
 * call to a resource that requires a version the host cannot satisfy.
 *
 * @see https://docs.valence.desire2learn.com/basic/version.html
 */
export class VersionError extends BrightspaceError {
	/** D2L product component code, e.g. "lp", "le", "ep". */
	readonly product: string;
	/** The minimum version required by the library. */
	readonly required: string;
	/** The highest version the host reported it supports. */
	readonly available: string;

	constructor(
		message: string,
		options: {
			product: string;
			required: string;
			available: string;
			cause?: unknown;
		}
	) {
		super(message, { cause: options.cause });
		this.name = "VersionError";
		this.product = options.product;
		this.required = options.required;
		this.available = options.available;
	}
}

/**
 * Thrown when the HTTP request fails at the transport level — timeout,
 * connection refused, DNS failure, or any error that prevents a response
 * from being received at all.
 *
 * No `status` is set because no HTTP response was received.
 */
export class NetworkError extends BrightspaceError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, { cause: options?.cause });
		this.name = "NetworkError";
	}
}

export function isBrightspaceError(err: unknown): err is BrightspaceError {
	return err instanceof BrightspaceError;
}

export function isAuthError(err: unknown): err is AuthError {
	return err instanceof AuthError;
}

export function isNotFoundError(err: unknown): err is NotFoundError {
	return err instanceof NotFoundError;
}

export function isRateLimitError(err: unknown): err is RateLimitError {
	return err instanceof RateLimitError;
}

export function isVersionError(err: unknown): err is VersionError {
	return err instanceof VersionError;
}

/**
 * D2L Errors.ProblemDetails — returned when HTTP status code alone is
 * insufficient to describe the problem. RFC 7807 format.
 * @see https://docs.valence.desire2learn.com/res/apiprop.html#Errors.ProblemDetails
 */
interface D2LProblemDetails {
	type?: string;
	status?: number;
	title?: string;
	detail?: string;
	instance?: string;
}

/**
 * Attempts to parse a D2L Errors.ProblemDetails structure from a raw body
 * string. Returns null if the body is not a valid ProblemDetails JSON object.
 */
function parseProblemDetails(
	rawBody: string | undefined
): D2LProblemDetails | null {
	if (!rawBody) return null;
	try {
		const parsed = JSON.parse(rawBody) as Record<string, unknown>;
		// ProblemDetails always has at least a title or detail field
		if (typeof parsed.title === "string" || typeof parsed.detail === "string") {
			return parsed as D2LProblemDetails;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Builds a human-readable message from a ProblemDetails body, falling
 * back to a default message when details are absent.
 */
function problemMessage(fallback: string, rawBody: string | undefined): string {
	const details = parseProblemDetails(rawBody);
	if (!details) return fallback;
	const parts: string[] = [];
	if (details.title) parts.push(details.title);
	if (details.detail) parts.push(details.detail);
	return parts.length > 0 ? parts.join(": ") : fallback;
}

export function mapHttpError(
	status: number,
	rawBody: string | undefined,
	headers: Headers
): BrightspaceError {
	switch (status) {
		case 400:
			return new ValidationError(
				problemMessage(
					"The request body or parameters were rejected by D2L. Ensure all required fields are present and correctly typed.",
					rawBody
				),
				{ rawBody }
			);
		case 401:
			return new AuthError(
				problemMessage(
					"Authentication failed. The access token is missing, expired, or invalid.",
					rawBody
				),
				{ status, rawBody }
			);
		case 403:
			return new AuthError(
				problemMessage(
					"Access denied. The authenticated user does not have permission to perform this action.",
					rawBody
				),
				{ status, rawBody }
			);
		case 404:
			return new NotFoundError(
				problemMessage(
					"The requested resource was not found. The resource may not exist, or the API contract version may be obsolete.",
					rawBody
				),
				{ rawBody }
			);
		case 429: {
			const retryAfter = parseIntHeader(headers, "retry-after");
			const creditsRemaining = parseIntHeader(
				headers,
				"x-rate-limit-remaining"
			);
			const requestCost = parseIntHeader(headers, "x-request-cost");
			return new RateLimitError(
				problemMessage(
					`Rate limit exceeded. ${retryAfter != null ? `Retry after ${retryAfter}s.` : "Check Retry-After header."}`,
					rawBody
				),
				{ retryAfter, creditsRemaining, requestCost, rawBody }
			);
		}

		default:
			if (status >= 500) {
				return new ServerError(
					problemMessage(
						`D2L server error (${status}). The service encountered an unexpected condition.`,
						rawBody
					),
					{ status, rawBody }
				);
			}
			// Catch-all for unexpected 4xx codes not explicitly handled above
			return new BrightspaceError(
				problemMessage(
					`Unexpected response from D2L API (${status}).`,
					rawBody
				),
				{ status, rawBody }
			);
	}
}

function parseIntHeader(headers: Headers, name: string): number | undefined {
	const value = headers.get(name);
	if (value == null) return undefined;
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}
