import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Demographics API response shapes
// @see https://docs.valence.desire2learn.com/res/demographics.html
// ---------------------------------------------------------------------------

/**
 * Demographics.DemographicsDataType — a supported data type for demographic fields.
 * @see https://docs.valence.desire2learn.com/res/demographics.html#Demographics.DemographicsDataType
 */
export interface DemographicsDataType {
	DataTypeId: string;
	DataTypeName: string;
	DisplayName: string;
}

/**
 * Demographics.DemographicsEntry — a name/values pair for a demographic field.
 * @see https://docs.valence.desire2learn.com/res/demographics.html#Demographics.DemographicsEntry
 */
export interface DemographicsEntry {
	Name: string;
	Values: string[];
}

/**
 * Demographics.DemographicsEntryData — body for setting user demographic entries.
 * @see https://docs.valence.desire2learn.com/res/demographics.html#Demographics.DemographicsEntryData
 */
export interface DemographicsEntryData {
	EntryValues: DemographicsEntry[];
}

/**
 * Demographics.DemographicsUserEntryData — user demographic entries with userId.
 * @see https://docs.valence.desire2learn.com/res/demographics.html#Demographics.DemographicsUserEntryData
 */
export interface DemographicsUserEntryData {
	UserId: number;
	EntryValues: DemographicsEntry[];
}

/**
 * Demographics.DemographicsField — a demographic field definition (fetch shape).
 * @see https://docs.valence.desire2learn.com/res/demographics.html#Demographics.DemographicsField
 */
export interface DemographicsField {
	FieldId: number;
	Name: string;
	Description: string;
	DataTypeId: string;
}

/** Input for creating a demographics field */
export interface DemographicsFieldCreate {
	Name: string;
	Description: string;
	DataTypeId: string;
}

/** Input for updating a demographics field */
export interface DemographicsFieldUpdate {
	Name: string;
	Description: string;
}

export interface ListOrgUnitUsersParams {
	fieldIds?: number[];
	roleIds?: number[];
	userIds?: number[];
	search?: string;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class DemographicsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Data types (read-only reference data)
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all supported demographics data types.
	 * GET /d2l/api/lp/(version)/demographics/dataTypes/
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#get--d2l-api-lp-(version)-demographics-dataTypes-
	 */
	async listDataTypes(): Promise<DemographicsDataType[]> {
		return this.get<DemographicsDataType[]>("lp", "demographics/dataTypes/");
	}

	// ---------------------------------------------------------------------------
	// Fields
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all demographics fields.
	 * GET /d2l/api/lp/(version)/demographics/fields/
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#get--d2l-api-lp-(version)-demographics-fields-
	 */
	async listFields(): Promise<DemographicsField[]> {
		return this.get<DemographicsField[]>("lp", "demographics/fields/");
	}

	/**
	 * Retrieve a specific demographics field.
	 * GET /d2l/api/lp/(version)/demographics/fields/(fieldId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#get--d2l-api-lp-(version)-demographics-fields-(fieldId)
	 */
	async retrieveField(fieldId: number): Promise<DemographicsField> {
		return this.get<DemographicsField>("lp", `demographics/fields/${fieldId}`);
	}

	/**
	 * Create a demographics field.
	 * POST /d2l/api/lp/(version)/demographics/fields/
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#post--d2l-api-lp-(version)-demographics-fields-
	 */
	async createField(data: DemographicsFieldCreate): Promise<DemographicsField> {
		return this.post<DemographicsField>("lp", "demographics/fields/", data);
	}

	/**
	 * Update a demographics field's name and description.
	 * PUT /d2l/api/lp/(version)/demographics/fields/(fieldId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#put--d2l-api-lp-(version)-demographics-fields-(fieldId)
	 */
	async updateField(
		fieldId: number,
		data: DemographicsFieldUpdate
	): Promise<DemographicsField> {
		return this.put<DemographicsField>(
			"lp",
			`demographics/fields/${fieldId}`,
			data
		);
	}

	/**
	 * Delete a demographics field.
	 * DELETE /d2l/api/lp/(version)/demographics/fields/(fieldId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#delete--d2l-api-lp-(version)-demographics-fields-(fieldId)
	 */
	async delField(fieldId: number): Promise<void> {
		return this.delete<void>("lp", `demographics/fields/${fieldId}`);
	}

	// ---------------------------------------------------------------------------
	// User demographics entries
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve demographics entries for a specific user.
	 * GET /d2l/api/lp/(version)/demographics/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#get--d2l-api-lp-(version)-demographics-users-(userId)
	 */
	async retrieveUserEntries(userId: number): Promise<DemographicsEntryData> {
		return this.get<DemographicsEntryData>(
			"lp",
			`demographics/users/${userId}`
		);
	}

	/**
	 * Set demographics entries for a specific user.
	 * Replaces all existing entries for the user.
	 * PUT /d2l/api/lp/(version)/demographics/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#put--d2l-api-lp-(version)-demographics-users-(userId)
	 */
	async updateUserEntries(
		userId: number,
		data: DemographicsEntryData
	): Promise<DemographicsEntryData> {
		return this.put<DemographicsEntryData>(
			"lp",
			`demographics/users/${userId}`,
			data
		);
	}

	/**
	 * Delete demographics entries for a specific user.
	 * If entryIds is not provided, all entries for the user are deleted.
	 * DELETE /d2l/api/lp/(version)/demographics/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#delete--d2l-api-lp-(version)-demographics-users-(userId)
	 */
	async delUserEntries(userId: number, entryIds?: number[]): Promise<void> {
		const query = entryIds?.length ? `?entryIds=${entryIds.join(",")}` : "";
		return this.delete<void>("lp", `demographics/users/${userId}${query}`);
	}

	/**
	 * Retrieve demographics entries for all users in an org unit.
	 * Returns a paged result; supports filtering by field, role, user, and search string.
	 * GET /d2l/api/lp/(version)/demographics/orgUnits/(orgUnitId)/users/
	 * @see https://docs.valence.desire2learn.com/res/demographics.html#get--d2l-api-lp-(version)-demographics-orgUnits-(orgUnitId)-users-
	 */
	async listOrgUnitUserEntries(
		orgUnitId: number,
		params: ListOrgUnitUsersParams = {}
	): Promise<PaginatedList<DemographicsUserEntryData>> {
		const page = await this.fetchOrgUnitUsersPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchOrgUnitUsersPage(
		orgUnitId: number,
		params: ListOrgUnitUsersParams
	): Promise<PaginatedPageResponse<DemographicsUserEntryData>> {
		const sp = new URLSearchParams();
		if (params.fieldIds?.length) sp.set("fieldIds", params.fieldIds.join(","));
		if (params.roleIds?.length) sp.set("roleIds", params.roleIds.join(","));
		if (params.userIds?.length) sp.set("userIds", params.userIds.join(","));
		if (params.search) sp.set("search", params.search);
		if (params.bookmark) sp.set("bookmark", params.bookmark);
		const qs = sp.toString();
		const query = qs ? `?${qs}` : "";

		const raw = await this.get<D2LPageResponse<DemographicsUserEntryData>>(
			"lp",
			`demographics/orgUnits/${orgUnitId}/users/${query}`
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
}