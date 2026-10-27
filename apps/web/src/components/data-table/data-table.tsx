"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
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
	sort?: DataTableSortState;
	onSort?: (columnId: string) => void;
	editingRowId?: string | null;
	renderEditRow?: (row: T) => React.ReactNode;
	isCreating?: boolean;
	renderCreateRow?: () => React.ReactNode;
	className?: string;
	borderless?: boolean;
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
				className="size-3.5 text-muted-foreground/50"
			/>
		);
	}

	return (
		<HugeiconsIcon
			icon={direction === "desc" ? ArrowDown01Icon : ArrowUp01Icon}
			strokeWidth={2}
			className="size-3.5 text-foreground"
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
	sort,
	onSort,
	editingRowId,
	renderEditRow,
	isCreating,
	renderCreateRow,
	className,
	borderless = false,
}: Props<T>) {
	const colSpan = columns.length;

	return (
		<div className={cn(!borderless && "rounded-md border border-border bg-card", className)}>
			<Table>
				<TableHeader className="bg-muted/40">
					<TableRow className="border-border hover:bg-transparent">
						{columns.map((column) => (
							<TableHead
								key={column.id}
								className={cn(
									"h-11 text-muted-foreground text-xs uppercase tracking-wide",
									column.headerClassName,
								)}
							>
								{column.sortable && onSort ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onSort(column.id)}
										className="h-auto gap-1.5 p-0 text-xs hover:bg-transparent hover:text-foreground"
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
				<TableBody className="bg-card">
					{loading
						? ["s1", "s2", "s3", "s4", "s5"].map((key) => (
								<TableRow key={key} className="border-border">
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
									<TableRow key={rowId} className="border-border">
										{columns.map((column) => (
											<TableCell
												key={column.id}
												className={cn("text-foreground", column.className)}
											>
												{column.renderCell(row)}
											</TableCell>
										))}
									</TableRow>
								);
							})
						: null}

					{!loading && rows.length === 0 && !isCreating ? (
						<TableRow className="border-border hover:bg-transparent">
							<TableCell colSpan={colSpan} className="h-32 text-center">
								<p className="font-medium text-foreground">{emptyTitle}</p>
								<p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
									{emptyDescription}
								</p>
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
		<TableRow className={cn("border-border bg-muted/30 hover:bg-muted/30", className)}>
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
