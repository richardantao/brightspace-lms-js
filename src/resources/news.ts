import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L News API response shapes
// @see https://docs.valence.desire2learn.com/res/news.html
// ---------------------------------------------------------------------------

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface NewsAttachment {
	FileId: number;
	FileName: string;
	FileSize: number;
}

/**
 * News.NewsItem — returned by retrieve and list actions.
 * @see https://docs.valence.desire2learn.com/res/news.html#News.NewsItem
 */
export interface NewsItem {
	Id: number;
	IsHidden: boolean;
	Attachments: NewsAttachment[];
	Title: string;
	Body: RichText;
	CreatedBy: number | null;
	CreatedDate: string | null;
	LastModifiedBy: number | null;
	LastModifiedDate: string | null;
	StartDate: string | null;
	EndDate: string | null;
	IsGlobal: boolean;
	IsPublished: boolean;
	ShowOnlyInCourseOfferings: boolean;
	IsAuthorInfoShown: boolean;
	IsPinned: boolean;
	/** Added with LE API v1.81 */
	PinnedDate: string | null;
	/** Added with LE API v1.75 */
	IsStartDateShown: boolean;
	/** Added with LE API v1.75 */
	SortOrder: number;
}

/**
 * News.NewsItemData — body for create and update actions.
 *
 * Note: Do not provide an empty string for Body.Html if you intend a
 * text-only body. Pass null for the Html field instead.
 *
 * @see https://docs.valence.desire2learn.com/res/news.html#News.NewsItemData
 */
export interface NewsItemData {
	Title: string;
	Body: RichText;
	StartDate: string;
	EndDate: string | null;
	IsGlobal: boolean;
	IsPublished: boolean;
	ShowOnlyInCourseOfferings: boolean;
	IsAuthorInfoShown: boolean;
	IsPinned: boolean;
	/** Added with LE API v1.75 */
	IsStartDateShown: boolean;
	/** Added with LE API v1.75 */
	SortOrder: number | null;
}

/**
 * News.NewsFeed — wrapper returned by the user news feed endpoint.
 * @see https://docs.valence.desire2learn.com/res/news.html#News.NewsFeed
 */
export interface NewsFeed {
	OrgUnitId: number;
	Resource: NewsItem;
}

/**
 * Feed.UserFeedResource — generic feed item wrapper for the user feed endpoint.
 * Resource type varies depending on the source of the feed item.
 * @see https://docs.valence.desire2learn.com/res/news.html#Feed.UserFeedResource
 */
export interface UserFeedResource {
	Type: string;
	MessageMetaData: {
		Identifier: string;
		Title: string;
		Summary: RichText;
		Date: string;
		ApiViewUrl: string;
		WebViewUrl: string;
	};
	Resource: unknown;
}

/** Sharing rule for a news item */
export interface OrgUnitSharingRuleData {
	SharingOrgUnitId: number;
	ShareWithOrgUnit: boolean;
	ShareWithDescendants: boolean;
	ShareWithDescendantsOfType: number | null;
}

/** Input for updating an existing sharing rule */
export interface UpdateOrgUnitSharingRuleData {
	ShareWithOrgUnit: boolean;
	ShareWithDescendants: boolean;
	ShareWithDescendantsOfType: number | null;
}

export interface ListNewsParams {
	since?: string;
	until?: string;
	bookmark?: string;
}

export interface ListUserFeedParams {
	since?: string;
	until?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class NewsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Org unit news
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve news items for an org unit.
	 * Required scope: `news:newsitems:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/news/
	 * @see https://docs.valence.desire2learn.com/res/news.html#get--d2l-api-le-(version)-(orgUnitId)-news-
	 */
	async list(
		orgUnitId: number,
		params: ListNewsParams = {}
	): Promise<PaginatedList<NewsItem>> {
		const page = await this.fetchNewsPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a specific news item.
	 * Required scope: `news:newsitems:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#get--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)
	 */
	async retrieve(orgUnitId: number, newsItemId: number): Promise<NewsItem> {
		return this.get<NewsItem>("le", `${orgUnitId}/news/${newsItemId}`);
	}

	/**
	 * Create a news item for an org unit.
	 * Required scope: `news:newsitems:manage`
	 * POST /d2l/api/le/(version)/(orgUnitId)/news/
	 * @see https://docs.valence.desire2learn.com/res/news.html#post--d2l-api-le-(version)-(orgUnitId)-news-
	 */
	async create(orgUnitId: number, data: NewsItemData): Promise<NewsItem> {
		return this.post<NewsItem>("le", `${orgUnitId}/news/`, data);
	}

