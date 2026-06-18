import { BaseResource } from "../core/resource";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import type { PaginatedList } from "../types";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Enrollments API response shapes
// @see https://docs.valence.desire2learn.com/res/enroll.html
// ---------------------------------------------------------------------------

/** OrgUnit.OrgUnitTypeInfo — embedded composite in OrgUnitInfo */
export interface OrgUnitTypeInfo {
	Id: number;
	Code: string;
	Name: string;
}

/** Enrollment.OrgUnitInfo — embedded in MyOrgUnitInfo and UserOrgUnit */
export interface OrgUnitInfo {
	Id: number;
	Type: OrgUnitTypeInfo;
	Name: string;
	Code: string | null;
	/** Null when the user cannot access the org unit */
	HomeUrl: string | null;
	/** Only present for course offerings that have an image set */
	ImageUrl: string | null;
}

/** Enrollment.RoleInfo — embedded in OrgUnitUser and UserOrgUnit */
export interface RoleInfo {
	Id: number;
	Code: string | null;
	Name: string;
}

/**
 * Enrollment.MyOrgUnitInfo — item in the calling user's enrollment list
 * GET /d2l/api/lp/(version)/enrollments/myenrollments/
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.MyOrgUnitInfo
 */
export interface MyOrgUnitInfo {
	OrgUnit: OrgUnitInfo;
	Access: {
		IsActive: boolean;
		StartDate: string | null;
		EndDate: string | null;
		CanAccess: boolean;
		ClasslistRoleName: string | null;
		LISRoles: string[];
		LastAccessed: string | null;
	};
	/** Date this enrollment was pinned; null if not pinned */
	PinDate: string | null;
}

/**
 * Enrollment.EnrollmentData — returned on create and delete actions
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.EnrollmentData
 */
export interface EnrollmentData {
	OrgUnitId: number;
	UserId: number;
	RoleId: number;
	IsCascading: boolean;
}

/**
 * Enrollment.CreateEnrollmentData — body for POST /d2l/api/lp/(version)/enrollments/
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.CreateEnrollmentData
 */
export interface CreateEnrollmentData {
	OrgUnitId: number;
	UserId: number;
	RoleId: number;
	/** Added with LMS v20.25.1 — if true, sends enrollment email to the user */
	SendEnrollmentEmail?: boolean | null;
}

/**
 * Enrollment.OrgUnitUser — item in org-unit user list
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.OrgUnitUser
 */
export interface OrgUnitUser {
	User: {
		Identifier: string | null;
		DisplayName: string | null;
		EmailAddress: string | null;
		OrgDefinedId: string | null;
		ProfileBadgeUrl: string | null;
		ProfileIdentifier: string | null;
		UserName: string | null;
	};
	Role: RoleInfo;
}

/**
 * Enrollment.ClasslistUser — item returned from classlist endpoint
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.ClasslistUser
 */
export interface ClasslistUser {
	Identifier: string;
	ProfileIdentifier: string;
	DisplayName: string;
	Username: string | null;
	OrgDefinedId: string | null;
	Email: string | null;
	FirstName: string | null;
	LastName: string | null;
	RoleId: number | null;
	LastAccessed: string | null;
	IsOnline: boolean;
	/** Empty string if the role is not configured to display in the classlist */
	ClasslistRoleDisplayName: string;
	/** Added with LMS v20.25.2 */
	Pronouns: string | null;
}

/**
 * Enrollment.UserOrgUnit — item in a user's org unit enrollment list
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.UserOrgUnit
 */
export interface UserOrgUnit {
	OrgUnit: OrgUnitInfo;
	Role: RoleInfo;
	IsCascading: boolean;
	EnrolledByUserId: number | null;
	EnrolledByUserDate: string | null;
}

/**
 * Enrollment.CompletionData — returned by completion status endpoint
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.CompletionData
 */
export interface CompletionData {
	Completion: boolean;
	CompletionDate: string | null;
}

/**
 * Enrollment.CompletionParameterData — body for PUT completion status
 * @see https://docs.valence.desire2learn.com/res/enroll.html#Enrollment.CompletionParameterData
 */
export interface CompletionParameterData {
	Completion: boolean;
	CompletionDate: string | null;
	/**
	 * When Completion is true and a CompletionDate already exists,
	 * set true to overwrite it. False preserves the original.
	 */
	Overwrite?: boolean | null;
}

export interface ListMyEnrollmentsParams {
	orgUnitTypeId?: number;
	isActive?: boolean;
	canAccess?: boolean;
	bookmark?: string;
}

export interface ListOrgUnitUsersParams {
	roleId?: number;
	bookmark?: string;
}

