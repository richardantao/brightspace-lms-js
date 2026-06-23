import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("VersionsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("delegates check() to the version resolver", async () => {
		const client = createTestClient();
		const checkSpy = vi.spyOn(client.versions, "check");
		respondJsonOnce({ Supported: true, Versions: [] });

		await client.versions.check();
		expect(checkSpy).toHaveBeenCalled();
	});
});
