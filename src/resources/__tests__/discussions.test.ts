import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("DiscussionsResource", () => {
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

	it("threads bookmarks and routes forum/topic/post calls", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ ForumId: 1 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ ForumId: 2 }], HasMoreItems: false });
		respondJsonOnce({ ForumId: 3 });
		respondJsonOnce(undefined, 204);

		const page = await client.discussions.listForums(1);
		await page.toArray();
		await client.discussions.createForum(1, {
			Name: "Forum",
			Description: { Text: "d", Html: null },
			ShowDescriptionInTopics: true,
			StartDate: null,
			EndDate: null,
			AllowAnonymous: false,
			IsHidden: false,
			RequiresApproval: false,
			MustPostToParticipate: false,
			DisplayInCalendar: null,
			StartDateAvailabilityType: null,
			EndDateAvailabilityType: null,
		});
		await client.discussions.delTopic(1, 2, 3);

		expect(String(mockFetch.mock.calls[1]?.[0])).toContain(
			"/discussions/forums/"
		);
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain("bookmark=next");
		expect(
			JSON.parse(mockFetch.mock.calls[3]?.[1].body as string)
		).toMatchObject({ Name: "Forum" });
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/discussions/forums/2/topics/3"
		);
	});
});
