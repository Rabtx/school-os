"use client";

import { useMemo, useState } from "react";
import { nextSort, type SortState } from "./table.logic";

export type UseClientTableOptions<T> = {
	data: T[];
	pageSize?: number;
	searchQuery?: string;
	searchFn?: (row: T, query: string) => boolean;
	filterFn?: (row: T, filters: Record<string, string>) => boolean;
	sortFn?: (rows: T[], sort: SortState) => T[];
};

/** Search, filters, sort and paging for a table whose rows are all in memory. */
export function useClientTable<T>({
	data,
	pageSize: initialPageSize = 10,
	searchQuery = "",
	searchFn,
	filterFn,
	sortFn,
}: UseClientTableOptions<T>) {
	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState(initialPageSize);
	const [filters, setFilters] = useState<Record<string, string>>({});
	const [sort, setSort] = useState<SortState>(null);

	const filteredRows = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		let rows = data;
		if (query && searchFn) rows = rows.filter((row) => searchFn(row, query));
		if (filterFn) rows = rows.filter((row) => filterFn(row, filters));
		if (sort && sortFn) rows = sortFn([...rows], sort);
		return rows;
	}, [data, filterFn, filters, searchFn, searchQuery, sort, sortFn]);

	const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
	const safePageIndex = Math.min(pageIndex, pageCount - 1);
	const rows = useMemo(() => {
		const start = safePageIndex * pageSize;
		return filteredRows.slice(start, start + pageSize);
	}, [filteredRows, pageSize, safePageIndex]);

	return {
		rows,
		/** Every row that passes search and filters, across all pages (for export and totals). */
		filteredRows,
		totalRows: filteredRows.length,
		pageIndex: safePageIndex,
		setPageIndex,
		pageSize,
		setPageSize,
		pageCount,
		filters,
		setFilter(id: string, value: string) {
			setFilters((current) => ({ ...current, [id]: value }));
			setPageIndex(0);
		},
		sort,
		toggleSort(id: string) {
			setSort((current) => nextSort(current, id));
			setPageIndex(0);
		},
		resetPage() {
			setPageIndex(0);
		},
	};
}
