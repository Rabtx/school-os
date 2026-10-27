"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@school-os/ui/components/badge";
import { cn } from "@/lib/utils";

import {
	isQuietHours,
	resolveTeacherDashboardMode,
	type TeacherDashboardMode,
} from "../lib/teacher-dashboard-mode";
import type { TeacherOnboardingPrefs } from "../lib/teacher-onboarding.storage";
import type { TeacherDashboard, TeacherDashboardMorningDigest } from "../types/staff.types";
import { useNow } from "@/lib/use-now";

type Props = {
	greeting: string;
	displayName: string;
	organizationName: string;
	sessionDate: string;
	stats: TeacherDashboard["stats"];
	digest: TeacherDashboardMorningDigest;
	preferences?: TeacherOnboardingPrefs | null;
	className?: string;
};

const modeAccent: Record<TeacherDashboardMode, string> = {
	teaching: "from-sky-500/20 via-primary/10 to-emerald-500/15",
	grading: "from-violet-500/20 via-primary/10 to-amber-500/15",
	communication: "from-rose-500/15 via-primary/10 to-orange-500/15",
	planning: "from-indigo-500/20 via-primary/10 to-slate-500/10",
};

function buildAssistantLine(
	stats: TeacherDashboard["stats"],
	digest: TeacherDashboardMorningDigest,
): string {
	const parts: string[] = [];

	if (stats.pendingAttendanceCount > 0) {
		parts.push(
			`${stats.pendingAttendanceCount} homeroom${stats.pendingAttendanceCount === 1 ? "" : "s"} ready for a quick attendance confirm`,
		);
	} else if (stats.todayPresent > 0) {
		parts.push(
			`${stats.todayPresent} students marked present today${stats.todayAttendanceRate != null ? ` (${stats.todayAttendanceRate}%)` : ""}`,
		);
	} else {
		parts.push("Your classes are set for today");
	}

	if (digest.draftHomeworkCount > 0) {
		parts.push(
			`${digest.draftHomeworkCount} homework draft${digest.draftHomeworkCount === 1 ? "" : "s"} waiting for your approve`,
		);
	}

	if (digest.dueTodayHomeworkCount > 0) {
		parts.push(
			`${digest.dueTodayHomeworkCount} assignment${digest.dueTodayHomeworkCount === 1 ? "" : "s"} due today`,
		);
	}

	if (digest.upcomingPeriod) {
		const subject =
			digest.upcomingPeriod.subjectName ?? digest.upcomingPeriod.subjectCode ?? "Class";
		parts.push(
			`Next: ${subject} · ${digest.upcomingPeriod.periodName} at ${digest.upcomingPeriod.startsAt}`,
		);
	}

	if (stats.alertCount > 0) {
		parts.push(
			`${stats.alertCount} student${stats.alertCount === 1 ? "" : "s"} flagged for absence pattern`,
		);
	}

	return parts.join(". ") + (parts.length ? "." : "");
}

function formatAssistantForPlan(
	full: string,
	planStyle: TeacherOnboardingPrefs["planStyle"],
): string {
	if (!full) return full;
	if (planStyle === "brief") {
		const firstSentence = full.split(". ")[0] ?? full;
		return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
	}
	if (planStyle === "resources") {
		return `${full} Check homework materials before you publish.`;
	}
	return full;
}

export function TeacherCommandHero({
	greeting,
	displayName,
	organizationName,
	sessionDate,
	stats,
	digest,
	preferences,
	className,
}: Props) {
	const now = useNow();
	const hour = now.getHours();
	const modeMeta = resolveTeacherDashboardMode(hour);
	const quietEnabled = preferences?.quietHours ?? true;
	const quiet = quietEnabled && isQuietHours(hour);
	const planStyle = preferences?.planStyle ?? "detailed";
	const assistantLine = formatAssistantForPlan(buildAssistantLine(stats, digest), planStyle);
	const caughtUp =
		stats.pendingTaskCount === 0 &&
		digest.draftHomeworkCount === 0 &&
		digest.yesterdayUnmarkedSections.length === 0;

	return (
		<section
			className={cn(
				"relative overflow-hidden rounded-2xl border border-border/80 p-6 shadow-sm sm:p-8",
				className,
			)}
		>
			<div
				className={cn(
					"pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
					modeAccent[modeMeta.mode],
				)}
				aria-hidden
			/>
			<div
				className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl"
				aria-hidden
			/>
			<div className="relative space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge
						variant="secondary"
						className="border border-border/60 bg-background/70 backdrop-blur-sm"
					>
						{modeMeta.label}
					</Badge>
					<span className="text-[12px] text-muted-foreground">{modeMeta.hint}</span>
					{quiet ? (
						<Badge
							variant="outline"
							className="border-violet-500/40 bg-violet-500/5 text-violet-900 dark:text-violet-200"
						>
							Quiet hours · non-urgent items wait until morning
						</Badge>
					) : null}
				</div>

				<div>
					<h1 className="font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
						{greeting}, {displayName}
					</h1>
					<p className="mt-1 text-[13px] text-muted-foreground">
						{organizationName} · {sessionDate}
						{stats.todayPeriodCount > 0
							? ` · ${stats.todayPeriodCount} period${stats.todayPeriodCount === 1 ? "" : "s"} on timetable`
							: ` · ${stats.totalClasses} class${stats.totalClasses === 1 ? "" : "es"} assigned`}
					</p>
				</div>

				<div className="rounded-xl border border-border/70 bg-background/75 p-4 backdrop-blur-md">
					<div className="flex gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
							<HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5" />
						</div>
						<div className="min-w-0 space-y-1">
							<p className="font-medium text-[13px] text-foreground">Your assistant, prepped</p>
							<p className="text-[13px] leading-relaxed text-muted-foreground">
								{assistantLine || "Open a class or approve homework when you are ready — no rush."}
							</p>
							{caughtUp ? (
								<p className="text-[12px] text-emerald-700 dark:text-emerald-300">
									All clear for now. Focus on teaching — we will surface the next action when it
									matters.
								</p>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
