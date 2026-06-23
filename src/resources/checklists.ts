import { BaseResource } from "../core/resource";

// ---------------------------------------------------------------------------
// Wire types — matched exactly to D2L Checklist API response shapes
// @see https://docs.valence.desire2learn.com/res/checklist.html
// ---------------------------------------------------------------------------

export interface RichText {
	Text: string;
	Html: string | null;
}

export interface RichTextInput {
	Content: string;
	Type: "Text" | "Html";
}

/**
 * Checklist.ChecklistReadData — returned by retrieve and list actions.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistReadData
 */
export interface ChecklistReadData {
	Id: number;
	Name: string;
	Description: RichText;
}

/**
 * Checklist.ChecklistUpdateData — body for create and update actions.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistUpdateData
 */
export interface ChecklistUpdateData {
	Name: string;
	Description: RichTextInput;
}

/**
 * Checklist.ChecklistCategoryReadData — returned by category retrieve actions.
 * SortOrder must be 1 or greater.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistCategoryReadData
 */
export interface ChecklistCategoryReadData {
	CategoryId: number;
	Name: string;
	Description: RichText;
	SortOrder: number;
}

/**
 * Checklist.ChecklistCategoryUpdateData — body for category create and update actions.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistCategoryUpdateData
 */
export interface ChecklistCategoryUpdateData {
	Name: string;
	Description: RichTextInput;
	/** Must be 1 or greater */
	SortOrder: number;
}

/**
 * Checklist.ChecklistItemReadData — returned by item retrieve actions.
 * SortOrder must be 1 or greater.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistItemReadData
 */
export interface ChecklistItemReadData {
	ChecklistItemId: number;
	CategoryId: number;
	ChecklistId: number;
	Name: string;
	Description: RichText;
	/** Must be 1 or greater */
	SortOrder: number;
	DueDate: string | null;
}

/**
 * Checklist.ChecklistItemUpdateData — body for item create and update actions.
 * @see https://docs.valence.desire2learn.com/res/checklist.html#Checklist.ChecklistItemUpdateData
 */
export interface ChecklistItemUpdateData {
	CategoryId: number;
	Name: string;
	Description: RichTextInput;
	/** Must be 1 or greater */
	SortOrder: number;
	DueDate: string | null;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class ChecklistsResource extends BaseResource {
	// ---------------------------------------------------------------------------
	// Checklists
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all checklists for an org unit.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-
	 */
	async list(orgUnitId: number): Promise<ChecklistReadData[]> {
		return this.get<ChecklistReadData[]>("le", `${orgUnitId}/checklists/`);
	}

	/**
	 * Retrieve a specific checklist.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)
	 */
	async retrieve(
		orgUnitId: number,
		checklistId: number
	): Promise<ChecklistReadData> {
		return this.get<ChecklistReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}`
		);
	}

	/**
	 * Create a checklist.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/checklists/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#post--d2l-api-le-(version)-(orgUnitId)-checklists-
	 */
	async create(
		orgUnitId: number,
		data: ChecklistUpdateData
	): Promise<ChecklistReadData> {
		return this.post<ChecklistReadData>("le", `${orgUnitId}/checklists/`, data);
	}

	/**
	 * Update a checklist.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#put--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)
	 */
	async update(
		orgUnitId: number,
		checklistId: number,
		data: ChecklistUpdateData
	): Promise<ChecklistReadData> {
		return this.put<ChecklistReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}`,
			data
		);
	}

	/**
	 * Delete a checklist.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#delete--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)
	 */
	async del(orgUnitId: number, checklistId: number): Promise<void> {
		return this.delete<void>("le", `${orgUnitId}/checklists/${checklistId}`);
	}

	// ---------------------------------------------------------------------------
	// Checklist categories
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all categories in a checklist.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/categories/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-categories-
	 */
	async listCategories(
		orgUnitId: number,
		checklistId: number
	): Promise<ChecklistCategoryReadData[]> {
		return this.get<ChecklistCategoryReadData[]>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/categories/`
		);
	}

	/**
	 * Retrieve a specific checklist category.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-categories-(categoryId)
	 */
	async retrieveCategory(
		orgUnitId: number,
		checklistId: number,
		categoryId: number
	): Promise<ChecklistCategoryReadData> {
		return this.get<ChecklistCategoryReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/categories/${categoryId}`
		);
	}

	/**
	 * Create a checklist category.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/categories/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#post--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-categories-
	 */
	async createCategory(
		orgUnitId: number,
		checklistId: number,
		data: ChecklistCategoryUpdateData
	): Promise<ChecklistCategoryReadData> {
		return this.post<ChecklistCategoryReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/categories/`,
			data
		);
	}

	/**
	 * Update a checklist category.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#put--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-categories-(categoryId)
	 */
	async updateCategory(
		orgUnitId: number,
		checklistId: number,
		categoryId: number,
		data: ChecklistCategoryUpdateData
	): Promise<ChecklistCategoryReadData> {
		return this.put<ChecklistCategoryReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/categories/${categoryId}`,
			data
		);
	}

	/**
	 * Delete a checklist category.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/categories/(categoryId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#delete--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-categories-(categoryId)
	 */
	async delCategory(
		orgUnitId: number,
		checklistId: number,
		categoryId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/categories/${categoryId}`
		);
	}

	// ---------------------------------------------------------------------------
	// Checklist items
	// ---------------------------------------------------------------------------

	/**
	 * Retrieve all items in a checklist.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/items/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-items-
	 */
	async listItems(
		orgUnitId: number,
		checklistId: number
	): Promise<ChecklistItemReadData[]> {
		return this.get<ChecklistItemReadData[]>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/items/`
		);
	}

	/**
	 * Retrieve a specific checklist item.
	 * Required scope: `checklists:checklist:read`
	 * GET /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/items/(checklistItemId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#get--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-items-(checklistItemId)
	 */
	async retrieveItem(
		orgUnitId: number,
		checklistId: number,
		checklistItemId: number
	): Promise<ChecklistItemReadData> {
		return this.get<ChecklistItemReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/items/${checklistItemId}`
		);
	}

	/**
	 * Create a checklist item.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * POST /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/items/
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#post--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-items-
	 */
	async createItem(
		orgUnitId: number,
		checklistId: number,
		data: ChecklistItemUpdateData
	): Promise<ChecklistItemReadData> {
		return this.post<ChecklistItemReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/items/`,
			data
		);
	}

	/**
	 * Update a checklist item.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * PUT /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/items/(checklistItemId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#put--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-items-(checklistItemId)
	 */
	async updateItem(
		orgUnitId: number,
		checklistId: number,
		checklistItemId: number,
		data: ChecklistItemUpdateData
	): Promise<ChecklistItemReadData> {
		return this.put<ChecklistItemReadData>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/items/${checklistItemId}`,
			data
		);
	}

	/**
	 * Delete a checklist item.
	 * Required scope: `checklists:checklist:read checklists:checklist:write`
	 * DELETE /d2l/api/le/(version)/(orgUnitId)/checklists/(checklistId)/items/(checklistItemId)
	 * @see https://docs.valence.desire2learn.com/res/checklist.html#delete--d2l-api-le-(version)-(orgUnitId)-checklists-(checklistId)-items-(checklistItemId)
	 */
	async delItem(
		orgUnitId: number,
		checklistId: number,
		checklistItemId: number
	): Promise<void> {
		return this.delete<void>(
			"le",
			`${orgUnitId}/checklists/${checklistId}/items/${checklistItemId}`
		);
	}
}