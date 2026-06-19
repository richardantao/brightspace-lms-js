import { BaseResource } from "../core/resource";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";
import type { PaginatedList } from "../types";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L User API response shapes
// @see https://docs.valence.desire2learn.com/res/user.html
// ---------------------------------------------------------------------------

/** User.WhoAmIUser — returned by GET /d2l/api/lp/(version)/users/whoami */
export interface WhoAmIUser {
	Identifier: string;
	FirstName: string;
	LastName: string;
	/** Same value as UniqueIdentifier in UserData */
	UniqueName: string;
	ProfileIdentifier: string;
	Pronouns: string;
}

/** User.UserActivationData — embedded in UserData and used for activation updates */
export interface UserActivationData {
	IsActive: boolean;
}

/** User.UserData — returned by GET /d2l/api/lp/(version)/users/(userId) */
export interface UserData {
	OrgId: number;
	UserId: number;
	FirstName: string;
	MiddleName: string | null;
	LastName: string;
	UserName: string;
	ExternalEmail: string | null;
	OrgDefinedId: string | null;
	UniqueIdentifier: string;
	Activation: UserActivationData;
	DisplayName: string;
	LastAccessedDate: string | null;
	Pronouns: string;
	/** Added with LMS v20.26.2 */
	FirstLoginDate: string | null;
}

/** User.CreateUserData — body for POST /d2l/api/lp/(version)/users/ */
export interface CreateUserData {
	OrgDefinedId: string | null;
	FirstName: string;
	MiddleName: string | null;
	LastName: string;
	ExternalEmail: string | null;
	UserName: string;
	RoleId: number;
	IsActive: boolean;
	SendCreationEmail: boolean;
	Pronouns: string | null;
	/** Added with LP API v1.57 */
	PasswordData?: UserPasswordData | null;
}

/** User.UpdateUserData — body for PUT /d2l/api/lp/(version)/users/(userId) */
export interface UpdateUserData {
	OrgDefinedId: string;
	FirstName: string;
	MiddleName: string | null;
	LastName: string;
	ExternalEmail: string | null;
	UserName: string;
	Activation: UserActivationData;
	/**
	 * System-defined pronouns. Pass null to leave unchanged.
	 * Pass "" to reset to empty.
	 */
	Pronouns: string | null;
}

/** User.LegalPreferredNames — used by GET/PUT /d2l/api/lp/(version)/users/(userId)/names */
export interface LegalPreferredNames {
	LegalFirstName: string;
	LegalLastName: string;
	PreferredFirstName: string | null;
	PreferredLastName: string | null;
	/** Last name used for sorting; null falls back to Preferred/Legal last name */
	SortLastName: string | null;
}

/** User.UserPasswordData — used in CreateUserData and password reset */
export interface UserPasswordData {
	Password: string;
	ForcePasswordReset: boolean;
}

/** User.UserResetPassword — body for POST /d2l/api/lp/(version)/users/(userId)/password */
export interface UserResetPassword {
	/**
	 * If true, forces the user to reset their password on next login.
	 * If false (or absent in LP API < v1.50), sends a password reset email
	 * without forcing reset on next login.
	 */
	ForcePasswordReset: boolean;
}

/** User.Pronouns — returned by GET and used by PUT /d2l/api/lp/(version)/users/(userId)/pronouns */
export interface UserPronouns {
	UserDefinedPronouns: string | null;
	/** Only present on retrieve actions — not accepted on update */
	SystemDefinedPronouns?: string | null;
	ShowPronouns: boolean;
	UseUserDefinedPronouns: boolean;
}

/** User.BatchUserCreateError — error entry returned from POST /d2l/api/lp/(version)/users/batch/ */
export interface BatchUserCreateError {
	UserName: string;
	/** HTTP error code indicating the failure type */
	StatusError: number;
	StatusMessage: string;
}

