import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Survey API response shapes
// @see https://docs.valence.desire2learn.com/res/survey.html
// ---------------------------------------------------------------------------

/** ATTEMPTSALLOWEDTYPE_T */
export const AttemptsAllowedType = {
	Unlimited: 0,
	Editable: 1,
	Limited: 2,
} as const;
export type AttemptsAllowedType =
	(typeof AttemptsAllowedType)[keyof typeof AttemptsAllowedType];

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

export interface SurveyRichTextSection {
	Text: RichText;
	IsDisplayed: boolean;
}

export interface SurveyRichTextInputSection {
	Text: RichTextInput;
	IsDisplayed: boolean;
}

export interface SurveyUserResponses {
	AttemptsAllowedTypeId: AttemptsAllowedType;
	/** null when Unlimited; 1 when Editable; configured value when Limited */
	NumberOfAttempts: number | null;
}

/**
 * Surveys.SurveyReadData — returned by survey retrieve and list actions.
 * @see https://docs.valence.desire2learn.com/res/survey.html#Surveys.SurveyReadData
 */
export interface SurveyReadData {
	SurveyId: number;
	Name: string;
	SortOrder: number;
	HasInstantFeedback: boolean;
	IsAnonymous: boolean;
	Description: SurveyRichTextSection;
	Submission: RichText;
	Footer: SurveyRichTextSection;
	IsActive: boolean;
	StartDate: string | null;
	EndDate: string | null;
	DisplayInCalendar: boolean;
	UserResponses: SurveyUserResponses;
	CategoryId: number | null;
	PreventMovingBackwards: boolean;
	Shuffle: boolean;
	ActivityId: string | null;
	AllowOnlyUsersWithSpecialAccess: boolean;
}

/**
 * Surveys.SurveyWriteData — body for create and update actions.
 * @see https://docs.valence.desire2learn.com/res/survey.html#Surveys.SurveyWriteData
 */
export interface SurveyWriteData {
	Name: string;
	HasInstantFeedback: boolean;
	IsAnonymous: boolean;
	Description: SurveyRichTextInputSection;
	Submission: RichTextInput;
	Footer: SurveyRichTextInputSection;
	IsActive: boolean;
	StartDate: string | null;
	EndDate: string | null;
	DisplayInCalendar: boolean;
	UserResponses: SurveyUserResponses;
	CategoryId: number | null;
	PreventMovingBackwards: boolean;
	Shuffle: boolean;
	AllowOnlyUsersWithSpecialAccess: boolean;
}

/**
 * Surveys.SurveyAttemptData — returned by attempt retrieve actions.
 * @see https://docs.valence.desire2learn.com/res/survey.html#Surveys.SurveyAttemptData
 */
export interface SurveyAttemptData {
	AttemptId: number;
	SurveyId: number;
	/** null if the survey is anonymous */
	UserId: number | null;
	AttemptNumber: number;
	Started: string;
	Completed: string | null;
}

/**
 * Surveys.SurveyCategoryReadData — returned by category retrieve actions.
 * @see https://docs.valence.desire2learn.com/res/survey.html#Surveys.SurveyCategoryReadData
 */
export interface SurveyCategoryReadData {
	CategoryId: number;
	Name: string;
	SortOrder: number;
}

/** Input for create and update category actions */
export interface SurveyCategoryData {
	Name: string;
	SortOrder: number;
}

/** Special access configuration for a survey and user */
export interface SurveySpecialAccessData {
	StartDate: string | null;
	EndDate: string | null;
}

/** Special access data with user context */
export interface SurveySpecialAccessUserData {
	UserId: number;
	SpecialAccess: SurveySpecialAccessData;
}

export interface ListSurveysParams {
	bookmark?: string;
}

