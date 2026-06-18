import { createSign, randomUUID } from "node:crypto";

import { AuthError } from "../core/errors";
import type {
	OAuth2AuthorizationCodeConfig,
	OAuth2ClientCredentialsConfig,
} from "../types";
import type { AuthHeaderContext, AuthProvider } from "./provider";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRIGHTSPACE_TOKEN_URL = "https://auth.brightspace.com/core/connect/token";
const BRIGHTSPACE_AUTH_URL = "https://auth.brightspace.com/oauth2/auth";

/**
 * D2L best practice: client assertions should be short-lived.
 * Recommended < 60s, maximum 5 minutes (300s).
 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#security-operational-best-practices
 */
const DEFAULT_ASSERTION_LIFETIME_SECONDS = 60;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface OAuthTokenResponse {
	access_token: string;
	expires_in?: number;
	token_type?: string;
	refresh_token?: string;
}

type OAuth2Config =
	| OAuth2AuthorizationCodeConfig
	| OAuth2ClientCredentialsConfig;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class OAuth2AuthProvider implements AuthProvider {
	private accessToken: string | null = null;
	private expiresAt = 0;
	private refreshToken: string | null = null;
	private pendingCode: string | null = null;
	private inflight: Promise<string> | null = null;

	constructor(
		private readonly config: OAuth2Config
	) {
		if (config.type === "oauth2_authorization_code") {
			this.refreshToken = config.refreshToken ?? null;
			// Store the code separately so we can null it after first use
			this.pendingCode = config.code ?? null;
		}
	}

	async getHeaders(
		_context: AuthHeaderContext
	): Promise<Record<string, string>> {
		const token = await this.getToken();
		return { Authorization: `Bearer ${token}` };
	}

	/**
	 * Generates the Brightspace authorization URL to redirect the user to for
	 * the authorization code grant flow.
	 *
	 * The consumer is responsible for redirecting the user's browser to this URL
	 * and capturing the `code` query parameter on return to their `redirectUri`.
	 *
	 * Only valid for `oauth2_authorization_code` configs.
	 *
	 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#making-access-token-requests
	 */
	getAuthorizationUrl(state?: string): string {
		if (this.config.type !== "oauth2_authorization_code") {
			throw new AuthError(
				"getAuthorizationUrl() is only available for oauth2_authorization_code configs"
			);
		}

		const authUrl = this.config.authUrl ?? BRIGHTSPACE_AUTH_URL;
		const params = new URLSearchParams({
			response_type: "code",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
		});

		if (this.config.scope) params.set("scope", this.config.scope);
		if (state) params.set("state", state);

		return `${authUrl}?${params.toString()}`;
	}

	/**
	 * Exchanges an authorization code for tokens. Call this after the user
	 * has been redirected back to your redirectUri with a `code` parameter.
	 * Updates internal token state — subsequent `getHeaders()` calls will use
	 * the new access token.
	 *
	 * Only valid for `oauth2_authorization_code` configs.
	 */
	async exchangeCode(code: string): Promise<void> {
		if (this.config.type !== "oauth2_authorization_code") {
			throw new AuthError(
				"exchangeCode() is only available for oauth2_authorization_code configs"
			);
		}
		this.pendingCode = code;
		this.accessToken = null;
		this.expiresAt = 0;
		await this.getToken();
	}

	// ---------------------------------------------------------------------------
	// Internal token lifecycle
	// ---------------------------------------------------------------------------

	private async getToken(): Promise<string> {
		const now = Date.now();
		if (this.accessToken && now < this.expiresAt - 30_000) {
			return this.accessToken;
		}

		// Deduplicate concurrent token fetches
		if (!this.inflight) {
			this.inflight = this.fetchToken().finally(() => {
				this.inflight = null;
			});
		}

		return this.inflight;
	}

	private async fetchToken(): Promise<string> {
		const tokenUrl = this.config.tokenUrl ?? BRIGHTSPACE_TOKEN_URL;
		const requestInit = this.buildTokenRequest(tokenUrl);

		const response = await fetch(tokenUrl, requestInit);
		const data = (await response
			.json()
			.catch(() => ({}))) as Partial<OAuthTokenResponse>;

		if (!response.ok || !data.access_token) {
			throw new AuthError("Failed to fetch OAuth2 access token", {
				status: 401,
				rawBody: safeStringify(data),
			});
		}

		this.accessToken = data.access_token;

		if (data.refresh_token) {
			this.refreshToken = data.refresh_token;
		}

		// Null out the authorization code — it is single-use.
		// After this point only refresh_token will be used for renewal.
		if (this.config.type === "oauth2_authorization_code" && this.pendingCode) {
			this.pendingCode = null;
		}

		const expiresIn = data.expires_in ?? 3600;
		this.expiresAt = Date.now() + expiresIn * 1000;

		return this.accessToken;
	}

	private buildTokenRequest(tokenUrl: string): RequestInit {
		if (this.config.type === "oauth2_client_credentials") {
			return this.buildClientCredentialsRequest(tokenUrl, this.config);
		}

		return this.buildAuthorizationCodeRequest(this.config);
	}

	// ---------------------------------------------------------------------------
	// Client credentials grant (JWT client assertion, RFC 7523)
	// ---------------------------------------------------------------------------

	private buildClientCredentialsRequest(
		tokenUrl: string,
		config: OAuth2ClientCredentialsConfig
	): RequestInit {
		const params = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: config.clientId,
			client_assertion_type:
				"urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
			client_assertion: this.createClientAssertion(tokenUrl, config),
		});

		if (config.scope) params.set("scope", config.scope);

		return {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params,
		};
	}

	/**
	 * Builds a JWT client assertion per RFC 7521 / RFC 7523.
	 *
	 * D2L requires:
	 *   Header: alg, kid (key identifier matching your JWKS), typ
	 *   Payload: iss, sub (both = clientId), aud (token URL), iat, exp, jti (unique)
	 *
	 * Supports RS256/384/512 (RSA) and ES256/384/512 (EC) per D2L's supported algorithms.
	 * D2L security best practices recommend exp < 60s; max 5 minutes.
	 *
	 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#making-access-token-requests
	 */
	private createClientAssertion(
		tokenUrl: string,
		config: OAuth2ClientCredentialsConfig
	): string {
		const alg = config.algorithm ?? "RS256";
		const now = Math.floor(Date.now() / 1000);

		const header = {
			alg,
			typ: "JWT",
			// kid is required — D2L uses it to look up the public key in your JWKS
			kid: config.keyId,
		};

		const payload = {
			iss: config.clientId,
			sub: config.clientId,
			// aud must be the token endpoint URL per RFC 7523
			aud: tokenUrl,
			// jti must be unique and single-use — D2L rejects reused values
			jti: randomUUID(),
			iat: now,
			exp:
				now + (config.assertionLifetime ?? DEFAULT_ASSERTION_LIFETIME_SECONDS),
		};

		const encodedHeader = base64url(JSON.stringify(header));
		const encodedPayload = base64url(JSON.stringify(payload));
		const signingInput = `${encodedHeader}.${encodedPayload}`;

		const { cryptoAlg, dsaEncoding } = resolveSigningParams(alg);
		const signer = createSign(cryptoAlg);
		signer.update(signingInput, "utf8");
		signer.end();

		// EC signatures from Node crypto are DER-encoded; JWT requires IEEE P1363 (raw r||s).
		// RS* signatures are already in the correct format.
		const rawSig = signer.sign({
			key: config.privateKey,
			dsaEncoding,
		});

		return `${signingInput}.${base64url(rawSig)}`;
	}

	// ---------------------------------------------------------------------------
	// Authorization code grant
	// ---------------------------------------------------------------------------

	private buildAuthorizationCodeRequest(
		config: OAuth2AuthorizationCodeConfig
	): RequestInit {
		const params = new URLSearchParams();

		// Authorization header uses Basic clientId:clientSecret per RFC 6749
		const basic = Buffer.from(
			`${config.clientId}:${config.clientSecret}`
		).toString("base64");

		if (this.refreshToken) {
			// Prefer refresh token if available — avoids re-authorization
			params.set("grant_type", "refresh_token");
			params.set("refresh_token", this.refreshToken);
		} else if (this.pendingCode) {
			// Initial code exchange
			params.set("grant_type", "authorization_code");
			params.set("code", this.pendingCode);
			params.set("redirect_uri", config.redirectUri);
		} else {
			throw new AuthError(
				"OAuth2 authorization code flow requires either an authorization code or a refresh token. " +
					"Call getAuthorizationUrl() to begin the authorization flow, or provide a refreshToken in config."
			);
		}

		if (config.scope) params.set("scope", config.scope);

		return {
			method: "POST",
			headers: {
				Authorization: `Basic ${basic}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		};
	}
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/**
 * Maps D2L-supported JWT algorithm identifiers to Node.js crypto parameters.
 *
 * RS* — RSA with SHA hash. Node crypto algorithm string is "RSA-SHA{n}".
 *       Signatures are PKCS#1 v1.5, already in correct format for JWT.
 *
 * ES* — EC with SHA hash. Node crypto algorithm string is "SHA{n}".
 *       Node produces DER-encoded signatures by default; JWT requires
 *       IEEE P1363 format (raw r||s concatenation), so we set dsaEncoding: 'ieee-p1363'.
 */
function resolveSigningParams(
	alg: NonNullable<OAuth2ClientCredentialsConfig["algorithm"]>
): {
	cryptoAlg: string;
	dsaEncoding: "der" | "ieee-p1363";
} {
	switch (alg) {
		case "RS256":
			return { cryptoAlg: "RSA-SHA256", dsaEncoding: "der" };
		case "RS384":
			return { cryptoAlg: "RSA-SHA384", dsaEncoding: "der" };
		case "RS512":
			return { cryptoAlg: "RSA-SHA512", dsaEncoding: "der" };
		case "ES256":
			return { cryptoAlg: "SHA256", dsaEncoding: "ieee-p1363" };
		case "ES384":
			return { cryptoAlg: "SHA384", dsaEncoding: "ieee-p1363" };
		case "ES512":
			return { cryptoAlg: "SHA512", dsaEncoding: "ieee-p1363" };
	}
}

function base64url(input: string | Buffer): string {
	const raw =
		typeof input === "string"
			? Buffer.from(input, "utf8").toString("base64")
			: input.toString("base64");
	return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}