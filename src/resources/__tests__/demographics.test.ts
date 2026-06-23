import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("DemographicsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		respondJsonOnce({
			Supported: true,
			Versions: [
				{ ProductCode: "lp", Version: "1.49", Supported: true },
				{ ProductCode: "le", Version: "1.82", Supported: true },
			],
		});
	});

	it("routes demographic data, field, user, and org-unit calls", async () => {
		const client = createTestClient();
		respondJsonOnce([{ Id: 1 }]);
		respondJsonOnce([{ Id: 2 }]);
		respondJsonOnce({ Id: 3 });
		respondJsonOnce({ Id: 4 });
		respondJsonOnce(undefined, 204);
		respondJsonOnce({
			Objects: [{ UserId: 5 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ UserId: 6 }], HasMoreItems: false });

		await client.demographics.listDataTypes();
		await client.demographics.listFields();
		await client.demographics.retrieveField(3);
		await client.demographics.retrieveUserEntries(4);
		await client.demographics.delUserEntries(4, [7, 8]);
		const page = await client.demographics.listOrgUnitUserEntries(1, {
			search: "Ada",
		});
		await page.toArray();

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/demographics/dataTypes/"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/demographics/fields/"
		);
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/demographics/fields/3"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/demographics/users/4"
		);
		expect(mockFetch.mock.calls[5]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/demographics/users/4?entryIds=7,8"
		);
		expect(String(mockFetch.mock.calls[6]?.[0])).toContain(
			"/demographics/orgUnits/1/users/?search=Ada"
		);
		expect(String(mockFetch.mock.calls[7]?.[0])).toContain("bookmark=next");
	});
});
