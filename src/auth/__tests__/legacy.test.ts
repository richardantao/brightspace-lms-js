import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { LegacyIdKeyClient } from "../legacy";

function hmacBase64Url(key: string, data: string): string {
	return createHmac("sha256", key)
		.update(data)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

describe("LegacyIdKeyClient", () => {
	it("uses Unix seconds, lowercased paths, uppercase methods, and base64url signatures", async () => {
		vi.spyOn(Date, "now").mockReturnValue(1_700_000_001_234);
		const client = new LegacyIdKeyClient({
			type: "legacy",
			appId: "app",
			appKey: "app-secret",
			userId: "user",
			userKey: "user-secret",
		});

		const headers = await client.getHeaders({
			method: "POST",
			url: "https://Example.com/D2L/API/LP/1.49/Users/WhoAmI",
		});

		expect(headers["X-D2L-Timestamp"]).toBe("1700000001");
		const baseString = "POST&/d2l/api/lp/1.49/users/whoami&user&1700000001";
		expect(headers["X-D2L-App-Signature"]).toBe(
			hmacBase64Url("app-secret", baseString)
		);
		expect(headers["X-D2L-User-Signature"]).toBe(
			hmacBase64Url("user-secret", baseString)
		);
		expect(headers["X-D2L-App-Signature"]).not.toMatch(/[+=/]/);
	});
});
