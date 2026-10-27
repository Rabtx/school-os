"use client";

import { ArrowDown01Icon, ArrowUp01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Admission } from "./admissions-data";
import { StatusBadge } from "./status-badge";

type SortKey = "id" | "student" | "grade" | "guardian" | "date" | "status" | "campus";

type Col = {
	id: SortKey | "actions";
	label: string;
	sortable?: boolean;
	width: string;
};

const COLUMNS: Col[] = [
	{ id: "student", label: "Applicant", sortable: true, width: "34%" },
	{ id: "campus", label: "Campus", sortable: true, width: "14%" },
	{ id: "guardian", label: "Guardian", sortable: true, width: "22%" },
	{ id: "date", label: "Applied", sortable: true, width: "14%" },
	{ id: "status", label: "Status", sortable: true, width: "12%" },
	{ id: "actions", label: "", width: "52px" },
];

const SOURCE_LABEL: Record<Admission["source"], string> = {
	portal: "Online portal",
	"walk-in": "Walk-in",
	referral: "Referral",
	transfer: "Transfer",
};

type Props = {
	admissions: Admission[];
	className?: string;
	query?: string;
};

function compareAdmissions(a: Admission, b: Admission, key: SortKey): number {
	return String(a[key]).localeCompare(String(b[key]), undefined, {
		numeric: true,
		sensitivity: "base",
	});
}

function initials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

function useAdmissionRows(
	admissions: Admission[],
	query: string,
	sortKey: SortKey,
	sortDir: "asc" | "desc",
) {
	return useMemo(() => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? admissions.filter((row) =>
					[
						row.id,
						row.student,
						row.email,
						row.grade,
						row.campus,
						row.guardian,
						row.status,
						row.source,
						row.note,
					].some((field) => field.toLowerCase().includes(q)),
				)
			: admissions;

		const sorted = filtered.toSorted((a, b) => compareAdmissions(a, b, sortKey));
		if (sortDir === "desc") sorted.reverse();
		return sorted;
	}, [admissions, query, sortDir, sortKey]);
}

