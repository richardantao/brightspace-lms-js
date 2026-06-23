import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Release Conditions API response shapes
// @see https://docs.valence.desire2learn.com/res/releaseconditions.html
// ---------------------------------------------------------------------------

/** EXPRESSIONOPERATOR_T */
export type ExpressionOperator = "All" | "Any";

/** CONDITIONDATA_T — all supported condition type string values */
export type ConditionDataType =
	// Awards
	| "EarnsAward"
	// Checklist
	| "CompletesChecklist"
	| "CompletesChecklistItem"
	| "NotCompletedChecklist"
	| "NotCompletedChecklistItem"
	// Classlist
	| "DaysEnrolledInCurrentOrgUnit"
	| "EnrolledInGroup"
	| "EnrolledInOrgUnit"
	| "EnrolledInSection"
	| "RoleInCurrentOrgUnit"
	// Content
	| "CompletesContentTopic"
	| "NotCompletedContentTopic"
	| "NotVisitedContentTopic"
	| "VisitsAllContentTopics"
	| "VisitsContentTopic"
	// Discussions
	| "AuthorsPostsInTopic"
	| "NotAuthoredPostsInTopic"
	// Dropboxes
	| "NotSubmittedToDropbox"
	| "ReceivesFeedback"
	| "SubmitsToDropbox"
	// Grades
	| "NotReceivedScoreOnGradeItem"
	| "ReceivesScoreOnGradeItem"
	| "ReleasedFinalGrade"
	// Quizzes
	| "NotSubmittedQuizAttempt"
	| "ReceivesScoreOnQuiz"
	| "SubmitsQuizAttempt"
	/** Round-tripped unsupported condition */
	| "RoundTrip"
	| (string & Record<never, never>);

/** OPERATOR_T — score comparison operators */
export type ScoreOperator =
	| "Between"
	| "EqualTo"
	| "GreaterThan"
	| "GreaterThanOrEqual"
	| "LessThan"
	| "LessThanOrEqual"
	| "NotBetween"
	| "NotEqualTo";

/** POSTS_T — discussion post type */
export type PostsType = "NewThreadsOnly" | "ThreadsAndReplies";

/** CURRENTROLE_T — role condition operator */
export type CurrentRoleOperator = "Enrolled" | "NotEnrolled";

export interface RichText {
	Text: string;
	Html: string | null;
}

/**
 * Base condition — all condition types share these properties.
 * Additional type-specific params are added as additional properties.
 * When round-tripping unsupported conditions, include Type and State as-is.
 */
export interface BaseCondition {
	Type: ConditionDataType;
	State: string | null;
	Text: RichText;
}

/** Expression node — a group of conditions joined by an operator */
export interface ExpressionData extends BaseCondition {
	Type: "Expression";
	ExpressionParams: {
		Operator: ExpressionOperator;
		Operands: ConditionData[];
	};
}

/** Union of all concrete condition types */
export type ConditionData = ExpressionData | BaseCondition;

/**
 * ConditionsData — top-level container returned by retrieve and used on update.
 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#ConditionsData
 */
export interface ConditionsData {
	Expression: ExpressionData;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class ReleaseConditionsResource extends BaseResource {
	/**
	 * Retrieve the release conditions for a content topic.
	 * Required scope: `releaseconditions:conditions:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#get--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)-releaseconditions
	 */
	async retrieveForContentTopic(
		orgUnitId: number,
		topicId: number
	): Promise<ConditionsData> {
		return this.get<ConditionsData>(
			"le",
			`${orgUnitId}/content/topics/${topicId}/releaseconditions`
		);
	}

	/**
	 * Update the release conditions for a content topic.
	 * Required scope: `releaseconditions:conditions:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/content/topics/(topicId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#put--d2l-api-le-(version)-(orgUnitId)-content-topics-(topicId)-releaseconditions
	 */
	async updateForContentTopic(
		orgUnitId: number,
		topicId: number,
		data: ConditionsData
	): Promise<ConditionsData> {
		return this.put<ConditionsData>(
			"le",
			`${orgUnitId}/content/topics/${topicId}/releaseconditions`,
			data
		);
	}

	/**
	 * Retrieve the release conditions for a discussion topic.
	 * Required scope: `releaseconditions:conditions:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#get--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-releaseconditions
	 */
	async retrieveForDiscussionTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number
	): Promise<ConditionsData> {
		return this.get<ConditionsData>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/releaseconditions`
		);
	}

	/**
	 * Update the release conditions for a discussion topic.
	 * Required scope: `releaseconditions:conditions:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/discussions/forums/(forumId)/topics/(topicId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#put--d2l-api-le-(version)-(orgUnitId)-discussions-forums-(forumId)-topics-(topicId)-releaseconditions
	 */
	async updateForDiscussionTopic(
		orgUnitId: number,
		forumId: number,
		topicId: number,
		data: ConditionsData
	): Promise<ConditionsData> {
		return this.put<ConditionsData>(
			"le",
			`${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/releaseconditions`,
			data
		);
	}

	/**
	 * Retrieve the release conditions for a quiz.
	 * Required scope: `releaseconditions:conditions:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/quizzes/(quizId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#get--d2l-api-le-(version)-(orgUnitId)-quizzes-(quizId)-releaseconditions
	 */
	async retrieveForQuiz(
		orgUnitId: number,
		quizId: number
	): Promise<ConditionsData> {
		return this.get<ConditionsData>(
			"le",
			`${orgUnitId}/quizzes/${quizId}/releaseconditions`
		);
	}

	/**
	 * Update the release conditions for a quiz.
	 * Required scope: `releaseconditions:conditions:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/quizzes/(quizId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#put--d2l-api-le-(version)-(orgUnitId)-quizzes-(quizId)-releaseconditions
	 */
	async updateForQuiz(
		orgUnitId: number,
		quizId: number,
		data: ConditionsData
	): Promise<ConditionsData> {
		return this.put<ConditionsData>(
			"le",
			`${orgUnitId}/quizzes/${quizId}/releaseconditions`,
			data
		);
	}

	/**
	 * Retrieve the release conditions for a dropbox folder.
	 * Required scope: `releaseconditions:conditions:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/dropbox/folders/(folderId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#get--d2l-api-le-(version)-(orgUnitId)-dropbox-folders-(folderId)-releaseconditions
	 */
	async retrieveForDropbox(
		orgUnitId: number,
		folderId: number
	): Promise<ConditionsData> {
		return this.get<ConditionsData>(
			"le",
			`${orgUnitId}/dropbox/folders/${folderId}/releaseconditions`
		);
	}

	/**
	 * Update the release conditions for a dropbox folder.
	 * Required scope: `releaseconditions:conditions:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/dropbox/folders/(folderId)/releaseconditions
	 * @see https://docs.valence.desire2learn.com/res/releaseconditions.html#put--d2l-api-le-(version)-(orgUnitId)-dropbox-folders-(folderId)-releaseconditions
	 */
	async updateForDropbox(
		orgUnitId: number,
		folderId: number,
		data: ConditionsData
	): Promise<ConditionsData> {
		return this.put<ConditionsData>(
			"le",
			`${orgUnitId}/dropbox/folders/${folderId}/releaseconditions`,
			data
		);
	}
}