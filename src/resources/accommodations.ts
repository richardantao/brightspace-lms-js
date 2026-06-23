import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Accommodations API response shapes
// @see https://docs.valence.desire2learn.com/res/accommodations.html
// ---------------------------------------------------------------------------

/** TIMEOP_T — time limit accommodation operation */
export const TimeLimitOperation = {
	Multiply: 1,
	AddExtra: 2,
} as const;
export type TimeLimitOperation =
	(typeof TimeLimitOperation)[keyof typeof TimeLimitOperation];

/**
 * Accommodations.QuizzingControlAccommodation — allows right-click during quizzes.
 * @see https://docs.valence.desire2learn.com/res/accommodations.html#Accommodations.QuizzingControlAccommodation
 */
export interface QuizzingControlAccommodation {
	AlwaysAllowRightClick: boolean;
}

/**
 * Accommodations.QuizzingTimeLimitAccommodation — modifies quiz time limits.
 * @see https://docs.valence.desire2learn.com/res/accommodations.html#Accommodations.QuizzingTimeLimitAccommodation
 */
export interface QuizzingTimeLimitAccommodation {
	TimeLimitOperation: TimeLimitOperation;
	TimeMultiplier: number;
	AdditionalTime: number;
}

/**
 * Accommodations.QuizzingAccommodations — all quizzing accommodations for a user.
 * @see https://docs.valence.desire2learn.com/res/accommodations.html#Accommodations.QuizzingAccommodations
 */
export interface QuizzingAccommodations {
	QuizzingControlAccommodation: QuizzingControlAccommodation;
	QuizzingTimeLimitAccommodation: QuizzingTimeLimitAccommodation;
}

/**
 * Accommodations.UserAccommodations — all accommodations for a user in an org unit.
 * Accommodations are org-unit-specific and do not cascade to descendants.
 * @see https://docs.valence.desire2learn.com/res/accommodations.html#Accommodations.UserAccommodations
 */
export interface UserAccommodations {
	OrgUnitId: number;
	UserId: number;
	QuizzingAccommodations: QuizzingAccommodations;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class AccommodationsResource extends BaseResource {
	/**
	 * Retrieve accommodations for a specific user in an org unit.
	 * Required scope: `accommodations:profile:read`
	 * GET /d2l/api/le/(version)/accommodations/(orgUnitId)/users/(userId)
	 * @see https://docs.valence.desire2learn.com/res/accommodations.html#get--d2l-api-le-(version)-accommodations-(orgUnitId)-users-(userId)
	 */
	async retrieve(
		orgUnitId: number,
		userId: number
	): Promise<UserAccommodations> {
		return this.get<UserAccommodations>(
			"le",
			`accommodations/${orgUnitId}/users/${userId}`
		);
	}

	/**
	 * Retrieve the calling user's accommodations in an org unit.
	 * Required scope: `accommodations:profile:read`
	 * GET /d2l/api/le/(version)/accommodations/(orgUnitId)/myaccommodations
	 * @see https://docs.valence.desire2learn.com/res/accommodations.html#get--d2l-api-le-(version)-accommodations-(orgUnitId)-myaccommodations
	 */
	async retrieveMine(orgUnitId: number): Promise<UserAccommodations> {
		return this.get<UserAccommodations>(
			"le",
			`accommodations/${orgUnitId}/myaccommodations`
		);
	}

	/**
	 * Update a user's accommodations in an org unit.
	 * Replaces all existing accommodations data for the user in the org unit.
	 * OrgUnitId and UserId in the body must match the route parameters.
	 * Required scope: `accommodations:profile:manage`
	 * PUT /d2l/api/le/(version)/accommodations/
	 * @see https://docs.valence.desire2learn.com/res/accommodations.html#put--d2l-api-le-(version)-accommodations-
	 */
	async update(data: UserAccommodations): Promise<UserAccommodations> {
		return this.put<UserAccommodations>("le", "accommodations/", data);
	}
}