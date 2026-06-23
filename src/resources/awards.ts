import { BaseResource } from "../core/resource";
import type { PaginatedList } from "../types";
import {
	type D2LPageResponse,
	type PaginatedPageResponse,
	CursorPaginatedList,
} from "../core/paginated-list";
import { buildQueryString } from "../core/utils";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Awards API response shapes
// @see https://docs.valence.desire2learn.com/res/awards.html
// ---------------------------------------------------------------------------

/** AWARD_T — badge or certificate */
export const AwardType = {
	Badge: 1,
	Certificate: 2,
} as const;
export type AwardType = (typeof AwardType)[keyof typeof AwardType];

/** EXPIRY_CALCULATION_T */
export const ExpiryCalculationType = {
	Never: 1,
	Fixed: 2,
	Relative: 3,
	RelativeDayOfMonth: 4,
} as const;
export type ExpiryCalculationType =
	(typeof ExpiryCalculationType)[keyof typeof ExpiryCalculationType];

/** EXPIRY_NOTIFICATION_T */
export const ExpiryNotificationType = {
	Days: 1,
	Weeks: 2,
	Months: 3,
	Years: 4,
} as const;
export type ExpiryNotificationType =
	(typeof ExpiryNotificationType)[keyof typeof ExpiryNotificationType];

/**
 * AwardDateTime — D2L's UTC datetime format prefixed with "U" without trailing "Z".
 * e.g. "U2046-05-20T13:15:30.067" (equivalent to ISO 8601 "2046-05-20T13:15:30.067Z")
 */
export type AwardDateTime = string;

export interface AwardExpiryCalculation {
	ExpiryCalculationType: ExpiryCalculationType;
	Day: number | null;
	Week: number | null;
	Month: number | null;
	Year: number | null;
}

export interface AwardExpiryNotification {
	SendExpiryNotification: boolean;
	ExpiryNotificationType: ExpiryNotificationType | null;
	Amount: number | null;
}

export interface AwardFileData {
	FileId: number;
	FileName: string;
	FileSize: number;
}

export interface AwardInputFileInfo {
	FileId: number;
}

export interface AwardReleaseCondition {
	ConditionId: number;
	ConditionText: string;
}

/**
 * Awards.Award — full award definition.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.Award
 */
export interface Award {
	AwardId: number;
	CreatedBy: number;
	Title: string;
	Description: string;
	ExpiryCalculation: AwardExpiryCalculation;
	ExpiryNotification: AwardExpiryNotification;
	IssuerName: string;
	IssuerUrl: string;
	IssuerContact: string;
	AwardType: AwardType;
	/** Always null for Badge awards */
	CertificateData: AwardFileData | null;
	ImageData: AwardFileData | null;
	IsDeleted: boolean;
	Criteria: string | null;
}

/**
 * Awards.AwardCreate — body for create award action.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.AwardCreate
 */
export interface AwardCreate {
	AwardType: AwardType;
	/** Max 256 chars */
	Title: string;
	/** Max 1000 chars */
	Description: string;
	ExpiryCalculation: AwardExpiryCalculation;
	ExpiryNotification: AwardExpiryNotification;
	/** Max 128 chars */
	IssuerName: string;
	/** Valid URL, max 128 chars */
	IssuerUrl: string;
	/** Valid email, max 128 chars */
	IssuerContact: string;
	/** Required for Certificate awards; null/omit for Badge awards */
	Certificate: AwardInputFileInfo | null;
	Image: AwardInputFileInfo | null;
	Criteria: string | null;
}

/**
 * Awards.AwardUpdate — body for update award action.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.AwardUpdate
 */
export type AwardUpdate = Omit<AwardCreate, "AwardType">;

/**
 * Awards.Association — an award associated with an org unit.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.Association
 */
export interface AwardAssociation {
	AssociationId: number;
	OrgUnitId: number;
	ConditionSet: {
		ConditionSetId: number;
		ConditionSetType: number | null;
		ReleaseConditions: AwardReleaseCondition[];
	};
	Credit: number | null;
	HiddenAward: boolean;
	Award: Award;
}

/**
 * Awards.MyAssociation — association with issuance status for the calling user.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.MyAssociation
 */
