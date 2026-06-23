import { beforeEach, describe, expect, it } from "vitest";

import {
	createTestClient,
	mockFetch,
	respondJsonOnce,
} from "../../__tests__/test-utils";

describe("ContentResource", () => {
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

	it("hits topic, module, and progress routes", async () => {
		const client = createTestClient();
		respondJsonOnce({ Id: 1 });
		respondJsonOnce({ Id: 2 });
		respondJsonOnce({ Id: 3 });
		respondJsonOnce({ Completed: true });
		respondJsonOnce(undefined, 204);

		await client.content.retrieveToc(1);
		await client.content.createRootModule(1, { Title: "Module" } as never);
		await client.content.createTopic(1, 2, { Title: "Topic" } as never);
		await client.content.updateUserProgress(1, 2, 3, true);
		await client.content.delTopic(1, 2);

		expect(mockFetch.mock.calls[1]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/content/toc"
		);
		expect(mockFetch.mock.calls[2]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/content/root/"
		);
		expect(mockFetch.mock.calls[3]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/content/modules/2/structure/"
		);
		expect(
			JSON.parse(mockFetch.mock.calls[4]?.[1].body as string)
		).toMatchObject({ Completed: true });
		expect(mockFetch.mock.calls[5]?.[0]).toBe(
			"https://example.brightspace.com/d2l/api/le/1.82/1/content/topics/2"
		);
	});
});
