import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Grade API response shapes
// @see https://docs.valence.desire2learn.com/res/grade.html
// ---------------------------------------------------------------------------

/**
 * GRADEOBJ_T — grade object type discriminator values
 * @see https://docs.valence.desire2learn.com/res/grade.html#term-GRADEOBJ_T
 */
export const GradeObjectType = {
	Numeric: 1,
	PassFail: 2,
	SelectBox: 3,
	Text: 4,
	Calculated: 5,
	Formula: 6,
	FinalCalculated: 7,
	FinalAdjusted: 8,
	Category: 9,
} as const;
export type GradeObjectType =
	(typeof GradeObjectType)[keyof typeof GradeObjectType];

/** RichText composite — returned on retrieve actions */
export interface RichText {
	Text: string;
	Html: string | null;
}

/** RichTextInput composite — used on create/update actions */
export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

/** Grade.AssociatedTool — embedded in GradeObject */
export interface AssociatedTool {
	ToolId: number;
	ToolItemId: number;
}

/**
 * Grade.GradeObject — polymorphic grade item. GradeType discriminates the variant.
 * Lists may contain objects of differing types with different fields present.
 * @see https://docs.valence.desire2learn.com/res/grade.html#Grade.GradeObject
 */
export interface GradeObject {
	Id: number;
	Name: string;
	ShortName: string;
	GradeType:
		| "Numeric"
		| "PassFail"
		| "SelectBox"
		| "Text"
		| "Calculated"
		| "Formula"
		| "FinalCalculated"
		| "FinalAdjusted";
	CategoryId: number | null;
	Description: RichText;
	/** Not present on Text grade objects */
	MaxPoints?: number;
	CanExceedMaxPoints?: boolean;
	IsBonus?: boolean;
	ExcludeFromFinalGradeCalculation?: boolean;
	GradeSchemeId?: number | null;
	/** URL to retrieve the associated grade scheme — not on input actions */
	GradeSchemeUrl?: string;
	/** Allowed on input with LE API v1.89+ */
	Weight?: number;
	AssociatedTool: AssociatedTool | null;
	IsHidden: boolean;
}

/**
 * Input shape for create/update grade object actions.
 * Omits read-only server fields (Id, GradeSchemeUrl).
 * Description uses RichTextInput instead of RichText.
 */
export type GradeObjectInput = Omit<
	GradeObject,
	"Id" | "GradeSchemeUrl" | "Description"
> & {
	Description: RichTextInput;
};

/**
 * Grade.GradeObjectCategory — a category grouping grade objects
 * @see https://docs.valence.desire2learn.com/res/grade.html#Grade.GradeObjectCategory
 */
export interface GradeObjectCategory {
	Id: number;
	Grades: GradeObject[];
	Name: string;
	ShortName: string;
	CanExceedMax: boolean;
	ExcludeFromFinalGrade: boolean;
	StartDate: string | null;
	EndDate: string | null;
	Weight: number | null;
	MaxPoints: number | null;
	AutoPoints: boolean | null;
	WeightDistributionType: number | null;
	NumberOfHighestToDrop: number | null;
	NumberOfLowestToDrop: number | null;
}

/** Input shape for create/update category — omits server-assigned fields */
export type GradeObjectCategoryData = Omit<
	GradeObjectCategory,
	"Id" | "Grades"
>;

/**
 * Grade.GradeValue — a user's grade on a specific grade object.
 * Base fields present on all types; computable fields present on non-Text types.
 * @see https://docs.valence.desire2learn.com/res/grade.html#Grade.GradeValue
 */
export interface GradeValue {
	DisplayedGrade: string;
	GradeObjectIdentifier: string;
	GradeObjectName: string;
	GradeObjectType: GradeObjectType;
	GradeObjectTypeName: string | null;
	Comments: RichText;
	PrivateComments: RichText;
	LastModified: string | null;
	LastModifiedBy: string | null;
	/** Only present on released final grades with appropriate permissions */
	ReleasedDate: string | null;
	// Computable fields — present on Numeric, PassFail, SelectBox, Calculated, Formula, Final types
	PointsNumerator?: number;
	PointsDenominator?: number;
}

