import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Discussions API response shapes
// @see https://docs.valence.desire2learn.com/res/discuss.html
// ---------------------------------------------------------------------------

/** RATING_T — discussion topic rating type */
export const DiscussionRatingType = {
	None: 0,
	FiveStar: 1,
	UpVoteDownVote: 2,
	UpVoteOnly: 3,
} as const;
export type DiscussionRatingType =
	(typeof DiscussionRatingType)[keyof typeof DiscussionRatingType];

/** SCORING_T — discussion topic aggregate score calculation type */
export const DiscussionScoringType = {
	AverageMessageScore: 1,
	MaximumMessageScore: 2,
	MinimumMessageScore: 3,
	ModeHighestMessageScore: 4,
	ModeLowestMessageScore: 5,
	SumOfMessageScores: 6,
} as const;
export type DiscussionScoringType =
	(typeof DiscussionScoringType)[keyof typeof DiscussionScoringType];

/** POSTVOTE_T — post vote type */
export const PostVoteType = {
	DownVote: -1,
	NoVote: 0,
	UpVote: 1,
} as const;
export type PostVoteType = (typeof PostVoteType)[keyof typeof PostVoteType];

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

export interface DiscussionPostAttachment {
	FileId: number;
	FileName: string;
	FileSize: number;
}

/**
 * Discussions.Forum — returned by forum retrieve actions.
 * @see https://docs.valence.desire2learn.com/res/discuss.html#Discussions.Forum
 *
 * Note: IsLocked, PostStartDate, and PostEndDate are no longer used as of
 * LE API v1.56 — they will always be false/null when returned by the service.
 */
export interface DiscussionForum {
	ForumId: number;
	StartDate: string | null;
	EndDate: string | null;
	/** No longer used as of LE API v1.56. Always null. */
	PostStartDate: string | null;
	/** No longer used as of LE API v1.56. Always null. */
	PostEndDate: string | null;
	Name: string;
	Description: RichText;
	ShowDescriptionInTopics: boolean | null;
	AllowAnonymous: boolean;
	/** No longer used as of LE API v1.56. Always false. */
	IsLocked: boolean;
	IsHidden: boolean;
	RequiresApproval: boolean;
	DisplayInCalendar: boolean;
	/** No longer used as of LE API v1.56. */
	DisplayPostDatesInCalendar: boolean;
	StartDateAvailabilityType: string | null;
	EndDateAvailabilityType: string | null;
}

/**
 * Discussions.ForumData — body for create and update forum actions.
 * @see https://docs.valence.desire2learn.com/res/discuss.html#Discussions.ForumData
 *
 * Note: PostStartDate, PostEndDate, IsLocked, and DisplayPostDatesInCalendar
 * are ignored by the service as of LE API v1.56.
 */
export interface DiscussionForumData {
	Name: string;
	Description: RichText;
	ShowDescriptionInTopics: boolean | null;
	StartDate: string | null;
	EndDate: string | null;
	AllowAnonymous: boolean;
	IsHidden: boolean;
	RequiresApproval: boolean;
	/**
	 * Cannot be true if AllowAnonymous is true (400 error).
	 */
	MustPostToParticipate: boolean | null;
	/**
	 * Cannot be true if neither StartDate nor EndDate is provided (400 error).
	 */
	DisplayInCalendar: boolean | null;
	StartDateAvailabilityType: string | null;
	EndDateAvailabilityType: string | null;
}

/** Discussions.CopyForumData — body for copy forum action. */
export interface CopyForumData {
	IncludeTopics: boolean;
	IncludePinnedThreads: boolean;
}

/** Deleted forum entry in DeletedDiscussionsData */
export interface DeletedForum {
	ForumId: number;
	Name: string;
	DeletedDate: string;
	DeletedByUserId: number | null;
	TopicCount: number;
}

/** Deleted topic entry in DeletedDiscussionsData */
export interface DeletedTopic {
	TopicId: number;
	ParentForumId: number;
	Name: string;
	DeletedDate: string;
	DeletedByUserId: number | null;
}

