import type { VersionCheckResult } from "../types";
import type { HttpClient } from "../core/http-client";
import type { VersionResolver } from "../core/version-resolver";

export class VersionsResource {
	constructor(
		private readonly http: HttpClient,
		private readonly resolver: VersionResolver
	) {}

	async check(): Promise<VersionCheckResult> {
		return this.resolver.check(this.http);
	}
}