export interface ListAttemptsParams {
	userId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class SurveysResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Surveys
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all surveys for a course.
	 * Required scope: `surveys:surveys:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-
	 */
	async list(
		orgUnitId: number,
		params: ListSurveysParams = {}
	): Promise<PaginatedList<SurveyReadData>> {
		const page = await this.fetchSurveysPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a specific survey.
	 * Required scope: `surveys:surveys:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)
	 */
	async retrieve(orgUnitId: number, surveyId: number): Promise<SurveyReadData> {
		return this.get<SurveyReadData>("le", `${orgUnitId}/surveys/${surveyId}`);
	}

	/**
	 * Create a survey.
	 * Required scope: `surveys:surveys:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/surveys/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#post--d2l-api-le-(version)-(orgUnitId)-surveys-
	 */
	async create(
		orgUnitId: number,
		data: SurveyWriteData
	): Promise<SurveyReadData> {
		return this.post<SurveyReadData>("le", `${orgUnitId}/surveys/`, data);
	}

	/**
	 * Update a survey.
	 * Required scope: `surveys:surveys:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#put--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)
	 */
	async update(
		orgUnitId: number,
		surveyId: number,
		data: SurveyWriteData
	): Promise<SurveyReadData> {
		return this.put<SurveyReadData>(
			"le",
			`${orgUnitId}/surveys/${surveyId}`,
			data
		);
	}

	/**
	 * Delete a survey.
	 * Required scope: `surveys:surveys:delete`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#delete--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)
	 */
	async del(orgUnitId: number, surveyId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/surveys/${surveyId}`);
	}

	// ---------------------------------------------------------------------------
	// Survey attempts
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all attempts for a survey, optionally filtered by user.
	 * Required scope: `surveys:surveysattempts:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)/attempts/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)-attempts-
	 */
	async listAttempts(
		orgUnitId: number,
		surveyId: number,
		params: ListAttemptsParams = {}
	): Promise<PaginatedList<SurveyAttemptData>> {
		const page = await this.fetchAttemptsPage(orgUnitId, surveyId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	// ---------------------------------------------------------------------------
	// Survey categories
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all survey categories for a course.
	 * Required scope: `surveys:surveys:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/categories/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-categories-
	 */
	async listCategories(orgUnitId: number): Promise<SurveyCategoryReadData[]> {
		return this.get<SurveyCategoryReadData[]>(
			"le",
			`${orgUnitId}/surveys/categories/`
		);
	}

	/**
	 * Retrieve a specific survey category.
	 * Required scope: `surveys:surveys:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-categories-(categoryId)
	 */
	async retrieveCategory(
		orgUnitId: number,
		categoryId: number
	): Promise<SurveyCategoryReadData> {
		return this.get<SurveyCategoryReadData>(
			"le",
			`${orgUnitId}/surveys/categories/${categoryId}`
		);
	}

	/**
	 * Create a survey category.
	 * Required scope: `surveys:surveys:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/surveys/categories/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#post--d2l-api-le-(version)-(orgUnitId)-surveys-categories-
	 */
	async createCategory(
		orgUnitId: number,
		data: SurveyCategoryData
	): Promise<SurveyCategoryReadData> {
		return this.post<SurveyCategoryReadData>(
			"le",
			`${orgUnitId}/surveys/categories/`,
			data
		);
	}

	/**
	 * Update a survey category.
	 * Required scope: `surveys:surveys:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/surveys/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#put--d2l-api-le-(version)-(orgUnitId)-surveys-categories-(categoryId)
	 */
	async updateCategory(
		orgUnitId: number,
		categoryId: number,
		data: SurveyCategoryData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/surveys/categories/${categoryId}`,
			data
		);
	}

	/**
	 * Delete a survey category.
	 * Required scope: `surveys:surveys:delete`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/surveys/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#delete--d2l-api-le-(version)-(orgUnitId)-surveys-categories-(categoryId)
	 */
	async delCategory(orgUnitId: number, categoryId: number): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/surveys/categories/${categoryId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Special access
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all users with special access for a survey.
	 * Required scope: `surveys:specialaccess:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)/specialaccess/
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)-specialaccess-
	 */
	async listSpecialAccess(
		orgUnitId: number,
		surveyId: number
	): Promise<SurveySpecialAccessUserData[]> {
		return this.get<SurveySpecialAccessUserData[]>(
			"le",
			`${orgUnitId}/surveys/${surveyId}/specialaccess/`
		);
	}

	/**
	 * Retrieve special access for a specific user and survey.
	 * Required scope: `surveys:specialaccess:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)/specialaccess/(userId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#get--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)-specialaccess-(userId)
	 */
	async retrieveSpecialAccess(
		orgUnitId: number,
		surveyId: number,
		userId: number
	): Promise<SurveySpecialAccessData> {
		return this.get<SurveySpecialAccessData>(
			"le",
			`${orgUnitId}/surveys/${surveyId}/specialaccess/${userId}`
		);
	}

	/**
	 * Update special access for a specific user and survey.
	 * Required scope: `surveys:specialaccess:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)/specialaccess/(userId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#put--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)-specialaccess-(userId)
	 */
	async updateSpecialAccess(
		orgUnitId: number,
		surveyId: number,
		userId: number,
		data: SurveySpecialAccessData
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/surveys/${surveyId}/specialaccess/${userId}`,
			data
		);
	}

	/**
	 * Remove special access for a specific user and survey.
	 * Required scope: `surveys:specialaccess:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/surveys/(surveyId)/specialaccess/(userId)
	 * @see https://docs.valence.desire2learn.com/res/survey.html#delete--d2l-api-le-(version)-(orgUnitId)-surveys-(surveyId)-specialaccess-(userId)
	 */
	async delSpecialAccess(
		orgUnitId: number,
		surveyId: number,
		userId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/surveys/${surveyId}/specialaccess/${userId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchSurveysPage(
		orgUnitId: number,
		params: ListSurveysParams
	): Promise<PaginatedPageResponse<SurveyReadData>> {
		const query = buildQueryString({ bookmark: params.bookmark });
		const raw = await this.get<D2LPageResponse<SurveyReadData>>(
			"le",
			`${orgUnitId}/surveys/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchSurveysPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchAttemptsPage(
		orgUnitId: number,
		surveyId: number,
		params: ListAttemptsParams
	): Promise<PaginatedPageResponse<SurveyAttemptData>> {
		const query = buildQueryString({
			userId: params.userId,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<SurveyAttemptData>>(
			"le",
			`${orgUnitId}/surveys/${surveyId}/attempts/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchAttemptsPage(orgUnitId, surveyId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}