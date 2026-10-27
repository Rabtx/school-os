"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { subjectColor } from "@/lib/subject-color";
import { cn } from "@/lib/utils";
import { useAcademicYearsQuery, useClassesQuery, useSectionsQuery } from "@/modules/academic";
import { useTenantContext } from "@/modules/tenants";
import { useSectionWeekTimetableQuery } from "../hooks/use-timetable-queries";
import type { SectionLesson, SectionWeek, TimetablePeriod } from "../types/timetable.types";

function localIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T00:00:00`);
	date.setDate(date.getDate() + days);
	return localIsoDate(date);
}

function dayHeading(isoDate: string): string {
	const date = new Date(`${isoDate}T00:00:00`);
	return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()}`;
}

function shortTime(time: string): string {
	return time.slice(0, 5);
}

const PILL_CONTROL =
	"h-full min-w-[120px] rounded-none border-0 bg-transparent font-medium text-[13px] text-dashboard-text-primary shadow-none dark:bg-transparent";

/** Figma "Timetable" class view (`77:73662`): periods down the side, weekdays across. */
export function ClassTimetablePage() {
	const searchParams = useSearchParams();
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const [todayIso] = useState(() => localIsoDate(new Date()));
	const [anchorDate, setAnchorDate] = useState(todayIso);
	const [sectionId, setSectionId] = useState(searchParams.get("sectionId") ?? "");

	const sectionsQuery = useSectionsQuery(tenantId, campusId, Boolean(tenantId));
	const classesQuery = useClassesQuery(tenantId, Boolean(tenantId));
	const yearsQuery = useAcademicYearsQuery(tenantId, Boolean(tenantId));
	const activeYearId = yearsQuery.data?.find((year) => year.status === "active")?.id;
	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const sectionOptions = useMemo(
		() =>
			(sectionsQuery.data ?? [])
				.filter((section) => !activeYearId || section.academicYearId === activeYearId)
				.map((section) => {
					const className = classNameById.get(section.classId);
					return {
						label:
							className && !section.name.startsWith(className)
								? `${className} · ${section.name}`
								: section.name,
						value: section.id,
					};
				}),
		[activeYearId, classNameById, sectionsQuery.data],
	);

	useEffect(() => {
		if (!sectionId && sectionOptions[0]) setSectionId(sectionOptions[0].value);
	}, [sectionId, sectionOptions]);

	const weekQuery = useSectionWeekTimetableQuery(tenantId, sectionId || null, anchorDate);
	const week = weekQuery.data;
	const lessonCount = week?.days.reduce((sum, day) => sum + day.lessons.length, 0) ?? 0;
	const sectionLabel = sectionOptions.find((option) => option.value === sectionId)?.label;

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 px-4 py-5 tracking-[-0.15px] sm:px-6">
			<header className="flex flex-wrap items-end gap-3">
				<div className="min-w-0 flex-1">
					<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
						Timetable{sectionLabel ? ` · ${sectionLabel}` : ""}
					</h1>
					<p className="text-[14px] text-dashboard-text-dim leading-5">
						{week
							? `Week of ${new Date(`${week.weekStart}T00:00:00`).toLocaleDateString(undefined, {
									day: "numeric",
									month: "short",
								})} · ${lessonCount} lessons`
							: "Choose a class"}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex h-7 items-center overflow-hidden rounded-full border border-dashboard-border-strong bg-dashboard-surface text-[13px]">
						<span className="flex h-full items-center border-dashboard-border border-e px-3 text-dashboard-text-dim">
							Class
						</span>
						<SelectField
							aria-label="Class"
							items={sectionOptions}
							value={sectionId}
							onValueChange={setSectionId}
							placeholder="Select"
							className={PILL_CONTROL}
						/>
					</div>
					<WeekButton
						label="Previous week"
						onClick={() => setAnchorDate(shiftDays(anchorDate, -7))}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
					</WeekButton>
					<button
						type="button"
						onClick={() => setAnchorDate(todayIso)}
						className="h-7 rounded-full border border-dashboard-border-strong px-3 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
					>
						This week
					</button>
					<WeekButton label="Next week" onClick={() => setAnchorDate(shiftDays(anchorDate, 7))}>
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
					</WeekButton>
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-auto">
				{weekQuery.isLoading || !sectionId ? (
					<div className="flex h-40 items-center justify-center text-[13px] text-dashboard-text-dim">
						{sectionId ? <Spinner className="size-5" /> : "Choose a class to see its week."}
					</div>
				) : !week || week.periods.length === 0 ? (
					<div className="flex h-40 items-center justify-center text-[13px] text-dashboard-text-dim">
						No periods are set up for this school yet.
					</div>
				) : (
					<WeekGrid week={week} todayIso={todayIso} />
				)}
			</div>
		</div>
	);
}

function WeekButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className="flex size-7 items-center justify-center rounded-full border border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover"
		>
			{children}
		</button>
	);
}

function WeekGrid({ week, todayIso }: { week: SectionWeek; todayIso: string }) {
	const lessonFor = (dayIndex: number, periodId: string) =>
		week.days[dayIndex]?.lessons.find((lesson) => lesson.periodId === periodId);
	const columns = `88px repeat(${week.days.length}, minmax(140px, 1fr))`;

	return (
		<div className="min-w-[820px]">
			<div className="grid gap-2 pb-2" style={{ gridTemplateColumns: columns }}>
				<div />
				{week.days.map((day) => {
					const isToday = day.date === todayIso;
					return (
						<div
							key={day.date}
							className={cn(
								"flex items-center gap-2 px-1 text-[13px]",
								isToday ? "text-[var(--rx-accent)]" : "text-dashboard-text-secondary",
							)}
						>
							{dayHeading(day.date)}
							{isToday ? (
								<span className="inline-flex h-5 items-center gap-1 rounded-[4px] bg-[color-mix(in_oklab,var(--rx-accent)_16%,transparent)] px-1.5 text-[12px]">
									<span aria-hidden className="size-1.5 rounded-full bg-current" />
									Today
								</span>
							) : null}
						</div>
					);
				})}
			</div>

			<div className="grid gap-2" style={{ gridTemplateColumns: columns }}>
				{week.periods.map((period) => (
					<PeriodRow
						key={period.id}
						period={period}
						days={week.days}
						todayIso={todayIso}
						lessonFor={lessonFor}
					/>
				))}
			</div>
		</div>
	);
}

function PeriodRow({
	period,
	days,
	todayIso,
	lessonFor,
}: {
	period: TimetablePeriod;
	days: SectionWeek["days"];
	todayIso: string;
	lessonFor: (dayIndex: number, periodId: string) => SectionLesson | undefined;
}) {
	const label = (
		<div className="pt-1.5 text-[13px] leading-4">
			<p className="text-dashboard-text-primary">{shortTime(period.startsAt)}</p>
			<p className="text-[12px] text-dashboard-text-dim">{period.name}</p>
		</div>
	);

	if (period.kind === "break") {
		return (
			<>
				{label}
				<div
					className="flex h-9 items-center rounded-[8px] border border-dashboard-border border-dashed px-3 text-[13px] text-dashboard-text-dim"
					style={{ gridColumn: `span ${days.length}` }}
				>
					{period.name} · {shortTime(period.startsAt)}–{shortTime(period.endsAt)}
				</div>
			</>
		);
	}

	return (
		<>
			{label}
			{days.map((day, dayIndex) => {
				const lesson = lessonFor(dayIndex, period.id);
				const isToday = day.date === todayIso;
				if (!lesson) {
					return (
						<div
							key={day.date}
							className="flex min-h-16 items-center rounded-[8px] border border-dashboard-border border-dashed px-3 text-[12px] text-dashboard-text-dim"
						>
							Free
						</div>
					);
				}
				const color = subjectColor(lesson.subjectName ?? "Lesson");
				return (
					<div
						key={day.date}
						className={cn(
							"flex min-h-16 gap-2.5 rounded-[8px] border bg-dashboard-surface px-3 py-2",
							isToday
								? "border-[color-mix(in_oklab,var(--rx-accent)_55%,transparent)]"
								: "border-dashboard-border",
						)}
					>
						<span
							aria-hidden
							className="w-[3px] shrink-0 rounded-full"
							style={{ background: color }}
						/>
						<div className="min-w-0 text-[13px] leading-4">
							<p className="truncate font-medium text-dashboard-text-primary">
								{lesson.subjectName ?? "Lesson"}
							</p>
							<p className="mt-1 truncate text-[12px] text-dashboard-text-dim">
								{lesson.teacherName ?? "No teacher"}
							</p>
							<p className="truncate text-[12px] text-dashboard-text-dim">
								{lesson.roomName ?? "—"}
							</p>
						</div>
					</div>
				);
			})}
		</>
	);
}
