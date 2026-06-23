import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Learning Outcomes API response shapes
// @see https://docs.valence.desire2learn.com/res/outcomes.html
// ---------------------------------------------------------------------------

/** ALIGNEDACTIVITYTYPE_T — types of activities that can be aligned to outcomes */
export type AlignedActivityType =
	| "ContentObject"
	| "DiscussionTopic"
	| "Assignment"
	| "LtiLink"
	| "Quiz"
	| "Survey"
	| "Checklist"
	| "SelfAssessment"
	| "QuizQuestion"
	| "RubricCriterion";

/**
 * Outcomes.Outcome — a single outcome node in a tree structure.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.Outcome
 */
export interface Outcome {
	OutcomeId: string;
	/**
	 * Source where this outcome was defined.
	 * "asn" = Achievement Standards Network; "lores" = authored in Brightspace.
	 */
	SourceType: string;
	SourceId: string;
	/** Null for outcomes defined in an organization level outcome set */
	SourceOrgUnitId: number | null;
	ShortCode: string;
	Description: string;
	Children: Outcome[];
}

/**
 * Outcomes.OutcomeSet — a named set of outcomes (tree structure).
 * OutcomeSetId is unique for org-level sets; org-unit imported sets share
 * the ID of their source org-level set.
 * The primary "My Learning Outcomes" org-unit set always uses ID 0.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.OutcomeSet
 */
export interface OutcomeSet {
	/** 0 = "My Learning Outcomes" primary org-unit set */
	OutcomeSetId: number;
	/** null for the primary "My Learning Outcomes" set */
	Name: string | null;
	Outcomes: Outcome[];
}

/** Reference to an existing outcome node — for use in OutcomeSetUpdateNode */
export interface OutcomeSetUpdateNodeRef {
	OutcomeId: string;
	Children: OutcomeSetUpdateNode[];
}

/** Import from ASN node — for use in OutcomeSetUpdateNode */
export interface OutcomeSetUpdateNodeImport {
	Import: { Source: "asn"; Uri: string };
	Children: OutcomeSetUpdateNode[];
}

/** Create new authored outcome node — for use in OutcomeSetUpdateNode */
export interface OutcomeSetUpdateNodeCreate {
	Create: { Description: string; ShortCode?: string };
	Children: OutcomeSetUpdateNode[];
}

/** Union of the three update node types */
export type OutcomeSetUpdateNode =
	| OutcomeSetUpdateNodeRef
	| OutcomeSetUpdateNodeImport
	| OutcomeSetUpdateNodeCreate;

/**
 * Outcomes.OutcomeSetUpdate — body for update outcome set actions.
 * Omitting Name leaves the name unchanged; omitting Outcomes leaves outcomes unchanged.
 * Pass an empty array to remove all outcomes.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.OutcomeSetUpdate
 */
export interface OutcomeSetUpdate {
	/** Max 256 chars. null or omit to leave name unchanged. */
	Name?: string | null;
	/** null or omit to leave outcomes unchanged; [] to remove all */
	Outcomes?: OutcomeSetUpdateNode[] | null;
}

/**
 * Outcomes.OutcomeSetCreate — body for creating an org-level outcome set.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.OutcomeSetCreate
 */
export interface OutcomeSetCreate {
	/** Max 256 chars */
	Name: string;
}

/** ASN outcome in import/export format */
export interface ImportExportOutcomeAsn {
	Source: "asn";
	Uri: string;
	Children: ImportExportOutcome[];
}

/** Authored outcome in import/export format */
export interface ImportExportOutcomeAuthored {
	Source: "lores";
	ShortCode?: string;
	Description: string;
	Children: ImportExportOutcome[];
}

export type ImportExportOutcome =
	| ImportExportOutcomeAsn
	| ImportExportOutcomeAuthored;

/**
 * Outcomes.ImportExportOutcomeSet — import/export format for a full outcome set.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.ImportExportOutcomeSet
 */
export interface ImportExportOutcomeSet {
	Name: string | null;
	/** Globally unique identifier for the set (max 256 chars) */
	ImportId: string;
	Outcomes: ImportExportOutcome[];
}

/**
 * Outcomes.AlignedActivity — an activity aligned to an outcome.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.AlignedActivity
 */
