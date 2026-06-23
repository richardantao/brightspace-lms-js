import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
	seedDefaultVersionCheck,
} from "../../__tests__/test-utils";

describe("AssessmentsResource", () => {
	beforeEach(() => {
		mockFetch.mockReset();
		seedDefaultVersionCheck();
	});

	it("routes rubric and assessment query strings correctly", async () => {
		const client = createTestClient();
		respondJsonOnce([{ RubricId: 1 }]);
		respondJsonOnce({ RubricId: 2 });
		respondJsonOnce({ RubricId: 3 });

		await client.assessments.listRubrics(1, {
			objectType: "Quiz",
			objectId: 2,
		});
		await client.assessments.retrieveAssessment(1, {
			assessmentType: "Rubric",
			objectType: "Quiz",
			objectId: 2,
			rubricId: 3,
			userId: 4,
		});
		await client.assessments.updateAssessment(
			1,
			{ objectType: "Quiz", objectId: 2, userId: 4 },
			{ RubricId: 3 } as never
		);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/rubrics?objectType=Quiz&objectId=2"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/assessment?assessmentType=Rubric&objectType=Quiz&objectId=2&rubricId=3&userId=4"
		);
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/assessment?objectType=Quiz&objectId=2&userId=4"
		);
	});
});
