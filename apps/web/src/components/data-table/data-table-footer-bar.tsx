"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SelectField } from "@school-os/ui/components/select-field";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FooterStat = {
	label: string;
	value: ReactNode;
	tone?: "danger" | "warning" | "success";
};

type Props = {
	/** Rows on screen and in the filtered set. */
	shown: number;
	total: number;
	noun: string;
	stats?: FooterStat[];
	pageIndex: number;
	pageCount: number;
	pageSize: number;
	onPageChange: (pageIndex: number) => void;
	onPageSizeChange: (pageSize: number) => void;
};

const toneClass = {
	danger: "text-[var(--rx-danger)]",
	warning: "text-[var(--rx-warning)]",
	success: "text-[var(--rx-success)]",
};

const NO_STATS: FooterStat[] = [];

const PAGE_SIZES = [25, 50, 100];

/** Figma list footer: shown count and stat cells separated by rules, then a compact pager. */
export function DataTableFooterBar({
	shown,
	total,
	noun,
	stats = NO_STATS,
	pageIndex,
	pageCount,
	pageSize,
	onPageChange,
	onPageSizeChange,
}: Props) {
	const atStart = pageIndex <= 0;
	const atEnd = pageIndex >= pageCount - 1;
	const pageSizes = [...new Set([pageSize, ...PAGE_SIZES])]
		.toSorted((a, b) => a - b)
		.map((size) => ({ label: `${size} rows`, value: String(size) }));
	const cell =
		"flex h-11 shrink-0 items-center gap-1.5 border-dashboard-border border-e px-4 sm:px-6";

	return (
		<div className="flex flex-wrap items-center text-[13px] text-dashboard-text-dim">
			<div className={cell}>
				<span className="text-dashboard-text-primary tabular-nums">{shown}</span>
				<span>
					of {total} {noun} shown
				</span>
			</div>
			{stats.map((stat) => (
				<div key={stat.label} className={cell}>
					<span>{stat.label}</span>
					<span
						className={cn(
							"tabular-nums",
							stat.tone ? toneClass[stat.tone] : "text-dashboard-text-primary",
						)}
					>
						{stat.value}
					</span>
				</div>
			))}
			<div className="ms-auto flex h-11 items-center gap-2 px-4 sm:px-6">
				<SelectField
					aria-label="Rows per page"
					value={String(pageSize)}
					onValueChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
					items={pageSizes}
					className="h-7 w-[104px] rounded-full border-dashboard-border-strong text-[13px]"
				/>
				<button
					type="button"
					aria-label="Previous page"
					disabled={atStart}
					onClick={() => onPageChange(pageIndex - 1)}
					className="flex size-7 items-center justify-center rounded-md hover:bg-dashboard-hover hover:text-dashboard-text-primary disabled:pointer-events-none disabled:opacity-40"
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
				</button>
				<span className="tabular-nums">
					<span className="text-dashboard-text-primary">{pageCount === 0 ? 0 : pageIndex + 1}</span>{" "}
					/ {pageCount}
				</span>
				<button
					type="button"
					aria-label="Next page"
					disabled={atEnd}
					onClick={() => onPageChange(pageIndex + 1)}
					className="flex size-7 items-center justify-center rounded-md hover:bg-dashboard-hover hover:text-dashboard-text-primary disabled:pointer-events-none disabled:opacity-40"
				>
					<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
				</button>
			</div>
		</div>
	);
}
