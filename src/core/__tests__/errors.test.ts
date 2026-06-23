import { describe, expect, it } from "vitest";

import {
	AuthError,
	BrightspaceError,
	NetworkError,
	NotFoundError,
	RateLimitError,
	ServerError,
	ValidationError,
	VersionError,
	mapHttpError,
} from "../errors";

describe("mapHttpError", () => {
	it("maps status codes to the expected error classes", () => {
		expect(mapHttpError(400, undefined, new Headers())).toBeInstanceOf(
			ValidationError
		);
		expect(mapHttpError(401, undefined, new Headers())).toBeInstanceOf(
			AuthError
		);
		expect(mapHttpError(403, undefined, new Headers())).toBeInstanceOf(
			AuthError
		);
		expect(mapHttpError(404, undefined, new Headers())).toBeInstanceOf(
			NotFoundError
		);
		expect(mapHttpError(429, undefined, new Headers())).toBeInstanceOf(
			RateLimitError
		);
		expect(mapHttpError(500, undefined, new Headers())).toBeInstanceOf(
			ServerError
		);
		expect(mapHttpError(418, undefined, new Headers())).toBeInstanceOf(
			BrightspaceError
		);
	});

	it("parses ProblemDetails bodies into the message", () => {
		const error = mapHttpError(
			404,
			JSON.stringify({
				title: "User Not Found",
				detail: "No user with that ID exists.",
			}),
			new Headers()
		);

		expect(error).toMatchObject({
			message: "User Not Found: No user with that ID exists.",
			status: 404,
			rawBody: JSON.stringify({
				title: "User Not Found",
				detail: "No user with that ID exists.",
			}),
		});
	});

	it("extracts rate limit headers", () => {
		const error = mapHttpError(
			429,
			undefined,
			new Headers({
				"Retry-After": "30",
				"X-Rate-Limit-Remaining": "0",
				"X-Request-Cost": "5",
			})
		);

		expect(error).toBeInstanceOf(RateLimitError);
		expect(error).toMatchObject({
			retryAfter: 30,
			creditsRemaining: 0,
			requestCost: 5,
		});
	});

	it("falls back to the static message when body is not ProblemDetails", () => {
		const error = mapHttpError(400, "plain text", new Headers());
		expect(error.message).toContain(
			"The request body or parameters were rejected by D2L"
		);
	});
});

describe("error classes", () => {
	it("preserve their specific fields", () => {
		expect(
			new VersionError("bad version", {
				product: "lp",
				required: "1.49",
				available: "1.48",
			})
		).toMatchObject({ product: "lp", required: "1.49", available: "1.48" });
		expect(new NetworkError("network failed")).toBeInstanceOf(BrightspaceError);
	});
});