export function AdmissionsTable({ admissions, className, query = "" }: Props) {
	const [sortKey, setSortKey] = useState<SortKey>("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const rows = useAdmissionRows(admissions, query, sortKey, sortDir);

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
			return;
		}
		setSortKey(key);
		setSortDir(key === "date" ? "desc" : "asc");
	};

	if (rows.length === 0) {
		return (
			<div className={cn("px-4 py-10 text-center", className)}>
				<p className="font-medium text-[14px] text-dashboard-text-primary">
					No matching admissions
				</p>
				<p className="mx-auto mt-1 max-w-sm text-[12.5px] text-dashboard-text-muted leading-5">
					Nothing matches “{query.trim()}”. Try a student name, campus, or status.
				</p>
			</div>
		);
	}

	return (
		<div className={cn("min-w-0", className)}>
			{/* Phone: stacked cards — avoids 760px min-width table scroll */}
			<ul className="divide-y divide-dashboard-border-subtle md:hidden">
				{rows.map((a) => (
					<li key={a.id} className="px-4 py-3.5">
						<AdmissionMobileCard admission={a} />
					</li>
				))}
			</ul>

			{/* Tablet+: fixed table */}
			<div className="hidden min-w-0 overflow-x-auto overscroll-x-contain md:block">
				<table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-[13px]">
					<colgroup>
						{COLUMNS.map((col) => (
							<col key={col.id} style={{ width: col.width }} />
						))}
					</colgroup>
					<thead>
						<tr className="text-start">
							{COLUMNS.map((col) => (
								<th
									key={col.id}
									className="py-2.5 pe-3 font-medium text-[11px] text-dashboard-text-muted uppercase tracking-[0.06em] first:ps-4 last:pe-3"
								>
									{col.sortable ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => toggleSort(col.id as SortKey)}
											className="-ms-2 h-7 gap-1 px-2 font-medium text-[11px] text-dashboard-text-muted uppercase tracking-[0.06em] hover:text-dashboard-text-secondary"
											aria-label={`Sort by ${col.label}`}
										>
											{col.label}
											<HugeiconsIcon
												icon={
													sortKey === col.id
														? sortDir === "asc"
															? ArrowUp01Icon
															: ArrowDown01Icon
														: ArrowDown01Icon
												}
												size={12}
												strokeWidth={2}
												className={cn(
													sortKey === col.id
														? "text-dashboard-text-secondary"
														: "text-dashboard-text-faint opacity-50",
												)}
											/>
										</Button>
									) : (
										<span className="sr-only">{col.label || "Actions"}</span>
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((a, i) => (
							<tr
								key={a.id}
								className={cn(
									"group/row transition-colors hover:bg-dashboard-hover",
									i > 0 && "border-dashboard-border-subtle [&>td]:border-t",
								)}
							>
								{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a data cell; its content carries the label */}
								<td className="py-3 pe-3 ps-4 align-top">
									<div className="flex min-w-0 items-start gap-2.5">
										<span
											aria-hidden
											className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-dashboard-surface-strong font-semibold text-[11px] text-dashboard-text-secondary ring-1 ring-dashboard-border"
										>
											{initials(a.student)}
										</span>
										<span className="min-w-0">
											<span className="block truncate font-semibold text-[13px] text-dashboard-text-primary">
												{a.student}
											</span>
											<span className="mt-0.5 block truncate text-[12px] text-dashboard-text-muted">
												{a.id} · {a.grade} · {SOURCE_LABEL[a.source]}
											</span>
											<span className="mt-0.5 block truncate text-[11.5px] text-dashboard-text-secondary">
												{a.note}
											</span>
										</span>
									</div>
								</td>
								<td className="py-3 pe-3 align-top">
									<span className="block truncate font-medium text-[12.5px] text-dashboard-text-primary">
										{a.campus}
									</span>
									<span className="mt-0.5 block truncate text-[11.5px] text-dashboard-text-muted">
										{a.grade}
									</span>
								</td>
								<td className="py-3 pe-3 align-top">
									<span className="block truncate font-medium text-[12.5px] text-dashboard-text-primary">
										{a.guardian}
									</span>
									<span className="mt-0.5 block truncate text-[11.5px] text-dashboard-text-muted">
										{a.guardianRelation} · {a.guardianPhone}
									</span>
								</td>
								<td className="py-3 pe-3 align-top tabular-nums">
									<span className="block text-[12.5px] text-dashboard-text-primary">{a.date}</span>
									<span className="mt-0.5 block truncate text-[11.5px] text-dashboard-text-muted">
										{SOURCE_LABEL[a.source]}
									</span>
								</td>
								<td className="py-3 pe-3 align-top">
									<StatusBadge status={a.status} />
								</td>
								{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a data cell; its content carries the label */}
								<td className="py-3 pe-3 align-top">
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="outline"
													size="icon-sm"
													aria-label={`Actions for ${a.student}`}
												/>
											}
										>
											<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem disabled>View detail (coming soon)</DropdownMenuItem>
											<DropdownMenuItem disabled>Update status</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function AdmissionMobileCard({ admission: a }: { admission: Admission }) {
	return (
		<article className="flex gap-3">
			<span
				aria-hidden
				className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-dashboard-surface-strong font-semibold text-[12px] text-dashboard-text-secondary ring-1 ring-dashboard-border"
			>
				{initials(a.student)}
			</span>
			<div className="min-w-0 flex-1 space-y-2">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="truncate font-semibold text-[14px] text-dashboard-text-primary">
							{a.student}
						</p>
						<p className="mt-0.5 text-[12px] text-dashboard-text-muted">
							{a.id} · {a.grade}
						</p>
					</div>
					<StatusBadge status={a.status} className="shrink-0" />
				</div>

				<dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
					<div>
						<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
							Campus
						</dt>
						<dd className="mt-0.5 font-medium text-dashboard-text-secondary">{a.campus}</dd>
					</div>
					<div>
						<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
							Applied
						</dt>
						<dd className="mt-0.5 font-medium text-dashboard-text-secondary tabular-nums">
							{a.date}
						</dd>
					</div>
					<div className="col-span-2">
						<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
							Guardian
						</dt>
						<dd className="mt-0.5 text-dashboard-text-secondary">
							<span className="font-medium">{a.guardian}</span>
							<span className="text-dashboard-text-muted">
								{" "}
								· {a.guardianRelation} · {a.guardianPhone}
							</span>
						</dd>
					</div>
				</dl>

				<p className="text-[12px] text-dashboard-text-secondary leading-4">
					<span className="text-dashboard-text-muted">{SOURCE_LABEL[a.source]} · </span>
					{a.note}
				</p>
			</div>
		</article>
	);
}
