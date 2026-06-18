import type { PaginatedList } from "../types";

// ---------------------------------------------------------------------------
// D2L wire format for paged responses
// @see https://docs.valence.desire2learn.com/basic/apicall.html#paged-data
// ---------------------------------------------------------------------------

/**
 * Raw D2L paged response shape as returned over the wire.
 * All paginated list endpoints return this structure.
 *
 * - `Objects`      — the current page's items
 * - `HasMoreItems` — whether additional pages exist
 * - `Bookmark`     — opaque cursor to pass as a query param to fetch the next page
 *
 * Consumers never see this type — it is mapped to PaginatedPageResponse
 * inside each resource method via `fromD2LPage()`.
 */
export interface D2LPageResponse<T> {
	Objects: T[];
	HasMoreItems: boolean;
	Bookmark?: string;
}

/**
 * Internal page representation used by CursorPaginatedList.
 * Mapped from D2LPageResponse via `fromD2LPage()`.
 */
export interface PaginatedPageResponse<T> {
	items: T[];
	hasMore: boolean;
	/** Resolves the next page. Absent on the final page. */
	next?: () => Promise<PaginatedPageResponse<T>>;
}

/**
 * Maps a raw D2L paged response to the internal PaginatedPageResponse shape.
 *
 * @param raw       - The raw response body from D2L
 * @param fetchNext - Factory that fetches the next page given a bookmark cursor.
 *                    Called with `raw.Bookmark` when `HasMoreItems` is true.
 */
export function fromD2LPage<T>(
	raw: D2LPageResponse<T>,
	fetchNext: (bookmark: string) => Promise<PaginatedPageResponse<T>>
): PaginatedPageResponse<T> {
	return {
		items: raw.Objects,
		hasMore: raw.HasMoreItems,
		next:
			raw.HasMoreItems && raw.Bookmark
				? () => fetchNext(raw.Bookmark as string)
				: undefined,
	};
}

// ---------------------------------------------------------------------------
// PaginatedList implementation
// ---------------------------------------------------------------------------

export class CursorPaginatedList<T> implements PaginatedList<T> {
	constructor(
		public readonly values: T[],
		public readonly hasMore: boolean,
		private readonly nextResolver?: () => Promise<PaginatedPageResponse<T>>
	) {}

	async nextPage(): Promise<PaginatedList<T>> {
		if (!this.hasMore) {
			throw new Error(
				"Cannot call nextPage() when hasMore is false. " +
					"Check hasMore before calling nextPage(), or use the async iterator instead."
			);
		}
		if (!this.nextResolver) {
			throw new Error(
				"No page resolver available. " +
					"This list was not constructed with pagination support."
			);
		}

		const page = await this.nextResolver();
		return new CursorPaginatedList<T>(page.items, page.hasMore, page.next);
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		let page: PaginatedList<T> = this;

		while (true) {
			for (const value of page.values) {
				yield value;
			}
			if (!page.hasMore) break;
			page = await page.nextPage();
		}
	}

	async toArray(): Promise<T[]> {
		const out: T[] = [];
		for await (const value of this) {
			out.push(value);
		}
		return out;
	}
}

/**
 * Constructs a CursorPaginatedList from a raw D2L paged response.
 *
 * Usage in a resource method:
 *
 * ```ts
 * const raw = await this.get<D2LPageResponse<D2LUser>>("lp", "users/");
 * return paginatedListFromD2L(raw, bookmark =>
 *   this.get<D2LPageResponse<D2LUser>>("lp", `users/?bookmark=${bookmark}`)
 *     .then(r => fromD2LPage(r, bm => ...))
 * );
 * ```
 */
export function paginatedListFromD2L<T>(
	raw: D2LPageResponse<T>,
	fetchNext: (bookmark: string) => Promise<PaginatedPageResponse<T>>
): CursorPaginatedList<T> {
	const page = fromD2LPage(raw, fetchNext);
	return new CursorPaginatedList<T>(page.items, page.hasMore, page.next);
}