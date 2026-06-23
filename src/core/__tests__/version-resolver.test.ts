import { describe, expect, it, vi } from "vitest";

import { VersionError } from "../errors";
import { VersionResolver } from "../version-resolver";

describe("VersionResolver", () => {
	it("builds versioned and unstable paths", () => {
		const resolver = new VersionResolver();
		expect(resolver.path("lp", "users/whoami")).toBe(
			"/d2l/api/lp/1.49/users/whoami"
		);
		expect(resolver.unstablePath("le", "/quizzes/1")).toBe(
			"/d2l/api/le/unstable/quizzes/1"
		);
	});

	it("throws VersionError when the host does not support a version", async () => {
		const resolver = new VersionResolver();
		const client = {
			post: vi.fn().mockResolvedValue({
				Supported: false,
				Versions: [
					{
						ProductCode: "lp",
						Version: "1.48",
						Supported: false,
						LatestVersion: "1.49",
					},
				],
			}),
		};

		await expect(resolver.check(client)).rejects.toBeInstanceOf(VersionError);
	});

	it("stores negotiated versions and warns on floor and newer versions", async () => {
		const resolver = new VersionResolver();
		const warnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		const client = {
			post: vi.fn().mockResolvedValue({
				Supported: true,
				Versions: [
					{
						ProductCode: "lp",
						Version: "1.48",
						Supported: true,
						LatestVersion: "1.50",
					},
				],
			}),
		};

		await resolver.check(client);
		expect(resolver.path("lp", "users")).toBe("/d2l/api/lp/1.48/users");
		expect(warnSpy).toHaveBeenCalled();
		warnSpy.mockRestore();
	});
});
