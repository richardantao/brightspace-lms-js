import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("OrgUnitsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("hits the organization and org structure routes", async () => {
		const client = createTestClient();
		respondJsonOnce({ Identifier: "org" });
		respondJsonOnce("https://example.brightspace.com");
		respondJsonOnce({
			Objects: [{ Identifier: "1" }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ Identifier: "2" }], HasMoreItems: false });

		await client.orgUnits.retrieveOrganization();
		await client.orgUnits.retrievePrimaryUrl();
		const page = await client.orgUnits.list();
		await page.toArray();

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/organization/info"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/organization/primary-url"
		);
		expect(String(mockFetch.mock.calls[3]?.[0])).toContain(
			"/d2l/api/lp/1.49/orgstructure/"
		);
		expect(String(mockFetch.mock.calls[4]?.[0])).toContain("bookmark=next");
	});
});
