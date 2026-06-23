import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Org Unit API response shapes
// @see https://docs.valence.desire2learn.com/res/orgunit.html
// ---------------------------------------------------------------------------

/**
 * Org.Organization — the root org unit (the institution itself).
 * Callable anonymously — no auth header required.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#Org.Organization
 */
export interface Organization {
	Identifier: string;
	Name: string;
	/** Configured local time zone for the Brightspace back-end service. */
	TimeZone: string;
}

/**
 * OrgUnit.OrgUnitTypeInfo — embedded composite used by OrgUnit and OrgUnitProperties.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnitTypeInfo
 */
export interface OrgUnitTypeInfo {
	Id: number;
	Code: string;
	Name: string;
}

/**
 * OrgUnit.OrgUnit — fundamental org unit information returned by retrieve actions.
 * Path added with LMS v20.25.1.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnit
 */
export interface OrgUnit {
	Identifier: string;
	Name: string;
	/**
	 * Null in rare cases — most likely for the root organization org unit only.
	 * Never pass null when setting the code on create/update.
	 */
	Code: string | null;
	/** Added with LMS v20.25.1 */
	Path: string;
	Type: OrgUnitTypeInfo;
}

/**
 * OrgUnit.OrgUnitProperties — returned by list and filter actions.
 * Identical shape to OrgUnit. Only Name, Code, and Path are used on update.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnitProperties
 */
export type OrgUnitProperties = OrgUnit;

/**
 * OrgUnit.OrgUnitCoreInfo — extended org unit info including active state and dates.
 * Used by cross-resource composites such as Dropbox-related actions.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnitCoreInfo
 */
export interface OrgUnitCoreInfo {
	Identifier: string;
	TypeIdentifier: string;
	Name: string;
	Code: string | null;
	Path: string;
	IsActive: boolean;
	/** Non-null only for org unit types that support date ranges (e.g. course offerings) */
	StartDate: string | null;
	EndDate: string | null;
}

/**
 * OrgUnit.OrgUnitCreateData — body for create and update custom org unit actions.
 *
 * Code limitations:
 *   - Max 50 characters
 *   - Cannot contain: \ : * ? " < > | ' # , % &
 *
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnitCreateData
 */
export interface OrgUnitCreateData {
	/** D2LID of the org unit type */
	Type: number;
	Name: string;
	Code: string;
	/** Array of immediate parent org unit IDs */
	Parents: number[];
}

/**
 * OrgUnit.OrgUnitProperties update input — only Name, Code, and Path are used.
 */
export interface OrgUnitUpdateData {
	Name: string;
	/** Max 50 chars; cannot contain special characters; never null */
	Code: string;
	Path: string;
}

/**
 * OrgUnit.OrgUnitType — full type definition with permissions.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.OrgUnitType
 */
export interface OrgUnitType {
	Id: number;
	Code: string;
	Name: string;
	Description: string;
	SortOrder: number;
	Permissions: OrgUnitPermissions;
}

/**
 * OrgUnit.Permissions — CRUD permission flags for an org unit type.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.Permissions
 */
export interface OrgUnitPermissions {
	CanDelete: boolean;
	CanEdit: boolean;
}

/**
 * OrgUnit.CreateOrgUnitTypeData — body for create and update org unit type actions.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnit.CreateOrgUnitTypeData
 */
export interface CreateOrgUnitTypeData {
	Code: string;
	Name: string;
	Description: string;
	SortOrder: number;
}

/**
 * OrgUnitEditor.ColourScheme — color scheme for an org unit.
 * @see https://docs.valence.desire2learn.com/res/orgunit.html#OrgUnitEditor.ColourScheme
 */
export interface OrgUnitColourScheme {
	Dark: string;
	Light: string;
	Soft: string;
}

export interface ListOrgUnitsParams {
	/** Filter by org unit type ID */
	orgUnitType?: number;
	/** Substring match on code */
	orgUnitCode?: string;
	/** Substring match on name */
	orgUnitName?: string;
	/** Exact match on code — overrides orgUnitCode */
	exactOrgUnitCode?: string;
	/** Exact match on name — overrides orgUnitName */
	exactOrgUnitName?: string;
	bookmark?: string;
}

