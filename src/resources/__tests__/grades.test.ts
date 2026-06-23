import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("GradesResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("paginates grade values and builds nested value routes", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ GradeObjectIdentifier: "1" }],
			HasMoreItems: true,
			Bookmark: "cursor-abc",
		});
		respondJsonOnce({
			Objects: [{ GradeObjectIdentifier: "2" }],
			HasMoreItems: false,
		});
		respondJsonOnce({ GradeObjectIdentifier: "3" });

		const page = await client.grades.listValues(1, { graded: true });
		await page.toArray();
		await client.grades.retrieveValue(1, 2, 3);

		expect(mockFetch.mock.calls[1]?.[0]).toContain(
			"/d2l/api/le/1.82/1/grades/values/?graded=true"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toContain("bookmark=cursor-abc");
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/grades/2/values/3"
		);
	});
});
