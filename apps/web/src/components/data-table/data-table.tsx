"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Checkbox } from "@school-os/ui/components/checkbox";
import { Skeleton } from "@school-os/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-os/ui/components/table";
import { cn } from "@/lib/utils";
import type { DataTableSortDirection, DataTableSortState } from "./use-client-data-table";

export type DataTableColumn<T> = {
	id: string;
	header: React.ReactNode;
	renderCell: (row: T) => React.ReactNode;
	className?: string;
	headerClassName?: string;
	sortable?: boolean;
	sortValue?: (row: T) => string | number;
};

type Props<T> = {
	columns: DataTableColumn<T>[];
	rows: T[];
	getRowId: (row: T) => string;
	loading?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	/** Replaces the empty title and description, e.g. `NoResults` when filters hide every row. */
	emptyState?: React.ReactNode;
	sort?: DataTableSortState;
	onSort?: (columnId: string) => void;
	editingRowId?: string | null;
	renderEditRow?: (row: T) => React.ReactNode;
	isCreating?: boolean;
	renderCreateRow?: () => React.ReactNode;
	className?: string;
	borderless?: boolean;
	/** Figma list layout: no card, sticky header, 24px outer cell padding. */
	fullBleed?: boolean;
	/** Row checkboxes; the header box selects or clears the rows on screen. */
	selection?: {
		selectedIds: ReadonlySet<string>;
		onChange: (selectedIds: Set<string>) => void;
		label: (row: T) => string;
	};
};

