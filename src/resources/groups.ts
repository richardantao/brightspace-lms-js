import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Groups API response shapes
// @see https://docs.valence.desire2learn.com/res/groups.html
// ---------------------------------------------------------------------------

/** GRPENROLL_T — group enrollment style */
export const GroupEnrollmentStyle = {
	NumberOfGroupsNoEnrollment: 0,
	PeoplePerGroupAutoEnrollment: 1,
	NumberOfGroupsAutoEnrollment: 2,
	PeoplePerGroupSelfEnrollment: 3,
	SelfEnrollmentNumberOfGroups: 4,
	PeoplePerNumberOfGroupsSelfEnrollment: 5,
	SingleUserMemberSpecificGroup: 6,
} as const;
export type GroupEnrollmentStyle =
	(typeof GroupEnrollmentStyle)[keyof typeof GroupEnrollmentStyle];

/** SECTENROLL_T — section enrollment style */
export const SectionEnrollmentStyle = {
	/** Deprecated placeholder — do not use on create/update */
	NumberOfSectionsNoEnrollment: 0,
	PeoplePerSectionAutoEnrollment: 1,
	NumberOfSectionsAutoEnrollment: 2,
} as const;
export type SectionEnrollmentStyle =
	(typeof SectionEnrollmentStyle)[keyof typeof SectionEnrollmentStyle];

/** GROUPSJOBSTATUS_T — group category creation job status */
export const GroupsJobStatus = {
	Processing: 0,
	Complete: 1,
} as const;
export type GroupsJobStatus =
	(typeof GroupsJobStatus)[keyof typeof GroupsJobStatus];

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

/**
 * Group.GroupData — fetch response for a group.
 * @see https://docs.valence.desire2learn.com/res/groups.html#Group.GroupData
 */
export interface GroupData {
	GroupId: number;
	Name: string;
	Code: string;
	Description: RichText;
	/** User IDs of explicitly enrolled members */
	Enrollments: number[];
}

/** Enrolled group view — returned for groups the caller is enrolled in */
export interface EnrolledGroupData {
	GroupId: number;
	Name: string;
	Code: string;
	Description: RichText;
}

/** Input shape for creating or updating a group */
export interface GroupDataInput {
	Name: string;
	/** Max 50 chars; cannot contain: \ : * ? " < > | ' # , % & */
	Code: string;
	Description: RichTextInput;
}

/**
 * Group.GroupCategoryData — fetch response for a group category.
 * @see https://docs.valence.desire2learn.com/res/groups.html#Group.GroupCategoryData
 */
export interface GroupCategoryData {
	GroupCategoryId: number;
	Name: string;
	Description: RichText;
	EnrollmentStyle: GroupEnrollmentStyle;
	/** Deprecated as of LP API v1.53 — use MaxUsersPerGroup instead */
	EnrollmentQuantity: number | null;
	MaxUsersPerGroup: number | null;
	AutoEnroll: boolean;
	RandomizeEnrollments: boolean;
	/** Group IDs belonging to this category */
	Groups: number[];
	AllocateAfterExpiry: boolean;
	/** Added with LP API v1.53 */
	SelfEnrollmentStartDate: string | null;
	SelfEnrollmentExpiryDate: string | null;
	/** Added with LP API v1.53 */
	GroupPrefix: string | null;
	RestrictedByOrgUnitId: number | null;
	DescriptionsVisibleToEnrolees: boolean;
}

/** Input shape for creating a group category */
export interface CreateGroupCategoryData {
	Name: string;
	Description: RichTextInput;
	EnrollmentStyle: GroupEnrollmentStyle;
	AutoEnroll: boolean;
	RandomizeEnrollments: boolean;
	NumberOfGroups: number | null;
	MaxUsersPerGroup: number | null;
	AllocateAfterExpiry: boolean;
	/** Added with LP API v1.53 */
	SelfEnrollmentStartDate: string | null;
	SelfEnrollmentExpiryDate: string | null;
	GroupPrefix: string | null;
	RestrictedByOrgUnitId: number | null;
	DescriptionsVisibleToEnrolees: boolean;
}

/** Input shape for updating a group category */
export interface UpdateGroupCategoryData {
	Name: string;
	Description: RichTextInput;
	/** Added with LP API v1.53 */
	MaxUsersPerGroup: number | null;
	AutoEnroll: boolean;
	RandomizeEnrollments: boolean;
	/** Added with LP API v1.53 */
	AllocateAfterExpiry: boolean;
	SelfEnrollmentStartDate: string | null;
	SelfEnrollmentExpiryDate: string | null;
	GroupPrefix: string | null;
	DescriptionsVisibleToEnrolees: boolean;
}