	/**
	 * Update a news item.
	 * Required scope: `news:newsitems:manage`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#put--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)
	 */
	async update(
		orgUnitId: number,
		newsItemId: number,
		data: NewsItemData
	): Promise<NewsItem> {
		return this.put<NewsItem>("le", `${orgUnitId}/news/${newsItemId}`, data);
	}

	/**
	 * Delete a news item.
	 * Required scope: `news:newsitems:manage`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#delete--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)
	 */
	async del(orgUnitId: number, newsItemId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/news/${newsItemId}`);
	}

	/**
	 * Delete an attachment from a news item.
	 * Required scope: `news:newsitems:manage`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)/attachments/(fileId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#delete--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)-attachments-(fileId)
	 */
	async delAttachment(
		orgUnitId: number,
		newsItemId: number,
		fileId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/news/${newsItemId}/attachments/${fileId}`
		);
	}

	// ---------------------------------------------------------------------------
	// User news feed
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve news items for a specific user across all their org units.
	 * Subject to User Information Privacy permissions.
	 * Required scope: `news:newsitems:read`
	 * GET /d2l/api/le/(version)/news/user/(userId)/
	 * @see https://docs.valence.desire2learn.com/res/news.html#get--d2l-api-le-(version)-news-user-(userId)-
	 */
	async listUserNews(
		userId: number,
		params: ListNewsParams = {}
	): Promise<PaginatedList<NewsFeed>> {
		const page = await this.fetchUserNewsPage(userId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve the activity feed for the current user context.
	 * Aggregates news items and other events from all enrolled org units.
	 * Returns up to 24 hours of recent events when called without parameters.
	 * GET /d2l/api/lp/(version)/feed/
	 * @see https://docs.valence.desire2learn.com/res/news.html#get--d2l-api-lp-(version)-feed-
	 */
	async retrieveFeed(
		params: ListUserFeedParams = {}
	): Promise<UserFeedResource[]> {
		const query = buildQueryString({
			since: params.since,
			until: params.until,
		});
		return this.get<UserFeedResource[]>("lp", `feed/${query}`);
	}

	// ---------------------------------------------------------------------------
	// Sharing rules
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all sharing rules for a news item.
	 * Required scope: `news:newsitems:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)/sharingrules/
	 * @see https://docs.valence.desire2learn.com/res/news.html#get--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)-sharingrules-
	 */
	async listSharingRules(
		orgUnitId: number,
		newsItemId: number
	): Promise<OrgUnitSharingRuleData[]> {
		return this.get<OrgUnitSharingRuleData[]>(
			"le",
			`${orgUnitId}/news/${newsItemId}/sharingrules/`
		);
	}

	/**
	 * Create a sharing rule for a news item.
	 * Required scope: `news:newsitems:manage`
	 * POST /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)/sharingrules/
	 * @see https://docs.valence.desire2learn.com/res/news.html#post--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)-sharingrules-
	 */
	async createSharingRule(
		orgUnitId: number,
		newsItemId: number,
		data: OrgUnitSharingRuleData
	): Promise<OrgUnitSharingRuleData> {
		return this.post<OrgUnitSharingRuleData>(
			"le",
			`${orgUnitId}/news/${newsItemId}/sharingrules/`,
			data
		);
	}

	/**
	 * Update a sharing rule for a news item.
	 * Required scope: `news:newsitems:manage`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)/sharingrules/(sharingOrgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#put--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)-sharingrules-(sharingOrgUnitId)
	 */
	async updateSharingRule(
		orgUnitId: number,
		newsItemId: number,
		sharingOrgUnitId: number,
		data: UpdateOrgUnitSharingRuleData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/news/${newsItemId}/sharingrules/${sharingOrgUnitId}`,
			data
		);
	}

	/**
	 * Delete a sharing rule from a news item.
	 * Required scope: `news:newsitems:manage`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/news/(newsItemId)/sharingrules/(sharingOrgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/news.html#delete--d2l-api-le-(version)-(orgUnitId)-news-(newsItemId)-sharingrules-(sharingOrgUnitId)
	 */
	async delSharingRule(
		orgUnitId: number,
		newsItemId: number,
		sharingOrgUnitId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/news/${newsItemId}/sharingrules/${sharingOrgUnitId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchNewsPage(
		orgUnitId: number,
		params: ListNewsParams
	): Promise<PaginatedPageResponse<NewsItem>> {
		const query = buildQueryString({
			since: params.since,
			until: params.until,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<NewsItem>>(
			"le",
			`${orgUnitId}/news/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchNewsPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchUserNewsPage(
		userId: number,
		params: ListNewsParams
	): Promise<PaginatedPageResponse<NewsFeed>> {
		const query = buildQueryString({
			since: params.since,
			until: params.until,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<NewsFeed>>(
			"le",
			`news/user/${userId}/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchUserNewsPage(userId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}