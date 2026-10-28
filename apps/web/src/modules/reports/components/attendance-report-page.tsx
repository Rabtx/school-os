"use client";

import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Cancel01Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	Download04Icon,
	FileValidationIcon,
	FlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@rabtx/ui/avatar";
import { downloadCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { useTenantContext } from "@/modules/tenants";
import { useSchoolAttendanceReportQuery } from "../hooks/use-reports-queries";
import type {
	AttendanceCounts,
	SchoolAttendanceFollowUp,
	SchoolAttendanceReport,
	SchoolReportPeriod,
} from "../types/reports.types";
import {
	type Bar,
	BarChart,
	type KpiDelta,
	ReportCard,
	ReportKpiCard,
} from "./attendance-report-parts";

const PERIODS: { id: SchoolReportPeriod; label: string }[] = [
	{ id: "week", label: "Week" },
	{ id: "month", label: "Month" },
	{ id: "year", label: "Year" },
];

/** More sections than this and the class chart groups them by class (grade). */
const MAX_SECTION_BARS = 10;

function localIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function parseIso(isoDate: string): Date {
	return new Date(`${isoDate}T00:00:00`);
}

function shiftAnchor(isoDate: string, period: SchoolReportPeriod, step: number): string {
	const date = parseIso(isoDate);
	if (period === "week") date.setDate(date.getDate() + step * 7);
	else date.setMonth(date.getMonth() + step, 1);
	return localIsoDate(date);
}

function monthName(isoDate: string): string {
	return parseIso(isoDate).toLocaleDateString(undefined, { month: "long" });
}

function shortDate(isoDate: string): string {
	return parseIso(isoDate).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function rangeLabel(from: string, to: string): string {
	const start = parseIso(from);
	const end = parseIso(to);
	if (from === to) return shortDate(to);
	if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
		const month = end.toLocaleDateString(undefined, { month: "short" });
		return `${start.getDate()}–${end.getDate()} ${month}`;
	}
	return `${shortDate(from)} – ${shortDate(to)}`;
}

function title(
	report: SchoolAttendanceReport | undefined,
	period: SchoolReportPeriod,
	anchor: string,
) {
	if (period === "week") return `Attendance · Week of ${shortDate(report?.from ?? anchor)}`;
	if (period === "month") return `Attendance · ${monthName(report?.from ?? anchor)}`;
	return "Attendance · School year";
}

function comparisonLabel(report: SchoolAttendanceReport): string {
	if (!report.previous) return "This school year";
	if (!report.previousSummary?.total) return "No marks to compare";
	return report.period === "week" ? "vs last week" : `vs ${monthName(report.previous.from)}`;
}

/** Signed count change; `fewerIsBetter` turns a drop green. */
function countDelta(
	current: number,
	previous: AttendanceCounts | null,
	pick: (counts: AttendanceCounts) => number,
	fewerIsBetter: boolean,
): KpiDelta | null {
	if (!previous?.total) return null;
	const change = current - pick(previous);
	if (change === 0) return { label: "0", tone: "neutral" };
	const better = fewerIsBetter ? change < 0 : change > 0;
	return {
		label: `${change > 0 ? "+" : "−"}${Math.abs(change).toLocaleString()}`,
		tone: better ? "good" : "bad",
	};
}

function rateDelta(report: SchoolAttendanceReport): KpiDelta | null {
	if (report.attendanceRate == null || report.previousAttendanceRate == null) return null;
	const change = Math.round((report.attendanceRate - report.previousAttendanceRate) * 10) / 10;
	if (change === 0) return { label: "0%", tone: "neutral" };
	return {
		label: `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`,
		tone: change > 0 ? "good" : "bad",
	};
}

/** "Grade 7-B" → "7-B", "Grade 7" → "7": the chart axis has little room. */
function shortClassLabel(label: string): string {
	return label.replace(/^(grade|class|year)\s+/i, "");
}

function classBars(report: SchoolAttendanceReport): { bars: Bar[]; grouped: boolean } {
	const grouped = report.byClass.length > MAX_SECTION_BARS;
	const groups = new Map<string, { label: string; attended: number; total: number }>();
	for (const row of report.byClass) {
		const name = grouped ? (row.className ?? row.sectionName) : row.sectionName;
		const key = grouped ? name : row.sectionId;
		const group = groups.get(key) ?? { label: name, attended: 0, total: 0 };
		group.attended += row.summary.present + row.summary.late + row.summary.excused;
		group.total += row.summary.total;
		groups.set(key, group);
	}
	const bars = [...groups.entries()]
		.filter(([, group]) => group.total > 0)
		.map(([key, group]) => {
			const rate = Math.round((group.attended / group.total) * 1000) / 10;
			return {
				key,
				// Columns have little room; past six bars the chart draws rows with full names.
				label: groups.size > 6 ? group.label : shortClassLabel(group.label),
				value: rate,
				display: `${rate.toFixed(1)}%`,
				title: `${group.label}: ${rate.toFixed(1)}% of ${group.total.toLocaleString()} marks`,
			};
		});
	return { bars, grouped };
}

function weekdayName(dayOfWeek: number, style: "short" | "long"): string {
	// 2024-01-01 was a Monday.
	return new Date(2024, 0, dayOfWeek).toLocaleDateString(undefined, { weekday: style });
}

/** Leadership attendance report, rebuilt to the Figma "Attendance report" frame (`77:71451`). */
export function AttendanceReportPage() {
	const { activeTenant } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const [todayIso] = useState(() => localIsoDate(new Date()));
	const [period, setPeriod] = useState<SchoolReportPeriod>("month");
	const [anchor, setAnchor] = useState(todayIso);

	const query = useSchoolAttendanceReportQuery(tenantId, period, anchor);
	const report = query.data;
	const summary = report?.summary;
	const previous = report?.previousSummary ?? null;
	const comparison = report ? comparisonLabel(report) : "";

	const classChart = useMemo(
		() => (report ? classBars(report) : { bars: [], grouped: false }),
		[report],
	);
	const lateBars = useMemo(
		(): Bar[] =>
			(report?.lateByWeekday ?? []).map((day) => ({
				key: String(day.dayOfWeek),
				label: weekdayName(day.dayOfWeek, "short"),
				value: day.count,
				display: day.count.toLocaleString(),
				title: `${weekdayName(day.dayOfWeek, "long")}: ${day.count} late`,
			})),
		[report],
	);

	// The report covers every campus, so the line names the school only.
	const schoolLine = activeTenant?.name ?? "";
	const canGoForward = period !== "year" && shiftAnchor(anchor, period, 1) <= todayIso;

	return (
		<div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-4 px-4 py-5 tracking-[-0.15px] sm:px-6">
			<header className="flex flex-wrap items-end gap-3">
				<div className="min-w-0 flex-1">
					<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
						{title(report, period, anchor)}
					</h1>
					<p className="text-[14px] text-dashboard-text-dim leading-5">
						{schoolLine}
						{report
							? ` · ${rangeLabel(report.from, report.to)}, ${report.schoolDays} school ${report.schoolDays === 1 ? "day" : "days"}`
							: ""}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div
						role="tablist"
						aria-label="Report period"
						className="flex rounded-[8px] border border-dashboard-border bg-dashboard-bg p-0.5"
					>
						{PERIODS.map((option) => (
							<button
								key={option.id}
								type="button"
								role="tab"
								aria-selected={period === option.id}
								onClick={() => {
									setPeriod(option.id);
									setAnchor(todayIso);
								}}
								className={cn(
									"h-6 rounded-[6px] px-2.5 text-[13px] transition-colors",
									period === option.id
										? "bg-dashboard-surface-strong font-medium text-dashboard-text-primary"
										: "text-dashboard-text-dim hover:text-dashboard-text-primary",
								)}
							>
								{option.label}
							</button>
						))}
					</div>
					{period === "year" ? null : (
						<>
							<IconButton
								label={`Previous ${period}`}
								onClick={() => setAnchor(shiftAnchor(anchor, period, -1))}
							>
								<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
							</IconButton>
							<IconButton
								label={`Next ${period}`}
								disabled={!canGoForward}
								onClick={() => setAnchor(shiftAnchor(anchor, period, 1))}
							>
								<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
							</IconButton>
						</>
					)}
					<button
						type="button"
						disabled={!report}
						onClick={() => report && exportReport(report)}
						className="flex h-7 items-center gap-1.5 rounded-full border border-dashboard-border-strong px-3 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover disabled:opacity-50"
					>
						<HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={1.8} />
						Export
					</button>
				</div>
			</header>

			{query.isError ? (
				<p className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-6 text-center text-[13px] text-dashboard-text-dim">
					This report could not be loaded. School-wide attendance is limited to leadership roles.
				</p>
			) : null}

			<section
				aria-label="Attendance totals"
				className={cn(
					"grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
					query.isLoading && "animate-pulse",
				)}
			>
				<ReportKpiCard
					title="Attendance rate"
					subtitle="Present, late or excused ÷ marked"
					icon={CheckmarkCircle02Icon}
					value={report?.attendanceRate == null ? "—" : `${report.attendanceRate.toFixed(1)}%`}
					delta={report ? rateDelta(report) : null}
					comparison={summary?.total ? comparison : "Nothing marked yet"}
					href="#by-class"
				/>
				<ReportKpiCard
					title="Late arrivals"
					subtitle="Marked late at roll call"
					icon={Clock01Icon}
					value={summary ? summary.late.toLocaleString() : "—"}
					delta={summary ? countDelta(summary.late, previous, (c) => c.late, true) : null}
					comparison={comparison}
					href="#late-by-weekday"
				/>
				<ReportKpiCard
					title="Unexplained absences"
					subtitle="Absent, no leave on file"
					icon={Cancel01Icon}
					value={summary ? summary.absent.toLocaleString() : "—"}
					delta={summary ? countDelta(summary.absent, previous, (c) => c.absent, true) : null}
					comparison={comparison}
					href="#follow-up"
				/>
				<ReportKpiCard
					title="Excused absences"
					subtitle="Leave on file"
					icon={FileValidationIcon}
					value={summary ? summary.excused.toLocaleString() : "—"}
					delta={
						summary
							? (() => {
									const delta = countDelta(summary.excused, previous, (c) => c.excused, true);
									return delta ? { ...delta, tone: "neutral" as const } : null;
								})()
							: null
					}
					comparison={comparison}
					href="/admin/attendance"
				/>
			</section>

			<div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
				<ReportCard
					id="by-class"
					title="Attendance by class"
					subtitle={`Share of marks attended, %${classChart.grouped ? ", sections grouped by class" : ""}`}
				>
					<BarChart
						bars={classChart.bars}
						max={100}
						emptyText="No attendance marked in this period."
					/>
				</ReportCard>
				<ReportCard
					id="late-by-weekday"
					title="Late arrivals by weekday"
					subtitle={report ? `Marked late, ${rangeLabel(report.from, report.to)}` : "Marked late"}
				>
					<BarChart bars={lateBars} emptyText="No late arrivals in this period." />
				</ReportCard>
				<ReportCard title="Parent alerts by outcome" subtitle="WhatsApp, SMS and calls">
					<div className="flex h-[220px] flex-col items-center justify-center gap-1 px-6 text-center">
						<p className="text-[13px] text-dashboard-text-primary">WhatsApp is not connected</p>
						<p className="text-[12px] text-dashboard-text-dim">
							Read, delivered and fallback outcomes appear here once parent messaging is set up.
						</p>
					</div>
				</ReportCard>
			</div>

			<FollowUpTable report={report} loading={query.isLoading} />
		</div>
	);
}

function IconButton({
	label,
	onClick,
	disabled,
	children,
}: {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			disabled={disabled}
			className="flex size-7 items-center justify-center rounded-full border border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover disabled:opacity-40"
		>
			{children}
		</button>
	);
}

function classLabel(row: { sectionName: string | null; className: string | null }): string {
	if (!row.sectionName) return "—";
	if (!row.className || row.sectionName.startsWith(row.className)) return row.sectionName;
	return `${row.className} ${row.sectionName}`;
}

function periodCounts(row: SchoolAttendanceFollowUp): string {
	const parts = [];
	if (row.absences) parts.push(`${row.absences} ${row.absences === 1 ? "absence" : "absences"}`);
	if (row.late) parts.push(`${row.late} late`);
	return parts.join(" · ") || "—";
}

/** The rule-based next step for a student over the follow-up rule. */
function nextStep(
	row: SchoolAttendanceFollowUp,
	rule: SchoolAttendanceReport["followUpRule"],
): string {
	const guardian = row.guardianName ?? "the guardian";
	if (row.absences >= rule.absences) {
		return row.guardianPhone
			? `Call ${guardian} about the absences`
			: "Add a guardian phone number";
	}
	return `Send a late-arrival note to ${guardian}`;
}

function FollowUpTable({
	report,
	loading,
}: {
	report: SchoolAttendanceReport | undefined;
	loading: boolean;
}) {
	const rows = report?.followUps ?? [];
	const rule = report?.followUpRule ?? { absences: 3, late: 4 };
	const window =
		report?.period === "week"
			? "this week"
			: report?.period === "year"
				? "this year"
				: "this month";

	return (
		<section
			id="follow-up"
			className="min-w-0 scroll-mt-4 rounded-[12px] border border-dashboard-border bg-dashboard-surface"
		>
			<header className="flex flex-wrap items-center gap-2 px-4 py-3">
				<h2 className="font-medium text-[14px] text-dashboard-text-primary leading-5">
					Needs follow-up
				</h2>
				{rows.length > 0 ? (
					<span className="inline-flex h-5 items-center gap-1 rounded-[4px] bg-[color-mix(in_oklab,var(--rx-danger)_16%,transparent)] px-1.5 text-[12px] text-[var(--rx-danger)]">
						<span aria-hidden className="size-1.5 rounded-full bg-current" />
						{rows.length} {rows.length === 1 ? "student" : "students"}
					</span>
				) : null}
				<span className="ms-auto text-[12px] text-dashboard-text-dim">
					Rule: {rule.absences}+ absences or {rule.late}+ late arrivals {window}
				</span>
			</header>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[820px] text-[13px]">
					<thead>
						<tr className="border-dashboard-border border-y text-[12px] text-dashboard-text-dim">
							{["Student", "Class", "This period", "Guardian", "Next step", ""].map((head) => (
								<th key={head || "action"} className="h-8 px-4 text-start font-normal">
									{head}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={6} className="h-20 text-center text-dashboard-text-dim">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="h-20 text-center text-dashboard-text-dim">
									No students over the follow-up rule {window}.
								</td>
							</tr>
						) : (
							rows.map((row) => {
								const call = row.absences >= rule.absences && row.guardianPhone;
								return (
									<tr
										key={row.studentId}
										className="border-dashboard-border border-b last:border-0 hover:bg-dashboard-hover/60"
									>
										<td className="px-4 py-2">
											<span className="flex items-center gap-2.5">
												<Avatar name={row.fullName} />
												<span className="font-medium text-dashboard-text-primary">
													{row.fullName}
												</span>
											</span>
										</td>
										<td className="px-4 py-2 text-dashboard-text-secondary">{classLabel(row)}</td>
										<td className="px-4 py-2 text-dashboard-text-primary tabular-nums">
											{periodCounts(row)}
										</td>
										<td className="px-4 py-2 text-dashboard-text-secondary">
											{row.guardianName ?? (
												<span className="text-[var(--rx-danger)]">No guardian linked</span>
											)}
										</td>
										<td className="px-4 py-2 text-dashboard-text-secondary">
											<span className="flex items-center gap-2">
												<HugeiconsIcon
													icon={FlashIcon}
													size={14}
													strokeWidth={1.8}
													className="shrink-0 text-[var(--rx-accent)]"
												/>
												{nextStep(row, rule)}
											</span>
										</td>
										<td className="px-4 py-2 text-end">
											{call ? (
												<a
													href={`tel:${row.guardianPhone?.replaceAll(" ", "")}`}
													className="inline-flex h-6 items-center rounded-[6px] bg-[var(--rx-accent)] px-2.5 font-medium text-[13px] text-white hover:opacity-90"
												>
													Call
												</a>
											) : (
												<Link
													href={`/admin/students?student=${row.studentId}`}
													className="inline-flex h-6 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
												>
													Open profile
												</Link>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function exportReport(report: SchoolAttendanceReport) {
	downloadCsv(
		`attendance-${report.period}-${report.from}.csv`,
		[
			{ header: "Class", value: (row) => classLabel(row) },
			{ header: "Marked", value: (row) => row.summary.total },
			{ header: "Present", value: (row) => row.summary.present },
			{ header: "Late", value: (row) => row.summary.late },
			{ header: "Absent", value: (row) => row.summary.absent },
			{ header: "Excused", value: (row) => row.summary.excused },
			{ header: "Attendance rate %", value: (row) => row.attendanceRate },
		],
		report.byClass,
	);
}
