import { DEFAULT_RETRIES, DEFAULT_TIMEOUT_MS } from "./constants";
import { BrightspaceError, NetworkError, mapHttpError } from "./errors";
import type {
	HttpMethod,
	Middleware,
	RequestContext,
	ResponseContext,
} from "../types";
import type { AuthProvider } from "../auth";

export interface HttpClientOptions {
	host: string;
	authProvider: AuthProvider;
	timeout?: number;
	retries?: number;
}

export class HttpClient {
	private readonly middlewares: Middleware[] = [];
	private readonly host: string;
	private readonly timeout: number;
	private readonly retries: number;

	constructor(private readonly options: HttpClientOptions) {
		this.host = options.host.replace(/\/$/, "");
		this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
		this.retries = options.retries ?? DEFAULT_RETRIES;
	}

	use(middleware: Middleware): void {
		this.middlewares.push(middleware);
	}

	async get<T>(path: string): Promise<T> {
		return this.request<T>("GET", path);
	}

	async post<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	async put<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("PUT", path, body);
	}

	async patch<T>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("PATCH", path, body);
	}

	async delete<T>(path: string): Promise<T> {
		return this.request<T>("DELETE", path);
	}

	async request<T>(
		method: HttpMethod,
		path: string,
		payload?: unknown
	): Promise<T> {
		const route = path.startsWith("/") ? path : `/${path}`;
		const url = `${this.host}${route}`;

		const headers = new Headers({
			Accept: "application/json",
			"Content-Type": "application/json",
		});

		const authHeaders = await this.options.authProvider.getHeaders({
			method,
			url,
		});
		for (const [key, value] of Object.entries(authHeaders))
			headers.set(key, value);

		const body = payload === undefined ? undefined : JSON.stringify(payload);

		let request: RequestContext = {
			method,
			path: route,
			url,
			headers,
			...(body !== undefined ? { body } : {}),
		};

		for (const middleware of this.middlewares) {
			if (middleware.onRequest) {
				request = await middleware.onRequest(request);
			}
		}

		const response = await this.requestWithRetry(request);

		let data: unknown = null;
		const contentType = response.headers.get("content-type") ?? "";
		if (contentType.includes("application/json")) {
			data = await response.json().catch(() => null);
		} else if (response.status !== 204) {
			data = await response.text().catch(() => null);
		}

		if (!response.ok) {
			const rawBody = toRawBody(data);
			const error = mapHttpError(response.status, rawBody, response.headers);
			await this.handleError(error);
		}

		let ctx: ResponseContext = {
			request,
			response,
			data,
		};

		for (const middleware of this.middlewares) {
			if (middleware.onResponse) {
				ctx = await middleware.onResponse(ctx);
			}
		}

		return ctx.data as T;
	}

	private async requestWithRetry(request: RequestContext): Promise<Response> {
		let attempt = 0;
		let lastError: unknown = null;

		while (attempt <= this.retries) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
				const init: RequestInit = {
					method: request.method,
					headers: request.headers,
					signal: controller.signal,
					...(request.body !== undefined ? { body: request.body } : {}),
				};

				const response = await fetch(request.url, init);
				clearTimeout(timeoutId);

				if (response.status >= 500 && attempt < this.retries) {
					attempt += 1;
					await delay(backoffMs(attempt));
					continue;
				}

				if (response.status === 429 && attempt < this.retries) {
					const retryAfter = Number.parseInt(
						response.headers.get("retry-after") ?? "0",
						10
					);
					const wait =
						retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt + 1);
					attempt += 1;
					await delay(wait);
					continue;
				}

				return response;
			} catch (error) {
				clearTimeout(timeoutId);
				lastError = error;

				if (attempt >= this.retries) break;
				attempt += 1;
				await delay(backoffMs(attempt));
			}
		}

		const err =
			lastError instanceof BrightspaceError
				? lastError
				: new NetworkError("Request failed after retries", {
						cause: lastError,
				  });

		return this.handleError(err);
	}

	private async handleError(error: unknown): Promise<never> {
		for (const middleware of this.middlewares) {
			if (middleware.onError) {
				await middleware.onError(error);
			}
		}

		throw error;
	}
}

function backoffMs(attempt: number): number {
	return Math.min(1000 * 2 ** (attempt - 1), 10_000);
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function toRawBody(data: unknown): string | undefined {
	if (data == null) return undefined;
	if (typeof data === "string") return data;
	try {
		return JSON.stringify(data);
	} catch {
		return String(data);
	}
}
