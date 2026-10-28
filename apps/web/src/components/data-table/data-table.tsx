import { type DataTableColumn, type SortState, sortRows } from "@rabtx/ui/table";

export { DataTable, type DataTableColumn, DataTableInlineRow } from "@rabtx/ui/table";

/** Sort rows by the column the sort names, using that column's `sortValue`. */
export function defaultSortFn<T>(rows: T[], sort: SortState, columns: DataTableColumn<T>[]): T[] {
	return sortRows(rows, sort, columns.find((column) => column.id === sort?.id)?.sortValue);
}
