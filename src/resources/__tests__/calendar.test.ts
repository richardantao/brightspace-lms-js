import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("CalendarResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("routes list, retrieve, counts, and mutation calls correctly", async () => {
		const client = createTestClient();
		respondJsonOnce({
			Objects: [{ EventId: 1 }],
			HasMoreItems: true,
			Bookmark: "next",
		});
		respondJsonOnce({ Objects: [{ EventId: 2 }], HasMoreItems: false });
		respondJsonOnce({ EventId: 3 });
		respondJsonOnce({ EventId: 4 });
		respondJsonOnce({ Count: 5 });
		respondJsonOnce({ EventId: 6 });
		respondJsonOnce({ EventId: 7 });
		respondJsonOnce(undefined, 204);
		respondJsonOnce(undefined, 204);
		respondJsonOnce(undefined, 204);

		const page = await client.calendar.list(1, {
			associationType: "Course" as never,
		});
		await page.toArray();
		await client.calendar.retrieve(1, 3);
		await client.calendar.retrieveWithOccurrences(1, 4);
		await client.calendar.retrieveCount(1);
		await client.calendar.create(1, { Title: "Event" } as never);
		await client.calendar.update(1, 6, { Title: "Event" } as never);
		await client.calendar.del(1, 7);
		await client.calendar.addPresenter(1, 8, 9);
		await client.calendar.removePresenter(1, 8, 9);

		expect(String(mockFetch.mock.calls[1]?.[0])).toContain("/calendar/events/");
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain("bookmark=next");
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/3"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/4/occurrences/"
		);
		expect(mockFetch.mock.calls[5]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/events/count/"
		);
		expect(mockFetch.mock.calls[6]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/"
		);
		expect(mockFetch.mock.calls[7]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/6"
		);
		expect(mockFetch.mock.calls[8]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/7"
		);
		expect(mockFetch.mock.calls[9]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/8/presenter/9"
		);
		expect(mockFetch.mock.calls[10]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/calendar/event/8/presenter/9"
		);
	});
});
