import type { D2LProduct, D2LVersion } from "../types";

/**
 * The D2L API component versions this library targets by default.
 *
 * Strategy: target the OLDEST FULLY SUPPORTED version per the current D2L
 * deprecation table. This maximises host compatibility — any institution on
 * a reasonably modern Brightspace release will pass the version check —
 * while avoiding deprecated contracts that D2L no longer prioritises for
 * support or fixes.
 *
 * Do not target the latest version: institutions on older-but-supported
 * releases would fail the version check and the library would refuse to work.
 * Do not target deprecated versions: they are end-of-maintenance and may lose
 * routes when the contract reaches obsolescence.
 *
 * Deprecation table as of June 2026 (Brightspace 20.26.6):
 *
 *   Product  | Oldest fully supported | Deprecated      | Obsolete
 *   -------- | ---------------------- | --------------- | ----------------
 *   lp       | 1.49                   | 1.46–1.48       | 1.45 and older
 *   le       | 1.82                   | 1.75–1.81       | 1.74 and older
 *   ep       | 2.5                    | —               | 2.4 and older
 *   bas      | 1.4                    | 1.3             | 1.2 and older
 *   lr       | 1.3                    | —               | 1.2 and older
 *
 * Forward notice: as of Brightspace 20.27.1 (January 2027), contracts from
 * Learning Suite v20.24 and earlier become obsolete (routes may return 404).
 *
 * Update this table and KNOWN_VERSIONS when D2L publishes new release notes.
 *
 * @see https://docs.valence.desire2learn.com/about.html#api-deprecation-and-obsolescence
 * @see https://docs.valence.desire2learn.com/basic/version.html
 */
export const KNOWN_VERSIONS: Partial<Record<D2LProduct, D2LVersion>> = {
	lp: "1.49", // Oldest fully supported as of 20.26.6
	le: "1.82", // Oldest fully supported as of 20.26.6
	ep: "2.5", // Oldest fully supported as of 20.26.6
	bas: "1.4", // Oldest fully supported as of 20.26.6
	// lti: not a standalone versioned component — LTI is handled via LTI
	//   Advantage asset routes, not a product component in versions/check.
	// ext: versioned per Learning Suite release, not independently negotiated.
	//   Do not include in versions/check specs.
};

/**
 * The minimum D2L API component versions brightspace-lms has been
 * tested against. VersionResolver emits a warning when a host reports
 * a version below these floors.
 *
 * Set equal to KNOWN_VERSIONS: the floor is where we've actually tested,
 * not an arbitrary lower bound. If a host is below this floor, behaviour
 * is genuinely unpredictable.
 */
export const MIN_TESTED_VERSIONS: Partial<Record<D2LProduct, D2LVersion>> = {
	lp: "1.49",
	le: "1.82",
	ep: "2.5",
	bas: "1.4",
};

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_RETRIES = 3;
