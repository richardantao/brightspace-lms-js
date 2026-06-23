import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("QuizzesResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("paginates quiz lists and routes attempts correctly", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ Id: 1 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ Id: 2 }], HasMoreItems: false });
		respondJsonOnce({ Id: 3 });

		const page = await client.quizzes.list(1);
		await page.toArray();
		await client.quizzes.retrieveAttempt(1, 2, 3);

		expect(String(mockFetch.mock.calls[1]?.[0])).toContain(
			"/d2l/api/le/1.82/1/quizzes/"
		);
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain("bookmark=next");
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/quizzes/2/attempts/3"
		);
	});
});
