import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Course API response shapes
// @see https://docs.valence.desire2learn.com/res/course.html
// ---------------------------------------------------------------------------

/** Course.BasicOrgUnit — composite embedded in CourseOffering */
export interface BasicOrgUnit {
	Identifier: string;
	Name: string;
	Code: string;
}

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

/**
 * Course.CourseOffering — fundamental course information block
 * @see https://docs.valence.desire2learn.com/res/course.html#Course.CourseOffering
 */
export interface CourseOffering {
	Identifier: string;
	Name: string;
	Code: string;
	IsActive: boolean;
	Path: string;
	StartDate: string | null;
	EndDate: string | null;
	/** Added with LMS v20.25.8 */
	LocaleId: number | null;
	/** Added with LMS v20.25.8 — if true, course overrides user's locale preference */
	ForceLocale: boolean;
	CourseTemplate: BasicOrgUnit | null;
	Semester: BasicOrgUnit | null;
	Department: BasicOrgUnit | null;
	Description: RichText;
	CanSelfRegister: boolean;
	/** Added with LMS v20.26.4 */
	ShowAddressBook: boolean;
}

/**
 * Course.CourseOfferingInfo — body for PUT update actions
 * @see https://docs.valence.desire2learn.com/res/course.html#Course.CourseOfferingInfo
 */
export interface CourseOfferingInfo {
	Name: string;
	Code: string;
	StartDate: string | null;
	EndDate: string | null;
	/** Required LP API v1.54+. Pass null to preserve existing; 0 to reset to default. */
	LocaleId: number | null;
	/** Required LP API v1.54+ */
	ForceLocale: boolean;
	/** Required LP API v1.54+ */
	ShowAddressBook: boolean;
	IsActive: boolean;
	Description: RichTextInput;
	CanSelfRegister: boolean | null;
}

/**
 * Course.CreateCourseOffering — body for POST create action
 * @see https://docs.valence.desire2learn.com/res/course.html#Course.CreateCourseOffering
 */
export interface CreateCourseOffering {
	Name: string;
	/** Max 50 chars. Cannot contain: \ : * ? " < > | ' # , % & */
	Code: string;
	/**
	 * Root path for course content. Leave empty string if path enforcement
	 * is enabled on the back-end — it will populate this automatically.
	 */
	Path: string;
	CourseTemplateId: number;
	SemesterId: number | null;
	StartDate: string | null;
	EndDate: string | null;
	LocaleId: number | null;
	ForceLocale: boolean;
	ShowAddressBook: boolean;
	Description: RichTextInput;
	CanSelfRegister: boolean | null;
	/** Added with LP API v1.59 — defaults to true */
	IsActive?: boolean;
}

/** Course.CourseTemplate */
export interface CourseTemplate {
	Identifier: string;
	Code: string;
	Name: string;
	Path: string;
}

/** Course.CourseTemplateInfo — body for PUT update on templates */
export interface CourseTemplateInfo {
	Name: string;
	Code: string;
}

/** Course.CreateCourseTemplate — body for POST create template */
export interface CreateCourseTemplate {
	Name: string;
	Code: string;
	Path: string;
	ParentOrgUnitIds: number[];
}

/**
 * Course.CourseDatesUpdateInfo — body for bulk course update job
 * Only one of StartDate / StartOffsetAmount may be non-null; same for End.
 * @see https://docs.valence.desire2learn.com/res/course.html#Course.CourseDatesUpdateInfo
 */
export interface CourseDatesUpdateInfo {
	StartDate: string | null;
	/** Days offset from existing start date (multiplied by 24h internally). 0 = no change. */
	StartOffsetAmount: number | null;
	EndDate: string | null;
	EndOffsetAmount: number | null;
	/** null = leave unchanged; true/false = set active status */
	Status: boolean | null;
}

/** Course.CourseDatesUpdateJob — returned when creating a bulk update job */
export interface CourseDatesUpdateJob {
	JobToken: string;
}

/** Course.CourseUpdateStatus — returned when polling a bulk update job */
export interface CourseUpdateStatus {
	Status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED" | "CANCELLED";
}

