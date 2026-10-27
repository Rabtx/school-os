"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@school-os/ui/components/button";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/modules/dashboard";
import { DashboardForwardIcon } from "@/modules/dashboard";
import { DashboardCardFooter, DashboardCardHeader, FooterSep, InsightStat } from "../card-chrome";
import { LegendDot } from "./legend-dot";
import { PixelGridChart } from "./pixel-grid-chart";
import { RangeToggle } from "./range-toggle";
import { useNow } from "@/lib/use-now";

type Props = {
	months: DashboardMetrics["enrollmentMonths"];
	insights: DashboardMetrics["insights"];
	className?: string;
};

export function EnrollmentTrendCard({ months, insights, className }: Props) {
	const currentMonthIndex = useNow().getMonth();
	const currentMonth = months[currentMonthIndex];
	const peakMonth = months.toSorted((a, b) => b.newAdmissions - a.newAdmissions)[0];
	const highlightMonth = peakMonth?.month ?? "JAN";

	const narrative =
		currentMonth && currentMonth.newAdmissions > 0
			? `${currentMonth.month.charAt(0) + currentMonth.month.slice(1).toLowerCase()}: ${currentMonth.newAdmissions} new admission${currentMonth.newAdmissions === 1 ? "" : "s"} recorded from student records.`
			: "No new admissions logged this month yet — add students to see the trend fill in.";

	return (
		<section
			className={cn(
				"overflow-hidden rounded-[12px] border border-dashboard-border bg-dashboard-surface shadow-(--dashboard-shadow-card)",
				className,
			)}
			aria-label="Enrollment trend"
		>
			<DashboardCardHeader
				title="Enrollment Trend"
				description="New admissions versus returning students across the academic year."
				meta={`${insights.activeYearLabel} · ${insights.campusCount} campus${insights.campusCount === 1 ? "" : "es"}`}
				info="New counts use admitted-on dates; returning is active students enrolled before each month."
				actions={<RangeToggle className="w-full sm:w-auto" />}
			/>

			<div className="min-w-0 p-3 sm:p-5">
				<div className="mb-4 grid grid-cols-2 gap-4 sm:mb-5 sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
					<div className="col-span-2 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-8 lg:grid-cols-none">
						<InsightStat
							label="Total students"
							value={insights.totalStudents.toLocaleString("en-US")}
							hint={`${insights.newThisMonth} new this month · ${insights.sectionCount} sections`}
						/>
						<InsightStat
							label="New this month"
							value={String(insights.newThisMonth)}
							hint="Based on admitted-on dates"
						/>
						<InsightStat
							label="Enrolled in sections"
							value={String(insights.enrolledThisTerm)}
							hint="Active section enrollments"
							className="col-span-2 sm:col-span-1"
						/>
					</div>
					<div className="col-span-2 flex flex-wrap items-center gap-3 sm:gap-4 sm:pt-1">
						<LegendDot color="var(--dashboard-accent)" label="New admissions" />
						<LegendDot color="var(--dashboard-chart-dot)" label="Returning" />
					</div>
				</div>

				<div className="mb-3 rounded-[8px] border border-dashboard-border-subtle bg-dashboard-surface/70 px-3 py-2.5 text-[12.5px] text-dashboard-text-secondary leading-5 sm:mb-4 sm:px-3.5">
					<span className="font-medium text-dashboard-text-primary">Live data:</span> {narrative}
				</div>

				<p className="mb-2 text-[11px] text-dashboard-text-dim md:hidden">
					Swipe chart horizontally
				</p>
				<div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
					<PixelGridChart
						months={months}
						highlightMonth={highlightMonth}
						className="min-w-[520px] sm:min-w-[560px]"
					/>
				</div>
			</div>

			<DashboardCardFooter
				action={
					<Button
						variant="link"
						size="sm"
						className="h-auto gap-1 p-0 text-[12px] text-dashboard-accent no-underline hover:text-dashboard-accent-hover hover:no-underline"
					>
						Open students
						<DashboardForwardIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
					</Button>
				}
			>
				<span>
					<span className="font-semibold text-dashboard-text-secondary">
						{insights.totalStudents - insights.enrolledThisTerm}
					</span>{" "}
					without section
				</span>
				<FooterSep />
				<span>
					<span className="font-semibold text-dashboard-text-secondary">
						{insights.sectionCount}
					</span>{" "}
					sections
				</span>
				<FooterSep />
				<span className="hidden sm:inline">Updated {insights.updatedAt}</span>
			</DashboardCardFooter>
		</section>
	);
}
