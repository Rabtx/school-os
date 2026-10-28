"use client";

import {
	Calendar03Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	FileEditIcon,
	LicenseDraftIcon,
	TaskDone01Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { StatCard } from "@/app/admin/_components/dashboard/stat-card";
import { userFirstName } from "@/lib/user-display";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { type TeacherDashboard, useMyTeacherDashboardQuery } from "@/modules/staff";
import { useTenantContext } from "@/modules/tenants";
import type { TimetableClassSlot } from "@/modules/timetable";
import { useSessionStore } from "@/store";
import { DashboardCard } from "../principal-home/dashboard-card";
import { type LessonStatus, lessonStatuses, shortTime, timeUntil } from "./lesson-status";

function localIsoDate(date: Date): string {
	return date.toLocaleDateString("en-CA");
}

function greeting(hour: number): string {
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

const plain = (value: number) => value.toLocaleString();
const dash = () => "—";

/** Teacher home, rebuilt to the Figma "Teacher · Home" frame (`158:31492`). */
export function TeacherHome() {
	const user = useSessionStore((state) => state.user);
	const { activeTenant } = useTenantContext();
	const now = useNow();
	const sessionDate = localIsoDate(now);
	const query = useMyTeacherDashboardQuery(activeTenant?.id ?? null, sessionDate);
	const data = query.data;

	const lessons = (data?.todaySchedule?.slots ?? []).filter(
		(slot): slot is TimetableClassSlot => slot.type === "class",
	);
	const statuses = lessonStatuses(lessons, now);
	const nextIndex = statuses.findIndex((status) => status === "now" || status === "next");
	const nextLesson = nextIndex >= 0 ? lessons[nextIndex] : undefined;
	const homerooms = (data?.sections ?? []).filter(
		(item) => item.section.accessType === "homeroom" && item.studentCount > 0,
	);
	const homeroom = homerooms.find((item) => !item.todayAttendance.isComplete) ?? homerooms[0];
	const homeroomSummary = homeroom?.todayAttendance.summary;
	const digest = data?.morningDigest;

	const subtitle = [
		now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
		homerooms.length > 0
			? `Homeroom ${homerooms.map((item) => item.section.name).join(", ")}`
			: null,
		`${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"} today`,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-4 px-4 py-5 tracking-[-0.15px] sm:px-6">
			<header>
				<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
					{greeting(now.getHours())}, {user ? userFirstName(user.username) : "there"}
				</h1>
				<p className="text-[14px] text-dashboard-text-dim leading-5">{subtitle}</p>
			</header>

			<section
				aria-label="Today at a glance"
				className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
			>
				<StatCard
					label={statuses[nextIndex] === "now" ? "Teaching now" : "Next class"}
					value={0}
					formatValue={() => (nextLesson ? shortTime(nextLesson.period.startsAt) : "—")}
					unavailable={!nextLesson}
					detail={
						nextLesson
							? `${nextLesson.sectionName} · ${nextLesson.subjectName ?? "Lesson"}${
									statuses[nextIndex] === "next"
										? ` · ${timeUntil(nextLesson.period.startsAt, now)}`
										: ""
								}`
							: "No more lessons today"
					}
					icon={UserGroupIcon}
				/>
				<StatCard
					label="Roll call"
					value={0}
					formatValue={() =>
						homeroom
							? `${homeroomSummary ? homeroomSummary.present + homeroomSummary.late : 0} / ${homeroom.studentCount}`
							: "—"
					}
					unavailable={!homeroom}
					detail={
						!homeroom
							? "No homeroom"
							: homeroom.todayAttendance.isComplete
								? `${homeroom.section.name} · done`
								: `${homeroom.section.name} · not finished`
					}
					icon={CheckmarkCircle02Icon}
				/>
				<StatCard
					label="To review"
					value={digest?.toReviewCount ?? 0}
					formatValue={digest ? plain : dash}
					unavailable={!digest}
					detail="Homework handed in"
					icon={TaskDone01Icon}
				/>
				<StatCard
					label="Due today"
					value={digest?.dueTodayHomeworkCount ?? 0}
					formatValue={digest ? plain : dash}
					unavailable={!digest}
					detail="Homework due today"
					icon={Clock01Icon}
				/>
				<StatCard
					label="Drafts"
					value={digest?.draftHomeworkCount ?? 0}
					formatValue={digest ? plain : dash}
					unavailable={!digest}
					detail="Homework not published"
					icon={LicenseDraftIcon}
				/>
			</section>

			<div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
				<TodaysClasses lessons={lessons} statuses={statuses} now={now} loading={query.isLoading} />
				<div className="flex min-w-0 flex-col gap-4">
					<HomeroomCard homeroom={homeroom} loading={query.isLoading} />
					<NeedsYou data={data} />
				</div>
			</div>

			<FollowUps alerts={data?.alerts ?? []} loading={query.isLoading} />
		</div>
	);
}

const STATUS_LABEL: Record<LessonStatus, { label: string; tone: string }> = {
	taught: { label: "Taught", tone: "border-dashboard-border-strong text-dashboard-text-dim" },
	now: {
		label: "Now",
		tone: "border-[color-mix(in_oklab,var(--rx-success)_55%,transparent)] text-[var(--rx-success)]",
	},
	next: {
		label: "Next",
		tone: "border-[color-mix(in_oklab,var(--rx-accent)_55%,transparent)] text-[var(--rx-accent)]",
	},
	later: { label: "Later", tone: "border-dashboard-border-strong text-dashboard-text-dim" },
};

function TodaysClasses({
	lessons,
	statuses,
	now,
	loading,
}: {
	lessons: TimetableClassSlot[];
	statuses: LessonStatus[];
	now: Date;
	loading: boolean;
}) {
	return (
		<DashboardCard title="Today's classes" icon={Calendar03Icon} className="lg:col-span-2">
			{loading ? (
				<div className="mx-4 mb-4 h-48 animate-pulse rounded-[8px] bg-dashboard-hover/50" />
			) : lessons.length === 0 ? (
				<p className="px-4 pt-6 pb-8 text-center text-[13px] text-dashboard-text-dim">
					No lessons on your timetable today.
				</p>
			) : (
				<ul className="px-2 pb-2">
					{lessons.map((lesson, index) => {
						const status = statuses[index] ?? "later";
						const badge = STATUS_LABEL[status];
						return (
							<li
								key={`${lesson.period.id}-${lesson.sectionId}`}
								className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[8px] px-2 py-2.5 hover:bg-dashboard-hover/60"
							>
								<span className="w-[104px] shrink-0 text-[13px] text-dashboard-text-secondary tabular-nums">
									{shortTime(lesson.period.startsAt)} – {shortTime(lesson.period.endsAt)}
								</span>
								<span className="inline-flex h-6 shrink-0 items-center rounded-[6px] border border-dashboard-border-strong px-2 text-[12px] text-dashboard-text-secondary">
									{lesson.sectionName}
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-[14px] text-dashboard-text-primary leading-5">
										{lesson.subjectName ?? "Lesson"}
									</span>
									<span className="block truncate text-[12px] text-dashboard-text-dim leading-4">
										{[lesson.roomName, lesson.period.name].filter(Boolean).join(" · ")}
									</span>
								</span>
								<span
									className={cn(
										"inline-flex h-6 shrink-0 items-center rounded-[6px] border px-2 text-[12px]",
										badge.tone,
									)}
								>
									{status === "next"
										? `Next · ${timeUntil(lesson.period.startsAt, now).replace("in ", "")}`
										: badge.label}
								</span>
								<Link
									href={`/admin/my-classes/${lesson.sectionId}`}
									className="inline-flex h-7 shrink-0 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
								>
									Open
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</DashboardCard>
	);
}

function HomeroomCard({
	homeroom,
	loading,
}: {
	homeroom: TeacherDashboard["sections"][number] | undefined;
	loading: boolean;
}) {
	if (loading) {
		return (
			<div className="h-40 animate-pulse rounded-[12px] border border-dashboard-border bg-dashboard-surface" />
		);
	}
	if (!homeroom) {
		return (
			<section className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-4">
				<h2 className="font-medium text-[14px] text-dashboard-text-primary">Homeroom roll call</h2>
				<p className="mt-2 text-[13px] text-dashboard-text-dim">You have no homeroom class.</p>
			</section>
		);
	}
	const summary = homeroom.todayAttendance.summary;
	const marked = summary ? summary.total - summary.unknown : 0;
	const share =
		homeroom.studentCount > 0 ? Math.min(100, (marked / homeroom.studentCount) * 100) : 0;
	const done = homeroom.todayAttendance.isComplete;
	return (
		<section className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-4 tracking-[-0.15px]">
			<div className="flex items-center gap-2">
				<h2 className="min-w-0 flex-1 font-medium text-[14px] text-dashboard-text-primary">
					Homeroom roll call · {homeroom.section.name}
				</h2>
				<span
					className={cn(
						"inline-flex h-6 items-center rounded-[6px] border px-2 text-[12px]",
						done
							? "border-[color-mix(in_oklab,var(--rx-success)_55%,transparent)] text-[var(--rx-success)]"
							: "border-[color-mix(in_oklab,var(--rx-accent)_55%,transparent)] text-[var(--rx-accent)]",
					)}
				>
					{done ? "Done" : "Open"}
				</span>
			</div>
			<p className="mt-3 text-[13px] text-dashboard-text-secondary">
				{marked} of {homeroom.studentCount} marked
				{summary
					? ` · ${summary.present} present, ${summary.absent} absent, ${summary.late} late`
					: ""}
			</p>
			<div
				role="progressbar"
				aria-label="Students marked"
				aria-valuemin={0}
				aria-valuemax={homeroom.studentCount}
				aria-valuenow={marked}
				className="mt-3 h-1.5 overflow-hidden rounded-full bg-dashboard-hover"
			>
				<div className="h-full rounded-full bg-[var(--rx-accent)]" style={{ width: `${share}%` }} />
			</div>
			<Link
				href={`/admin/attendance?sectionId=${homeroom.section.id}`}
				className={cn(
					"mt-4 inline-flex h-7 items-center rounded-[6px] px-3 font-medium text-[13px]",
					done
						? "border border-dashboard-border-strong text-dashboard-text-primary hover:bg-dashboard-hover"
						: "bg-[var(--rx-accent)] text-white hover:opacity-90",
				)}
			>
				{done ? "Review roll call" : "Take roll call"}
			</Link>
		</section>
	);
}

function NeedsYou({ data }: { data: TeacherDashboard | undefined }) {
	const digest = data?.morningDigest;
	const items: { key: string; label: string; href: string }[] = [
		...(data?.priorityActions ?? []).map((action) => ({
			key: `action-${action.sectionId}`,
			label:
				action.type === "mark_attendance"
					? `Take today's roll call for ${action.label}`
					: `Review absences in ${action.label}`,
			href: `/admin/attendance?sectionId=${action.sectionId}`,
		})),
		...(digest?.yesterdayUnmarkedSections ?? []).map((section) => ({
			key: `yesterday-${section.sectionId}`,
			label: `Yesterday's roll call for ${section.sectionName} is missing`,
			href: `/admin/attendance?sectionId=${section.sectionId}`,
		})),
		...(digest && digest.toReviewCount > 0
			? [
					{
						key: "review",
						label: `Check ${digest.toReviewCount} homework submissions`,
						href: "/admin/homework",
					},
				]
			: []),
		...(digest && digest.draftHomeworkCount > 0
			? [
					{
						key: "drafts",
						label: `Publish or delete ${digest.draftHomeworkCount} homework ${digest.draftHomeworkCount === 1 ? "draft" : "drafts"}`,
						href: "/admin/homework",
					},
				]
			: []),
	];
	return (
		<section className="rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-4 tracking-[-0.15px]">
			<h2 className="font-medium text-[14px] text-dashboard-text-primary">Needs you</h2>
			{items.length === 0 ? (
				<p className="mt-2 text-[13px] text-dashboard-text-dim">Nothing is waiting on you.</p>
			) : (
				<ul className="mt-2 flex flex-col">
					{items.map((item) => (
						<li key={item.key} className="flex items-center gap-3 py-1.5 text-[13px]">
							<span className="min-w-0 flex-1 text-dashboard-text-secondary">{item.label}</span>
							<Link href={item.href} className="shrink-0 text-[var(--rx-accent)] hover:underline">
								Open
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function FollowUps({ alerts, loading }: { alerts: TeacherDashboard["alerts"]; loading: boolean }) {
	return (
		<DashboardCard title="Students to follow up" icon={FileEditIcon}>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[560px] text-[13px]">
					<thead>
						<tr className="border-dashboard-border border-y text-[12px] text-dashboard-text-dim">
							{["Student", "Class", "Reason", ""].map((head) => (
								<th key={head || "action"} className="h-8 px-4 text-start font-normal">
									{head}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={4} className="h-16 text-center text-dashboard-text-dim">
									Loading…
								</td>
							</tr>
						) : alerts.length === 0 ? (
							<tr>
								<td colSpan={4} className="h-16 text-center text-dashboard-text-dim">
									No student in your homeroom has missed several days in a row.
								</td>
							</tr>
						) : (
							alerts.map((alert) => (
								<tr
									key={`${alert.studentId}-${alert.sectionId}`}
									className="border-dashboard-border border-b last:border-0"
								>
									<td className="px-4 py-2.5 font-medium text-dashboard-text-primary">
										{alert.studentName}
									</td>
									<td className="px-4 py-2.5 text-dashboard-text-secondary">
										{alert.sectionLabel}
									</td>
									<td className="px-4 py-2.5 text-[var(--rx-danger)]">
										Absent {alert.consecutiveDays} days in a row
									</td>
									<td className="px-4 py-2.5 text-end">
										<Link
											href={`/admin/my-classes/${alert.sectionId}`}
											className="inline-flex h-7 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
										>
											Open class
										</Link>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			<footer className="border-dashboard-border border-t px-4 py-2.5 text-[13px] text-dashboard-text-dim">
				<span className="text-dashboard-text-primary tabular-nums">{alerts.length}</span>{" "}
				{alerts.length === 1 ? "student needs" : "students need"} a follow-up
			</footer>
		</DashboardCard>
	);
}
