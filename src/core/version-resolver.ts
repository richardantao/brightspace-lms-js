import { KNOWN_VERSIONS, MIN_TESTED_VERSIONS } from "./constants";
import { VersionError } from "./errors";
import type {
	D2LProduct,
	D2LVersion,
	VersionCheckResult,
	VersionSpec,
} from "../types";

/**
 * Resolves and negotiates D2L API component versions.
 *
 * D2L versions each product component (lp, le, ep...) independently using
 * a major.minor scheme embedded directly in route URLs:
 *   /d2l/api/{product}/{version}/{route}
 *
 * On check(), posts to POST /d2l/api/versions/check to confirm the host
 * supports the versions this library targets, then stores the negotiated
 * versions for use in path() calls.
 *
 * @see https://docs.valence.desire2learn.com/basic/version.html
 */

interface VersionHttpClient {
	post<T>(path: string, body?: unknown): Promise<T>;
}

export class VersionResolver {
	private negotiated = new Map<D2LProduct, D2LVersion>();
	private checked = false;

	constructor(
		private readonly requested: Partial<Record<D2LProduct, D2LVersion>> = {}
	) {}

	buildRequestedSpecs(): VersionSpec[] {
		const merged: Partial<Record<D2LProduct, D2LVersion>> = {
			...KNOWN_VERSIONS,
			...this.requested,
		};

		return Object.entries(merged)
			.filter(
				(entry): entry is [D2LProduct, D2LVersion] => entry[1] !== undefined
			)
			.map(([ProductCode, Version]) => ({
				ProductCode,
				Version,
			}));
	}

	async check(client: VersionHttpClient): Promise<VersionCheckResult> {
		const specs = this.buildRequestedSpecs();
		// Note: this path is NOT built through path() - the versions endpoint
		// lives at /d2l/api/versions/check with no product/version segment.
		const result = await client.post<VersionCheckResult>(
			"/d2l/api/versions/check",
			specs
		);

		if (!result.Supported) {
			// Find the first unsupported component to surface in the error.
			// Per D2L docs: examine per-component Supported when top-level is false.
			const unsupported = result.Versions.find(v => !v.Supported);
			throw new VersionError(
				`Brightspace host does not support the required API version for ${unsupported?.ProductCode ?? "unknown"}. Contact the LMS administrator to upgrade the Brightspace installation.`,
				{
					product: unsupported?.ProductCode ?? "unknown",
					required:
						(unsupported &&
							(this.requested[unsupported.ProductCode] ??
								KNOWN_VERSIONS[unsupported.ProductCode])) ??
						"unknown",
					available:
						unsupported?.LatestVersion ?? unsupported?.Version ?? "unknown",
				}
			);
		}

		for (const version of result.Versions) {
			if (version.Supported) {
				// Store the version we requested (confirmed supported), not LatestVersion.
				// LatestVersion tells us a newer version exists - but we haven't tested
				// against it. We stay on our requested version unless the consumer pins
				// a higher one explicitly.
				this.negotiated.set(version.ProductCode, version.Version);

				// Inform the consumer if the host has a newer version than we're using.
				// Per D2L docs: if client is behind, suggest updating the client.
				if (
					version.LatestVersion &&
					compareVersions(version.Version, version.LatestVersion) < 0
				) {
					console.warn(
						`[brightspace-client] A newer version of ${version.ProductCode} is available on this host (using ${version.Version}, latest is ${version.LatestVersion}). Consider updating brightspace-client.`
					);
				}
			} else if (version.LatestVersion) {
				// The version we requested isn't supported, but the host offers something.
				// Store LatestVersion as a best-effort fallback, but warn loudly -
				// this is an untested version and may behave unexpectedly.
				this.negotiated.set(version.ProductCode, version.LatestVersion);
				console.warn(
					`[brightspace-client] ${version.ProductCode}@${version.Version} is not supported by this host. Falling back to ${version.LatestVersion} - this version has not been tested by brightspace-client. Some features may not work correctly.`
				);
			}

			// Warn if the negotiated version is below our tested floor.
			// This catches cases where a host is too old even if it claims to support the version.
			const floor = MIN_TESTED_VERSIONS[version.ProductCode];
			if (floor && compareVersions(version.Version, floor) < 0) {
				console.warn(
					`[brightspace-client] ${version.ProductCode}@${version.Version} is below the tested floor (${floor}). Behaviour may be unpredictable on older API contracts.`
				);
			}
		}

		this.checked = true;
		return result;
	}

	hasChecked(): boolean {
		return this.checked;
	}

	/**
	 * Returns the negotiated version for a product component.
	 * Falls back to consumer-pinned version, then library default.
	 */
	resolve(product: D2LProduct): D2LVersion {
		const resolved =
			this.negotiated.get(product) ??
			this.requested[product] ??
			KNOWN_VERSIONS[product];

		if (!resolved) {
			throw new VersionError(
				`No version configured for D2L product "${product}". ` +
					`This product may not support independent version negotiation (e.g. lti, ext). ` +
					`Pin a version explicitly via apiVersions in client config, or use client.raw for this route.`,
				{
					product,
					required: "unknown",
					available: "unknown",
				}
			);
		}

		return resolved;
	}

	/**
	 * Builds a versioned route path for a given product component and route.
	 *
	 * e.g. path("lp", "users/whoami") → "/d2l/api/lp/1.28/users/whoami"
	 *
	 * @param product - D2L product component code
	 * @param route   - Route path relative to the product/version prefix
	 */
	path(product: D2LProduct, route: string): string {
		const normalized = route.startsWith("/") ? route.slice(1) : route;
		return `/d2l/api/${product}/${this.resolve(product)}/${normalized}`;
	}

	/**
	 * Builds an unstable route path for a given product component.
	 *
	 * D2L reserves the 'unstable' version namespace for experimental routes
	 * that may change at any time without notice. Use only for prototyping —
	 * do not use in production code.
	 *
	 * e.g. unstablePath("lp", "users/whoami") → "/d2l/api/lp/unstable/users/whoami"
	 *
	 * @see https://docs.valence.desire2learn.com/basic/version.html#unstable-api-contract
	 */
	unstablePath(product: D2LProduct, route: string): string {
		const normalized = route.startsWith("/") ? route.slice(1) : route;
		return `/d2l/api/${product}/unstable/${normalized}`;
	}
}

/**
 * Compares two D2L version strings. Returns:
 *   negative if a < b
 *   zero     if a === b
 *   positive if a > b
 */
function compareVersions(a: D2LVersion, b: D2LVersion): number {
	const [amajRaw, aminRaw] = a.split(".");
	const [bmajRaw, bminRaw] = b.split(".");
	const amaj = Number.parseInt(amajRaw ?? "0", 10);
	const amin = Number.parseInt(aminRaw ?? "0", 10);
	const bmaj = Number.parseInt(bmajRaw ?? "0", 10);
	const bmin = Number.parseInt(bminRaw ?? "0", 10);

	if (amaj !== bmaj) return amaj - bmaj;
	return amin - bmin;
}
