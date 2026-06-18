import { createHmac } from "node:crypto";

import type { LegacyAuthConfig } from "../types";
import type { AuthHeaderContext, AuthProvider } from "./provider";

/**
 * Legacy ID-Key authentication provider.
 *
 * @deprecated D2L has deprecated the legacy ID-Key auth system.
 * Use OAuth2 where possible. This provider is included for integrations
 * that cannot yet migrate.
 *
 * @see https://docs.valence.desire2learn.com/basic/legacyauth.html
 *
 * Protocol notes from D2L docs:
 *
 * Timestamps: Unix timestamp format — seconds since epoch (not milliseconds).
 *
 * Base string: items concatenated with '&'. The HTTP method must be UPPERCASE;
 * the API route (path only, not full URL) must be lowercase.
 * Format: `{METHOD}&{lowercase-path}&{userId}&{timestamp}`
 *
 * Signatures: HMAC-SHA256, then base64url encoded per RFC 4648:
 *   - No '=' padding
 *   - '+' replaced with '-'
 *   - '/' replaced with '_'
 * Both app and user signatures are sent as request headers.
 */
export class LegacyAuthProvider implements AuthProvider {
	constructor(private readonly config: LegacyAuthConfig) {}

	async getHeaders(
		context: AuthHeaderContext
	): Promise<Record<string, string>> {
		// Seconds since epoch — D2L requires Unix timestamp, not milliseconds
		const timestamp = Math.floor(Date.now() / 1000).toString();

		// Extract path from the full URL and lowercase it per D2L spec
		const path = extractPath(context.url).toLowerCase();

		// Method must be uppercase per D2L spec
		const method = context.method.toUpperCase();

		// Base string: METHOD&lowercase-path&userId&timestamp
		const signatureBase = `${method}&${path}&${this.config.userId}&${timestamp}`;

		const appSig = hmacBase64Url(this.config.appKey, signatureBase);
		const userSig = hmacBase64Url(this.config.userKey, signatureBase);

		return {
			"X-D2L-App-Id": this.config.appId,
			"X-D2L-User-Id": this.config.userId,
			"X-D2L-Timestamp": timestamp,
			"X-D2L-App-Signature": appSig,
			"X-D2L-User-Signature": userSig,
		};
	}
}

/**
 * Produces an HMAC-SHA256 signature encoded as base64url per RFC 4648.
 * No padding, '+' → '-', '/' → '_'.
 */
function hmacBase64Url(key: string, data: string): string {
	return createHmac("sha256", key)
		.update(data)
		.digest("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/**
 * Extracts the path (and query string) from a full URL.
 * e.g. "https://lms.example.com/d2l/api/lp/1.28/users/whoami" → "/d2l/api/lp/1.28/users/whoami"
 */
function extractPath(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.pathname + parsed.search;
	} catch {
		// Fallback: if url is already a path, return as-is
		return url.startsWith("/") ? url : `/${url}`;
	}
}