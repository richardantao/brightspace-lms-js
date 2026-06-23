import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("AwardsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		respondJsonOnce({
			Supported: true,
			Versions: [
				{ ProductCode: "lp", Version: "1.49", Supported: true },
				{ ProductCode: "le", Version: "1.82", Supported: true },
				{ ProductCode: "bas", Version: "1.4", Supported: true },
			],
		});
	});

	it("routes library, associations, and issued award requests", async () => {
		const client = createTestClient();
		respondJsonOnce([{ AwardId: 1 }]);
		respondJsonOnce({
			Objects: [{ AssociationId: 2 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ AssociationId: 3 }], HasMoreItems: false });
		respondJsonOnce([{ AwardId: 4 }]);
		respondJsonOnce({ AwardId: 5 });
		respondJsonOnce(undefined, 204);

		await client.awards.listLibrary();
		const page = await client.awards.listAssociations(1);
		await page.toArray();
		await client.awards.listMyAssociations(1);
		await client.awards.issue(1, 2, { AwardId: 4 } as never);
		await client.awards.revoke(1, 5);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/bas/1.4/awards/library/"
		);
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain(
			"/awards/orgUnits/1/associations/"
		);
		expect(String(mockFetch.mock.calls[3]?.[0])).toContain("bookmark=next");
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/bas/1.4/awards/orgUnits/1/associations/myassociations/"
		);
		expect(mockFetch.mock.calls[5]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/bas/1.4/awards/orgUnits/1/issued/users/2"
		);
		expect(mockFetch.mock.calls[6]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/bas/1.4/awards/orgUnits/1/issued/5"
		);
	});
});
