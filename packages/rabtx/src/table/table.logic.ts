export type SortDirection = "asc" | "desc";
export type SortState = { id: string; direction: SortDirection } | null;

/** Header clicks cycle a column: ascending, descending, then back to the original order. */
export function nextSort(current: SortState, id: string): SortState {
	if (current?.id !== id) return { id, direction: "asc" };
	if (current.direction === "asc") return { id, direction: "desc" };
	return null;
}

/**
 * Sort rows by a column's value. Numbers compare as numbers, everything else by locale; missing
 * values always go last, whichever way the sort runs.
 */
export function sortRows<T>(
	rows: T[],
	sort: SortState,
	sortValue: ((row: T) => string | number | null | undefined) | undefined,
): T[] {
	if (!sort || !sortValue) return rows;
	return rows.toSorted((left, right) => {
		const a = sortValue(left);
		const b = sortValue(right);
		if (a == null && b == null) return 0;
		if (a == null) return 1;
		if (b == null) return -1;
		const comparison =
			typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
		return sort.direction === "asc" ? comparison : -comparison;
	});
}

/** How the header checkbox reads for the rows on screen. */
export function pageSelection(rowIds: string[], selected: ReadonlySet<string>) {
	const count = rowIds.filter((id) => selected.has(id)).length;
	const all = rowIds.length > 0 && count === rowIds.length;
	return { all, mixed: count > 0 && !all, count };
}

/** Add or remove ids from a selection, returning a new set. */
export function withIds(selected: ReadonlySet<string>, ids: string[], checked: boolean) {
	const next = new Set(selected);
	for (const id of ids) {
		if (checked) next.add(id);
		else next.delete(id);
	}
	return next;
}
