import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("EnrollmentsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("threads bookmarks through my enrollments and returns delete payloads", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ OrgUnit: { Id: 1 } }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ OrgUnit: { Id: 2 } }], HasMoreItems: false });
		respondJsonOnce({ OrgUnitId: 1, UserId: 2, RoleId: 3, IsCascading: false });

		const page = await client.enrollments.listMyCourses();
		await page.toArray();
		const deleted = await client.enrollments.del(1, 2);

		expect(mockFetch.mock.calls[1]?.[0]).toContain(
			"/enrollments/myenrollments/"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toContain("bookmark=next");
		expect(deleted).toEqual({
			OrgUnitId: 1,
			UserId: 2,
			RoleId: 3,
			IsCascading: false,
		});
	});
});
