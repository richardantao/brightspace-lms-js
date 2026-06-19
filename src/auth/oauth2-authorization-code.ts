/**
 * OAuth2 Authorization Code Grant auth provider.
 *
 * For user-delegated access. Construct one instance per request — do NOT share
 * across users or requests, as credentials are stored on the instance.
 *
 * The static config (clientId, clientSecret, redirectUri, scope) is shared;
 * the instance is per-request and per-user.
 *
 * @see https://docs.valence.desire2learn.com/basic/oauth2.html
 *
 * @example Returning session
 * ```ts
 * const auth = new OAuth2AuthorizationCodeClient(config);
 * auth.setCredentials({ refreshToken: session.refreshToken });
 * const client = new BrightspaceClient({ host, auth });
 * ```
 *
 * @example Fresh authorization
 * ```ts
 * // Login route
 * const auth = new OAuth2AuthorizationCodeClient(config);
 * session.oauthState = crypto.randomUUID();
 * res.redirect(auth.generateAuthUrl(session.oauthState));
 *
 * // Callback route
 * const auth = new OAuth2AuthorizationCodeClient(config);
 * if (req.query.state !== session.oauthState) throw new Error("CSRF mismatch");
 * const { tokens } = await auth.getToken(req.query.code);
 * session.refreshToken = tokens.refreshToken;
 * const client = new BrightspaceClient({ host, auth });
 * ```
 */

import { AuthError } from "../core/errors";
import type { OAuth2AuthorizationCodeConfig } from "../types";
import type { AuthHeaderContext, AuthProvider } from "./provider";

const BRIGHTSPACE_TOKEN_URL = "https://auth.brightspace.com/core/connect/token";
const BRIGHTSPACE_AUTH_URL = "https://auth.brightspace.com/oauth2/auth";

interface OAuthTokenResponse {
	access_token: string;
	expires_in?: number;
	token_type?: string;
	refresh_token?: string;
}

/**
 * The resolved credential set returned by getToken() and accepted by
 * setCredentials(). Store `refreshToken` in your session between requests.
 * Never persist `accessToken` long-term — it is short-lived.
 */
export interface OAuth2Credentials {
	accessToken: string;
	/** Unix timestamp in milliseconds when the access token expires. */
	expiresAt: number;
	/** Present on first authorization. Store this in session. */
	refreshToken?: string;
}

export class OAuth2AuthorizationCodeClient implements AuthProvider {
	private accessToken: string | null = null;
	private expiresAt = 0;
	private refreshToken: string | null = null;
	private pendingCode: string | null = null;
	private inflight: Promise<string> | null = null;

	constructor(private readonly config: OAuth2AuthorizationCodeConfig) {}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	/**
	 * Generates the Brightspace authorization URL to redirect the user to.
	 *
	 * After the user consents, D2L redirects to your `redirectUri` with a
	 * `code` query parameter. Pass that code to `getToken(code)`.
	 *
	 * The `state` parameter is standard OAuth2 CSRF protection. Generate a
	 * cryptographically random value, store it in the user's session, and
	 * verify it matches `req.query.state` in your callback before calling
	 * `getToken()`.
	 */
	generateAuthUrl(state?: string): string {
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
	 * Exchanges an authorization code for tokens. Call this in your OAuth2
	 * callback handler after verifying the `state` parameter.
	 *
	 * Store `tokens.refreshToken` in your session or database and use it to
	 * hydrate future instances via `setCredentials()`.
	 *
	 * Note: D2L only returns a `refreshToken` on the first authorization.
	 */
	async getToken(code: string): Promise<{ tokens: OAuth2Credentials }> {
		this.pendingCode = code;
		this.accessToken = null;
		this.expiresAt = 0;
		this.refreshToken = null;

		await this.resolveToken();

		return {
			tokens: {
				// biome-ignore lint/style/noNonNullAssertion: Access token is guaranteed to be set if resolveToken() succeeds
				accessToken: this.accessToken!,
				expiresAt: this.expiresAt,
				...(this.refreshToken ? { refreshToken: this.refreshToken } : {}),
			},
		};
	}

	/**
	 * Hydrates this instance with stored credentials.
	 * Provide at minimum a `refreshToken` — a new access token will be
	 * fetched automatically on first use.
	 */
	setCredentials(credentials: Partial<OAuth2Credentials>): void {
		if (credentials.accessToken) this.accessToken = credentials.accessToken;
		if (credentials.expiresAt) this.expiresAt = credentials.expiresAt;
		if (credentials.refreshToken) this.refreshToken = credentials.refreshToken;
	}

	/**
	 * Returns the current credentials stored on this instance.
	 * Useful for persisting an updated refreshToken after a renewal.
	 */
	getCredentials(): Partial<OAuth2Credentials> {
		return {
			...(this.accessToken ? { accessToken: this.accessToken } : {}),
			...(this.expiresAt ? { expiresAt: this.expiresAt } : {}),
			...(this.refreshToken ? { refreshToken: this.refreshToken } : {}),
		};
	}

	// ---------------------------------------------------------------------------
	// AuthProvider implementation
	// ---------------------------------------------------------------------------

	async getHeaders(
		_context: AuthHeaderContext
	): Promise<Record<string, string>> {
		const token = await this.resolveToken();
		return { Authorization: `Bearer ${token}` };
	}

	// ---------------------------------------------------------------------------
	// Internal token lifecycle
	// ---------------------------------------------------------------------------

	private async resolveToken(): Promise<string> {
		const now = Date.now();
		if (this.accessToken && now < this.expiresAt - 30_000) {
			return this.accessToken;
		}
		if (!this.inflight) {
			this.inflight = this.fetchToken().finally(() => {
				this.inflight = null;
			});
		}
		return this.inflight;
	}

	private async fetchToken(): Promise<string> {
		const tokenUrl = this.config.tokenUrl ?? BRIGHTSPACE_TOKEN_URL;
		const basic = Buffer.from(
			`${this.config.clientId}:${this.config.clientSecret}`
		).toString("base64");

		const params = new URLSearchParams();

		if (this.refreshToken) {
			params.set("grant_type", "refresh_token");
			params.set("refresh_token", this.refreshToken);
		} else if (this.pendingCode) {
			params.set("grant_type", "authorization_code");
			params.set("code", this.pendingCode);
			params.set("redirect_uri", this.config.redirectUri);
		} else {
			throw new AuthError(
				"OAuth2AuthorizationCodeClient has no authorization code or refresh token. " +
					"Call generateAuthUrl() to start the authorization flow, or " +
					"call setCredentials({ refreshToken }) to restore a previous session."
			);
		}

		if (this.config.scope) params.set("scope", this.config.scope);

		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				Authorization: `Basic ${basic}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		const data = (await response
			.json()
			.catch(() => ({}))) as Partial<OAuthTokenResponse>;

		if (!response.ok || !data.access_token) {
			throw new AuthError(
				"Failed to fetch OAuth2 authorization code access token",
				{
					status: 401,
					rawBody: safeStringify(data),
				}
			);
		}

		this.accessToken = data.access_token;
		if (data.refresh_token) this.refreshToken = data.refresh_token;
		// Authorization code is single-use — null after first exchange
		this.pendingCode = null;
		const expiresIn = data.expires_in ?? 3600;
		this.expiresAt = Date.now() + expiresIn * 1000;

		return this.accessToken;
	}
}

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