/** Input shape for updating a user's grade value */
export interface GradeValueInput {
	Comments: RichTextInput;
	PrivateComments: RichTextInput;
	/** Numeric: points earned */
	PointsNumerator?: number;
	/** PassFail: true = Pass, false = Fail */
	IsPass?: boolean;
	/** SelectBox: the scheme symbol selected */
	Value?: string;
	/** Text: the text value */
	Text?: string;
}

/**
 * Grade.GradeScheme — a grading scheme with symbol/percentage ranges
 * @see https://docs.valence.desire2learn.com/res/grade.html#Grade.GradeScheme
 */
export interface GradeScheme {
	Id: number;
	Name: string;
	ShortName: string;
	Ranges: GradeSchemeRange[];
}

export interface GradeSchemeRange {
	PercentStart: number;
	Symbol: string;
	AssignedValue: number | null;
	Colour: string;
}

/** Input shape for creating a grade scheme. Added in LE API v1.95 (June 2026). */
export interface GradeSchemeData {
	Name: string;
	ShortName: string;
	Ranges: GradeSchemeRange[];
}

export interface ListGradeValuesParams {
	graded?: boolean;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class GradesResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Grade objects
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all grade objects for a course.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-
	 */
	async listObjects(orgUnitId: number): Promise<GradeObject[]> {
		return this.get<GradeObject[]>("le", `${orgUnitId}/grades/`);
	}

	/**
	 * Retrieve a specific grade object.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)
	 */
	async retrieveObject(
		orgUnitId: number,
		gradeObjectId: number
	): Promise<GradeObject> {
		return this.get<GradeObject>("le", `${orgUnitId}/grades/${gradeObjectId}`);
	}

	/**
	 * Create a new grade object (Numeric, PassFail, SelectBox, or Text only).
	 * Calculated, Formula, Final, and Category types cannot be created via the API.
	 * POST /d2l/api/le/(version)/(orgUnitId)/grades/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#post--d2l-api-le-(version)-(orgUnitId)-grades-
	 */
	async createObject(
		orgUnitId: number,
		data: GradeObjectInput
	): Promise<GradeObject> {
		return this.post<GradeObject>("le", `${orgUnitId}/grades/`, data);
	}

	/**
	 * Update a grade object.
	 * PUT /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#put--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)
	 */
	async updateObject(
		orgUnitId: number,
		gradeObjectId: number,
		data: GradeObjectInput
	): Promise<void> {
		return this.put<void>("le", `${orgUnitId}/grades/${gradeObjectId}`, data);
	}

