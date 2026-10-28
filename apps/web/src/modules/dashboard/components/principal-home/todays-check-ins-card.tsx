"use client";

import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@rabtx/ui/avatar";
import { cn } from "@/lib/utils";
import type {
	AttendanceCheckIn,
	AttendanceMarkStatus,
} from "@/modules/attendance/types/attendance.types";
import { DashboardCard } from "./dashboard-card";

type Props = {
	checkIns: AttendanceCheckIn[];
	markedTotal: number;
	loading: boolean;
};

type Filter = "all" | "late" | "absent";

const FILTERS: { id: Filter; label: string }[] = [
	{ id: "all", label: "All classes" },
	{ id: "late", label: "Late" },
	{ id: "absent", label: "Absent" },
];

const STATUS: Record<AttendanceMarkStatus, { label: string; tone: string }> = {
	present: { label: "Present", tone: "text-[var(--rx-success)]" },
	late: { label: "Late", tone: "text-[var(--rx-warning)]" },
	absent: { label: "Absent", tone: "text-[var(--rx-danger)]" },
	excused: { label: "Excused", tone: "text-[var(--rx-accent)]" },
	left_early: { label: "Left early", tone: "text-[var(--rx-warning)]" },
	unknown: { label: "Unmarked", tone: "text-dashboard-text-dim" },
};

function timeLabel(markedAt: string | null): string {
	if (!markedAt) return "—";
	return new Date(markedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function classLabel(row: AttendanceCheckIn): string {
	if (!row.sectionName) return "—";
	if (!row.className || row.sectionName.startsWith(row.className)) return row.sectionName;
	return `${row.className} ${row.sectionName}`;
}

/** Figma "Today's check-ins": the latest marks with class, guardian, time and status. */
export function TodaysCheckInsCard({ checkIns, markedTotal, loading }: Props) {
	const [filter, setFilter] = useState<Filter>("all");
	const rows = filter === "all" ? checkIns : checkIns.filter((row) => row.status === filter);

	return (
		<DashboardCard
			title="Today's check-ins"
			icon={UserGroupIcon}
			actions={
				<div
					role="tablist"
					aria-label="Filter check-ins"
					className="flex rounded-[8px] bg-dashboard-bg p-0.5"
				>
					{FILTERS.map((option) => (
						<button
							key={option.id}
							type="button"
							role="tab"
							aria-selected={filter === option.id}
							onClick={() => setFilter(option.id)}
							className={cn(
								"h-6 rounded-[6px] px-2.5 text-[13px] transition-colors",
								filter === option.id
									? "bg-dashboard-surface-strong font-medium text-dashboard-text-primary"
									: "text-dashboard-text-dim hover:text-dashboard-text-primary",
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			}
		>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[720px] text-[13px]">
					<thead>
						<tr className="border-dashboard-border border-y text-[12px] text-dashboard-text-dim">
							{["Roll", "Student", "Class", "Guardian", "Check-in", "Method", "Status"].map(
								(head) => (
									<th key={head} className="h-8 px-4 text-start font-normal first:w-16">
										{head}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={7} className="h-24 text-center text-dashboard-text-dim">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={7} className="h-24 text-center text-dashboard-text-dim">
									{checkIns.length === 0
										? "No attendance marked today yet."
										: "No students match this filter."}
								</td>
							</tr>
						) : (
							rows.map((row, index) => {
								const status = STATUS[row.status];
								return (
									<tr
										key={row.markId}
										className="border-dashboard-border border-b last:border-0 hover:bg-dashboard-hover/60"
									>
										<td className="px-4 py-2.5 text-dashboard-text-dim tabular-nums">
											#{String(index + 1).padStart(2, "0")}
										</td>
										<td className="px-4 py-2.5">
											<span className="flex items-center gap-2.5">
												<Avatar name={row.fullName} />
												<span className="font-medium text-dashboard-text-primary">
													{row.fullName}
												</span>
											</span>
										</td>
										<td className="px-4 py-2.5 text-dashboard-text-secondary">{classLabel(row)}</td>
										<td className="px-4 py-2.5 text-dashboard-text-secondary">
											{row.guardianName ?? "—"}
										</td>
										<td className="px-4 py-2.5 text-dashboard-text-secondary tabular-nums">
											{timeLabel(row.markedAt)}
										</td>
										<td className="px-4 py-2.5 text-dashboard-text-dim">Roll call</td>
										<td className={cn("px-4 py-2.5", status.tone)}>{status.label}</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
			<footer className="flex items-center justify-between border-dashboard-border border-t px-4 py-2.5 text-[13px] text-dashboard-text-dim">
				<span>
					<span className="text-dashboard-text-primary tabular-nums">{rows.length}</span> of{" "}
					{markedTotal} check-ins today
				</span>
				<Link
					href="/admin/attendance"
					className="flex items-center gap-1 text-dashboard-text-secondary hover:text-dashboard-text-primary"
				>
					Open roll call
					<HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
				</Link>
			</footer>
		</DashboardCard>
	);
}
