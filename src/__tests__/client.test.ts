import { describe, expect, it } from "vitest";

import { BrightspaceClient } from "..";

describe("BrightspaceClient", () => {
	it("exposes expected resource groups", () => {
		const client = new BrightspaceClient({
			host: "https://example.brightspace.com",
			auth: { type: "bearer", token: "test-token" },
		});

		expect(client.users).toBeTruthy();
		expect(client.enrollments).toBeTruthy();
		expect(client.courses).toBeTruthy();
		expect(client.grades).toBeTruthy();
		expect(client.versions).toBeTruthy();
	});

	it("supports extend helper", () => {
		const client = new BrightspaceClient({
			host: "https://example.brightspace.com",
			auth: { type: "bearer", token: "test-token" },
		});

		const custom = client.extend<{ ok: boolean }>(
			"/d2l/api/lp/1.28/users/whoami"
		);
		expect(typeof custom.get).toBe("function");
		expect(typeof custom.post).toBe("function");
	});
});
