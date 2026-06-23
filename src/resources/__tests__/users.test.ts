import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("UsersResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("calls the expected retrieve, list, create, and delete routes", async () => {
		const client = createTestClient();
		respondJsonOnce({ UserId: 42, FirstName: "Ada", LastName: "Lovelace" });
		respondJsonOnce({
			Objects: [{ UserId: 1 }],
			HasMoreItems: true,
			Bookmark: "cursor-abc",
		});
		respondJsonOnce({ Objects: [{ UserId: 2 }], HasMoreItems: false });
		respondJsonOnce({ UserId: 7 });
		respondJsonOnce(undefined, 204);

		await client.users.retrieve(42);
		const page = await client.users.list();
		await page.toArray();
		await client.users.create({
			OrgDefinedId: "ada",
			FirstName: "Ada",
			MiddleName: null,
			LastName: "Lovelace",
			ExternalEmail: null,
			UserName: "ada",
			RoleId: 110,
			IsActive: true,
			SendCreationEmail: false,
			Pronouns: null,
		});
		await client.users.del(7);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/users/42"
		);
		expect(String(mockFetch.mock.calls[2]?.[0])).toContain(
			"/d2l/api/lp/1.49/users/"
		);
		expect(String(mockFetch.mock.calls[3]?.[0])).toContain(
			"bookmark=cursor-abc"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/users/"
		);
		expect(
			JSON.parse(mockFetch.mock.calls[4]?.[1].body as string)
		).toMatchObject({ UserName: "ada", IsActive: true });
		expect(mockFetch.mock.calls[5]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/lp/1.49/users/7"
		);
	});
});
