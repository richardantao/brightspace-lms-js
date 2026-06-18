import type { HttpClient } from "./http-client";
import type { D2LProduct } from "../types";
import type { VersionResolver } from "./version-resolver";

/**
 * Abstract base class for all D2L resource namespaces.
 *
 * Wraps HttpClient with version-aware path construction and ensures
 * version negotiation has completed before any API call is made.
 *
 * All HTTP methods gate on `ensureVersionsChecked()` so resources never
 * reach the wire with unresolved version state.
 *
 * @param ensureVersionsChecked - Injected by BrightspaceClient. Defaults to
 *   a no-op for unit testing only. Do not pass the default in production.
 */
export abstract class BaseResource {
	constructor(
		protected readonly http: HttpClient,
		protected readonly versions: VersionResolver,
		private readonly ensureVersionsChecked: () => Promise<void> = async () => {}
	) {}

	/**
	 * Builds a versioned route path for a product component and route segment.
	 * Delegates to VersionResolver which resolves the negotiated version.
	 *
	 * e.g. path("lp", "users/whoami") → "/d2l/api/lp/1.49/users/whoami"
	 */
	protected path(product: D2LProduct, route: string): string {
		return this.versions.path(product, route);
	}

	protected async get<T>(product: D2LProduct, route: string): Promise<T> {
		await this.ensureVersionsChecked();
		return this.http.get<T>(this.path(product, route));
	}

	protected async post<T>(
		product: D2LProduct,
		route: string,
		body?: unknown
	): Promise<T> {
		await this.ensureVersionsChecked();
		return this.http.post<T>(this.path(product, route), body);
	}

	protected async put<T>(
		product: D2LProduct,
		route: string,
		body?: unknown
	): Promise<T> {
		await this.ensureVersionsChecked();
		return this.http.put<T>(this.path(product, route), body);
	}

	protected async delete<T>(product: D2LProduct, route: string): Promise<T> {
		await this.ensureVersionsChecked();
		return this.http.delete<T>(this.path(product, route));
	}
}