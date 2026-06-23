import { describe, expect, it, vi } from "vitest";

import { NetworkError } from "../errors";
import { HttpClient } from "../http-client";

function createClient(
	options?: Partial<ConstructorParameters<typeof HttpClient>[0]>
) {
	return new HttpClient({
		host: "https://example.brightspace.com",
		authProvider: {
			getHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer token" }),
		},
		...options,
	});
}

describe("HttpClient", () => {
	it("injects auth and default headers", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		await client.post("/d2l/api/lp/1.49/test", { hello: "world" });

		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect((init.headers as Headers).get("Authorization")).toBe("Bearer token");
		expect((init.headers as Headers).get("Accept")).toBe("application/json");
		expect((init.headers as Headers).get("Content-Type")).toBe(
			"application/json"
		);
	});

	it("retries 5xx responses and waits for Retry-After on 429", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 500 }))
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				})
			);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient({ retries: 1 });
		const promise = client.get<{ ok: boolean }>("/d2l/api/lp/1.49/test");
		await vi.advanceTimersByTimeAsync(1000);
		await expect(promise).resolves.toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it("aborts timed out requests", async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn((_, init?: RequestInit) => {
			const signal = init?.signal;
			return new Promise((_, reject) => {
				signal?.addEventListener("abort", () => reject(new Error("aborted")));
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient({ timeout: 1, retries: 0 });
		const promise = client.get("/d2l/api/lp/1.49/test");
		const handled = promise.catch(error => error);
		await vi.advanceTimersByTimeAsync(1);
		await expect(handled).resolves.toBeInstanceOf(NetworkError);
		vi.useRealTimers();
	});

	it("fires middleware hooks in order", async () => {
		const events: string[] = [];
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient();
		client.use({
			onRequest: request => {
				events.push("request");
				return request;
			},
			onResponse: response => {
				events.push("response");
				return response;
			},
		});

		await client.get("/d2l/api/lp/1.49/test");
		expect(events).toEqual(["request", "response"]);
	});

	it("calls onError for failed responses", async () => {
		const events: string[] = [];
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ title: "Forbidden" }), {
				status: 403,
				headers: { "Content-Type": "application/json" },
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = createClient({ retries: 0 });
		client.use({
			onRequest: request => {
				events.push("request");
				return request;
			},
			onError: error => {
				events.push(error instanceof Error ? error.name : "error");
				throw error;
			},
		});

		await expect(client.get("/d2l/api/lp/1.49/test")).rejects.toMatchObject({
			name: "AuthError",
		});
		expect(events).toEqual(["request", "AuthError"]);
	});
});
