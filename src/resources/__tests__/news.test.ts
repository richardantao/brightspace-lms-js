import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("NewsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("threads bookmarks and query params through news routes", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ Id: 1 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ Id: 2 }], HasMoreItems: false });
		respondJsonOnce([{ Type: "feed" }]);
		respondJsonOnce(undefined, 204);

		const page = await client.news.list(1, { since: "2026-01-01T00:00:00Z" });
		await page.toArray();
		await client.news.retrieveFeed({
			since: "2026-01-01T00:00:00Z",
			until: "2026-01-02T00:00:00Z",
		});
		await client.news.delAttachment(1, 2, 3);

		expect(String(mockFetch.mock.calls[1]?.[0])).toContain(
			"/d2l/api/le/1.82/1/news/"
		);
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain("bookmark=next");
		expect(String(mockFetch.mock.calls[3]?.[0])).toContain(
			"/d2l/api/lp/1.49/feed/?since=2026-01-01T00%3A00%3A00Z&until=2026-01-02T00%3A00%3A00Z"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/news/2/attachments/3"
		);
	});
});
