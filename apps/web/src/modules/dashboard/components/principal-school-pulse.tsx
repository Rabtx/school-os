"use client";

import {
	AlertCircleIcon,
	ArrowRight01Icon,
	Megaphone01Icon,
	TaskDone01Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useMemo } from "react";
import { OpsPulseStrip } from "@/app/admin/_components/dashboard/ops-pulse-strip";
import { useDashboardMetricsQuery } from "../hooks/use-dashboard-queries";
import { DashboardForwardIcon } from "../i18n/dashboard-directional-icon";
import { useDashboardI18n } from "../i18n/dashboard-i18n-provider";
import { localizeDashboardMetrics } from "../i18n/localize-dashboard-metrics";
import { useNow } from "@/lib/use-now";

function computeSchoolHealthScore(input: {
	activeStudents: number;
	activeTeachers: number;
	totalTeachers: number;
	unassignedStudents: number;
	pendingInvites: number;
}): { score: number; tone: "good" | "watch" | "risk" } {
	let score = 72;
	if (input.activeStudents > 0) score += 8;
	if (input.activeTeachers > 0) score += 6;
	if (input.totalTeachers > 0 && input.activeTeachers / input.totalTeachers >= 0.9) score += 4;
	if (input.unassignedStudents === 0) score += 5;
	if (input.pendingInvites > 5) score -= 8;
	if (input.unassignedStudents > 10) score -= 6;
	score = Math.max(40, Math.min(98, score));
	const tone = score >= 85 ? "good" : score >= 70 ? "watch" : "risk";
	return { score, tone };
}

type Props = {
	tenantName: string | null;
	enabled?: boolean;
};

