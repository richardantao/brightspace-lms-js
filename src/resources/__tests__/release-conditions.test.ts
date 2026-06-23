import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("ReleaseConditionsResource", () => {
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

	it("routes release condition reads and writes for each entity type", async () => {
		const client = createTestClient();
		respondJsonOnce({ Conditions: [] });
		respondJsonOnce({ Conditions: [] });
		respondJsonOnce({ Conditions: [] });
		respondJsonOnce({ Conditions: [] });
		respondJsonOnce(undefined, 204);

		await client.releaseConditions.retrieveForContentTopic(1, 2);
		await client.releaseConditions.updateForDiscussionTopic(1, 2, 3, {
			Conditions: [],
		} as never);
		await client.releaseConditions.retrieveForQuiz(1, 4);
		await client.releaseConditions.updateForDropbox(1, 5, {
			Conditions: [],
		} as never);
		await client.releaseConditions.retrieveForDropbox(1, 5);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/content/topics/2/releaseconditions"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/discussions/forums/2/topics/3/releaseconditions"
		);
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/quizzes/4/releaseconditions"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/dropbox/folders/5/releaseconditions"
		);
	});
});