export interface MyAwardAssociation extends AwardAssociation {
	Issued: boolean;
}

/**
 * Awards.AssociationCreate — body for associating an award with an org unit.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.AssociationCreate
 */
export interface AwardAssociationCreate {
	AwardId: number;
	/** Must be positive if provided */
	Credit: number | null;
	HiddenAward: boolean;
}

/**
 * Awards.AssociationUpdate — body for updating an award association.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.AssociationUpdate
 */
export interface AwardAssociationUpdate {
	Credit: number | null;
	HiddenAward: boolean;
}

/**
 * Awards.IssuedAward — an award that has been issued to a user.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.IssuedAward
 */
export interface IssuedAward {
	IssuedId: number;
	Award: Award;
	IssuedDate: AwardDateTime;
	ExpiryDate: AwardDateTime | null;
	IssuedBy: number;
	OrgUnitId: number;
	Credit: number | null;
}

/**
 * Awards.IssueAward — body for manually issuing an award to a user.
 * @see https://docs.valence.desire2learn.com/res/awards.html#Awards.IssueAward
 */
export interface IssueAward {
	AwardId: number;
	/** Must be the same org unit as the award association */
	OrgUnitId: number;
	/** Optional override; if omitted, uses the award's default expiry */
	ExpiryDate?: AwardDateTime | null;
}

export interface ListAssociationsParams {
	bookmark?: string;
}

export interface ListIssuedAwardsParams {
	userId?: number;
	bookmark?: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class AwardsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Award library (org-level)
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all awards in the org award library.
	 * Required scope: `awards:library:read`
	 * GET /d2l/api/bas/(version)/awards/library/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#get--d2l-api-bas-(version)-awards-library-
	 */
	async listLibrary(): Promise<Award[]> {
		return this.get<Award[]>("bas", "awards/library/");
	}

	/**
	 * Retrieve a specific award from the library.
	 * Required scope: `awards:library:read`
	 * GET /d2l/api/bas/(version)/awards/library/(awardId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#get--d2l-api-bas-(version)-awards-library-(awardId)
	 */
	async retrieveFromLibrary(awardId: number): Promise<Award> {
		return this.get<Award>("bas", `awards/library/${awardId}`);
	}

	/**
	 * Create a new award in the library.
	 * Required scope: `awards:library:write`
	 * POST /d2l/api/bas/(version)/awards/library/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#post--d2l-api-bas-(version)-awards-library-
	 */
	async createInLibrary(data: AwardCreate): Promise<Award> {
		return this.post<Award>("bas", "awards/library/", data);
	}

	/**
	 * Update an award in the library.
	 * Required scope: `awards:library:write`
	 * PUT /d2l/api/bas/(version)/awards/library/(awardId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#put--d2l-api-bas-(version)-awards-library-(awardId)
	 */
	async updateInLibrary(awardId: number, data: AwardUpdate): Promise<Award> {
		return this.put<Award>("bas", `awards/library/${awardId}`, data);
	}

	/**
	 * Delete an award from the library.
	 * Required scope: `awards:library:write`
	 * DELETE /d2l/api/bas/(version)/awards/library/(awardId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#delete--d2l-api-bas-(version)-awards-library-(awardId)
	 */
	async delFromLibrary(awardId: number): Promise<void> {
		return this.delete<void>("bas", `awards/library/${awardId}`);
	}

