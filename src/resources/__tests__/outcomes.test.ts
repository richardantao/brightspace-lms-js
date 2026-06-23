import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("OutcomesResource", () => {
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

	it("routes outcome sets, exports, and alignments correctly", async () => {
		const client = createTestClient();
		respondJsonOnce([{ Id: 1 }]);
		respondJsonOnce({ Id: 2 });
		respondJsonOnce({ Id: 3 });
		respondJsonOnce({ Id: 4 });
		respondJsonOnce(undefined, 204);

		await client.outcomes.listOrgOutcomeSets();
		await client.outcomes.retrieveOrgUnitOutcomeSet(1, 2);
		await client.outcomes.exportOutcomeSet(3);
		await client.outcomes.listAlignments(1, "Quiz", 4);
		await client.outcomes.updateAlignments(1, "Quiz", 4, {
			Alignments: [],
		} as never);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/lo/outcomeSets/"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/lo/outcomeSets/2"
		);
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/lo/outcomeSets/3/export"
		);
		expect(mockFetch.mock.calls[4]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/lo/alignments/Quiz/4"
		);
	});
});