export interface AlignedActivity {
	ActivityType: AlignedActivityType;
	ObjectId: number;
	RubricId: number | null;
	/** Present only for Quiz and QuizQuestion activity types */
	QuestionID?: number | null;
}

/**
 * Outcomes.BulkAlignment — alignments for a given outcome in an org unit.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.BulkAlignment
 */
export interface BulkAlignment {
	OutcomeSetId: number;
	OutcomeId: string;
	Activities: AlignedActivity[];
}

/**
 * Outcomes.OutcomeAlignment — org units with alignments to an outcome.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.OutcomeAlignment
 */
export interface OutcomeAlignment {
	OutcomeId: string;
	AlignedOrgUnits: number[];
}

/**
 * Outcomes.Alignment — an outcome aligned to an activity.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.Alignment
 */
export interface Alignment {
	OutcomeSetId: number;
	OutcomeId: string;
	Direct: boolean;
}

/**
 * Outcomes.UpdateAlignment — body for updating activity alignments.
 * @see https://docs.valence.desire2learn.com/res/outcomes.html#Outcomes.UpdateAlignment
 */
export interface UpdateAlignment {
	/** "add" | "remove" | "replace" */
	Action: "add" | "remove" | "replace";
	OutcomeIds: string[];
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class OutcomesResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Organization-level outcome sets
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all organization-level outcome sets.
	 * Required scope: `outcomes:sets:read`
	 * GET /d2l/api/le/(version)/lo/outcomeSets/
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-lo-outcomeSets-
	 */
	async listOrgOutcomeSets(): Promise<OutcomeSet[]> {
		return this.get<OutcomeSet[]>("le", "lo/outcomeSets/");
	}

	/**
	 * Retrieve a specific organization-level outcome set.
	 * Required scope: `outcomes:sets:read`
	 * GET /d2l/api/le/(version)/lo/outcomeSets/(outcomeSetId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-lo-outcomeSets-(outcomeSetId)
	 */
	async retrieveOrgOutcomeSet(outcomeSetId: number): Promise<OutcomeSet> {
		return this.get<OutcomeSet>("le", `lo/outcomeSets/${outcomeSetId}`);
	}

	/**
	 * Create an organization-level outcome set.
	 * Required scope: `outcomes:sets:manage`
	 * POST /d2l/api/le/(version)/lo/outcomeSets/
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#post--d2l-api-le-(version)-lo-outcomeSets-
	 */
	async createOrgOutcomeSet(data: OutcomeSetCreate): Promise<OutcomeSet> {
		return this.post<OutcomeSet>("le", "lo/outcomeSets/", data);
	}

	/**
	 * Update an organization-level outcome set.
	 * Required scope: `outcomes:sets:manage`
	 * PUT /d2l/api/le/(version)/lo/outcomeSets/(outcomeSetId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#put--d2l-api-le-(version)-lo-outcomeSets-(outcomeSetId)
	 */
	async updateOrgOutcomeSet(
		outcomeSetId: number,
		data: OutcomeSetUpdate
	): Promise<OutcomeSet> {
		return this.put<OutcomeSet>("le", `lo/outcomeSets/${outcomeSetId}`, data);
	}

	/**
	 * Delete an organization-level outcome set.
	 * Returns 409 Conflict if any outcomes are used in org-unit level sets.
	 * Required scope: `outcomes:sets:manage`
	 * DELETE /d2l/api/le/(version)/lo/outcomeSets/(outcomeSetId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#delete--d2l-api-le-(version)-lo-outcomeSets-(outcomeSetId)
	 */
	async delOrgOutcomeSet(outcomeSetId: number): Promise<void> {
		return this.delete<void>("le", `lo/outcomeSets/${outcomeSetId}`);
	}