export interface ListCourseOfferingsParams {
	orgUnitId?: number;
	orgUnitTypeId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class CoursesResource extends BaseResource {
	/**
	 * Retrieve a specific course offering.
	 * GET /d2l/api/lp/(version)/courses/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#get--d2l-api-lp-(version)-courses-(orgUnitId)
	 */
	async retrieve(orgUnitId: number): Promise<CourseOffering> {
		return this.get<CourseOffering>("lp", `courses/${orgUnitId}`);
	}

	/**
	 * Retrieve a paged list of course offerings.
	 * GET /d2l/api/lp/(version)/courses/
	 * @see https://docs.valence.desire2learn.com/res/course.html#get--d2l-api-lp-(version)-courses-
	 */
	async list(
		params: ListCourseOfferingsParams = {}
	): Promise<PaginatedList<CourseOffering>> {
		const page = await this.fetchCourseOfferingsPage(params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Create a new course offering.
	 * POST /d2l/api/lp/(version)/courses/
	 * @see https://docs.valence.desire2learn.com/res/course.html#post--d2l-api-lp-(version)-courses-
	 */
	async create(data: CreateCourseOffering): Promise<CourseOffering> {
		return this.post<CourseOffering>("lp", "courses/", data);
	}

	/**
	 * Update a course offering's information.
	 * PUT /d2l/api/lp/(version)/courses/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#put--d2l-api-lp-(version)-courses-(orgUnitId)
	 */
	async update(orgUnitId: number, data: CourseOfferingInfo): Promise<void> {
		return this.put<void>("lp", `courses/${orgUnitId}`, data);
	}

	/**
	 * Delete a course offering.
	 * DELETE /d2l/api/lp/(version)/courses/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#delete--d2l-api-lp-(version)-courses-(orgUnitId)
	 */
	async del(orgUnitId: number): Promise<void> {
		return this.delete<void>("lp", `courses/${orgUnitId}`);
	}

	// ---------------------------------------------------------------------------
	// Course Templates
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a specific course template.
	 * GET /d2l/api/lp/(version)/coursetemplates/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#get--d2l-api-lp-(version)-coursetemplates-(orgUnitId)
	 */
	async retrieveTemplate(orgUnitId: number): Promise<CourseTemplate> {
		return this.get<CourseTemplate>("lp", `coursetemplates/${orgUnitId}`);
	}

	/**
	 * Create a new course template.
	 * POST /d2l/api/lp/(version)/coursetemplates/
	 * @see https://docs.valence.desire2learn.com/res/course.html#post--d2l-api-lp-(version)-coursetemplates-
	 */
	async createTemplate(data: CreateCourseTemplate): Promise<CourseTemplate> {
		return this.post<CourseTemplate>("lp", "coursetemplates/", data);
	}

	/**
	 * Update a course template's name and code.
	 * PUT /d2l/api/lp/(version)/coursetemplates/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#put--d2l-api-lp-(version)-coursetemplates-(orgUnitId)
	 */
	async updateTemplate(
		orgUnitId: number,
		data: CourseTemplateInfo
	): Promise<void> {
		return this.put<void>("lp", `coursetemplates/${orgUnitId}`, data);
	}

	/**
	 * Delete a course template.
	 * DELETE /d2l/api/lp/(version)/coursetemplates/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/course.html#delete--d2l-api-lp-(version)-coursetemplates-(orgUnitId)
	 */
	async delTemplate(orgUnitId: number): Promise<void> {
		return this.delete<void>("lp", `coursetemplates/${orgUnitId}`);
	}

	// ---------------------------------------------------------------------------
	// Course Updater — bulk date and status updates
	// ---------------------------------------------------------------------------

	/**
	 * Queue a bulk course date and status update job.
	 * Returns a job token to poll for completion status.
	 * POST /d2l/api/lp/(version)/courses/updates/
	 * @see https://docs.valence.desire2learn.com/res/course.html#post--d2l-api-lp-(version)-courses-updates-
	 */
	async createBulkUpdateJob(
		orgUnitIds: number[],
		updateInfo: CourseDatesUpdateInfo
	): Promise<CourseDatesUpdateJob> {
		return this.post<CourseDatesUpdateJob>("lp", "courses/updates/", {
			OrgUnitIds: orgUnitIds,
			UpdateInfo: updateInfo,
		});
	}

	/**
	 * Retrieve the status of a bulk course update job.
	 * GET /d2l/api/lp/(version)/courses/updates/(jobToken)
	 * @see https://docs.valence.desire2learn.com/res/course.html#get--d2l-api-lp-(version)-courses-updates-(jobToken)
	 */
	async retrieveBulkUpdateJobStatus(
		jobToken: string
	): Promise<CourseUpdateStatus> {
		return this.get<CourseUpdateStatus>("lp", `courses/updates/${jobToken}`);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchCourseOfferingsPage(
		params: ListCourseOfferingsParams
	): Promise<PaginatedPageResponse<CourseOffering>> {
		const query = buildQueryString({
			orgUnitId: params.orgUnitId,
			orgUnitTypeId: params.orgUnitTypeId,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<CourseOffering>>(
			"lp",
			`courses/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchCourseOfferingsPage({
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}