	/**
	 * Delete a grade object.
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#delete--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)
	 */
	async delObject(orgUnitId: number, gradeObjectId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/grades/${gradeObjectId}`);
	}

	// ---------------------------------------------------------------------------
	// Grade values
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of all users' grade values for a course.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/values/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-values-
	 */
	async listValues(
		orgUnitId: number,
		params: ListGradeValuesParams = {}
	): Promise<PaginatedList<GradeValue>> {
		const page = await this.fetchValuesPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve all grade values for a specific user in a course.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/values/(userId)/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-values-(userId)-
	 */
	async listUserValues(
		orgUnitId: number,
		userId: number
	): Promise<GradeValue[]> {
		return this.get<GradeValue[]>(
			"le",
			`${orgUnitId}/grades/values/${userId}/`
		);
	}

	/**
	 * Retrieve a specific user's grade value for a specific grade object.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)/values/(userId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)-values-(userId)
	 */
	async retrieveValue(
		orgUnitId: number,
		gradeObjectId: number,
		userId: number
	): Promise<GradeValue> {
		return this.get<GradeValue>(
			"le",
			`${orgUnitId}/grades/${gradeObjectId}/values/${userId}`
		);
	}

	/**
	 * Update a user's grade value for a grade object.
	 * PUT /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)/values/(userId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#put--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)-values-(userId)
	 */
	async updateValue(
		orgUnitId: number,
		gradeObjectId: number,
		userId: number,
		data: GradeValueInput
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/grades/${gradeObjectId}/values/${userId}`,
			data
		);
	}

	/**
	 * Delete a user's grade value for a grade object.
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/grades/(gradeObjectId)/values/(userId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#delete--d2l-api-le-(version)-(orgUnitId)-grades-(gradeObjectId)-values-(userId)
	 */
	async delValue(
		orgUnitId: number,
		gradeObjectId: number,
		userId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/grades/${gradeObjectId}/values/${userId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Grade categories
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all grade categories for a course.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/categories/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-categories-
	 */
	async listCategories(orgUnitId: number): Promise<GradeObjectCategory[]> {
		return this.get<GradeObjectCategory[]>(
			"le",
			`${orgUnitId}/grades/categories/`
		);
	}

	/**
	 * Retrieve a specific grade category.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-categories-(categoryId)
	 */
	async retrieveCategory(
		orgUnitId: number,
		categoryId: number
	): Promise<GradeObjectCategory> {
		return this.get<GradeObjectCategory>(
			"le",
			`${orgUnitId}/grades/categories/${categoryId}`
		);
	}

	/**
	 * Create a grade category.
	 * POST /d2l/api/le/(version)/(orgUnitId)/grades/categories/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#post--d2l-api-le-(version)-(orgUnitId)-grades-categories-
	 */
	async createCategory(
		orgUnitId: number,
		data: GradeObjectCategoryData
	): Promise<GradeObjectCategory> {
		return this.post<GradeObjectCategory>(
			"le",
			`${orgUnitId}/grades/categories/`,
			data
		);
	}

	/**
	 * Delete a grade category.
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/grades/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#delete--d2l-api-le-(version)-(orgUnitId)-grades-categories-(categoryId)
	 */
	async delCategory(orgUnitId: number, categoryId: number): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/grades/categories/${categoryId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Grade schemes
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all grade schemes for a course.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/schemes/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-schemes-
	 */
	async listSchemes(orgUnitId: number): Promise<GradeScheme[]> {
		return this.get<GradeScheme[]>("le", `${orgUnitId}/grades/schemes/`);
	}

	/**
	 * Retrieve a specific grade scheme.
	 * GET /d2l/api/le/(version)/(orgUnitId)/grades/schemes/(schemeId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#get--d2l-api-le-(version)-(orgUnitId)-grades-schemes-(schemeId)
	 */
	async retrieveScheme(
		orgUnitId: number,
		schemeId: number
	): Promise<GradeScheme> {
		return this.get<GradeScheme>(
			"le",
			`${orgUnitId}/grades/schemes/${schemeId}`
		);
	}

	/**
	 * Create a new grade scheme.
	 * Added with LE API v1.95 (Brightspace 20.26.6 / June 2026).
	 * POST /d2l/api/le/(version)/(orgUnitId)/grades/schemes/
	 * @see https://docs.valence.desire2learn.com/res/grade.html#post--d2l-api-le-(version)-(orgUnitId)-grades-schemes-
	 */
	async createScheme(
		orgUnitId: number,
		data: GradeSchemeData
	): Promise<GradeScheme> {
		return this.post<GradeScheme>("le", `${orgUnitId}/grades/schemes/`, data);
	}

	/**
	 * Delete a grade scheme.
	 * Added with LE API v1.95 (Brightspace 20.26.6 / June 2026).
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/grades/schemes/(schemeId)
	 * @see https://docs.valence.desire2learn.com/res/grade.html#delete--d2l-api-le-(version)-(orgUnitId)-grades-schemes-(schemeId)
	 */
	async delScheme(orgUnitId: number, schemeId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/grades/schemes/${schemeId}`);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchValuesPage(
		orgUnitId: number,
		params: ListGradeValuesParams
	): Promise<PaginatedPageResponse<GradeValue>> {
		const query = buildQueryString({
			graded: params.graded,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<GradeValue>>(
			"le",
			`${orgUnitId}/grades/values/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchValuesPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}