	// ---------------------------------------------------------------------------
	// Org-unit level outcome sets
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all outcome sets for an org unit.
	 * Required scope: `outcomes:sets:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/lo/outcomeSets/
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-(orgUnitId)-lo-outcomeSets-
	 */
	async listOrgUnitOutcomeSets(orgUnitId: number): Promise<OutcomeSet[]> {
		return this.get<OutcomeSet[]>("le", `${orgUnitId}/lo/outcomeSets/`);
	}

	/**
	 * Retrieve a specific org-unit outcome set.
	 * Required scope: `outcomes:sets:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/lo/outcomeSets/(outcomeSetId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-(orgUnitId)-lo-outcomeSets-(outcomeSetId)
	 */
	async retrieveOrgUnitOutcomeSet(
		orgUnitId: number,
		outcomeSetId: number
	): Promise<OutcomeSet> {
		return this.get<OutcomeSet>(
			"le",
			`${orgUnitId}/lo/outcomeSets/${outcomeSetId}`
		);
	}

	/**
	 * Update an org-unit outcome set.
	 * Required scope: `outcomes:sets:manage`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/lo/outcomeSets/(outcomeSetId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#put--d2l-api-le-(version)-(orgUnitId)-lo-outcomeSets-(outcomeSetId)
	 */
	async updateOrgUnitOutcomeSet(
		orgUnitId: number,
		outcomeSetId: number,
		data: OutcomeSetUpdate
	): Promise<OutcomeSet> {
		return this.put<OutcomeSet>(
			"le",
			`${orgUnitId}/lo/outcomeSets/${outcomeSetId}`,
			data
		);
	}

	// ---------------------------------------------------------------------------
	// Import / Export
	// ---------------------------------------------------------------------------

	/**
	 * Export an outcome set in the import/export format.
	 * Required scope: `outcomes:sets:read`
	 * GET /d2l/api/le/(version)/lo/outcomeSets/(outcomeSetId)/export
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-lo-outcomeSets-(outcomeSetId)-export
	 */
	async exportOutcomeSet(
		outcomeSetId: number
	): Promise<ImportExportOutcomeSet> {
		return this.get<ImportExportOutcomeSet>(
			"le",
			`lo/outcomeSets/${outcomeSetId}/export`
		);
	}

	/**
	 * Import an outcome set.
	 * Required scope: `outcomes:sets:manage`
	 * POST /d2l/api/le/(version)/lo/outcomeSets/import
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#post--d2l-api-le-(version)-lo-outcomeSets-import
	 */
	async importOutcomeSet(data: ImportExportOutcomeSet): Promise<OutcomeSet> {
		return this.post<OutcomeSet>("le", "lo/outcomeSets/import", data);
	}

	// ---------------------------------------------------------------------------
	// Alignments
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all outcome alignments for an activity in an org unit.
	 * Required scope: `outcomes:alignments:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/lo/alignments/(activityType)/(activityId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-(orgUnitId)-lo-alignments-(activityType)-(activityId)
	 */
	async listAlignments(
		orgUnitId: number,
		activityType: AlignedActivityType,
		activityId: number
	): Promise<Alignment[]> {
		return this.get<Alignment[]>(
			"le",
			`${orgUnitId}/lo/alignments/${activityType}/${activityId}`
		);
	}

	/**
	 * Update alignments for an activity in an org unit.
	 * Required scope: `outcomes:alignments:manage`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/lo/alignments/(activityType)/(activityId)
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#put--d2l-api-le-(version)-(orgUnitId)-lo-alignments-(activityType)-(activityId)
	 */
	async updateAlignments(
		orgUnitId: number,
		activityType: AlignedActivityType,
		activityId: number,
		data: UpdateAlignment
	): Promise<void> {
		return this.put<void>(
			"le",
			`${orgUnitId}/lo/alignments/${activityType}/${activityId}`,
			data
		);
	}

	/**
	 * Retrieve all alignments to a specific outcome across all org units.
	 * Required scope: `outcomes:alignments:read`
	 * GET /d2l/api/le/(version)/lo/outcomes/(outcomeId)/alignments
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-lo-outcomes-(outcomeId)-alignments
	 */
	async retrieveOutcomeAlignments(
		outcomeId: string
	): Promise<OutcomeAlignment> {
		return this.get<OutcomeAlignment>(
			"le",
			`lo/outcomes/${outcomeId}/alignments`
		);
	}

	/**
	 * Retrieve bulk alignments for a specific outcome in an org unit.
	 * Required scope: `outcomes:alignments:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/lo/outcomes/(outcomeId)/alignments
	 * @see https://docs.valence.desire2learn.com/res/outcomes.html#get--d2l-api-le-(version)-(orgUnitId)-lo-outcomes-(outcomeId)-alignments
	 */
	async listBulkAlignments(
		orgUnitId: number,
		outcomeId: string
	): Promise<BulkAlignment> {
		return this.get<BulkAlignment>(
			"le",
			`${orgUnitId}/lo/outcomes/${outcomeId}/alignments`
		);
	}
}