export interface ListUserEnrollmentsParams {
	orgUnitTypeId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class EnrollmentsResource extends BaseResource {
	/**
	 * Retrieve a paged list of the calling user's org unit enrollments.
	 * GET /d2l/api/lp/(version)/enrollments/myenrollments/
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-myenrollments-
	 */
	async listMyCourses(
		params: ListMyEnrollmentsParams = {}
	): Promise<PaginatedList<MyOrgUnitInfo>> {
		const page = await this.fetchMyEnrollmentsPage(params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a paged list of users enrolled in an org unit.
	 * GET /d2l/api/lp/(version)/enrollments/orgUnits/(orgUnitId)/users/
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-orgUnits-(orgUnitId)-users-
	 */
	async listOrgUnitUsers(
		orgUnitId: number,
		params: ListOrgUnitUsersParams = {}
	): Promise<PaginatedList<OrgUnitUser>> {
		const page = await this.fetchOrgUnitUsersPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve a paged list of a specific user's org unit enrollments.
	 * GET /d2l/api/lp/(version)/enrollments/users/(userId)/orgUnits/
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-users-(userId)-orgUnits-
	 */
	async listUserEnrollments(
		userId: number,
		params: ListUserEnrollmentsParams = {}
	): Promise<PaginatedList<UserOrgUnit>> {
		const page = await this.fetchUserEnrollmentsPage(userId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve the classlist for an org unit.
	 * GET /d2l/api/lp/(version)/enrollments/orgUnits/(orgUnitId)/users/classlist
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-orgUnits-(orgUnitId)-users-classlist
	 */
	async retrieveClasslist(orgUnitId: number): Promise<ClasslistUser[]> {
		const raw = await this.get<D2LPageResponse<ClasslistUser>>(
			"lp",
			`enrollments/orgUnits/${orgUnitId}/users/classlist`
		);
		return raw.Objects;
	}

	/**
	 * Retrieve a user's completion status for an org unit.
	 * GET /d2l/api/lp/(version)/enrollments/orgUnits/(orgUnitId)/users/(userId)/completion
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#get--d2l-api-lp-(version)-enrollments-orgUnits-(orgUnitId)-users-(userId)-completion
	 */
	async retrieveCompletion(
		orgUnitId: number,
		userId: number
	): Promise<CompletionData> {
		return this.get<CompletionData>(
			"lp",
			`enrollments/orgUnits/${orgUnitId}/users/${userId}/completion`
		);
	}

	/**
	 * Enroll a user in an org unit.
	 * POST /d2l/api/lp/(version)/enrollments/
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#post--d2l-api-lp-(version)-enrollments-
	 */
	async create(data: CreateEnrollmentData): Promise<EnrollmentData> {
		return this.post<EnrollmentData>("lp", "enrollments/", data);
	}

	/**
	 * Update a user's completion status for an org unit.
	 * PUT /d2l/api/lp/(version)/enrollments/orgUnits/(orgUnitId)/users/(userId)/completion
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#put--d2l-api-lp-(version)-enrollments-orgUnits-(orgUnitId)-users-(userId)-completion
	 */
	async updateCompletion(
		orgUnitId: number,
		userId: number,
		data: CompletionParameterData
	): Promise<void> {
		return this.put<void>(
			"lp",
			`enrollments/orgUnits/${orgUnitId}/users/${userId}/completion`,
			data
		);
	}

	/**
	 * Remove a user's enrollment from an org unit.
	 * Returns the EnrollmentData snapshot just before deletion.
	 * DELETE /d2l/api/lp/(version)/enrollments/orgUnits/(orgUnitId)/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/enroll.html#delete--d2l-api-lp-(version)-enrollments-orgUnits-(orgUnitId)-users-(userId)
	 */
	async del(orgUnitId: number, userId: number): Promise<EnrollmentData> {
		return this.delete<EnrollmentData>(
			"lp",
			`enrollments/orgUnits/${orgUnitId}/users/${userId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchMyEnrollmentsPage(
		params: ListMyEnrollmentsParams
	): Promise<PaginatedPageResponse<MyOrgUnitInfo>> {
		const query = buildQueryString({
			orgUnitTypeId: params.orgUnitTypeId,
			isActive: params.isActive,
			canAccess: params.canAccess,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<MyOrgUnitInfo>>(
			"lp",
			`enrollments/myenrollments/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchMyEnrollmentsPage({ ...params, bookmark: raw.Bookmark })
					: undefined,
		};
	}

	private async fetchOrgUnitUsersPage(
		orgUnitId: number,
		params: ListOrgUnitUsersParams
	): Promise<PaginatedPageResponse<OrgUnitUser>> {
		const query = buildQueryString({
			roleId: params.roleId,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<OrgUnitUser>>(
			"lp",
			`enrollments/orgUnits/${orgUnitId}/users/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchOrgUnitUsersPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchUserEnrollmentsPage(
		userId: number,
		params: ListUserEnrollmentsParams
	): Promise<PaginatedPageResponse<UserOrgUnit>> {
		const query = buildQueryString({
			orgUnitTypeId: params.orgUnitTypeId,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<UserOrgUnit>>(
			"lp",
			`enrollments/users/${userId}/orgUnits/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchUserEnrollmentsPage(userId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildQueryString(
	params: Record<string, string | number | boolean | undefined>
): string {
	const sp = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined) sp.set(k, String(v));
	}
	const qs = sp.toString();
	return qs ? `?${qs}` : "";
}