"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/modules/dashboard";
import { DashboardCardFooter, DashboardCardHeader, FooterSep, InsightStat } from "../card-chrome";
import { AiInsightButton } from "./ai-insight-button";
import { DateRangePill } from "./date-range-pill";
import { GradeChart } from "./grade-chart";

type Props = {
	grades: DashboardMetrics["gradeRows"];
	insights: DashboardMetrics["insights"];
	className?: string;
};

export function GradeDistributionCard({ grades, insights, className }: Props) {
	const watchGrade = grades.toSorted((a, b) => b.students - a.students)[0];

	return (
		<section
			className={cn(
				"overflow-hidden rounded-[12px] border border-dashboard-border bg-dashboard-surface shadow-(--dashboard-shadow-card)",
				className,
			)}
			aria-label="Students by grade"
		>
			<DashboardCardHeader
				title="Students by Grade"
				description="Headcount balance by grade level for the active term."
				meta={`${insights.activeYearLabel} · ${insights.campusCount} campus${insights.campusCount === 1 ? "" : "es"}`}
				info="Counts come from active section enrollments grouped by class."
				actions={<DateRangePill label={insights.activeYearLabel} />}
			/>

			<div className="p-3 sm:p-5">
				<div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
					<InsightStat
						label="Enrolled this term"
						value={insights.enrolledThisTerm.toLocaleString("en-US")}
						hint={`Peak at ${insights.peakGradeLabel} · softest at ${insights.softestGradeLabel}`}
					/>
					<div className="w-full rounded-[8px] border border-dashboard-border-subtle bg-dashboard-surface/70 px-3 py-2.5 text-[12px] text-dashboard-text-muted leading-4 sm:w-auto sm:max-w-[200px]">
						<div className="font-medium text-[11px] text-dashboard-text-dim uppercase tracking-[0.05em]">
							Watch
						</div>
						<p className="mt-1 text-dashboard-text-secondary">
							{watchGrade && watchGrade.students > 0
								? `${watchGrade.label} has ${watchGrade.students} enrolled students.`
								: "Add section enrollments to populate grade counts."}
						</p>
					</div>
				</div>

				<p className="mb-2 text-[11px] text-dashboard-text-dim sm:hidden">
					Swipe chart horizontally
				</p>
				<div className="min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
					<div className="min-w-[300px]">
						<GradeChart grades={grades} />
					</div>
				</div>

				<AiInsightButton
					label="Get AI insight on grade distribution"
					className="mt-5"
					disabled
					title="AI insights connect after Nest AI assist is enabled"
				/>
			</div>

			<DashboardCardFooter
				action={
					<Button
						variant="link"
						size="sm"
						className="h-auto gap-1 p-0 text-[12px] text-dashboard-accent no-underline hover:text-dashboard-accent-hover hover:no-underline"
					>
						Class lists
						<HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} />
					</Button>
				}
			>
				<span>
					Avg{" "}
					<span className="font-semibold text-dashboard-text-secondary">
						{insights.avgPerGrade}
					</span>
					/grade
				</span>
				<FooterSep />
				<span>
					Spread{" "}
					<span className="font-semibold text-dashboard-text-secondary">
						{insights.gradeSpread}
					</span>{" "}
					seats
				</span>
			</DashboardCardFooter>
		</section>
	);
}
