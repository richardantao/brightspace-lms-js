import { describe, expect, it } from "vitest";

import { BearerTokenClient } from "../bearer";

describe("BearerTokenClient", () => {
	it("returns a bearer authorization header", async () => {
		const client = new BearerTokenClient({ type: "bearer", token: "abc123" });
		expect(
			await client.getHeaders({ method: "GET", url: "https://example.com" })
		).toEqual({
			Authorization: "Bearer abc123",
		});
	});
});