export interface ListUsersParams {
	orgDefinedId?: string;
	userName?: string;
	externalEmail?: string;
	/** Filter by activation status */
	isActive?: boolean;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class UsersResource extends BaseResource {
	/**
	 * Retrieve the WhoAmI user information for the current user context.
	 * GET /d2l/api/lp/(version)/users/whoami
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-whoami
	 */
	async whoami(): Promise<WhoAmIUser> {
		return this.get<WhoAmIUser>("lp", "users/whoami");
	}

	/**
	 * Retrieve data for a specific user.
	 * GET /d2l/api/lp/(version)/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-(userId)
	 */
	async retrieve(userId: number): Promise<UserData> {
		return this.get<UserData>("lp", `users/${userId}`);
	}

	/**
	 * Retrieve a paged list of users matching optional filter parameters.
	 * GET /d2l/api/lp/(version)/users/
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-
	 */
	async list(params: ListUsersParams = {}): Promise<PaginatedList<UserData>> {
		const page = await this.fetchUsersPage(params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Create a new user.
	 * POST /d2l/api/lp/(version)/users/
	 * @see https://docs.valence.desire2learn.com/res/user.html#post--d2l-api-lp-(version)-users-
	 */
	async create(data: CreateUserData): Promise<UserData> {
		return this.post<UserData>("lp", "users/", data);
	}

	/**
	 * Update an existing user's data.
	 * PUT /d2l/api/lp/(version)/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/user.html#put--d2l-api-lp-(version)-users-(userId)
	 */
	async update(userId: number, data: UpdateUserData): Promise<UserData> {
		return this.put<UserData>("lp", `users/${userId}`, data);
	}

	/**
	 * Delete a user.
	 * DELETE /d2l/api/lp/(version)/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/user.html#delete--d2l-api-lp-(version)-users-(userId)
	 */
	async del(userId: number): Promise<void> {
		return this.delete<void>("lp", `users/${userId}`);
	}

	// ---------------------------------------------------------------------------
	// Sub-resource actions — activation, names, pronouns, password
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a user's activation status.
	 * GET /d2l/api/lp/(version)/users/(userId)/activation
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-(userId)-activation
	 */
	async retrieveActivation(userId: number): Promise<UserActivationData> {
		return this.get<UserActivationData>("lp", `users/${userId}/activation`);
	}

	/**
	 * Update a user's activation status.
	 * PUT /d2l/api/lp/(version)/users/(userId)/activation
	 * @see https://docs.valence.desire2learn.com/res/user.html#put--d2l-api-lp-(version)-users-(userId)-activation
	 */
	async updateActivation(userId: number, isActive: boolean): Promise<void> {
		return this.put<void>("lp", `users/${userId}/activation`, {
			IsActive: isActive,
		});
	}

	/**
	 * Retrieve a user's legal and preferred names.
	 * GET /d2l/api/lp/(version)/users/(userId)/names
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-(userId)-names
	 */
	async retrieveNames(userId: number): Promise<LegalPreferredNames> {
		return this.get<LegalPreferredNames>("lp", `users/${userId}/names`);
	}

	/**
	 * Update a user's legal and preferred names.
	 * PUT /d2l/api/lp/(version)/users/(userId)/names
	 * @see https://docs.valence.desire2learn.com/res/user.html#put--d2l-api-lp-(version)-users-(userId)-names
	 */
	async updateNames(userId: number, names: LegalPreferredNames): Promise<void> {
		return this.put<void>("lp", `users/${userId}/names`, names);
	}

	/**
	 * Retrieve a user's pronoun data.
	 * GET /d2l/api/lp/(version)/users/(userId)/pronouns
	 * @see https://docs.valence.desire2learn.com/res/user.html#get--d2l-api-lp-(version)-users-(userId)-pronouns
	 */
	async retrievePronouns(userId: number): Promise<UserPronouns> {
		return this.get<UserPronouns>("lp", `users/${userId}/pronouns`);
	}

	/**
	 * Update a user's pronoun preferences.
	 * Note: SystemDefinedPronouns is read-only and must not be included in the body.
	 * PUT /d2l/api/lp/(version)/users/(userId)/pronouns
	 * @see https://docs.valence.desire2learn.com/res/user.html#put--d2l-api-lp-(version)-users-(userId)-pronouns
	 */
	async updatePronouns(
		userId: number,
		pronouns: Omit<UserPronouns, "SystemDefinedPronouns">
	): Promise<void> {
		return this.put<void>("lp", `users/${userId}/pronouns`, pronouns);
	}

	/**
	 * Initiate a password reset for a user.
	 * POST /d2l/api/lp/(version)/users/(userId)/password
	 * @see https://docs.valence.desire2learn.com/res/user.html#post--d2l-api-lp-(version)-users-(userId)-password
	 */
	async resetPassword(userId: number, data: UserResetPassword): Promise<void> {
		return this.post<void>("lp", `users/${userId}/password`, data);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchUsersPage(
		params: ListUsersParams
	): Promise<PaginatedPageResponse<UserData>> {
		const query = buildQueryString({
			orgDefinedId: params.orgDefinedId,
			userName: params.userName,
			externalEmail: params.externalEmail,
			isActive:
				params.isActive !== undefined ? String(params.isActive) : undefined,
			bookmark: params.bookmark,
		});

		const raw = await this.get<D2LPageResponse<UserData>>(
			"lp",
			`users/${query}`
		);

		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () => this.fetchUsersPage({ ...params, bookmark: raw.Bookmark })
					: undefined,
		};
	}
}
