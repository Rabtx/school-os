"use client";

import {
	BookOpen02Icon,
	Home10Icon,
	Notebook01Icon,
	TeacherIcon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { SearchInput } from "@school-os/ui/components/search-input";
import { Separator } from "@school-os/ui/components/separator";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin";
import { useAcademicYearsQuery, useClassesQuery } from "@/modules/academic";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
import { useTenantContext } from "@/modules/tenants";
import { useMyTeacherDashboardQuery, useMyTeacherProfileQuery } from "../hooks/use-staff-queries";
import type { TeacherAccessibleSection } from "../types/staff.types";
import { ClassAssessmentScheduleSheet } from "./class-assessment-schedule-sheet";
import { ClassHomeworkAssignSheet } from "./class-homework-assign-sheet";
import { MyClassesEmptyState } from "./my-classes-empty-state";
import { TeacherClassCard } from "./teacher-class-card";

function localSessionDate(): string {
	return new Date().toLocaleDateString("en-CA");
}

type FilterCategory = "all" | "homeroom" | "subject";

const FILTER_LABELS: Record<FilterCategory, string> = {
	all: "All classes",
	homeroom: "Homeroom",
	subject: "Subject classes",
};

function MyClassesSkeleton() {
	return (
		<AdminPageShell
			title="My classes"
			description="Homeroom sections and subject classes assigned to you."
			icon={TeacherIcon}
			maxWidth="5xl"
		>
			<div className="mb-5 flex items-center gap-4 rounded-[14px] border border-dashboard-border bg-dashboard-card-inner px-4 py-3">
				<Skeleton className="h-8 w-28 rounded-lg" />
				<Skeleton className="h-8 w-32 rounded-lg" />
				<Skeleton className="h-8 w-28 rounded-lg" />
			</div>
			<div className="mb-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
				<Skeleton className="h-9 w-full rounded-lg sm:w-80" />
				<Skeleton className="h-9 w-full rounded-lg sm:w-72" />
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				{["sk-1", "sk-2", "sk-3", "sk-4"].map((skKey) => (
					<div
						key={skKey}
						className="flex flex-col gap-3 rounded-[14px] border border-dashboard-border bg-dashboard-card-outer p-4"
					>
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-24 rounded-full" />
							<Skeleton className="h-4 w-16" />
						</div>
						<Skeleton className="h-5 w-44" />
						<Skeleton className="h-4 w-32" />
						<div className="mt-1 flex gap-2 border-t border-dashboard-border-subtle pt-3">
							<Skeleton className="h-7 flex-1 rounded-md" />
							<Skeleton className="h-7 w-20 rounded-md" />
							<Skeleton className="h-7 w-20 rounded-md" />
							<Skeleton className="h-7 w-7 rounded-md" />
						</div>
					</div>
				))}
			</div>
		</AdminPageShell>
	);
}

type OverviewStatProps = {
	icon: typeof Home10Icon;
	label: string;
	value: number | string;
};

function OverviewStat({ icon, label, value }: OverviewStatProps) {
	return (
		<div className="flex items-center gap-2.5">
			<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dashboard-accent-soft text-dashboard-accent">
				<HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
			</span>
			<span className="flex flex-col leading-tight">
				<span className="font-semibold text-[15px] text-dashboard-text-primary tabular-nums">
					{value}
				</span>
				<span className="text-[11px] text-dashboard-text-muted">{label}</span>
			</span>
		</div>
	);
}

export function MyClassesPage() {
	const { activeTenant, campuses, activeCampus } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const sessionDate = useMemo(() => localSessionDate(), []);

	const profileQuery = useMyTeacherProfileQuery(tenantId);
	const dashboardQuery = useMyTeacherDashboardQuery(tenantId, sessionDate);
	const classesQuery = useClassesQuery(tenantId, Boolean(tenantId));
	const yearsQuery = useAcademicYearsQuery(tenantId, Boolean(tenantId));

	const [searchQuery, setSearchQuery] = useState("");
	const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
	const [assignHomeworkSection, setAssignHomeworkSection] =
		useState<TeacherAccessibleSection | null>(null);
	const [assignAssessmentSection, setAssignAssessmentSection] =
		useState<TeacherAccessibleSection | null>(null);

	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);
	const yearNameById = useMemo(
		() => new Map((yearsQuery.data ?? []).map((year) => [year.id, year.name])),
		[yearsQuery.data],
	);

	const sectionMetricsByKey = useMemo(() => {
		const map = new Map<string, NonNullable<typeof dashboardQuery.data>["sections"][number]>();
		for (const item of dashboardQuery.data?.sections ?? []) {
			const key = `${item.section.id}-${item.section.subjectId ?? "homeroom"}`;
			map.set(key, item);
		}
		return map;
	}, [dashboardQuery.data?.sections]);

	const accessibleSections = useMemo(
		() => profileQuery.data?.accessibleSections ?? [],
		[profileQuery.data],
	);
	const homeroomSections = accessibleSections.filter((s) => s.accessType === "homeroom");
	const subjectSections = accessibleSections.filter((s) => s.accessType === "subject");
	const totalStudents = dashboardQuery.data?.stats.totalStudents;

	const filteredSections = useMemo(() => {
		return accessibleSections.filter((section) => {
			if (filterCategory === "homeroom" && section.accessType !== "homeroom") return false;
			if (filterCategory === "subject" && section.accessType !== "subject") return false;

			if (!searchQuery.trim()) return true;

			const q = searchQuery.toLowerCase();
			const className = classNameById.get(section.classId)?.toLowerCase() ?? "";
			const campusName = campusNameById.get(section.campusId)?.toLowerCase() ?? "";
			const label = formatSectionLabel(
				section,
				classNameById.get(section.classId),
				campusNameById.get(section.campusId),
			).toLowerCase();
			const subjectName = section.subjectName?.toLowerCase() ?? "";
			const subjectCode = section.subjectCode?.toLowerCase() ?? "";

			return (
				label.includes(q) ||
				className.includes(q) ||
				campusName.includes(q) ||
				subjectName.includes(q) ||
				subjectCode.includes(q)
			);
		});
	}, [accessibleSections, filterCategory, searchQuery, classNameById, campusNameById]);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Switch to an organization to view your classes.</AlertDescription>
			</Alert>
		);
	}

	if (profileQuery.isLoading || classesQuery.isLoading) {
		return <MyClassesSkeleton />;
	}

	if (profileQuery.isError) {
		return (
			<Alert>
				<AlertDescription>
					My classes is available for teacher accounts in this organization.
				</AlertDescription>
			</Alert>
		);
	}

	const hasSections = accessibleSections.length > 0;
	const activeHomeworkSectionLabel = assignHomeworkSection
		? formatSectionLabel(
				assignHomeworkSection,
				classNameById.get(assignHomeworkSection.classId),
				campusNameById.get(assignHomeworkSection.campusId),
			)
		: "";
	const activeAssessmentSectionLabel = assignAssessmentSection
		? formatSectionLabel(
				assignAssessmentSection,
				classNameById.get(assignAssessmentSection.classId),
				campusNameById.get(assignAssessmentSection.campusId),
			)
		: "";

	return (
		<AdminPageShell
			title="My classes"
			description="Homeroom sections and subject classes assigned to you. Mark attendance, draft homework, or schedule tests in one tap."
			icon={TeacherIcon}
			maxWidth="5xl"
		>
			{hasSections ? (
				<>
					{/* At-a-glance overview */}
					<div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border border-dashboard-border bg-dashboard-card-inner px-4 py-3">
						<OverviewStat
							icon={Home10Icon}
							label="Homeroom sections"
							value={homeroomSections.length}
						/>
						<Separator orientation="vertical" className="hidden h-8 sm:block" />
						<OverviewStat
							icon={Notebook01Icon}
							label="Subject classes"
							value={subjectSections.length}
						/>
						<Separator orientation="vertical" className="hidden h-8 sm:block" />
						<OverviewStat
							icon={UserGroupIcon}
							label="Students across classes"
							value={totalStudents ?? "—"}
						/>
						<span className="ms-auto hidden items-center gap-1.5 text-[12px] text-dashboard-text-muted lg:flex">
							<HugeiconsIcon icon={BookOpen02Icon} size={14} strokeWidth={2} />
							Quick actions live on every card
						</span>
					</div>

					{/* Search & category filter controls */}
					<div className="mb-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
						<SearchInput
							placeholder="Search by class, section, subject, or campus..."
							value={searchQuery}
							onValueChange={(val) => setSearchQuery(val)}
							className="w-full sm:w-80"
						/>

						<ToggleGroup
							value={[filterCategory]}
							onValueChange={(next) => {
								const selected = next[0] as FilterCategory | undefined;
								if (selected) setFilterCategory(selected);
							}}
							variant="outline"
							size="sm"
							spacing={0}
							aria-label="Filter sections"
							className="justify-start sm:justify-end"
						>
							<ToggleGroupItem
								value="all"
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
							>
								All classes
								<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
									{accessibleSections.length}
								</Badge>
							</ToggleGroupItem>

							<ToggleGroupItem
								value="homeroom"
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
							>
								Homeroom
								<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
									{homeroomSections.length}
								</Badge>
							</ToggleGroupItem>

							<ToggleGroupItem
								value="subject"
								className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
							>
								Subject classes
								<Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
									{subjectSections.length}
								</Badge>
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					{/* Section cards */}
					{filteredSections.length === 0 ? (
						<MyClassesEmptyState
							variant="no-results"
							searchQuery={searchQuery.trim()}
							filterLabel={filterCategory === "all" ? undefined : FILTER_LABELS[filterCategory]}
							onClearFilters={() => {
								setSearchQuery("");
								setFilterCategory("all");
							}}
						/>
					) : (
						<div className="grid gap-3 sm:grid-cols-2">
							{filteredSections.map((section, index) => {
								const key = `${section.id}-${section.subjectId ?? "homeroom"}`;
								return (
									<TeacherClassCard
										key={key}
										section={section}
										label={formatSectionLabel(
											section,
											classNameById.get(section.classId),
											campusNameById.get(section.campusId),
										)}
										campusName={campusNameById.get(section.campusId)}
										academicYearName={yearNameById.get(section.academicYearId)}
										metrics={sectionMetricsByKey.get(key)}
										revealDelay={Math.min(index * 0.04, 0.32)}
										onAssignHomework={(sec) => setAssignHomeworkSection(sec)}
										onScheduleAssessment={(sec) => setAssignAssessmentSection(sec)}
									/>
								);
							})}
						</div>
					)}
				</>
			) : (
				<MyClassesEmptyState variant="no-sections" />
			)}

			{/* Integrated quick-action sheets */}
			{assignHomeworkSection ? (
				<ClassHomeworkAssignSheet
					open={Boolean(assignHomeworkSection)}
					onOpenChange={(open) => {
						if (!open) setAssignHomeworkSection(null);
					}}
					tenantId={tenantId}
					campusId={assignHomeworkSection.campusId ?? campusId}
					sectionId={assignHomeworkSection.id}
					sectionSubjectId={assignHomeworkSection.subjectId}
					classLabel={activeHomeworkSectionLabel}
					subjectName={assignHomeworkSection.subjectName}
				/>
			) : null}

			{assignAssessmentSection ? (
				<ClassAssessmentScheduleSheet
					open={Boolean(assignAssessmentSection)}
					onOpenChange={(open) => {
						if (!open) setAssignAssessmentSection(null);
					}}
					tenantId={tenantId}
					campusId={assignAssessmentSection.campusId ?? campusId}
					sectionId={assignAssessmentSection.id}
					sectionSubjectId={assignAssessmentSection.subjectId}
					classLabel={activeAssessmentSectionLabel}
					subjectName={assignAssessmentSection.subjectName}
				/>
			) : null}
		</AdminPageShell>
	);
}
