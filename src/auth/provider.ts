import type { HttpMethod } from "../types";

export interface AuthHeaderContext {
	method: HttpMethod;
	url: string;
}

export interface AuthProvider {
	getHeaders(context: AuthHeaderContext): Promise<Record<string, string>>;
}
