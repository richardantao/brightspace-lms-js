import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("AccommodationsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("retrieves and updates accommodations routes", async () => {
		const client = createTestClient();
		respondJsonOnce({
			OrgUnitId: 1,
			UserId: 2,
			QuizzingAccommodations: {
				QuizzingControlAccommodation: { AlwaysAllowRightClick: true },
				QuizzingTimeLimitAccommodation: {
					TimeLimitOperation: 1,
					TimeMultiplier: 2,
					AdditionalTime: 0,
				},
			},
		});
		respondJsonOnce({
			OrgUnitId: 1,
			UserId: 2,
			QuizzingAccommodations: {
				QuizzingControlAccommodation: { AlwaysAllowRightClick: true },
				QuizzingTimeLimitAccommodation: {
					TimeLimitOperation: 1,
					TimeMultiplier: 2,
					AdditionalTime: 0,
				},
			},
		});
		respondJsonOnce({
			OrgUnitId: 1,
			UserId: 2,
			QuizzingAccommodations: {
				QuizzingControlAccommodation: { AlwaysAllowRightClick: true },
				QuizzingTimeLimitAccommodation: {
					TimeLimitOperation: 1,
					TimeMultiplier: 2,
					AdditionalTime: 0,
				},
			},
		});

		await client.accommodations.retrieve(1, 2);
		await client.accommodations.retrieveMine(1);
		await client.accommodations.update({
			OrgUnitId: 1,
			UserId: 2,
			QuizzingAccommodations: {
				QuizzingControlAccommodation: { AlwaysAllowRightClick: true },
				QuizzingTimeLimitAccommodation: {
					TimeLimitOperation: 1,
					TimeMultiplier: 2,
					AdditionalTime: 0,
				},
			},
		});

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/accommodations/1/users/2"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/accommodations/1/myaccommodations"
		);
		expect(JSON.parse(mockFetch.mock.calls[3]?.[1].body)).toMatchObject({
			OrgUnitId: 1,
			UserId: 2,
		});
	});
});
