import { createAuthProvider } from "./auth";
import { HttpClient } from "./core/http-client";
import { VersionResolver } from "./core/version-resolver";
import { VersionError } from "./core/errors";
import type {
	BrightspaceClientConfig,
	Middleware,
	RequestContext,
} from "./types";
import { CoursesResource } from "./resources/courses";
import { EnrollmentsResource } from "./resources/enrollments";
import { GradesResource } from "./resources/grades";
import { UsersResource } from "./resources/users";
import { VersionsResource } from "./resources/versions";

class RawClient {
	constructor(private readonly http: HttpClient) {}

	get<T = unknown>(path: string): Promise<T> {
		return this.http.get<T>(path);
	}

	post<T = unknown>(path: string, body?: unknown): Promise<T> {
		return this.http.post<T>(path, body);
	}

	put<T = unknown>(path: string, body?: unknown): Promise<T> {
		return this.http.put<T>(path, body);
	}

	patch<T = unknown>(path: string, body?: unknown): Promise<T> {
		return this.http.patch<T>(path, body);
	}

	delete<T = unknown>(path: string): Promise<T> {
		return this.http.delete<T>(path);
	}
}

export class BrightspaceClient {
	private readonly http: HttpClient;
	private readonly versionsResolver: VersionResolver;

	/**
	 * Deduplicates concurrent version check requests — all callers awaiting
	 * the first negotiation share a single in-flight promise.
	 */
	private versionCheckPromise: Promise<void> | null = null;

	/**
	 * Set to the VersionError after a definitive version mismatch.
	 * Subsequent calls short-circuit immediately rather than retrying a check
	 * that is guaranteed to fail (e.g. the host is permanently too old).
	 * Transient network errors do NOT set this flag — those are retried.
	 */
	private versionCheckError: VersionError | null = null;

	readonly users: UsersResource;
	readonly enrollments: EnrollmentsResource;
	readonly courses: CoursesResource;
	readonly grades: GradesResource;
	readonly versions: VersionsResource;
	readonly raw: RawClient;

	constructor(config: BrightspaceClientConfig) {
		const authProvider = createAuthProvider(config.auth);

		this.http = new HttpClient({
			host: config.host,
			authProvider,
			...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
			...(config.retries !== undefined ? { retries: config.retries } : {}),
		});

		this.versionsResolver = new VersionResolver(config.apiVersions);

		const ensureVersionsChecked = async (): Promise<void> => {
			// Short-circuit on a previous definitive failure
			if (this.versionCheckError) throw this.versionCheckError;
			if (this.versionsResolver.hasChecked()) return;

			if (!this.versionCheckPromise) {
				this.versionCheckPromise = this.versionsResolver
					.check(this.http)
					.then(() => undefined)
					.catch((err: unknown) => {
						// Permanently record definitive version mismatches.
						// All other errors (network, auth) are not recorded so they
						// can be retried on the next call.
						if (err instanceof VersionError) {
							this.versionCheckError = err;
						}
						throw err;
					})
					.finally(() => {
						this.versionCheckPromise = null;
					});
			}

			await this.versionCheckPromise;
		};

		this.users = new UsersResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.enrollments = new EnrollmentsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.courses = new CoursesResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.grades = new GradesResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.versions = new VersionsResource(this.http, this.versionsResolver);
		this.raw = new RawClient(this.http);
	}

	/**
	 * Register a middleware to intercept requests, responses, and errors.
	 * Middlewares are applied in registration order.
	 * Returns `this` for chaining.
	 */
	use(middleware: Middleware): this {
		this.http.use(middleware);
		return this;
	}

	/**
	 * Access an arbitrary D2L API route not yet covered by a named resource.
	 * Auth and HTTP handling are preserved; version negotiation is bypassed.
	 *
	 * @example
	 * const custom = client.extend<{ Value: number }>('/d2l/api/le/1.82/123/custom/endpoint');
	 * const result = await custom.get();
	 */
	extend<T = unknown>(
		path: string
	): {
		get: () => Promise<T>;
		post: (body?: unknown) => Promise<T>;
		put: (body?: unknown) => Promise<T>;
		patch: (body?: unknown) => Promise<T>;
		delete: () => Promise<T>;
	} {
		const clean = path.startsWith("/") ? path : `/${path}`;

		return {
			get: () => this.raw.get<T>(clean),
			post: (body?: unknown) => this.raw.post<T>(clean, body),
			put: (body?: unknown) => this.raw.put<T>(clean, body),
			patch: (body?: unknown) => this.raw.patch<T>(clean, body),
			delete: () => this.raw.delete<T>(clean),
		};
	}
}

export type { BrightspaceClientConfig, RequestContext };
