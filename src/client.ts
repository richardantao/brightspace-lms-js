import { createAuthProvider, type AuthProvider } from "./auth";
import { HttpClient } from "./core/http-client";
import { VersionResolver } from "./core/version-resolver";
import { VersionError } from "./core/errors";
import type {
	AuthConfig,
	BrightspaceClientConfig,
	Middleware,
	RequestContext,
} from "./types";
import { CoursesResource } from "./resources/courses";
import { EnrollmentsResource } from "./resources/enrollments";
import { GradesResource } from "./resources/grades";
import { UsersResource } from "./resources/users";
import { VersionsResource } from "./resources/versions";
import { QuizzesResource } from "./resources/quizzes";
import { DropboxesResource } from "./resources/dropboxes";
import { AssessmentsResource } from "./resources/assessments";
import { CalendarResource } from "./resources/calendar";
import { OrgUnitsResource } from "./resources/org-units";
import { DiscussionsResource } from "./resources/discussions";
import { SurveysResource } from "./resources/surveys";
import { GroupsResource } from "./resources/groups";
import { ChecklistsResource } from "./resources/checklists";
import { ContentResource } from "./resources/content";
import { NewsResource } from "./resources/news";
import { OutcomesResource } from "./resources/outcomes";
import { AwardsResource } from "./resources/awards";
import { ReleaseConditionsResource } from "./resources/release-conditions";
import { DemographicsResource } from "./resources/demographics";
import { AccommodationsResource } from "./resources/accommodations";

/**
 * Extends BrightspaceClientConfig to accept either a plain AuthConfig object
 * or a pre-constructed AuthProvider instance.
 *
 * Use a pre-constructed provider when you need to drive the OAuth2
 * authorization code flow yourself — the two-phase redirect + code exchange
 * pattern where the authorization code isn't available until after the user
 * returns from the D2L consent screen:
 *
 * ```ts
 * // Phase 1 — before redirect, construct provider and generate redirect URL
 * const provider = new OAuth2AuthProvider({
 *   type: "oauth2_authorization_code",
 *   clientId: "...",
 *   clientSecret: "...",
 *   redirectUri: "https://app.example.com/oauth/callback",
 *   scope: "core:*:*",
 * });
 * const redirectUrl = provider.getAuthorizationUrl(state);
 * res.redirect(redirectUrl);
 *
 * // Phase 2 — in callback handler, exchange code then construct client
 * await provider.exchangeCode(req.query.code);
 * const client = new BrightspaceClient({ host, auth: provider });
 * const me = await client.users.whoami();
 * ```
 *
 * For all other auth flows, pass a plain AuthConfig object:
 * - bearer: token known at construction time
 * - legacy: all keys known at construction time
 * - oauth2_client_credentials: private key known at construction time
 * - oauth2_authorization_code with refreshToken: token renewal is automatic
 */
export interface BrightspaceClientOptions
	extends Omit<BrightspaceClientConfig, "auth"> {
	auth: AuthConfig | AuthProvider;
}

/**
 * Duck-type guard that distinguishes a pre-constructed AuthProvider from a
 * plain AuthConfig discriminated union member. AuthProvider instances expose
 * a `getHeaders` method; AuthConfig objects do not.
 */
function isAuthProvider(auth: AuthConfig | AuthProvider): auth is AuthProvider {
	return "getHeaders" in auth && typeof auth.getHeaders === "function";
}

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
	readonly quizzes: QuizzesResource;
	readonly dropboxes: DropboxesResource;
	readonly assessments: AssessmentsResource;
	readonly calendar: CalendarResource;
	readonly orgUnits: OrgUnitsResource;
	readonly discussions: DiscussionsResource;
	readonly surveys: SurveysResource;
	readonly groups: GroupsResource;
	readonly checklists: ChecklistsResource;
	readonly content: ContentResource;
	readonly news: NewsResource;
	readonly outcomes: OutcomesResource;
	readonly awards: AwardsResource;
	readonly releaseConditions: ReleaseConditionsResource;
	readonly demographics: DemographicsResource;
	readonly accommodations: AccommodationsResource;
	readonly raw: RawClient;

	constructor(options: BrightspaceClientOptions) {
		// Accept either a pre-constructed AuthProvider or a plain AuthConfig.
		// Duck-type on getHeaders — AuthProvider instances implement this method;
		// plain AuthConfig objects (which are discriminated union members) do not.
		const authProvider: AuthProvider = isAuthProvider(options.auth)
			? options.auth
			: createAuthProvider(options.auth);

		this.http = new HttpClient({
			host: options.host,
			authProvider,
			...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
			...(options.retries !== undefined ? { retries: options.retries } : {}),
		});

		this.versionsResolver = new VersionResolver(options.apiVersions);

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
		this.quizzes = new QuizzesResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.dropboxes = new DropboxesResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.assessments = new AssessmentsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.calendar = new CalendarResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.orgUnits = new OrgUnitsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.discussions = new DiscussionsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.surveys = new SurveysResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.groups = new GroupsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.checklists = new ChecklistsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.content = new ContentResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.news = new NewsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.outcomes = new OutcomesResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.awards = new AwardsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.releaseConditions = new ReleaseConditionsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.demographics = new DemographicsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
		this.accommodations = new AccommodationsResource(
			this.http,
			this.versionsResolver,
			ensureVersionsChecked
		);
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

export type {
	BrightspaceClientOptions as BrightspaceClientConfig,
	RequestContext,
};
