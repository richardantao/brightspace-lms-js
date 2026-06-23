import { describe, expect, it } from "vitest";

import { CursorPaginatedList } from "../paginated-list";

describe("CursorPaginatedList", () => {
	it("throws when nextPage() is called and hasMore is false", async () => {
		const list = new CursorPaginatedList([1, 2], false);
		await expect(list.nextPage()).rejects.toThrow(/hasMore is false/);
	});

	it("iterates and flattens all pages in order", async () => {
		const list = new CursorPaginatedList([1, 2], true, async () => ({
			items: [3],
			hasMore: true,
			next: async () => ({ items: [4, 5], hasMore: false }),
		}));

		expect(await list.toArray()).toEqual([1, 2, 3, 4, 5]);
	});
});