export function PrincipalSchoolPulse({ tenantName, enabled = true }: Props) {
	const { t, intlLocale } = useDashboardI18n();
	const { metrics, isLoading, isError } = useDashboardMetricsQuery(enabled, { schoolPulse: true });

	const localized = useMemo(
		() => (metrics ? localizeDashboardMetrics(metrics, t) : null),
		[metrics, t],
	);

	const now = useNow();
	const todayLabel = useMemo(
		() =>
			now.toLocaleDateString(intlLocale, {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			}),
		[intlLocale, now],
	);

	if (!enabled) {
		return (
			<Alert>
				<AlertDescription>{t("principal.noMetricsPermission")}</AlertDescription>
			</Alert>
		);
	}

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t("principal.pulseError")}</AlertDescription>
			</Alert>
		);
	}

	if (isLoading || !metrics || !localized) {
		return (
			<div className="flex min-h-[200px] items-center justify-center px-4 py-8">
				<Spinner className="size-8" />
			</div>
		);
	}

	const staffStat = metrics.stats.find((s) => s.id === "staff");
	const studentOps = metrics.opsPulse.find((item) => item.id === "students");
	const staffOps = metrics.opsPulse.find((item) => item.id === "staff");
	const inviteOps = metrics.opsPulse.find((item) => item.id === "invites");

	const activeStudents = metrics.insights.totalStudents;
	const staffParts = staffOps?.value.split("/") ?? [];
	const activeTeachers = Number(staffParts[0] ?? staffStat?.value ?? 0);
	const totalTeachers = Number(staffParts[1] ?? activeTeachers);
	const unassignedMatch = studentOps?.hint.match(/(\d+) need section assignment/);
	const unassigned = unassignedMatch ? Number(unassignedMatch[1]) : 0;
	const pendingInvites = Number(inviteOps?.value ?? 0);

	const health = computeSchoolHealthScore({
		activeStudents,
		activeTeachers,
		totalTeachers,
		unassignedStudents: unassigned,
		pendingInvites,
	});

	const healthLabel =
		health.tone === "good"
			? t("principal.healthGood")
			: health.tone === "watch"
				? t("principal.healthWatch")
				: t("principal.healthRisk");

	const suggestions: string[] = [];
	if (unassigned > 0) {
		suggestions.push(
			t("principal.suggestUnassigned", {
				count: unassigned,
				studentWord: unassigned === 1 ? t("principal.student") : t("principal.students"),
			}),
		);
	}
	if (pendingInvites > 0) {
		suggestions.push(
			t("principal.suggestInvites", {
				count: pendingInvites,
				inviteWord: pendingInvites === 1 ? t("principal.invite") : t("principal.invites"),
			}),
		);
	}
	if (metrics.stats.find((s) => s.id === "attendance")?.unavailable) {
		suggestions.push(t("principal.suggestAttendance"));
	} else if (
		metrics.stats.find((s) => s.id === "attendance")?.detail.includes("No attendance sessions")
	) {
		suggestions.push(t("principal.suggestAttendance"));
	}
	if (metrics.stats.find((s) => s.id === "fees")?.unavailable) {
		suggestions.push(t("principal.suggestFinance"));
	}
	if (suggestions.length === 0) {
		suggestions.push(t("principal.suggestClear"));
	}

	const campusHint =
		unassigned > 0
			? t("principal.withoutSection", { count: unassigned })
			: `${metrics.insights.campusCount} ${
					metrics.insights.campusCount === 1 ? t("common.campus") : t("common.campuses")
				}`;

	const attendanceStat = metrics.stats.find((s) => s.id === "attendance");

	return (
		<div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
			<section className="rounded-2xl border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="font-medium text-[11px] text-dashboard-text-dim uppercase tracking-[0.08em]">
							{t("principal.schoolHealth")}
						</p>
						<h2 className="mt-1 font-semibold text-[20px] text-dashboard-text-primary sm:text-[22px]">
							{tenantName ?? t("common.yourSchool")} — {todayLabel}
						</h2>
						<p className="mt-1 text-dashboard-text-muted text-sm">{healthLabel}</p>
					</div>
					<div className="text-end">
						<div className="font-semibold text-[36px] text-dashboard-text-primary tabular-nums leading-none">
							{health.score}
							<span className="text-[18px] text-dashboard-text-muted">/100</span>
						</div>
						<p className="mt-1 text-[11px] text-dashboard-text-dim">
							{t("principal.operationalScore")}
						</p>
					</div>
				</div>

				<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<PulseRow
						icon={UserGroupIcon}
						label={t("principal.studentsEnrolled")}
						value={t("principal.activeCount", { count: activeStudents })}
						hint={campusHint}
					/>
					<PulseRow
						icon={TaskDone01Icon}
						label={t("principal.staffOnDuty")}
						value={t("principal.teachersRatio", { active: activeTeachers, total: totalTeachers })}
						hint={staffStat?.detail ?? t("principal.fromStaffDirectory")}
					/>
					<PulseRow
						icon={AlertCircleIcon}
						label={t("principal.attendanceToday")}
						value={
							attendanceStat && !attendanceStat.unavailable
								? attendanceStat.formatValue(attendanceStat.value)
								: "—"
						}
						hint={attendanceStat?.detail ?? t("principal.attendanceHint")}
					/>
					<PulseRow
						icon={Megaphone01Icon}
						label={t("principal.revenueSnapshot")}
						value="—"
						hint={t("principal.revenueHint")}
					/>
				</div>
			</section>

			<OpsPulseStrip items={localized.opsPulse} />

			<section className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,320px)]">
				<div className="rounded-2xl border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
					<h3 className="font-medium text-dashboard-text-primary text-sm">
						{t("principal.aiSummary")}
					</h3>
					<p className="mt-2 text-dashboard-text-muted text-sm leading-relaxed">
						{suggestions[0]}
						{suggestions[1] ? ` ${suggestions[1]}` : ""}
					</p>
					<p className="mt-3 text-[11px] text-dashboard-text-dim">{t("principal.aiRoadmap")}</p>
				</div>

				<div className="rounded-2xl border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
					<h3 className="font-medium text-dashboard-text-primary text-sm">
						{t("principal.quickActions")}
					</h3>
					<ul className="mt-3 space-y-2">
						<QuickAction href="/admin/admissions?start=1" label={t("principal.admitStudent")} />
						<QuickAction href="/admin/attendance" label={t("principal.openAttendance")} />
						<QuickAction href="/admin/students" label={t("principal.reviewStudents")} />
						<QuickAction href="/admin/members" label={t("principal.staffInvites")} />
						<QuickAction href="/admin/homework" label={t("principal.homeworkOversight")} />
					</ul>
				</div>
			</section>
		</div>
	);
}

function PulseRow({
	icon,
	label,
	value,
	hint,
}: {
	icon: typeof UserGroupIcon;
	label: string;
	value: string;
	hint: string;
}) {
	return (
		<div className="rounded-xl border border-dashboard-border-subtle bg-dashboard-bg/40 px-3 py-3">
			<div className="flex items-center gap-2 text-dashboard-text-muted">
				<HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />
				<span className="font-medium text-[10.5px] uppercase tracking-[0.06em]">{label}</span>
			</div>
			<p className="mt-2 font-semibold text-[15px] text-dashboard-text-primary tabular-nums">
				{value}
			</p>
			<p className="mt-1 line-clamp-2 text-[11px] text-dashboard-text-dim leading-4">{hint}</p>
		</div>
	);
}

function QuickAction({ href, label }: { href: string; label: string }) {
	return (
		<li>
			<Button
				variant="ghost"
				size="sm"
				className="h-auto w-full justify-between px-2 py-2 font-normal"
				render={<Link href={href} />}
			>
				{label}
				<DashboardForwardIcon
					icon={ArrowRight01Icon}
					size={14}
					className="text-dashboard-text-dim"
				/>
			</Button>
		</li>
	);
}