	// ---------------------------------------------------------------------------
	// Award associations (org unit level)
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve awards associated with an org unit.
	 * Required scope: `awards:associations:read`
	 * GET /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/associations/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#get--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-associations-
	 */
	async listAssociations(
		orgUnitId: number,
		params: ListAssociationsParams = {}
	): Promise<PaginatedList<AwardAssociation>> {
		const page = await this.fetchAssociationsPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Retrieve awards the calling user may earn in an org unit.
	 * Required scope: `awards:associations:read`
	 * GET /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/associations/myassociations/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#get--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-associations-myassociations-
	 */
	async listMyAssociations(orgUnitId: number): Promise<MyAwardAssociation[]> {
		return this.get<MyAwardAssociation[]>(
			"bas",
			`awards/orgUnits/${orgUnitId}/associations/myassociations/`
		);
	}

	/**
	 * Associate an award with an org unit.
	 * Required scope: `awards:associations:write`
	 * POST /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/associations/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#post--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-associations-
	 */
	async createAssociation(
		orgUnitId: number,
		data: AwardAssociationCreate
	): Promise<AwardAssociation> {
		return this.post<AwardAssociation>(
			"bas",
			`awards/orgUnits/${orgUnitId}/associations/`,
			data
		);
	}

	/**
	 * Update an award association.
	 * Required scope: `awards:associations:write`
	 * PUT /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/associations/(associationId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#put--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-associations-(associationId)
	 */
	async updateAssociation(
		orgUnitId: number,
		associationId: number,
		data: AwardAssociationUpdate
	): Promise<AwardAssociation> {
		return this.put<AwardAssociation>(
			"bas",
			`awards/orgUnits/${orgUnitId}/associations/${associationId}`,
			data
		);
	}

	/**
	 * Remove an award association from an org unit.
	 * Required scope: `awards:associations:write`
	 * DELETE /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/associations/(associationId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#delete--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-associations-(associationId)
	 */
	async delAssociation(
		orgUnitId: number,
		associationId: number
	): Promise<void> {
		return this.delete<void>(
			"bas",
			`awards/orgUnits/${orgUnitId}/associations/${associationId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Issued awards
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve issued awards in an org unit, optionally filtered by user.
	 * Required scope: `awards:issued:read`
	 * GET /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/issued/
	 * @see https://docs.valence.desire2learn.com/res/awards.html#get--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-issued-
	 */
	async listIssued(
		orgUnitId: number,
		params: ListIssuedAwardsParams = {}
	): Promise<PaginatedList<IssuedAward>> {
		const page = await this.fetchIssuedPage(orgUnitId, params);
		return new CursorPaginatedList(page.items, page.hasMore, page.next);
	}

	/**
	 * Issue an award to a user.
	 * Required scope: `awards:issued:write`
	 * POST /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/issued/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#post--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-issued-users-(userId)
	 */
	async issue(
		orgUnitId: number,
		userId: number,
		data: IssueAward
	): Promise<IssuedAward> {
		return this.post<IssuedAward>(
			"bas",
			`awards/orgUnits/${orgUnitId}/issued/users/${userId}`,
			data
		);
	}

	/**
	 * Revoke an issued award from a user.
	 * Required scope: `awards:issued:write`
	 * DELETE /d2l/api/bas/(version)/awards/orgUnits/(orgUnitId)/issued/(issuedId)
	 * @see https://docs.valence.desire2learn.com/res/awards.html#delete--d2l-api-bas-(version)-awards-orgUnits-(orgUnitId)-issued-(issuedId)
	 */
	async revoke(orgUnitId: number, issuedId: number): Promise<void> {
		return this.delete<void>(
			"bas",
			`awards/orgUnits/${orgUnitId}/issued/${issuedId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Pagination internals
	// ---------------------------------------------------------------------------

	private async fetchAssociationsPage(
		orgUnitId: number,
		params: ListAssociationsParams
	): Promise<PaginatedPageResponse<AwardAssociation>> {
		const query = buildQueryString({ bookmark: params.bookmark });
		const raw = await this.get<D2LPageResponse<AwardAssociation>>(
			"bas",
			`awards/orgUnits/${orgUnitId}/associations/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchAssociationsPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}

	private async fetchIssuedPage(
		orgUnitId: number,
		params: ListIssuedAwardsParams
	): Promise<PaginatedPageResponse<IssuedAward>> {
		const query = buildQueryString({
			userId: params.userId,
			bookmark: params.bookmark,
		});
		const raw = await this.get<D2LPageResponse<IssuedAward>>(
			"bas",
			`awards/orgUnits/${orgUnitId}/issued/${query}`
		);
		return {
			items: raw.Objects,
			hasMore: raw.HasMoreItems,
			next:
				raw.HasMoreItems && raw.Bookmark
					? () =>
							this.fetchIssuedPage(orgUnitId, {
								...params,
								bookmark: raw.Bookmark,
							})
					: undefined,
		};
	}
}