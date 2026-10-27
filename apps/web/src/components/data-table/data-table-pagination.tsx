"use client";

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@school-os/ui/components/pagination";
import { SelectField } from "@school-os/ui/components/select-field";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

const pageSizeItems = [
	{ label: "10 rows", value: "10" },
	{ label: "20 rows", value: "20" },
	{ label: "50 rows", value: "50" },
	{ label: "100 rows", value: "100" },
];

type Props = {
	pageIndex: number;
	pageCount: number;
	pageSize: number;
	totalRows: number;
	onPageChange: (pageIndex: number) => void;
	onPageSizeChange: (pageSize: number) => void;
	className?: string;
};

type PageToken = { key: string; page: number | "ellipsis" };

function buildPageNumbers(pageIndex: number, pageCount: number): PageToken[] {
	if (pageCount <= 7) {
		return Array.from({ length: pageCount }, (_, index) => ({
			key: `page-${index}`,
			page: index,
		}));
	}

	const pages: PageToken[] = [{ key: "page-0", page: 0 }];
	if (pageIndex > 2) pages.push({ key: "ellipsis-start", page: "ellipsis" });

	const start = Math.max(1, pageIndex - 1);
	const end = Math.min(pageCount - 2, pageIndex + 1);
	for (let page = start; page <= end; page += 1) {
		pages.push({ key: `page-${page}`, page });
	}

	if (pageIndex < pageCount - 3) pages.push({ key: "ellipsis-end", page: "ellipsis" });
	if (pageCount > 1) pages.push({ key: `page-${pageCount - 1}`, page: pageCount - 1 });

	return pages;
}

function preventNav(event: MouseEvent<HTMLAnchorElement>) {
	event.preventDefault();
}

export function DataTablePagination({
	pageIndex,
	pageCount,
	pageSize,
	totalRows,
	onPageChange,
	onPageSizeChange,
	className,
}: Props) {
	const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
	const to = Math.min(totalRows, (pageIndex + 1) * pageSize);
	const pages = buildPageNumbers(pageIndex, pageCount);
	const atStart = pageIndex <= 0;
	const atEnd = pageIndex >= pageCount - 1;

	return (
		<div
			className={cn(
				"flex flex-col gap-3 border-dashboard-border border-t px-4 py-2 text-[13px] tracking-[-0.15px] sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<p className="text-dashboard-text-dim tabular-nums">
				{totalRows === 0 ? (
					"No rows"
				) : (
					<>
						<span className="text-dashboard-text-primary">
							{from}–{to}
						</span>{" "}
						of {totalRows} shown
					</>
				)}
			</p>

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
				<div className="flex items-center gap-2">
					<span className="text-dashboard-text-dim">Rows per page</span>
					<SelectField
						value={String(pageSize)}
						onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
						items={pageSizeItems}
						className="h-7 w-[112px]"
					/>
				</div>

				<Pagination className="mx-0 w-auto justify-start sm:justify-end">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href="#"
								onClick={(event) => {
									preventNav(event);
									if (!atStart) onPageChange(pageIndex - 1);
								}}
								className={cn(atStart && "pointer-events-none opacity-50")}
								aria-disabled={atStart}
							/>
						</PaginationItem>
						{pages.map(({ key, page }) =>
							page === "ellipsis" ? (
								<PaginationItem key={key}>
									<PaginationEllipsis />
								</PaginationItem>
							) : (
								<PaginationItem key={key}>
									<PaginationLink
										href="#"
										size="icon"
										isActive={page === pageIndex}
										onClick={(event) => {
											preventNav(event);
											onPageChange(page);
										}}
									>
										{page + 1}
									</PaginationLink>
								</PaginationItem>
							),
						)}
						<PaginationItem>
							<PaginationNext
								href="#"
								onClick={(event) => {
									preventNav(event);
									if (!atEnd) onPageChange(pageIndex + 1);
								}}
								className={cn(atEnd && "pointer-events-none opacity-50")}
								aria-disabled={atEnd}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</div>
		</div>
	);
}
