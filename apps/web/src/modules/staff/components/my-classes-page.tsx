"use client";

import { Calendar03Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Meter, Trend } from "@rabtx/ui/meter";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	useClientDataTable,
} from "@/components/data-table";
import { ListPage } from "@/components/list-page";
import { NoResults } from "@/components/states";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useTenantContext } from "@/modules/tenants";
import { type TimetableClassSlot, useMyWeekTimetableQuery } from "@/modules/timetable";
import { useMyTeacherDashboardQuery } from "../hooks/use-staff-queries";
import type { TeacherAccessibleSection, TeacherDashboardSection } from "../types/staff.types";
import { ClassAssessmentScheduleSheet } from "./class-assessment-schedule-sheet";
import { ClassHomeworkAssignSheet } from "./class-homework-assign-sheet";

type View = "today" | "week" | "all";

type ClassRow = {
	key: string;
	sectionId: string;
	sectionName: string;
	section: TeacherAccessibleSection | null;
	subjectName: string | null;
	homeroom: boolean;
	roomName: string | null;
	startsAt: string | null;
	endsAt: string | null;
	date: string | null;
	studentCount: number;
	recentAttendance: TeacherDashboardSection["recentAttendance"];
	status: { label: string; tone: "accent" | "warning" | "success" | "dim" };
};

const EMPTY_ATTENDANCE: TeacherDashboardSection["recentAttendance"] = { rate: null, days: [] };

function minutesOf(time: string): number {
	const [hours = "0", minutes = "0"] = time.split(":");
	return Number(hours) * 60 + Number(minutes);
}

