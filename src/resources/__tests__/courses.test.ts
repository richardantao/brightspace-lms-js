import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("CoursesResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("hits the expected course routes and bulk update body shape", async () => {
		const client = createTestClient();
		respondJsonOnce({ Identifier: "1", Name: "Course" });
		respondJsonOnce({ Objects: [{ Identifier: "1" }], HasMoreItems: false });
		respondJsonOnce({ Identifier: "2" });
		respondJsonOnce({ Identifier: "3" });
		respondJsonOnce(undefined, 204);
		respondJsonOnce({ JobToken: "job-1" });

		await client.courses.retrieve(1);
		await client.courses.list();
		await client.courses.create({
			Name: "Course",
			Code: "C101",
			Path: "/content",
			CourseTemplateId: 10,
			SemesterId: null,
			StartDate: null,
			EndDate: null,
			LocaleId: null,
			ForceLocale: false,
			ShowAddressBook: false,
			Description: { Content: "desc", Type: "Text" },
			CanSelfRegister: null,
		});
		await client.courses.update(3, {
			Name: "Course",
			Code: "C101",
			StartDate: null,
			EndDate: null,
			LocaleId: null,
			ForceLocale: false,
			ShowAddressBook: false,
			IsActive: true,
			Description: { Content: "desc", Type: "Text" },
			CanSelfRegister: null,
		});
		await client.courses.del(3);
		await client.courses.createBulkUpdateJob([1, 2], {
			StartDate: null,
			StartOffsetAmount: 0,
			EndDate: null,
			EndOffsetAmount: 0,
			Status: true,
		});

		expect(mockFetch.mock.calls[1]?.[0]).toContain(
			"/d2l/api/lp/1.49/courses/1"
		);
		expect(
			JSON.parse(mockFetch.mock.calls[4]?.[1].body as string)
		).toMatchObject({ Name: "Course", Code: "C101" });
		expect(mockFetch.mock.calls[6]?.[0]).toContain(
			"/d2l/api/lp/1.49/courses/updates/"
		);
		expect(
			JSON.parse(mockFetch.mock.calls[6]?.[1].body as string)
		).toMatchObject({ OrgUnitIds: [1, 2] });
	});
});
