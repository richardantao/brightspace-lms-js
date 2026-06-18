import type { AuthConfig } from "../types";
import { BearerAuthProvider } from "./bearer";
import { LegacyAuthProvider } from "./legacy";
import { OAuth2AuthProvider } from "./oauth2";
import type { AuthProvider } from "./provider";

export function createAuthProvider(
	auth: AuthConfig
): AuthProvider {
	switch (auth.type) {
		case "oauth2_authorization_code":
		case "oauth2_client_credentials":
			return new OAuth2AuthProvider(auth);
		case "bearer":
			return new BearerAuthProvider(auth);
		case "legacy":
			return new LegacyAuthProvider(auth);
	}
}

export type { AuthProvider } from "./provider";
export { OAuth2AuthProvider } from "./oauth2";