function clock(time: string): string {
	const [hours = "0", minutes = "00"] = time.split(":");
	const hour = Number(hours);
	return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes}`;
}

function dayLabel(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
}

/** Where a lesson stands: taught, now, next (first upcoming today), later, or a future day. */
function lessonStatus(
	date: string,
	slot: TimetableClassSlot,
	today: string,
	now: Date,
	isNext: boolean,
) {
	if (date < today) return { label: "Taught", tone: "dim" } as const;
	if (date > today) return { label: "Coming up", tone: "dim" } as const;
	const current = now.getHours() * 60 + now.getMinutes();
	if (current >= minutesOf(slot.period.endsAt)) return { label: "Taught", tone: "dim" } as const;
	if (current >= minutesOf(slot.period.startsAt)) return { label: "Now", tone: "success" } as const;
	if (isNext) return { label: "Next", tone: "accent" } as const;
	return { label: "Later", tone: "dim" } as const;
}

const TONE: Record<ClassRow["status"]["tone"], string> = {
	accent: "text-[var(--rx-accent)]",
	warning: "text-[var(--rx-warning)]",
	success: "text-[var(--rx-success)]",
	dim: "text-dashboard-text-dim",
};

/** Figma "Teacher · My classes" (`158:32640`): this teacher's lessons and classes as one table. */
export function MyClassesPage() {
	const searchParams = useSearchParams();
	const requested = searchParams.get("view");
	const view: View = requested === "today" || requested === "all" ? requested : "week";
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const now = useNow();
	const today = now.toLocaleDateString("en-CA");

	const dashboardQuery = useMyTeacherDashboardQuery(tenantId, today);
	const weekQuery = useMyWeekTimetableQuery(tenantId, today, view !== "all");
	const [search, setSearch] = useState("");
	const [subjectFilter, setSubjectFilter] = useState("");
	const [homeworkSection, setHomeworkSection] = useState<TeacherAccessibleSection | null>(null);
	const [testSection, setTestSection] = useState<TeacherAccessibleSection | null>(null);

	const sections = useMemo(() => dashboardQuery.data?.sections ?? [], [dashboardQuery.data]);

	const rows = useMemo((): ClassRow[] => {
		const metricsFor = (sectionId: string, subjectId: string | null) =>
			sections.find(
				(item) =>
					item.section.id === sectionId &&
					(subjectId
						? item.section.subjectId === subjectId
						: item.section.accessType === "homeroom"),
			) ?? sections.find((item) => item.section.id === sectionId);

		if (view === "all") {
			return sections.map((item) => {
				const homeroom = item.section.accessType === "homeroom";
				const status: ClassRow["status"] = homeroom
					? item.todayAttendance.isComplete
						? { label: "Roll call done", tone: "success" }
						: { label: "Roll call open", tone: "warning" }
					: { label: "Subject class", tone: "dim" };
				return {
					key: `${item.section.id}-${item.section.subjectId ?? "homeroom"}`,
					sectionId: item.section.id,
					sectionName: item.section.name,
					section: item.section,
					subjectName: item.section.subjectName,
					homeroom,
					roomName: null,
					startsAt: null,
					endsAt: null,
					date: null,
					studentCount: item.studentCount,
					recentAttendance: item.recentAttendance,
					status,
				};
			});
		}

		const days = (weekQuery.data?.days ?? []).filter(
			(day) => view === "week" || day.date === today,
		);
		const lessons = days.flatMap((day) =>
			day.slots
				.filter((slot): slot is TimetableClassSlot => slot.type === "class")
				.map((slot) => ({ date: day.date, slot })),
		);
		const current = now.getHours() * 60 + now.getMinutes();
		const nextIndex = lessons.findIndex(
			({ date, slot }) => date === today && minutesOf(slot.period.startsAt) > current,
		);
		return lessons.map(({ date, slot }, index) => {
			const metrics = metricsFor(slot.sectionId, slot.subjectId);
			return {
				key: `${date}-${slot.period.id}-${slot.sectionId}`,
				sectionId: slot.sectionId,
				sectionName: slot.sectionName,
				section: metrics?.section ?? null,
				subjectName: slot.subjectName,
				homeroom: false,
				roomName: slot.roomName,
				startsAt: slot.period.startsAt,
				endsAt: slot.period.endsAt,
				date,
				studentCount: metrics?.studentCount ?? 0,
				recentAttendance: metrics?.recentAttendance ?? EMPTY_ATTENDANCE,
				status: lessonStatus(date, slot, today, now, index === nextIndex),
			};
		});
	}, [now, sections, today, view, weekQuery.data]);

	const subjectItems = useMemo(() => {
		const names = new Set<string>();
		for (const row of rows) names.add(row.homeroom ? "Homeroom" : (row.subjectName ?? "Lesson"));
		return [...names].toSorted().map((name) => ({ label: name, value: name }));
	}, [rows]);

	const table = useClientDataTable({
		data: rows,
		searchQuery: search,
		searchFn: (row, query) =>
			[row.sectionName, row.subjectName, row.roomName]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(query),
		filterFn: (row, filters) =>
			!filters.subject ||
			(row.homeroom ? "Homeroom" : (row.subjectName ?? "Lesson")) === filters.subject,
		pageSize: 50,
	});

	const columns = useMemo(
		(): DataTableColumn<ClassRow>[] => [
			{
				id: "class",
				header: "Class",
				renderCell: (row) => <span className="font-medium">{row.sectionName}</span>,
			},
			{
				id: "subject",
				header: "Subject & notes",
				renderCell: (row) => (
					<span className="flex flex-wrap gap-1.5">
						<Chip>{row.homeroom ? "Homeroom" : (row.subjectName ?? "Lesson")}</Chip>
						{row.roomName ? <Chip>{row.roomName}</Chip> : null}
					</span>
				),
			},
			...(view === "all"
				? []
				: [
						{
							id: "time",
							header: "Time",
							renderCell: (row: ClassRow) =>
								row.startsAt && row.endsAt ? (
									<span className="tabular-nums">
										{clock(row.startsAt)} – {clock(row.endsAt)}
									</span>
								) : (
									"—"
								),
						},
					]),
			{
				id: "students",
				header: "Students",
				renderCell: (row) => <span className="tabular-nums">{row.studentCount}</span>,
			},
			{
				id: "attendance",
				header: "Avg attendance",
				renderCell: (row) => <Meter rate={row.recentAttendance.rate} />,
			},
			{
				id: "trend",
				header: "Trend",
				renderCell: (row) => (
					<Trend
						values={row.recentAttendance.days.map((day) => ({ label: day.date, rate: day.rate }))}
						label={`${row.sectionName} attendance, last 10 school days`}
					/>
				),
			},
			{
				id: "status",
				header: view === "all" ? "Today" : "Day & status",
				renderCell: (row) => (
					<span className="flex items-center gap-2 whitespace-nowrap">
						{row.date ? (
							<>
								<HugeiconsIcon
									icon={Calendar03Icon}
									size={14}
									strokeWidth={1.8}
									className="text-dashboard-text-dim"
								/>
								<span>{dayLabel(row.date)}</span>
								<span aria-hidden className="h-3 w-px bg-dashboard-border-strong" />
							</>
						) : null}
						<span className={TONE[row.status.tone]}>{row.status.label}</span>
					</span>
				),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				className: "text-right",
				renderCell: (row) => (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`Actions for ${row.sectionName}`}
								/>
							}
						>
							<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								render={<Link href={`/admin/my-classes/${row.sectionId}`}>Open class</Link>}
							/>
							<DropdownMenuItem
								render={
									<Link href={`/admin/attendance?sectionId=${row.sectionId}`}>Roll call</Link>
								}
							/>
							{row.section && row.section.accessType === "subject" ? (
								<>
									<DropdownMenuItem onClick={() => setHomeworkSection(row.section)}>
										New homework
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setTestSection(row.section)}>
										Schedule a test
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[view],
	);

	const rated = table.filteredRows.filter((row) => row.recentAttendance.rate !== null);
	const averageRate =
		rated.length > 0
			? rated.reduce((sum, row) => sum + (row.recentAttendance.rate ?? 0), 0) / rated.length
			: null;
	const toReview = dashboardQuery.data?.morningDigest.toReviewCount ?? 0;
	const noun = view === "all" ? "classes" : "lessons";
	const loading = dashboardQuery.isLoading || (view !== "all" && weekQuery.isLoading);
	const filtersActive = Boolean(search.trim() || subjectFilter);

	return (
		<ListPage
			title="My classes"
			tabs={[
				{ label: "Today", href: "/admin/my-classes?view=today", active: view === "today" },
				{ label: "This week", href: "/admin/my-classes", active: view === "week" },
				{ label: "All classes", href: "/admin/my-classes?view=all", active: view === "all" },
				{ label: "Timetable", href: "/admin/timetable" },
			]}
			toolbar={
				<DataTableToolbar
					className="border-0 px-4 sm:px-6"
					search={search}
					onSearchChange={(value) => {
						setSearch(value);
						table.resetPage();
					}}
					searchPlaceholder="Search classes"
					filters={[
						{
							id: "subject",
							label: "Subject",
							value: subjectFilter,
							placeholder: "All",
							onChange: (value) => {
								setSubjectFilter(value);
								table.setFilter("subject", value);
							},
							items: subjectItems,
						},
					]}
				>
					<Button
						size="sm"
						variant="outline"
						className="h-7 rounded-full"
						render={<Link href="/admin/timetable" />}
						nativeButton={false}
					>
						Timetable
					</Button>
				</DataTableToolbar>
			}
			footer={
				<DataTableFooterBar
					shown={table.rows.length}
					total={table.totalRows}
					noun={noun}
					stats={[
						{
							label: "Avg attendance",
							value: averageRate === null ? "—" : `${averageRate.toFixed(1)}%`,
						},
						{
							label: "Homework to check",
							value: toReview,
							tone: toReview > 0 ? "warning" : undefined,
						},
					]}
					pageIndex={table.pageIndex}
					pageCount={table.pageCount}
					pageSize={table.pageSize}
					onPageChange={table.setPageIndex}
					onPageSizeChange={table.setPageSize}
				/>
			}
		>
			<DataTable
				fullBleed
				columns={columns}
				rows={table.rows}
				getRowId={(row) => row.key}
				loading={loading}
				emptyState={
					filtersActive ? (
						<NoResults
							noun={noun}
							filters={[
								...(search.trim()
									? [{ key: "search", label: `"${search.trim()}"`, onRemove: () => setSearch("") }]
									: []),
								...(subjectFilter
									? [
											{
												key: "subject",
												label: subjectFilter,
												onRemove: () => {
													setSubjectFilter("");
													table.setFilter("subject", "");
												},
											},
										]
									: []),
							]}
							onClearAll={() => {
								setSearch("");
								setSubjectFilter("");
								table.setFilter("subject", "");
							}}
						/>
					) : undefined
				}
				emptyTitle={view === "all" ? "No classes assigned yet" : "No lessons on your timetable"}
				emptyDescription={
					view === "all"
						? "Ask the principal to assign you a homeroom or a subject class."
						: view === "today"
							? "Nothing scheduled for today."
							: "Nothing scheduled this week. Your classes are under All classes."
				}
			/>

			{homeworkSection ? (
				<ClassHomeworkAssignSheet
					open
					onOpenChange={(open) => !open && setHomeworkSection(null)}
					tenantId={tenantId ?? ""}
					campusId={homeworkSection.campusId ?? campusId}
					sectionId={homeworkSection.id}
					sectionSubjectId={homeworkSection.subjectId}
					classLabel={homeworkSection.name}
					subjectName={homeworkSection.subjectName}
				/>
			) : null}
			{testSection ? (
				<ClassAssessmentScheduleSheet
					open
					onOpenChange={(open) => !open && setTestSection(null)}
					tenantId={tenantId ?? ""}
					campusId={testSection.campusId ?? campusId}
					sectionId={testSection.id}
					sectionSubjectId={testSection.subjectId}
					classLabel={testSection.name}
					subjectName={testSection.subjectName}
				/>
			) : null}
		</ListPage>
	);
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<span
			className={cn(
				"inline-flex h-6 items-center rounded-full border border-dashboard-border-strong bg-dashboard-hover/40 px-2.5 text-[12px] text-dashboard-text-secondary",
				className,
			)}
		>
			{children}
		</span>
	);
}