export interface ListRelativesParams {
	/** Filter by org unit type ID */
	ouTypeId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class OrgUnitsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Organization root
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve the organization properties (the root org unit / institution).
	 * This call can be made anonymously — no Authorization header required.
	 * GET /d2l/api/lp/(version)/organization/info
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-organization-info
	 */
	async retrieveOrganization(): Promise<Organization> {
		return this.get<Organization>("lp", "organization/info");
	}

	/**
	 * Retrieve the organization's primary root URL.
	 * Returns plain text, not JSON. This call can be made anonymously.
	 * GET /d2l/api/lp/(version)/organization/primary-url
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-organization-primary-url
	 */
	async retrievePrimaryUrl(): Promise<string> {
		return this.get<string>("lp", "organization/primary-url");
	}

	// ---------------------------------------------------------------------------
	// Org unit structure
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of all org units, with optional filters.
	 * Use exactOrgUnitCode / exactOrgUnitName for precise lookups;
	 * orgUnitCode / orgUnitName do substring matching.
	 * GET /d2l/api/lp/(version)/orgstructure/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-
	 */
	async list(
		params: ListOrgUnitsParams = {}
	): Promise<PaginatedList<OrgUnitProperties>> {
		const page = await this.fetchOrgUnitsPage(params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve properties for a specific org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)
	 */
	async retrieve(orgUnitId: number): Promise<OrgUnit> {
		return this.get<OrgUnit>("lp", `orgstructure/${orgUnitId}`);
	}

	/**
	 * Create a custom org unit.
	 * POST /d2l/api/lp/(version)/orgstructure/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#post--d2l-api-lp-(version)-orgstructure-
	 */
	async create(data: OrgUnitCreateData): Promise<OrgUnit> {
		return this.post<OrgUnit>("lp", "orgstructure/", data);
	}

	/**
	 * Update a custom org unit's Name, Code, and Path.
	 * Only these three fields are used by the back-end service on update.
	 * PUT /d2l/api/lp/(version)/orgstructure/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#put--d2l-api-lp-(version)-orgstructure-(orgUnitId)
	 */
	async update(orgUnitId: number, data: OrgUnitUpdateData): Promise<void> {
		return this.put<void>("lp", `orgstructure/${orgUnitId}`, data);
	}

	/**
	 * Delete a custom org unit.
	 * DELETE /d2l/api/lp/(version)/orgstructure/(orgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#delete--d2l-api-lp-(version)-orgstructure-(orgUnitId)
	 */
	async del(orgUnitId: number): Promise<void> {
		return this.delete<void>("lp", `orgstructure/${orgUnitId}`);
	}

	// ---------------------------------------------------------------------------
	// Hierarchy traversal
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all ancestor org units of a given org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)/ancestors/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)-ancestors-
	 */
	async listAncestors(
		orgUnitId: number,
		params: ListRelativesParams = {}
	): Promise<PaginatedList<OrgUnit>> {
		const page = await this.fetchRelativesPage(
			`orgstructure/${orgUnitId}/ancestors/`,
			params
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve all descendant org units of a given org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)/descendants/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)-descendants-
	 */
	async listDescendants(
		orgUnitId: number,
		params: ListRelativesParams = {}
	): Promise<PaginatedList<OrgUnit>> {
		const page = await this.fetchRelativesPage(
			`orgstructure/${orgUnitId}/descendants/`,
			params
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve all immediate parent org units of a given org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)/parents/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)-parents-
	 */
	async listParents(
		orgUnitId: number,
		params: ListRelativesParams = {}
	): Promise<PaginatedList<OrgUnit>> {
		const page = await this.fetchRelativesPage(
			`orgstructure/${orgUnitId}/parents/`,
			params
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve all immediate child org units of a given org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)/children/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)-children-
	 */
	async listChildren(
		orgUnitId: number,
		params: ListRelativesParams = {}
	): Promise<PaginatedList<OrgUnit>> {
		const page = await this.fetchRelativesPage(
			`orgstructure/${orgUnitId}/children/`,
			params
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Add a parent relationship to an org unit.
	 * POST /d2l/api/lp/(version)/orgstructure/(orgUnitId)/parents/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#post--d2l-api-lp-(version)-orgstructure-(orgUnitId)-parents-
	 */
	async addParent(orgUnitId: number, parentOrgUnitId: number): Promise<void> {
		return this.post<void>("lp", `orgstructure/${orgUnitId}/parents/`, {
			orgUnitId: parentOrgUnitId,
		});
	}

	/**
	 * Remove the relationship between an org unit and one of its parents.
	 * DELETE /d2l/api/lp/(version)/orgstructure/(orgUnitId)/parents/(parentOrgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#delete--d2l-api-lp-(version)-orgstructure-(orgUnitId)-parents-(parentOrgUnitId)
	 */
	async removeParent(
		orgUnitId: number,
		parentOrgUnitId: number
	): Promise<void> {
		return this.delete<void>(
			"lp",
			`orgstructure/${orgUnitId}/parents/${parentOrgUnitId}`
		);
	}

	/**
	 * Remove the relationship between an org unit and one of its children.
	 * DELETE /d2l/api/lp/(version)/orgstructure/(orgUnitId)/children/(childOrgUnitId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#delete--d2l-api-lp-(version)-orgstructure-(orgUnitId)-children-(childOrgUnitId)
	 */
	async removeChild(orgUnitId: number, childOrgUnitId: number): Promise<void> {
		return this.delete<void>(
			"lp",
			`orgstructure/${orgUnitId}/children/${childOrgUnitId}`
		);
	}

	/**
	 * Retrieve all org units that have no children.
	 * GET /d2l/api/lp/(version)/orgstructure/childless/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-childless-
	 */
	async listChildless(
		params: Omit<
			ListOrgUnitsParams,
			"exactOrgUnitCode" | "exactOrgUnitName"
		> = {}
	): Promise<PaginatedList<OrgUnitProperties>> {
		const page = await this.fetchOrgUnitsPage(
			params,
			"orgstructure/childless/"
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve all org units that have no parents (orphans).
	 * GET /d2l/api/lp/(version)/orgstructure/orphans/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-orphans-
	 */
	async listOrphans(
		params: Omit<
			ListOrgUnitsParams,
			"exactOrgUnitCode" | "exactOrgUnitName"
		> = {}
	): Promise<PaginatedList<OrgUnitProperties>> {
		const page = await this.fetchOrgUnitsPage(params, "orgstructure/orphans/");
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	// ---------------------------------------------------------------------------
	// Color schemes
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve the color scheme for an org unit.
	 * GET /d2l/api/lp/(version)/orgstructure/(orgUnitId)/colours
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-(orgUnitId)-colours
	 */
	async retrieveColourScheme(orgUnitId: number): Promise<OrgUnitColourScheme> {
		return this.get<OrgUnitColourScheme>(
			"lp",
			`orgstructure/${orgUnitId}/colours`
		);
	}

	/**
	 * Update the color scheme for an org unit.
	 * PUT /d2l/api/lp/(version)/orgstructure/(orgUnitId)/colours
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#put--d2l-api-lp-(version)-orgstructure-(orgUnitId)-colours
	 */
	async updateColourScheme(
		orgUnitId: number,
		scheme: OrgUnitColourScheme
	): Promise<void> {
		return this.put<void>("lp", `orgstructure/${orgUnitId}/colours`, scheme);
	}

	// ---------------------------------------------------------------------------
	// Recycle bin
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve a paged list of org units in the recycle bin.
	 * GET /d2l/api/lp/(version)/orgstructure/recyclebin/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-orgstructure-recyclebin-
	 */
	async listRecycleBin(
		params: { bookmark?: string } = {}
	): Promise<PaginatedList<OrgUnitProperties>> {
		const page = await this.fetchOrgUnitsPage(
			params,
			"orgstructure/recyclebin/"
		);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Permanently delete an org unit from the recycle bin.
	 * DELETE /d2l/api/lp/(version)/orgstructure/recyclebin/(orgUnitId)/delete
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#delete--d2l-api-lp-(version)-orgstructure-recyclebin-(orgUnitId)-delete
	 */
	async deleteFromRecycleBin(orgUnitId: number): Promise<void> {
		return this.delete<void>(
			"lp",
			`orgstructure/recyclebin/${orgUnitId}/delete`
		);
	}

	/**
	 * Restore an org unit from the recycle bin.
	 * POST /d2l/api/lp/(version)/orgstructure/recyclebin/(orgUnitId)/restore
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#post--d2l-api-lp-(version)-orgstructure-recyclebin-(orgUnitId)-restore
	 */
	async restoreFromRecycleBin(orgUnitId: number): Promise<void> {
		return this.post<void>(
			"lp",
			`orgstructure/recyclebin/${orgUnitId}/restore`
		);
	}

	// ---------------------------------------------------------------------------
	// Org unit types
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all org unit types.
	 * GET /d2l/api/lp/(version)/outypes/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-outypes-
	 */
	async listTypes(): Promise<OrgUnitType[]> {
		return this.get<OrgUnitType[]>("lp", "outypes/");
	}

	/**
	 * Retrieve a specific org unit type.
	 * GET /d2l/api/lp/(version)/outypes/(orgUnitTypeId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#get--d2l-api-lp-(version)-outypes-(orgUnitTypeId)
	 */
	async retrieveType(orgUnitTypeId: number): Promise<OrgUnitType> {
		return this.get<OrgUnitType>("lp", `outypes/${orgUnitTypeId}`);
	}

	/**
	 * Create a custom org unit type.
	 * POST /d2l/api/lp/(version)/outypes/
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#post--d2l-api-lp-(version)-outypes-
	 */
	async createType(data: CreateOrgUnitTypeData): Promise<OrgUnitType> {
		return this.post<OrgUnitType>("lp", "outypes/", data);
	}

	/**
	 * Update a custom org unit type.
	 * PUT /d2l/api/lp/(version)/outypes/(orgUnitTypeId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#put--d2l-api-lp-(version)-outypes-(orgUnitTypeId)
	 */
	async updateType(
		orgUnitTypeId: number,
		data: CreateOrgUnitTypeData
	): Promise<void> {
		return this.put<void>("lp", `outypes/${orgUnitTypeId}`, data);
	}

	/**
	 * Delete a custom org unit type.
	 * Only custom types can be deleted — built-in types (course offerings,
	 * departments, semesters) cannot be removed.
	 * DELETE /d2l/api/lp/(version)/outypes/(orgUnitTypeId)
	 * @see https://docs.valence.desire2learn.com/res/orgunit.html#delete--d2l-api-lp-(version)-outypes-(orgUnitTypeId)
	 */
	async delType(orgUnitTypeId: number): Promise<void> {
		return this.delete<void>("lp", `outypes/${orgUnitTypeId}`);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchOrgUnitsPage(
		params: ListOrgUnitsParams & { bookmark?: string },
		route = "orgstructure/"
	): Promise<PaginatedPageResponse<OrgUnitProperties>> {
		const query = buildQueryString({
			orgUnitType: params.orgUnitType,
			orgUnitCode: params.orgUnitCode,
			orgUnitName: params.orgUnitName,
			exactOrgUnitCode: params.exactOrgUnitCode,
			exactOrgUnitName: params.exactOrgUnitName,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<OrgUnitProperties>>(
			"lp",
			`${route}${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchOrgUnitsPage(
								{ ...params, bookmark: raw.Bookmark },
								route
							)
					: undefined,
		};
	}

	private async fetchRelativesPage(
		route: string,
		params: ListRelativesParams
	): Promise<PaginatedPageResponse<OrgUnit>> {
		const query = buildQueryString({
			ouTypeId: params.ouTypeId,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<OrgUnit>>(
			"lp",
			`${route}${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchRelativesPage(route, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}
