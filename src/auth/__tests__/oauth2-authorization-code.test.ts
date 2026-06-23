import { describe, expect, it, vi } from "vitest";

import { AuthError } from "../../core/errors";
import { OAuth2AuthorizationCodeClient } from "../oauth2-authorization-code";

function createClient(
	config?: Partial<
		ConstructorParameters<typeof OAuth2AuthorizationCodeClient>[0]
	>
) {
	return new OAuth2AuthorizationCodeClient({
		type: "oauth2_authorization_code",
		clientId: "client-id",
		clientSecret: "client-secret",
		redirectUri: "https://example.com/callback",
		...config,
	});
}

describe("OAuth2AuthorizationCodeClient", () => {
	it("generates an authorization URL with the expected query parameters", () => {
		const client = createClient({ scope: "core:*:*" });
		const url = new URL(client.generateAuthUrl("state-123"));

		expect(url.origin + url.pathname).toBe(
			"https://auth.brightspace.com/oauth2/auth"
		);
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"https://example.com/callback"
		);
		expect(url.searchParams.get("scope")).toBe("core:*:*");
		expect(url.searchParams.get("state")).toBe("state-123");
	});

	it("deduplicates concurrent initial token requests", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({ access_token: "token-1", expires_in: 60 }),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			)
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		await Promise.all([
			client.getToken("auth-code"),
			client.getHeaders({ method: "GET", url: "https://example.com" }),
		]);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("keeps a cached access token valid until 30 seconds before expiry", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({ access_token: "token-2", expires_in: 60 }),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			)
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		await client.getToken("auth-code");

		await client.getHeaders({ method: "GET", url: "https://example.com" });
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(20_000);
		await client.getHeaders({ method: "GET", url: "https://example.com" });
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(11_000);
		await expect(
			client.getHeaders({ method: "GET", url: "https://example.com" })
		).rejects.toBeInstanceOf(AuthError);
		vi.useRealTimers();
	});

	it("clears the authorization code after the first exchange", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const fetchMock = vi.fn().mockResolvedValueOnce(
			new Response(JSON.stringify({ access_token: "token-1", expires_in: 1 }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		await client.getToken("auth-code");
		await vi.advanceTimersByTimeAsync(2000);
		await expect(
			client.getHeaders({ method: "GET", url: "https://example.com" })
		).rejects.toBeInstanceOf(AuthError);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	it("uses a refresh token when the cached access token expires", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: "token-1", expires_in: 1 }),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				)
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: "token-2", expires_in: 60 }),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					}
				)
			);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		await client.getToken("auth-code");
		client.setCredentials({ refreshToken: "refresh-1" });
		await vi.advanceTimersByTimeAsync(2000);
		await client.getHeaders({ method: "GET", url: "https://example.com" });

		const secondCallBody = fetchMock.mock.calls[1]?.[1].body;
		expect(String(secondCallBody)).toContain("grant_type=refresh_token");
		expect(String(secondCallBody)).toContain("refresh_token=refresh-1");
		vi.useRealTimers();
	});

	it("throws when neither authorization code nor refresh token is present", async () => {
		const client = createClient();
		await expect(
			client.getHeaders({ method: "GET", url: "https://example.com" })
		).rejects.toBeInstanceOf(AuthError);
	});
});
