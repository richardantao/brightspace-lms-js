import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Middleware } from "../types";
import { createTestClient } from "./test-utils";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function respondJsonOnce(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {}
): void {
	mockFetch.mockResolvedValueOnce(
		new Response(JSON.stringify(body), {
			status,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
		})
	);
}

describe("BrightspaceClient", () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	it("exposes expected resource groups", () => {
		const client = createTestClient();

		expect(client.users).toBeTruthy();
		expect(client.enrollments).toBeTruthy();
		expect(client.courses).toBeTruthy();
		expect(client.grades).toBeTruthy();
		expect(client.versions).toBeTruthy();
		expect(client.quizzes).toBeTruthy();
		expect(client.dropboxes).toBeTruthy();
		expect(client.assessments).toBeTruthy();
		expect(client.calendar).toBeTruthy();
		expect(client.orgUnits).toBeTruthy();
		expect(client.discussions).toBeTruthy();
		expect(client.surveys).toBeTruthy();
		expect(client.groups).toBeTruthy();
		expect(client.checklists).toBeTruthy();
		expect(client.content).toBeTruthy();
		expect(client.news).toBeTruthy();
		expect(client.outcomes).toBeTruthy();
		expect(client.awards).toBeTruthy();
		expect(client.releaseConditions).toBeTruthy();
		expect(client.demographics).toBeTruthy();
		expect(client.accommodations).toBeTruthy();
		expect(client.raw).toBeTruthy();
	});

	it("supports extend helper", () => {
		const client = createTestClient();

		const custom = client.extend<{ ok: boolean }>(
			"/d2l/api/lp/1.28/users/whoami"
		);

		expect(typeof custom.get).toBe("function");
		expect(typeof custom.post).toBe("function");
		expect(typeof custom.put).toBe("function");
		expect(typeof custom.patch).toBe("function");
		expect(typeof custom.delete).toBe("function");
	});

	it("registers middleware for the next request", async () => {
		const client = createTestClient();
		const middleware: Middleware = {
			onRequest: vi.fn(request => request),
			onResponse: vi.fn(response => response),
		};

		client.use(middleware);
		respondJsonOnce({ ok: true });

		const result = await client
			.extend<{ ok: boolean }>("/d2l/api/lp/1.28/users/whoami")
			.get();

		expect(result).toEqual({ ok: true });
		expect(middleware.onRequest).toHaveBeenCalledTimes(1);
		expect(middleware.onResponse).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch.mock.calls[0]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.28/users/whoami"
		);
	});

	it("short-circuits subsequent calls after a VersionError", async () => {
		const client = createTestClient();

		respondJsonOnce({
			Supported: false,
			Versions: [
				{
					ProductCode: "lp",
					Version: "1.28",
					Supported: false,
					LatestVersion: "1.49",
				},
			],
		});

		await expect(client.users.whoami()).rejects.toMatchObject({
			name: "VersionError",
		});
		expect(mockFetch).toHaveBeenCalledTimes(1);

		await expect(client.users.whoami()).rejects.toMatchObject({
			name: "VersionError",
		});
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it("shares a single version check across concurrent first calls", async () => {
		const client = createTestClient();

		respondJsonOnce({
			Supported: true,
			Versions: [
				{ ProductCode: "lp", Version: "1.49", Supported: true },
				{ ProductCode: "le", Version: "1.82", Supported: true },
			],
		});
		respondJsonOnce({
			Identifier: "ada",
			FirstName: "Ada",
			LastName: "Lovelace",
			UniqueName: "ada",
			ProfileIdentifier: "profile",
			Pronouns: "she/her",
		});
		respondJsonOnce({
			Identifier: "ada",
			FirstName: "Ada",
			LastName: "Lovelace",
			UniqueName: "ada",
			ProfileIdentifier: "profile",
			Pronouns: "she/her",
		});

		await Promise.all([client.users.whoami(), client.users.whoami()]);

		const versionChecks = mockFetch.mock.calls.filter(
			([url]) =>
				typeof url === "string" && url.endsWith("/d2l/api/versions/check")
		);

		expect(versionChecks).toHaveLength(1);
		expect(mockFetch).toHaveBeenCalledTimes(3);
	});
});
