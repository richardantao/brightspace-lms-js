import { vi } from "vitest";

import { BrightspaceClient } from "..";

export const mockFetch: ReturnType<typeof vi.fn> = vi.fn();
vi.stubGlobal("fetch", mockFetch);

export function respondJsonOnce(
	body: unknown,
	status = 200,
	headers: Record<string, string> = {}
): void {
	mockFetch.mockResolvedValueOnce(
		new Response(JSON.stringify(body), {
			status,
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
		})
	);
}

export function respondTextOnce(
	body: string,
	status = 200,
	headers: Record<string, string> = {}
): void {
	mockFetch.mockResolvedValueOnce(
		new Response(body, {
			status,
			headers,
		})
	);
}

export function seedDefaultVersionCheck(): void {
	respondJsonOnce({
		Supported: true,
		Versions: [
			{ ProductCode: "lp", Version: "1.49", Supported: true },
			{ ProductCode: "le", Version: "1.82", Supported: true },
		],
	});
}

export function createTestClient(): BrightspaceClient {
	return new BrightspaceClient({
		host: "https://example.brightspace.com",
		auth: { type: "bearer", token: "test-token" },
	});
}
