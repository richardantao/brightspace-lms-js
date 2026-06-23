import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("GroupsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("hits category and section routes", async () => {
		const client = createTestClient();
		respondJsonOnce([{ Id: 1 }]);
		respondJsonOnce({ JobToken: "job-1" });
		respondJsonOnce(undefined, 204);

		await client.groups.listCategories(1);
		await client.groups.createCategory(1, {
			Name: "Group A",
			EnrollmentType: 1,
			IsActive: true,
			AutoEnrollment: false,
			CategoryIdentifier: "g1",
		} as never);
		await client.groups.enrollUserInSection(1, 2, 3);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/1/groupcategories/"
		);
		expect(
			JSON.parse(mockFetch.mock.calls[2]?.[1].body as string)
		).toMatchObject({ Name: "Group A" });
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/1/sections/2/enrollments/3"
		);
	});
});