/** Discussions.DeletedDiscussionsData */
export interface DeletedDiscussionsData {
	DeletedForums: DeletedForum[];
	DeletedTopics: DeletedTopic[];
}

/**
 * Discussions.Topic — returned by topic retrieve actions.
 * @see https://docs.valence.desire2learn.com/res/discuss.html#Discussions.Topic
 *
 * Note: IsLocked, UnlockStartDate, and UnlockEndDate are no longer used
 * as of LE API v1.56.
 */
export interface DiscussionTopic {
	ForumId: number;
	TopicId: number;
	Name: string;
	Description: RichText;
	StartDate: string | null;
	EndDate: string | null;
	/** No longer used as of LE API v1.56. Always null. */
	UnlockStartDate: string | null;
	/** No longer used as of LE API v1.56. Always null. */
	UnlockEndDate: string | null;
	/** No longer used as of LE API v1.56. Always false. */
	IsLocked: boolean;
	AllowAnonymousPosts: boolean;
	RequiresApproval: boolean;
	UnApprovedPostCount: number;
	PinnedPostCount: number;
	ScoringType: DiscussionScoringType;
	IsAutoScore: boolean;
	ScoreOutOf: number | null;
	IncludeNonScoredValues: boolean;
	ScoredCount: number;
	RatingsSum: number;
	RatingsCount: number;
	IsHidden: boolean;
	MustPostToParticipate: boolean;
	RatingType: DiscussionRatingType;
	ActivityId: string | null;
	/** Added with LE v1.29 */
	GroupTypeId: number | null;
	StartDateAvailabilityType: string | null;
	EndDateAvailabilityType: string | null;
	/** Added with LE API v1.90 */
	DueDate: string | null;
}

/**
 * Discussions.CreateTopicData — body for create and update topic actions.
 * @see https://docs.valence.desire2learn.com/res/discuss.html#Discussions.CreateTopicData
 */
export interface CreateDiscussionTopicData {
	Name: string;
	Description: RichTextInput;
	AllowAnonymousPosts: boolean;
	StartDate: string | null;
	EndDate: string | null;
	IsHidden: boolean;
	RequiresApproval: boolean;
	ScoreOutOf: number | null;
	IsAutoScore: boolean;
	IncludeNonScoredValues: boolean;
	ScoringType: DiscussionScoringType | null;
	MustPostToParticipate: boolean;
	RatingType: DiscussionRatingType | null;
	/** Cannot be true if neither StartDate nor EndDate is provided (400 error). */
	DisplayInCalendar: boolean | null;
	/** Added with LE v1.29 */
	GroupTypeId: number | null;
	StartDateAvailabilityType: string | null;
	EndDateAvailabilityType: string | null;
	/** Added with LE API v1.90 */
	DueDate: string | null;
}

/** Discussions.CopyTopicData */
export interface CopyTopicData {
	TargetForumId: number;
	IncludePinnedThreads: boolean;
}

/**
 * Discussions.Post — returned by post retrieve actions.
 * @see https://docs.valence.desire2learn.com/res/discuss.html#Discussions.Post
 */
export interface DiscussionPost {
	ForumId: number;
	PostId: number;
	TopicId: number;
	PostingUserId: number | null;
	PostingUserDisplayName: string;
	ThreadId: number;
	ParentPostId: number | null;
	Message: RichText;
	Subject: string;
	DatePosted: string;
	IsAnonymous: boolean;
	RequiresApproval: boolean;
	IsDeleted: boolean;
	LastEditedDate: string | null;
	LastEditedBy: number | null;
	CanRate: boolean;
	ReplyPostIds: number[];
	WordCount: number;
	AttachmentCount: number;
	/** Added with LE API v1.45 */
	IsRead: boolean;
	/** Added with LE API v1.95 */
	Attachments: DiscussionPostAttachment[];
	/** Added with LE API v1.95 */
	ThreadIsPinned: boolean;
}

