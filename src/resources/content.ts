import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Content API response shapes
// @see https://docs.valence.desire2learn.com/res/content.html
// ---------------------------------------------------------------------------

/** CONTENT_T — content object type discriminator */
export const ContentType = {
	Module: 0,
	Topic: 1,
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

/** TOPIC_T — course topic type */
export const TopicType = {
	File: 1,
	Link: 3,
} as const;
export type TopicType = (typeof TopicType)[keyof typeof TopicType];

/** CONTENT_COMPLETIONTYPE_T — completion type for a content topic */
export const ContentCompletionType = {
	Manual: 1,
	Auto: 2,
	/** Exempt / optional */
	None: 3,
} as const;
export type ContentCompletionType =
	(typeof ContentCompletionType)[keyof typeof ContentCompletionType];

/** COMPLETION_T — completion status filter */
export const CompletionFilter = {
	Any: 1,
	CompletedOnly: 2,
	NotCompletedOnly: 3,
} as const;
export type CompletionFilter =
	(typeof CompletionFilter)[keyof typeof CompletionFilter];

/** EXEMPTION_T — exemption status filter */
export const ExemptionFilter = {
	Any: 1,
	ExemptedOnly: 2,
	NotExemptedOnly: 3,
} as const;
export type ExemptionFilter =
	(typeof ExemptionFilter)[keyof typeof ExemptionFilter];

/** CONTENTACTIVITYTYPE_T — activity type for a content topic */
export const ContentActivityType = {
	UnknownActivity: -1,
	Module: 0,
	File: 1,
	Link: 2,
	Dropbox: 3,
	Quiz: 4,
	DiscussionForum: 5,
	DiscussionTopic: 6,
	LTI: 7,
	Schedule: 9,
	Checklist: 10,
	SelfAssessment: 11,
	Survey: 12,
	CourseLink: 14,
	Scorm_1_3: 20,
	Scorm_1_3_Root: 21,
	Scorm_1_2: 22,
	Scorm_1_2_Root: 23,
	Scorm: 24,
	Lor: 25,
	LorScorm: 26,
	LTIAdvantage: 27,
	OrgUnit: 28,
	ActivityInstance: 29,
} as const;
export type ContentActivityType =
	(typeof ContentActivityType)[keyof typeof ContentActivityType];

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

/**
 * Content.ContentObject — polymorphic content object.
 * Type === 0 means Module; Type === 1 means Topic.
 * @see https://docs.valence.desire2learn.com/res/content.html#Content.ContentObject
 */
export type ContentObject = ContentModule | ContentTopic;

/**
 * A content module (folder of content). Type === 0.
 * Structure contains nested ContentObjects.
 */
export interface ContentModule {
	Type: 0;
	Id: number;
	Title: string;
	ShortTitle: string;
	Structure: ContentObject[];
	ModuleStartDate: string | null;
	ModuleEndDate: string | null;
	ModuleDueDate: string | null;
	IsHidden: boolean;
	IsLocked: boolean;
	Description: RichText | null;
	ParentModuleId: number | null;
	/** Hex color value. Added with LMS v20.24.7. */
	Color: string | null;
	/** Minutes of class time to cover material */
	Duration: number | null;
	LastModifiedDate: string | null;
}

/**
 * A content topic (a leaf content item). Type === 1.
 * Note: Duration is only available in the unstable API contract.
 */
export interface ContentTopic {
	Type: 1;
	Id: number;
	Title: string;
	ShortTitle: string;
	TopicType: TopicType;
	Url: string | null;
	StartDate: string | null;
	EndDate: string | null;
	DueDate: string | null;
	IsHidden: boolean;
	IsLocked: boolean;
	/** Added with LE API v1.72 */
	IsBroken: boolean;
	/** Only set for link-type topics (TopicType 3) */
	OpenAsExternalResource: boolean | null;
	Description: RichText | null;
	ParentModuleId: number;
	ActivityId: string | null;
	IsExempt: boolean;
	ToolId: number | null;
	ToolItemId: number | null;
	ActivityType: ContentActivityType;
	GradeItemId: number | null;
	AssociatedGradeItemIds: number[];
	LastModifiedDate: string | null;
}

/**
 * Content.ContentObjectData — polymorphic input for create/update actions.
 * @see https://docs.valence.desire2learn.com/res/content.html#Content.ContentObjectData
 */
export type ContentObjectData = ContentModuleData | ContentTopicData;

/** Module input data — Type must be 0 */
export interface ContentModuleData {
	Type: 0;
	Title: string;
	ShortTitle: string;
	ModuleStartDate: string | null;
	ModuleEndDate: string | null;
	ModuleDueDate: string | null;
	IsHidden: boolean;
	IsLocked: boolean;
	Description: RichTextInput | null;
}

/** Topic input data — Type must be 1 */
export interface ContentTopicData {
	Type: 1;
	Title: string;
	ShortTitle: string;
	TopicType: TopicType;
	Url: string;
	StartDate: string | null;
	EndDate: string | null;
	DueDate: string | null;
	IsHidden: boolean;
	IsLocked: boolean;
	/** Only for link-type topics */
	OpenAsExternalResource: boolean | null;
	Description: RichTextInput | null;
	/**
	 * When true, notifies students of the change.
	 * Only relevant on update actions.
	 */
	MajorUpdate: boolean | null;
	/** Notification summary when MajorUpdate is true */
	MajorUpdateText: string | null;
	/** Resets completion tracking when MajorUpdate is true */
	ResetCompletionTracking: boolean | null;
}

/**
 * Content.UserProgressData — a user's completion progress on a content topic.
 * @see https://docs.valence.desire2learn.com/res/content.html#Content.UserProgressData
 */
export interface ContentUserProgress {
	OrgUnitId: number;
	UserId: number;
	ContentObjectId: number;
	CompletionData: {
		Completed: boolean;
		CompletionDate: string | null;
	};
	LastVisited: string | null;
}

/**
 * Content table of contents — the full hierarchical content structure.
 * Returned by the TOC endpoint.
 */
export interface ContentTableOfContents {
	Modules: ContentModule[];
}

export interface ListUserProgressParams {
	userId?: number;
	completionFilter?: CompletionFilter;
	exemptionFilter?: ExemptionFilter;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class ContentResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Table of contents
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve the full table of contents (module/topic hierarchy) for a course.
	 * Required scope: `content:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/toc
	 * @see https://docs.valence.desire2learn.com/res/content.html#get--d2l-api-le-(version)-(orgUnitId)-content-toc
	 */
	async retrieveToc(orgUnitId: number): Promise<ContentTableOfContents> {
		return this.get<ContentTableOfContents>("le", `${orgUnitId}/content/toc`);
	}

	// ---------------------------------------------------------------------------
	// Modules
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a specific content module.
	 * Required scope: `content:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/modules/(moduleId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#get--d2l-api-le-(version)-(orgUnitId)-content-modules-(moduleId)
	 */
	async retrieveModule(
		orgUnitId: number,
		moduleId: number
	): Promise<ContentModule> {
		return this.get<ContentModule>(
			"le",
			`${orgUnitId}/content/modules/${moduleId}`
		);
	}

	/**
	 * Retrieve the root modules of a course's table of contents.
	 * Required scope: `content:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/root/
	 * @see https://docs.valence.desire2learn.com/res/content.html#get--d2l-api-le-(version)-(orgUnitId)-content-root-
	 */
	async listRootModules(orgUnitId: number): Promise<ContentModule[]> {
		return this.get<ContentModule[]>("le", `${orgUnitId}/content/root/`);
	}

	/**
	 * Create a root-level module.
	 * Required scope: `content:topics:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/content/root/
	 * @see https://docs.valence.desire2learn.com/res/content.html#post--d2l-api-le-(version)-(orgUnitId)-content-root-
	 */
	async createRootModule(
		orgUnitId: number,
		data: ContentModuleData
	): Promise<ContentModule> {
		return this.post<ContentModule>("le", `${orgUnitId}/content/root/`, data);
	}

	/**
	 * Create a child module inside a parent module.
	 * Required scope: `content:topics:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/content/modules/(moduleId)/structure/
	 * @see https://docs.valence.desire2learn.com/res/content.html#post--d2l-api-le-(version)-(orgUnitId)-content-modules-(moduleId)-structure-
	 */
	async createChildModule(
		orgUnitId: number,
		parentModuleId: number,
		data: ContentModuleData
	): Promise<ContentModule> {
		return this.post<ContentModule>(
			"le",
			`${orgUnitId}/content/modules/${parentModuleId}/structure/`,
			data
		);
	}

	/**
	 * Update a content module.
	 * Required scope: `content:topics:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/content/modules/(moduleId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#put--d2l-api-le-(version)-(orgUnitId)-content-modules-(moduleId)
	 */
	async updateModule(
		orgUnitId: number,
		moduleId: number,
		data: ContentModuleData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/content/modules/${moduleId}`,
			data
		);
	}

	/**
	 * Delete a content module and all its children.
	 * Required scope: `content:topics:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/content/modules/(moduleId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#delete--d2l-api-le-(version)-(orgUnitId)-content-modules-(moduleId)
	 */
	async delModule(orgUnitId: number, moduleId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/content/modules/${moduleId}`);
	}

	// ---------------------------------------------------------------------------
	// Topics
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a specific content topic.
	 * Required scope: `content:topics:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#get--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)
	 */
	async retrieveTopic(
		orgUnitId: number,
		topicId: number
	): Promise<ContentTopic> {
		return this.get<ContentTopic>(
			"le",
			`${orgUnitId}/content/topics/${topicId}`
		);
	}

	/**
	 * Create a topic inside a module.
	 * Required scope: `content:topics:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/content/modules/(moduleId)/structure/
	 * @see https://docs.valence.desire2learn.com/res/content.html#post--d2l-api-le-(version)-(orgUnitId)-content-modules-(moduleId)-structure-
	 */
	async createTopic(
		orgUnitId: number,
		parentModuleId: number,
		data: ContentTopicData
	): Promise<ContentTopic> {
		return this.post<ContentTopic>(
			"le",
			`${orgUnitId}/content/modules/${parentModuleId}/structure/`,
			data
		);
	}

	/**
	 * Update a content topic.
	 * Required scope: `content:topics:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#put--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)
	 */
	async updateTopic(
		orgUnitId: number,
		topicId: number,
		data: ContentTopicData
	): Promise<void> {
		return this.put<void>("le", `${orgUnitId}/content/topics/${topicId}`, data);
	}

	/**
	 * Delete a content topic.
	 * Required scope: `content:topics:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#delete--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)
	 */
	async delTopic(orgUnitId: number, topicId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/content/topics/${topicId}`);
	}

	// ---------------------------------------------------------------------------
	// User progress
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve completion progress for a specific topic and user.
	 * Required scope: `content:completions:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)/completions/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#get--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)-completions-users-(userId)
	 */
	async retrieveUserProgress(
		orgUnitId: number,
		topicId: number,
		userId: number
	): Promise<ContentUserProgress> {
		return this.get<ContentUserProgress>(
			"le",
			`${orgUnitId}/content/topics/${topicId}/completions/users/${userId}`
		);
	}

	/**
	 * Update completion progress for a specific topic and user.
	 * Required scope: `content:completions:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)/completions/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/content.html#put--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)-completions-users-(userId)
	 */
	async updateUserProgress(
		orgUnitId: number,
		topicId: number,
		userId: number,
		completed: boolean
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/content/topics/${topicId}/completions/users/${userId}`,
			{ Completed: completed }
		);
	}
}