function SortIndicator({
	active,
	direction,
}: {
	active: boolean;
	direction: DataTableSortDirection | undefined;
}) {
	if (!active) {
		return (
			<HugeiconsIcon
				icon={ArrowUp01Icon}
				strokeWidth={2}
				className="size-3.5 text-dashboard-text-faint"
			/>
		);
	}

	return (
		<HugeiconsIcon
			icon={direction === "desc" ? ArrowDown01Icon : ArrowUp01Icon}
			strokeWidth={2}
			className="size-3.5 text-dashboard-text-primary"
		/>
	);
}

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
}: Props<T>) {
	const colSpan = columns.length + (selection ? 1 : 0);
	const rowIds = rows.map(getRowId);
	const selectedOnPage = selection
		? rowIds.filter((id) => selection.selectedIds.has(id)).length
		: 0;
	const allOnPage = rowIds.length > 0 && selectedOnPage === rowIds.length;
	const edge = fullBleed ? "first:ps-4 last:pe-4 sm:first:ps-6 sm:last:pe-6" : "";

	function togglePage(checked: boolean) {
		if (!selection) return;
		const next = new Set(selection.selectedIds);
		for (const id of rowIds) {
			if (checked) next.add(id);
			else next.delete(id);
		}
		selection.onChange(next);
	}

	function toggleRow(id: string, checked: boolean) {
		if (!selection) return;
		const next = new Set(selection.selectedIds);
		if (checked) next.add(id);
		else next.delete(id);
		selection.onChange(next);
	}

	return (
		<div
			className={cn(
				!borderless &&
					!fullBleed &&
					"rounded-[12px] border border-dashboard-border bg-dashboard-surface",
				className,
			)}
		>
			<Table className="text-[13px] tracking-[-0.15px]">
				<TableHeader
					className={cn(fullBleed && "sticky top-0 z-[1] bg-dashboard-bg [&_tr]:border-b-0")}
				>
					<TableRow
						className={cn(
							"border-dashboard-border hover:bg-transparent",
							fullBleed && "shadow-[inset_0_-1px_0_var(--dashboard-border)]",
						)}
					>
						{selection ? (
							<TableHead className={cn("h-8 w-10", edge)}>
								<Checkbox
									aria-label="Select all rows on this page"
									checked={allOnPage}
									indeterminate={selectedOnPage > 0 && !allOnPage}
									onCheckedChange={(checked) => togglePage(Boolean(checked))}
								/>
							</TableHead>
						) : null}
						{columns.map((column) => (
							<TableHead
								key={column.id}
								className={cn(
									"h-8 font-normal text-[12px] text-dashboard-text-dim",
									!selection && edge,
									selection && "last:pe-4 sm:last:pe-6",
									column.headerClassName,
								)}
							>
								{column.sortable && onSort ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onSort(column.id)}
										className="h-auto gap-1 p-0 font-normal text-[12px] text-dashboard-text-dim hover:bg-transparent hover:text-dashboard-text-primary"
									>
										{column.header}
										<SortIndicator
											active={sort?.id === column.id}
											direction={sort?.id === column.id ? sort.direction : undefined}
										/>
									</Button>
								) : (
									column.header
								)}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{loading
						? ["s1", "s2", "s3", "s4", "s5"].map((key) => (
								<TableRow key={key} className="border-dashboard-border">
									{selection ? <TableCell className={edge} /> : null}
									{columns.map((column) => (
										<TableCell key={column.id}>
											<Skeleton className="h-4 w-full max-w-[180px]" />
										</TableCell>
									))}
								</TableRow>
							))
						: null}

					{!loading && isCreating && renderCreateRow ? renderCreateRow() : null}

					{!loading
						? rows.map((row) => {
								const rowId = getRowId(row);
								if (editingRowId === rowId && renderEditRow) {
									return renderEditRow(row);
								}

								return (
									<TableRow
										key={rowId}
										data-state={selection?.selectedIds.has(rowId) ? "selected" : undefined}
										className="border-dashboard-border hover:bg-dashboard-hover/60 data-[state=selected]:bg-dashboard-hover"
									>
										{selection ? (
											<TableCell className={cn("w-10", edge)}>
												<Checkbox
													aria-label={`Select ${selection.label(row)}`}
													checked={selection.selectedIds.has(rowId)}
													onCheckedChange={(checked) => toggleRow(rowId, Boolean(checked))}
												/>
											</TableCell>
										) : null}
										{columns.map((column) => (
											<TableCell
												key={column.id}
												className={cn(
													"py-2.5 text-dashboard-text-primary",
													fullBleed && "whitespace-nowrap",
													!selection && edge,
													selection && "last:pe-4 sm:last:pe-6",
													column.className,
												)}
											>
												{column.renderCell(row)}
											</TableCell>
										))}
									</TableRow>
								);
							})
						: null}

					{!loading && rows.length === 0 && !isCreating ? (
						<TableRow className="border-dashboard-border hover:bg-transparent">
							<TableCell colSpan={colSpan} className="h-32 text-center whitespace-normal">
								{emptyState ?? (
									<>
										<p className="font-medium text-[14px] text-dashboard-text-primary">
											{emptyTitle}
										</p>
										<p className="mx-auto mt-1 max-w-sm text-[13px] text-dashboard-text-dim">
											{emptyDescription}
										</p>
									</>
								)}
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}

export function DataTableInlineRow({
	colSpan,
	children,
	className,
}: {
	colSpan: number;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<TableRow
			className={cn(
				"border-dashboard-border bg-dashboard-hover/40 hover:bg-dashboard-hover/40",
				className,
			)}
		>
			<TableCell colSpan={colSpan}>{children}</TableCell>
		</TableRow>
	);
}

export function defaultSortFn<T>(
	rows: T[],
	sort: DataTableSortState,
	columns: DataTableColumn<T>[],
): T[] {
	if (!sort) return rows;
	const column = columns.find((item) => item.id === sort.id);
	if (!column?.sortValue) return rows;

	return rows.toSorted((left, right) => {
		const leftValue = column.sortValue?.(left);
		const rightValue = column.sortValue?.(right);
		if (leftValue == null && rightValue == null) return 0;
		if (leftValue == null) return 1;
		if (rightValue == null) return -1;
		if (typeof leftValue === "number" && typeof rightValue === "number") {
			return sort.direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
		}
		const comparison = String(leftValue).localeCompare(String(rightValue));
		return sort.direction === "asc" ? comparison : -comparison;
	});
}
