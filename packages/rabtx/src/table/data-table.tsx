"use client";

import type { ReactNode } from "react";
import { Checkbox } from "../checkbox";
import { pageSelection, type SortState, withIds } from "./table.logic";
import { fullBleedParts, tableParts } from "./table.styles";

export type DataTableColumn<T> = {
	id: string;
	header: ReactNode;
	renderCell: (row: T) => ReactNode;
	className?: string;
	headerClassName?: string;
	sortable?: boolean;
	sortValue?: (row: T) => string | number;
};

export type DataTableProps<T> = {
	columns: DataTableColumn<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	loading?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	/** Replaces the empty title and description, such as a no-results state with its filters. */
	emptyState?: ReactNode;
	sort?: SortState;
	onSort?: (columnId: string) => void;
	editingRowId?: string | null;
	renderEditRow?: (row: T) => ReactNode;
	isCreating?: boolean;
	renderCreateRow?: () => ReactNode;
	className?: string;
	/** No card frame. */
	borderless?: boolean;
	/** The Figma list layout: no card, a sticky header and 24px outer cell padding. */
	fullBleed?: boolean;
	/** Row checkboxes; the header box selects or clears the rows on screen. */
	selection?: {
		selectedIds: ReadonlySet<string>;
		onChange: (selectedIds: Set<string>) => void;
		label: (row: T) => string;
	};
};

const join = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const SKELETON_ROWS = ["s1", "s2", "s3", "s4", "s5"];

function SortArrow({ direction }: { direction: "asc" | "desc" | null }) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 16 16"
			className={join("size-3.5", direction ? "text-(--rx-text)" : "text-(--rx-text-disabled)")}
		>
			<path
				d={direction === "desc" ? "M4 6l4 4 4-4" : "M4 10l4-4 4 4"}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

/**
 * A list table: sortable headers, optional row checkboxes, a loading skeleton and an empty state.
 * Sorting, filtering and paging live with the caller (see `useClientTable`), so the same table
 * works for client and server data.
 */
export function DataTable<T>({
	columns,
	rows,
	getRowId,
	loading,
	emptyTitle = "No results",
	emptyDescription = "Try adjusting your search or filters.",
	emptyState,
	sort,
	onSort,
	editingRowId,
	renderEditRow,
	isCreating,
	renderCreateRow,
	className,
	borderless = false,
	fullBleed = false,
	selection,
}: DataTableProps<T>) {
	const colSpan = columns.length + (selection ? 1 : 0);
	const rowIds = rows.map(getRowId);
	const page = selection ? pageSelection(rowIds, selection.selectedIds) : null;
	const edge = fullBleed ? fullBleedParts.edge : "";
	const cellEdge = selection ? fullBleed && fullBleedParts.lastEdge : edge;

	return (
		<div className={join(!borderless && !fullBleed && tableParts.card, className)}>
			<div className={tableParts.scroller}>
				<table className={tableParts.table}>
					<thead className={join(fullBleed && fullBleedParts.header)}>
						<tr className={join(tableParts.headRow, fullBleed && fullBleedParts.headRow)}>
							{selection && page ? (
								<th className={join(tableParts.head, tableParts.checkCell, edge)}>
									<Checkbox
										aria-label="Select all rows on this page"
										checked={page.all}
										mixed={page.mixed}
										onChange={(event) =>
											selection.onChange(
												withIds(selection.selectedIds, rowIds, event.target.checked),
											)
										}
									/>
								</th>
							) : null}
							{columns.map((column) => {
								const active = sort?.id === column.id;
								return (
									<th
										key={column.id}
										scope="col"
										aria-sort={
											active ? (sort?.direction === "desc" ? "descending" : "ascending") : undefined
										}
										className={join(tableParts.head, cellEdge, column.headerClassName)}
									>
										{column.sortable && onSort ? (
											<button
												type="button"
												onClick={() => onSort(column.id)}
												className={tableParts.sortButton}
											>
												{column.header}
												<SortArrow direction={active ? (sort?.direction ?? null) : null} />
											</button>
										) : (
											column.header
										)}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody aria-busy={loading || undefined}>
						{loading
							? SKELETON_ROWS.map((key) => (
									<tr key={key} aria-hidden="true" className={tableParts.row}>
										{selection ? (
											<td aria-hidden="true" className={join(tableParts.cell, edge)} />
										) : null}
										{columns.map((column) => (
											<td key={column.id} aria-hidden="true" className={tableParts.cell}>
												<div className={tableParts.skeleton} />
											</td>
										))}
									</tr>
								))
							: null}

						{!loading && isCreating && renderCreateRow ? renderCreateRow() : null}

						{loading
							? null
							: rows.map((row) => {
									const rowId = getRowId(row);
									if (editingRowId === rowId && renderEditRow) return renderEditRow(row);
									const selected = selection?.selectedIds.has(rowId) ?? false;
									return (
										<tr
											key={rowId}
											data-state={selected ? "selected" : undefined}
											className={tableParts.row}
										>
											{selection ? (
												<td className={join(tableParts.cell, tableParts.checkCell, edge)}>
													<Checkbox
														aria-label={`Select ${selection.label(row)}`}
														checked={selected}
														onChange={(event) =>
															selection.onChange(
																withIds(selection.selectedIds, [rowId], event.target.checked),
															)
														}
													/>
												</td>
											) : null}
											{columns.map((column) => (
												<td
													key={column.id}
													className={join(
														tableParts.cell,
														fullBleed && fullBleedParts.cell,
														cellEdge,
														column.className,
													)}
												>
													{column.renderCell(row)}
												</td>
											))}
										</tr>
									);
								})}

						{!loading && rows.length === 0 && !isCreating ? (
							<tr>
								<td colSpan={colSpan} className={tableParts.empty}>
									{emptyState ?? (
										<>
											<p className={tableParts.emptyTitle}>{emptyTitle}</p>
											<p className={tableParts.emptyDescription}>{emptyDescription}</p>
										</>
									)}
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/** A full-width row inside the table, for inline create and edit forms. */
export function DataTableInlineRow({
	colSpan,
	children,
	className,
}: {
	colSpan: number;
	children: ReactNode;
	className?: string;
}) {
	return (
		<tr className={join(tableParts.inlineRow, className)}>
			<td colSpan={colSpan} className={tableParts.cell}>
				{children}
			</td>
		</tr>
	);
}