/** Group enrollment record */
export interface GroupEnrollment {
	UserId: number;
}

/** Group category creation job result */
export interface GroupsJobResult {
	JobToken: string;
	Status: GroupsJobStatus;
}

/**
 * Section.SectionData — fetch response for a section.
 * @see https://docs.valence.desire2learn.com/res/groups.html#Section.SectionData
 */
export interface SectionData {
	SectionId: number;
	Name: string;
	Code: string;
	Description: RichText;
	Enrollments: number[];
}

/** Input shape for creating or updating a section */
export interface SectionDataInput {
	Name: string;
	Code: string;
	Description: RichTextInput;
}

/**
 * Section.SectionPropertyData — section enrollment settings for an org unit.
 * @see https://docs.valence.desire2learn.com/res/groups.html#Section.SectionPropertyData
 */
export interface SectionPropertyData {
	EnrollmentStyle: SectionEnrollmentStyle;
	EnrollmentQuantity: number | null;
	AutoEnroll: boolean;
	RandomizeEnrollments: boolean;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class GroupsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Group categories
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all group categories for a course.
	 * Required scope: `groups:groupcategory:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/groupcategories/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-groupcategories-
	 */
	async listCategories(orgUnitId: number): Promise<GroupCategoryData[]> {
		return this.get<GroupCategoryData[]>("lp", `${orgUnitId}/groupcategories/`);
	}

	/**
	 * Retrieve a specific group category.
	 * Required scope: `groups:groupcategory:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)
	 */
	async retrieveCategory(
		orgUnitId: number,
		groupCategoryId: number
	): Promise<GroupCategoryData> {
		return this.get<GroupCategoryData>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}`
		);
	}

	/**
	 * Create a group category (async job — poll retrieveCategoryJob for status).
	 * Required scope: `groups:groupcategory:write`
	 * POST /d2l/api/lp/(version)/(orgUnitId)/groupcategories/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#post--d2l-api-lp-(version)-(orgUnitId)-groupcategories-
	 */
	async createCategory(
		orgUnitId: number,
		data: CreateGroupCategoryData
	): Promise<GroupsJobResult> {
		return this.post<GroupsJobResult>(
			"lp",
			`${orgUnitId}/groupcategories/`,
			data
		);
	}

	/**
	 * Retrieve the status of a group category creation job.
	 * Required scope: `groups:groupcategory:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/groupcategories/job/(jobToken)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-groupcategories-job-(jobToken)
	 */
	async retrieveCategoryJob(
		orgUnitId: number,
		jobToken: string
	): Promise<GroupsJobResult> {
		return this.get<GroupsJobResult>(
			"lp",
			`${orgUnitId}/groupcategories/job/${jobToken}`
		);
	}

	/**
	 * Update a group category.
	 * Required scope: `groups:groupcategory:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)
	 */
	async updateCategory(
		orgUnitId: number,
		groupCategoryId: number,
		data: UpdateGroupCategoryData
	): Promise<GroupCategoryData> {
		return this.put<GroupCategoryData>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}`,
			data
		);
	}

	/**
	 * Delete a group category.
	 * Required scope: `groups:groupcategory:write`
	 * DELETE /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#delete--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)
	 */
	async delCategory(orgUnitId: number, groupCategoryId: number): Promise<void> {
		return this.delete<void>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Groups
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all groups in a group category.
	 * Required scope: `groups:group:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-
	 */
	async listGroups(
		orgUnitId: number,
		groupCategoryId: number
	): Promise<GroupData[]> {
		return this.get<GroupData[]>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/`
		);
	}

	/**
	 * Retrieve a specific group.
	 * Required scope: `groups:group:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/(groupId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-(groupId)
	 */
	async retrieveGroup(
		orgUnitId: number,
		groupCategoryId: number,
		groupId: number
	): Promise<GroupData> {
		return this.get<GroupData>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}`
		);
	}

	/**
	 * Create a group within a group category.
	 * Required scope: `groups:group:write`
	 * POST /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#post--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-
	 */
	async createGroup(
		orgUnitId: number,
		groupCategoryId: number,
		data: GroupDataInput
	): Promise<GroupData> {
		return this.post<GroupData>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/`,
			data
		);
	}

	/**
	 * Update a group.
	 * Required scope: `groups:group:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/(groupId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-(groupId)
	 */
	async updateGroup(
		orgUnitId: number,
		groupCategoryId: number,
		groupId: number,
		data: GroupDataInput
	): Promise<GroupData> {
		return this.put<GroupData>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}`,
			data
		);
	}

	/**
	 * Delete a group.
	 * Required scope: `groups:group:write`
	 * DELETE /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/(groupId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#delete--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-(groupId)
	 */
	async delGroup(
		orgUnitId: number,
		groupCategoryId: number,
		groupId: number
	): Promise<void> {
		return this.delete<void>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Group enrollments
	// ---------------------------------------------------------------------------

	/**
	 * Enroll a user in a group.
	 * Required scope: `groups:group:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/(groupId)/enrollments/(userId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-(groupId)-enrollments-(userId)
	 */
	async enrollUser(
		orgUnitId: number,
		groupCategoryId: number,
		groupId: number,
		userId: number
	): Promise<void> {
		return this.put<void>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}/enrollments/${userId}`
		);
	}

	/**
	 * Remove a user's enrollment from a group.
	 * Required scope: `groups:group:write`
	 * DELETE /d2l/api/lp/(version)/(orgUnitId)/groupcategories/(groupCategoryId)/groups/(groupId)/enrollments/(userId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#delete--d2l-api-lp-(version)-(orgUnitId)-groupcategories-(groupCategoryId)-groups-(groupId)-enrollments-(userId)
	 */
	async unenrollUser(
		orgUnitId: number,
		groupCategoryId: number,
		groupId: number,
		userId: number
	): Promise<void> {
		return this.delete<void>(
			"lp",
			`${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}/enrollments/${userId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Sections
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve section enrollment settings for a course.
	 * Required scope: `groups:section:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/sections/settings
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-sections-settings
	 */
	async retrieveSectionSettings(
		orgUnitId: number
	): Promise<SectionPropertyData> {
		return this.get<SectionPropertyData>(
			"lp",
			`${orgUnitId}/sections/settings`
		);
	}

	/**
	 * Update section enrollment settings for a course.
	 * Required scope: `groups:section:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/sections/settings
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-sections-settings
	 */
	async updateSectionSettings(
		orgUnitId: number,
		data: SectionPropertyData
	): Promise<SectionPropertyData> {
		return this.put<SectionPropertyData>(
			"lp",
			`${orgUnitId}/sections/settings`,
			data
		);
	}

	/**
	 * Retrieve all sections for a course.
	 * Required scope: `groups:section:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/sections/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-sections-
	 */
	async listSections(orgUnitId: number): Promise<SectionData[]> {
		return this.get<SectionData[]>("lp", `${orgUnitId}/sections/`);
	}

	/**
	 * Retrieve a specific section.
	 * Required scope: `groups:section:read`
	 * GET /d2l/api/lp/(version)/(orgUnitId)/sections/(sectionId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#get--d2l-api-lp-(version)-(orgUnitId)-sections-(sectionId)
	 */
	async retrieveSection(
		orgUnitId: number,
		sectionId: number
	): Promise<SectionData> {
		return this.get<SectionData>("lp", `${orgUnitId}/sections/${sectionId}`);
	}

	/**
	 * Create a section.
	 * Required scope: `groups:section:write`
	 * POST /d2l/api/lp/(version)/(orgUnitId)/sections/
	 * @see https://docs.valence.desire2learn.com/res/groups.html#post--d2l-api-lp-(version)-(orgUnitId)-sections-
	 */
	async createSection(
		orgUnitId: number,
		data: SectionDataInput
	): Promise<SectionData> {
		return this.post<SectionData>("lp", `${orgUnitId}/sections/`, data);
	}

	/**
	 * Update a section.
	 * Required scope: `groups:section:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/sections/(sectionId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-sections-(sectionId)
	 */
	async updateSection(
		orgUnitId: number,
		sectionId: number,
		data: SectionDataInput
	): Promise<SectionData> {
		return this.put<SectionData>(
			"lp",
			`${orgUnitId}/sections/${sectionId}`,
			data
		);
	}

	/**
	 * Enroll a user in a section.
	 * Required scope: `groups:section:write`
	 * PUT /d2l/api/lp/(version)/(orgUnitId)/sections/(sectionId)/enrollments/(userId)
	 * @see https://docs.valence.desire2learn.com/res/groups.html#put--d2l-api-lp-(version)-(orgUnitId)-sections-(sectionId)-enrollments-(userId)
	 */
	async enrollUserInSection(
		orgUnitId: number,
		sectionId: number,
		userId: number
	): Promise<void> {
		return this.put<void>(
			"lp",
			`${orgUnitId}/sections/${sectionId}/enrollments/${userId}`
		);
	}
}