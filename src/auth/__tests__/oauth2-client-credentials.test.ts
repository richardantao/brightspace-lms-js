import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { OAuth2ClientCredentialsClient } from "../oauth2-client-credentials";

function decodeBase64Url(value: string): Record<string, unknown> {
	const padded =
		value.replace(/-/g, "+").replace(/_/g, "/") +
		"==".slice(0, (4 - (value.length % 4)) % 4);
	return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
		string,
		unknown
	>;
}

describe("OAuth2ClientCredentialsClient", () => {
	it("builds a JWT client assertion with the expected header and payload", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const { privateKey } = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			privateKeyEncoding: { type: "pkcs8", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});
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

		const client = new OAuth2ClientCredentialsClient({
			type: "oauth2_client_credentials",
			clientId: "client-id",
			privateKey,
			keyId: "key-1",
			assertionLifetime: 45,
		});

		await client.getHeaders({ method: "GET", url: "https://example.com" });

		const body = fetchMock.mock.calls[0]?.[1].body;
		const params = new URLSearchParams(String(body));
		const assertion = params.get("client_assertion");
		if (!assertion) throw new Error("missing client_assertion");

		const [encodedHeader, encodedPayload] = assertion.split(".");
		if (!encodedHeader || !encodedPayload)
			throw new Error("invalid client_assertion");
		expect(decodeBase64Url(encodedHeader)).toMatchObject({
			alg: "RS256",
			typ: "JWT",
			kid: "key-1",
		});
		expect(decodeBase64Url(encodedPayload)).toMatchObject({
			iss: "client-id",
			sub: "client-id",
			aud: "https://auth.brightspace.com/core/connect/token",
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 45,
		});
		vi.useRealTimers();
	});

	it("creates a unique jti on each token request", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const { privateKey } = generateKeyPairSync("rsa", {
			modulusLength: 2048,
			privateKeyEncoding: { type: "pkcs8", format: "pem" },
			publicKeyEncoding: { type: "spki", format: "pem" },
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: "token-1", expires_in: 1 }),
					{ status: 200, headers: { "Content-Type": "application/json" } }
				)
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: "token-2", expires_in: 1 }),
					{ status: 200, headers: { "Content-Type": "application/json" } }
				)
			);
		vi.stubGlobal("fetch", fetchMock);

		const client = new OAuth2ClientCredentialsClient({
			type: "oauth2_client_credentials",
			clientId: "client-id",
			privateKey,
			keyId: "key-1",
		});

		await client.getHeaders({ method: "GET", url: "https://example.com" });
		await vi.advanceTimersByTimeAsync(2000);
		await client.getHeaders({ method: "GET", url: "https://example.com" });

		const firstAssertion = new URLSearchParams(
			String(fetchMock.mock.calls[0]?.[1].body)
		).get("client_assertion");
		const secondAssertion = new URLSearchParams(
			String(fetchMock.mock.calls[1]?.[1].body)
		).get("client_assertion");
		if (!firstAssertion || !secondAssertion)
			throw new Error("missing client_assertion");
		const firstPayload = firstAssertion.split(".")[1];
		const secondPayload = secondAssertion.split(".")[1];
		if (!firstPayload || !secondPayload)
			throw new Error("invalid client_assertion");
		expect(decodeBase64Url(firstPayload).jti).not.toEqual(
			decodeBase64Url(secondPayload).jti
		);
		vi.useRealTimers();
	});
});
