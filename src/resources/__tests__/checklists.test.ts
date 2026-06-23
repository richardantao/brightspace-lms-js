import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("ChecklistsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("hits checklist and item routes", async () => {
		const client = createTestClient();
		respondJsonOnce([{ Id: 1 }]);
		respondJsonOnce({ Id: 2 });
		respondJsonOnce({ Id: 3 });
		respondJsonOnce(undefined, 204);

		await client.checklists.list(1);
		await client.checklists.retrieve(1, 2);
		await client.checklists.createItem(1, 2, {
			Name: "Item",
			Description: "Desc",
		} as never);
		await client.checklists.delItem(1, 2, 3);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/checklists/"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/checklists/2"
		);
		expect(JSON.parse(mockFetch.mock.calls[3]?.[1].body)).toMatchObject({
			Name: "Item",
		});
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/checklists/2/items/3"
		);
	});
});
