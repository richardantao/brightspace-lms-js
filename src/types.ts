
/**
 * D2L product component codes that appear in Valence API route paths.
 * e.g. /d2l/api/{product}/{version}/...
 *
 * lp  — Learning Platform (users, enrollments, org units)
 * le  — Learning Environment (courses, grades, quizzes, dropboxes)
 * lti — LTI integration
 * bas — Brightspace Admin Services
 * ep  — ePortfolio
 * ext — Extensibility
 */
export type D2LProduct = "lp" | "le" | "lti" | "bas" | "ep" | "ext";

/**
 * D2L API component version string. Major.minor format embedded in route URLs.
 * e.g. "1.28", "1.68"
 */
export type D2LVersion = `${number}.${number}`;

export type HttpMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "HEAD"
	| "OPTIONS";

/**
 * OAuth2 Authorization Code Grant.
 *
 * For user-facing applications. Involves a browser redirect to the Brightspace
 * auth service for user consent, followed by a code exchange for tokens.
 * Supports refresh tokens for long-lived access.
 *
 * Authorization endpoint: https://auth.brightspace.com/oauth2/auth
 * Token endpoint:         https://auth.brightspace.com/core/connect/token
 *
 * The library handles token exchange and refresh. The consumer is responsible
 * for driving the initial redirect and capturing the authorization code.
 *
 * @see https://docs.valence.desire2learn.com/basic/oauth2.html
 */
export interface OAuth2AuthorizationCodeConfig {
	type: "oauth2_authorization_code";
	clientId: string;
	clientSecret: string;
	/** The redirect URI registered with the Brightspace application. */
	redirectUri: string;
	/**
	 * Space-delimited OAuth2 scopes. Must be a subset of the scopes registered
	 * with the Brightspace application.
	 * Use 'core:*:*' as the general fallback scope for actions without specific scopes.
	 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#oauth-2-scopes-in-our-apis
	 */
	scope?: string;
	/**
	 * Authorization code received after user consent redirect.
	 * Provide this to bootstrap the token exchange on first use.
	 */
	code?: string;
	/**
	 * Existing refresh token. If provided, the provider will use this to
	 * obtain a new access token without requiring re-authorization.
	 */
	refreshToken?: string;
	/** Override the default token endpoint. Defaults to https://auth.brightspace.com/core/connect/token */
	tokenUrl?: string;
	/** Override the default authorization endpoint. Defaults to https://auth.brightspace.com/oauth2/auth */
	authUrl?: string;
}

/**
 * OAuth2 Client Credentials Grant.
 *
 * For server-to-server applications. Authenticates directly with the
 * Brightspace auth service using a JWT client assertion signed with a
 * private key (RS256, RS384, RS512, ES256, ES384, ES512).
 *
 * Does NOT use clientSecret — D2L's client credentials flow requires
 * asymmetric key authentication via JWT (RFC 7521, RFC 7523), not Basic auth.
 *
 * Token endpoint: https://auth.brightspace.com/core/connect/token
 *
 * Your JWKS URL must be publicly reachable over HTTPS — D2L fetches it
 * to verify your JWT client assertion signatures.
 *
 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#making-access-token-requests
 */
export interface OAuth2ClientCredentialsConfig {
		type: "oauth2_client_credentials";
		clientId: string;
		/**
		 * The private key used to sign JWT client assertions.
		 * Supported formats: PEM string (RS256/ES256 etc.)
		 * Must correspond to a public key in your registered JWKS URL.
		 */
		privateKey: string;
		/**
		 * The key ID (kid) that identifies which key in your JWKS Brightspace
		 * should use to verify your JWT client assertion.
		 */
		keyId: string;
		/**
		 * Signing algorithm. Must match the key type.
		 * D2L supports: RS256, RS384, RS512, ES256, ES384, ES512.
		 */
		algorithm?: "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512";
		/**
		 * Space-delimited OAuth2 scopes. Must be a subset of the scopes registered
		 * with the Brightspace application.
		 * Use 'core:*:*' as the general fallback scope for actions without specific scopes.
		 */
		scope?: string;
		/** Override the default token endpoint. Defaults to https://auth.brightspace.com/core/connect/token */
		tokenUrl?: string;
		/**
		 * Lifetime of the JWT client assertion in seconds.
		 * D2L recommends < 60s; maximum 5 minutes (300s).
		 * Defaults to 60.
		 * @see https://docs.valence.desire2learn.com/basic/oauth2.html#security-operational-best-practices
		 */
		assertionLifetime?: number;
	}

/**
 * Bearer token auth. For server-side use when a valid access token is already
 * available (e.g. passed from a user session). No refresh — caller is
 * responsible for token lifecycle.
 */
export interface BearerAuthConfig {
	type: "bearer";
	token: string;
}

/**
 * Legacy ID-Key authentication.
 *
 * @deprecated D2L has deprecated the legacy ID-Key auth system.
 * Migrate to OAuth2 where possible.
 * @see https://docs.valence.desire2learn.com/basic/legacyauth.html
 */
export interface LegacyAuthConfig {
	type: "legacy";
	appId: string;
	appKey: string;
	userId: string;
	userKey: string;
}

export type AuthConfig =
	| OAuth2AuthorizationCodeConfig
	| OAuth2ClientCredentialsConfig
	| BearerAuthConfig
	| LegacyAuthConfig;



export interface BrightspaceClientConfig {
		host: string;
		auth: AuthConfig;
		/**
		 * Pin specific D2L product component versions. Defaults to the highest
		 * version the library has been tested against for each product.
		 * Only override if you need to target a specific version.
		 */
		apiVersions?: Partial<Record<D2LProduct, D2LVersion>>;
		/** Request timeout in milliseconds. Default: 10000 */
		timeout?: number;
		/** Number of retries for 5xx and 429 responses. Default: 3 */
		retries?: number;
	}

export interface RequestContext {
	method: HttpMethod;
	path: string;
	url: string;
	headers: Headers;
	body?: BodyInit;
}

export interface ResponseContext {
	request: RequestContext;
	response: Response;
	data: unknown;
}

export interface Middleware {
	onRequest?: (
		request: RequestContext
	) => Promise<RequestContext> | RequestContext;
	onResponse?: (
		response: ResponseContext
	) => Promise<ResponseContext> | ResponseContext;
	onError?: (error: unknown) => Promise<never> | never;
}

export interface VersionSpec {
	ProductCode: D2LProduct;
	Version: D2LVersion;
}

export interface VersionCheckResult {
	Supported: boolean;
	Versions: Array<{
		ProductCode: D2LProduct;
		Version: D2LVersion;
		Supported: boolean;
		LatestVersion?: D2LVersion;
	}>;
}

export interface PaginatedList<T> extends AsyncIterable<T> {
	values: T[];
	hasMore: boolean;
	nextPage(): Promise<PaginatedList<T>>;
	toArray(): Promise<T[]>;
}

export interface PaginatedRequest<T> extends Promise<PaginatedList<T>> {
	autoPaginate(): Promise<PaginatedList<T>>;
	toArray(): Promise<T[]>;
}

export interface ListOptions {
	pageSize?: number;
	bookmark?: string;
	orgUnitTypeId?: number;
}
