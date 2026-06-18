import type { BearerAuthConfig } from "../types";
import type { AuthHeaderContext, AuthProvider } from "./provider";

export class BearerAuthProvider implements AuthProvider {
	constructor(private readonly config: BearerAuthConfig) {}

	async getHeaders(
		_context: AuthHeaderContext
	): Promise<Record<string, string>> {
		return { Authorization: `Bearer ${this.config.token}` };
	}
}