/** Discussions.CreatePostData — body for create post action. */
export interface CreateDiscussionPostData {
	ParentPostId: number | null;
	Subject: string;
	Message: RichTextInput;
	IsAnonymous: boolean;
}

/** Discussions.ApprovalData */
export interface DiscussionApprovalData {
	IsApproved: boolean;
}

/** Discussions.FlagData */
export interface DiscussionFlagData {
	IsFlagged: boolean;
}

/** Discussion topic statistics per user */
export interface DiscussionTopicUserStatistics {
	UserId: number;
	PostCount: number;
	ReadPostCount: number;
	RatingGiven: number | null;
}

export interface ListForumsParams {
	bookmark?: string;
}

export interface ListTopicsParams {
	bookmark?: string;
}

export interface ListPostsParams {
	threadId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class DiscussionsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Forums
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of discussion forums for a course.
	 * Required scope: `discussions:forums:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-
	 */
	async listForums(
		orgUnitId: number,
		params: ListForumsParams = {}
	): Promise<PaginatedList<DiscussionForum>> {
		const page = await this.fetchForumsPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a specific discussion forum.
	 * Required scope: `discussions:forums:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)
	 */
	async retrieveForum(
		orgUnitId: number,
		forumId: number
	): Promise<DiscussionForum> {
		return this.get<DiscussionForum>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}`
		);
	}

	/**
	 * Create a discussion forum.
	 * Required scope: `discussions:forums:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/discussions/forums/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#post--d2l-api-le-(version)-(orgUnitId)-discussions-forums-
	 */
	async createForum(
		orgUnitId: number,
		data: DiscussionForumData
	): Promise<DiscussionForum> {
		return this.post<DiscussionForum>(
			"le",
			`${orgUnitId}/discussions/forums/`,
			data
		);
	}

	/**
	 * Copy a discussion forum.
	 * Required scope: `discussions:forums:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/copy
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#post--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-copy
	 */
	async copyForum(
		orgUnitId: number,
		forumId: number,
		data: CopyForumData
	): Promise<DiscussionForum> {
		return this.post<DiscussionForum>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/copy`,
			data
		);
	}

	/**
	 * Update a discussion forum.
	 * Required scope: `discussions:forums:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#put--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)
	 */
	async updateForum(
		orgUnitId: number,
		forumId: number,
		data: DiscussionForumData
	): Promise<DiscussionForum> {
		return this.put<DiscussionForum>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}`,
			data
		);
	}

	/**
	 * Delete a discussion forum.
	 * Required scope: `discussions:forums:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#delete--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)
	 */
	async delForum(orgUnitId: number, forumId: number): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}`
		);
	}

	/**
	 * Retrieve deleted forums and topics for a course.
	 * Required scope: `discussions:forums:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/deleted/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-deleted-
	 */
	async listDeleted(orgUnitId: number): Promise<DeletedDiscussionsData> {
		return this.get<DeletedDiscussionsData>(
			"le",
			`${orgUnitId}/discussions/forums/deleted/`
		);
	}

	// ---------------------------------------------------------------------------
	// Topics
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of topics for a forum.
	 * Required scope: `discussions:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-
	 */
	async listTopics(
		orgUnitId: number,
		forumId: number,
		params: ListTopicsParams = {}
	): Promise<PaginatedList<DiscussionTopic>> {
		const page = await this.fetchTopicsPage(orgUnitId, forumId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a specific discussion topic.
	 * Required scope: `discussions:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)
	 */
	async retrieveTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number
	): Promise<DiscussionTopic> {
		return this.get<DiscussionTopic>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`
		);
	}

	/**
	 * Create a discussion topic in a forum.
	 * Required scope: `discussions:topics:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#post--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-
	 */
	async createTopic(
		orgUnitId: number,
		forumId: number,
		data: CreateDiscussionTopicData
	): Promise<DiscussionTopic> {
		return this.post<DiscussionTopic>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/`,
			data
		);
	}

	/**
	 * Copy a discussion topic to another forum.
	 * Required scope: `discussions:topics:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/copy
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#post--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-copy
	 */
	async copyTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		data: CopyTopicData
	): Promise<DiscussionTopic> {
		return this.post<DiscussionTopic>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/copy`,
			data
		);
	}

	/**
	 * Update a discussion topic.
	 * Required scope: `discussions:topics:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#put--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)
	 */
	async updateTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		data: CreateDiscussionTopicData
	): Promise<DiscussionTopic> {
		return this.put<DiscussionTopic>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`,
			data
		);
	}

	/**
	 * Delete a discussion topic.
	 * Required scope: `discussions:topics:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#delete--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)
	 */
	async delTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Posts
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of posts for a discussion topic.
	 * Filter by threadId to retrieve replies to a specific thread.
	 * Required scope: `discussions:posts:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-
	 */
	async listPosts(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		params: ListPostsParams = {}
	): Promise<PaginatedList<DiscussionPost>> {
		const page = await this.fetchPostsPage(orgUnitId, forumId, topicId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a specific post.
	 * Required scope: `discussions:posts:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/(postId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-(postId)
	 */
	async retrievePost(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		postId: number
	): Promise<DiscussionPost> {
		return this.get<DiscussionPost>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/${postId}`
		);
	}

	/**
	 * Create a post (thread or reply) in a discussion topic.
	 * Set ParentPostId to null to create a new thread; provide a PostId to reply.
	 * Required scope: `discussions:posts:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#post--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-
	 */
	async createPost(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		data: CreateDiscussionPostData
	): Promise<DiscussionPost> {
		return this.post<DiscussionPost>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/`,
			data
		);
	}

	/**
	 * Delete a post from a discussion topic.
	 * Required scope: `discussions:posts:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/(postId)
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#delete--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-(postId)
	 */
	async delPost(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		postId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/${postId}`
		);
	}

	/**
	 * Approve or unapprove a post.
	 * Required scope: `discussions:posts:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/(postId)/Approval
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#put--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-(postId)-Approval
	 */
	async updatePostApproval(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		postId: number,
		data: DiscussionApprovalData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/${postId}/Approval`,
			data
		);
	}

	/**
	 * Flag or unflag a post.
	 * Required scope: `discussions:posts:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/posts/(postId)/Flag
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#put--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-posts-(postId)-Flag
	 */
	async updatePostFlag(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		postId: number,
		data: DiscussionFlagData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/${postId}/Flag`,
			data
		);
	}

	// ---------------------------------------------------------------------------
	// Statistics
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve per-user discussion statistics for a topic.
	 * Required scope: `discussions:statistics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/statistics/
	 * @see https://docs.valence.desire2learn.com/res/discuss.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-statistics-
	 */
	async listTopicStatistics(
		orgUnitId: number,
		forumId: number,
		topicId: number
	): Promise<DiscussionTopicUserStatistics[]> {
		return this.get<DiscussionTopicUserStatistics[]>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/statistics/`
		);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchForumsPage(
		orgUnitId: number,
		params: ListForumsParams
	): Promise<PaginatedPageResponse<DiscussionForum>> {
		const query = buildQueryString({ bookmark: params.bookmark });
		const raw = await this.get<D2LPageResponse<DiscussionForum>>(
			"le",
			`${orgUnitId}/discussions/forums/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchForumsPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchTopicsPage(
		orgUnitId: number,
		forumId: number,
		params: ListTopicsParams
	): Promise<PaginatedPageResponse<DiscussionTopic>> {
		const query = buildQueryString({ bookmark: params.bookmark });
		const raw = await this.get<D2LPageResponse<DiscussionTopic>>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchTopicsPage(orgUnitId, forumId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchPostsPage(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		params: ListPostsParams
	): Promise<PaginatedPageResponse<DiscussionPost>> {
		const query = buildQueryString({
			threadId: params.threadId,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<DiscussionPost>>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchPostsPage(orgUnitId, forumId, topicId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}
