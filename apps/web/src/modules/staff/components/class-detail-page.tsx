"use client";

import {
	ArrowLeft01Icon,
	BookOpen02Icon,
	Calendar03Icon,
	CreditCardIcon,
	TableIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPageShell } from "@/components/admin";
import { CopyButton } from "@/components/copy-button";
import {
	DataTable,
	type DataTableColumn,
	DataTablePagination,
	DataTableShell,
	DataTableToolbar,
	defaultSortFn,
	useClientDataTable,
} from "@/components/data-table";
import { useAcademicYearsQuery, useClassesQuery } from "@/modules/academic";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
import { StudentAvatar } from "@/modules/students/components/student-avatar";
import { StudentRosterCards } from "@/modules/students/components/student-roster-cards";
import type { Student } from "@/modules/students/types/student.types";
import {
	formatStudentGender,
	studentStatusBadgeVariant,
} from "@/modules/students/utils/student-ui.utils";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useMySectionStudentsQuery, useMyTeacherProfileQuery } from "../hooks/use-staff-queries";
import type { TeacherSectionStudent } from "../types/staff.types";
import { ClassAssessmentScheduleSheet } from "./class-assessment-schedule-sheet";
import { ClassHomeworkAssignSheet } from "./class-homework-assign-sheet";
import { ClassRosterQuickActions } from "./class-roster-quick-actions";
import { ClassStudentProfileDrawer } from "./class-student-profile-drawer";

type Props = {
	sectionId: string;
};

type RosterView = "table" | "cards";

export function ClassDetailPage({ sectionId }: Props) {
	const searchParams = useSearchParams();
	const wantAssignHomework = searchParams.get("assignHomework") === "1";
	const wantScheduleAssessment = searchParams.get("assignAssessment") === "1";
	const assignHomeworkOpened = useRef(false);
	const assignAssessmentOpened = useRef(false);
	const { activeTenant, campuses, activeCampus } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canReadStudents = can(PermissionCodes.STUDENTS_READ);
	const canWriteHomework = can(PermissionCodes.HOMEWORK_WRITE);
	const canWriteAssessments = can(PermissionCodes.ASSESSMENTS_WRITE);

	const profileQuery = useMyTeacherProfileQuery(tenantId);
	const studentsQuery = useMySectionStudentsQuery(tenantId, sectionId);
	const classesQuery = useClassesQuery(tenantId, Boolean(tenantId));
	const yearsQuery = useAcademicYearsQuery(tenantId, Boolean(tenantId));

	const [rosterView, setRosterView] = useState<RosterView>("table");
	const [rosterSearch, setRosterSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [profileStudentId, setProfileStudentId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const [homeworkSheetOpen, setHomeworkSheetOpen] = useState(false);
	const [assessmentSheetOpen, setAssessmentSheetOpen] = useState(false);

	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);

	const section = profileQuery.data?.accessibleSections.find((item) => item.id === sectionId);

	const sectionLabel = useMemo(() => {
		if (!section) return "";
		return formatSectionLabel(
			section,
			classNameById.get(section.classId),
			campusNameById.get(section.campusId),
		);
	}, [campusNameById, classNameById, section]);

	const activeYearLabel = useMemo(() => {
		if (!section) return undefined;
		const year = yearsQuery.data?.find((item) => item.id === section.academicYearId);
		return year?.name;
	}, [section, yearsQuery.data]);

	const sectionSubjectId = useMemo(() => {
		if (!section || section.accessType !== "subject") return null;
		return (
			profileQuery.data?.subjectAssignments.find((assignment) => assignment.sectionId === sectionId)
				?.id ?? null
		);
	}, [profileQuery.data?.subjectAssignments, section, sectionId]);

	useEffect(() => {
		if (!wantAssignHomework || !canWriteHomework || !section || assignHomeworkOpened.current) {
			return;
		}
		assignHomeworkOpened.current = true;
		setHomeworkSheetOpen(true);
	}, [wantAssignHomework, canWriteHomework, section]);

	useEffect(() => {
		if (
			!wantScheduleAssessment ||
			!canWriteAssessments ||
			!section ||
			assignAssessmentOpened.current
		) {
			return;
		}
		assignAssessmentOpened.current = true;
		setAssessmentSheetOpen(true);
	}, [wantScheduleAssessment, canWriteAssessments, section]);

	const rosterRows = useMemo(
		() => (studentsQuery.data ?? []).map((row) => row.student),
		[studentsQuery.data],
	);

	const sectionLabelByStudentId = useMemo(() => {
		const map = new Map<string, string>();
		for (const student of rosterRows) {
			map.set(student.id, sectionLabel);
		}
		return map;
	}, [rosterRows, sectionLabel]);

	const openProfile = useCallback((studentId: string) => {
		setProfileStudentId(studentId);
		setProfileOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<TeacherSectionStudent>[] => [
			{
				id: "avatar",
				header: "",
				className: "w-[52px]",
				renderCell: (row) => <StudentAvatar student={row.student} size="sm" />,
			},
			{
				id: "student",
				header: "Student",
				sortable: true,
				sortValue: (row) => row.student.fullName,
				renderCell: (row) => (
					<div className="flex min-w-[140px] items-center gap-2">
						<div className="min-w-0 flex-1">
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0 text-start"
								onClick={() => openProfile(row.student.id)}
							>
								<span className="font-medium text-sm text-foreground">{row.student.fullName}</span>
							</Button>
							<span className="block font-mono text-[12px] text-muted-foreground">
								{row.student.studentCode}
							</span>
						</div>
						<CopyButton value={row.student.studentCode} label="Copy student code" />
					</div>
				),
			},
			{
				id: "contact",
				header: "Contact",
				sortable: true,
				sortValue: (row) => row.student.email ?? row.student.phone ?? "",
				renderCell: (row) => (
					<div className="flex min-w-[160px] items-center gap-2">
						<div className="min-w-0 flex-1 text-muted-foreground text-sm">
							<p className="truncate">{row.student.email ?? "—"}</p>
							{row.student.phone ? <p className="text-[12px]">{row.student.phone}</p> : null}
						</div>
						{row.student.phone ? <CopyButton value={row.student.phone} label="Copy phone" /> : null}
					</div>
				),
			},
			{
				id: "gender",
				header: "Gender",
				sortable: true,
				sortValue: (row) => row.student.gender ?? "",
				renderCell: (row) => (
					<span className="text-muted-foreground text-sm capitalize">
						{formatStudentGender(row.student.gender)}
					</span>
				),
			},
			{
				id: "bloodGroup",
				header: "Blood",
				sortable: true,
				sortValue: (row) => row.student.bloodGroup ?? "",
				renderCell: (row) =>
					row.student.bloodGroup ? (
						<Badge variant="outline" className="font-mono">
							{row.student.bloodGroup}
						</Badge>
					) : (
						<span className="text-muted-foreground text-sm">—</span>
					),
			},
			{
				id: "emergency",
				header: "Emergency",
				sortable: true,
				sortValue: (row) => row.student.emergencyContactName ?? "",
				renderCell: (row) => (
					<div className="flex min-w-[120px] items-center gap-2">
						<div className="min-w-0 flex-1 text-muted-foreground text-sm">
							<p className="truncate">{row.student.emergencyContactName ?? "—"}</p>
							{row.student.emergencyContactPhone ? (
								<p className="text-[12px]">{row.student.emergencyContactPhone}</p>
							) : null}
						</div>
						{row.student.emergencyContactPhone ? (
							<CopyButton value={row.student.emergencyContactPhone} label="Copy emergency phone" />
						) : null}
					</div>
				),
			},
			{
				id: "status",
				header: "Status",
				sortable: true,
				sortValue: (row) => row.student.status,
				renderCell: (row) => (
					<Badge variant={studentStatusBadgeVariant(row.student.status)} className="capitalize">
						{row.student.status}
					</Badge>
				),
			},
		],
		[openProfile],
	);

	const table = useClientDataTable({
		data: studentsQuery.data ?? [],
		searchQuery: rosterSearch,
		searchFn: (row, queryText) => {
			const haystack = [
				row.student.fullName,
				row.student.studentCode,
				row.student.email,
				row.student.phone,
				row.student.emergencyContactName,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		filterFn: (row, filters) => {
			if (filters.status && row.student.status !== filters.status) return false;
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	const cardStudents = useMemo(
		() => table.rows.map((row) => row.student),
		[table.rows],
	) as Student[];

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Switch to an organization to view this class.</AlertDescription>
			</Alert>
		);
	}

	if (profileQuery.isLoading || classesQuery.isLoading) {
		return (
			<AdminPageShell title="Loading class…" maxWidth="7xl">
				<div className="mb-5 flex flex-wrap items-center gap-2">
					<Skeleton className="h-5 w-24 rounded-full" />
					<Skeleton className="h-4 w-36" />
				</div>
				<div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
					{["qa-1", "qa-2", "qa-3", "qa-4"].map((qaKey) => (
						<Skeleton key={qaKey} className="h-[84px] rounded-[14px]" />
					))}
				</div>
				<Skeleton className="mb-3 h-9 w-full rounded-lg sm:w-72" />
				<div className="flex flex-col gap-2">
					{["row-1", "row-2", "row-3", "row-4", "row-5"].map((rowKey) => (
						<Skeleton key={rowKey} className="h-12 w-full rounded-lg" />
					))}
				</div>
			</AdminPageShell>
		);
	}

	if (!section) {
		return (
			<Alert>
				<AlertDescription>
					This class is not assigned to you, or it no longer exists.
				</AlertDescription>
			</Alert>
		);
	}

	const activeCount = rosterRows.filter((student) => student.status === "active").length;

	return (
		<AdminPageShell
			title={sectionLabel}
			description={
				section.accessType === "homeroom"
					? "Homeroom roster with ID cards, search, and classroom quick actions."
					: `${section.subjectName ?? "Subject"} roster with search, ID cards, and teaching shortcuts.`
			}
			breadcrumb={{ label: "My classes", href: "/admin/my-classes" }}
			maxWidth="7xl"
			actions={
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={<Link href="/admin/my-classes" />}
					>
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							data-icon="inline-start"
							strokeWidth={2}
							className="rtl:rotate-180"
						/>
						Back
					</Button>
					{section.accessType === "homeroom" ? (
						<Button
							size="sm"
							nativeButton={false}
							render={<Link href={`/admin/attendance?sectionId=${sectionId}&confirmAll=1`} />}
						>
							<HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" strokeWidth={2} />
							Mark attendance
						</Button>
					) : null}
					{canWriteHomework ? (
						<Button size="sm" onClick={() => setHomeworkSheetOpen(true)}>
							<HugeiconsIcon icon={BookOpen02Icon} data-icon="inline-start" strokeWidth={2} />
							Assign homework
						</Button>
					) : null}
					{canWriteAssessments ? (
						<Button size="sm" variant="secondary" onClick={() => setAssessmentSheetOpen(true)}>
							Schedule test
						</Button>
					) : null}
				</div>
			}
		>
			<div className="mb-5 flex flex-wrap items-center gap-2">
				<Badge
					variant={section.accessType === "homeroom" ? "default" : "outline"}
					className="capitalize"
				>
					{section.accessType === "homeroom" ? "Homeroom" : section.subjectCode}
				</Badge>
				<span className="text-[13px] text-dashboard-text-muted">
					{activeCount} active · {table.totalRows} enrolled
				</span>
				{activeYearLabel ? (
					<span className="text-[13px] text-dashboard-text-muted">· {activeYearLabel}</span>
				) : null}
			</div>

			<ClassRosterQuickActions
				className="mb-6"
				sectionId={sectionId}
				section={section}
				sectionSubjectId={sectionSubjectId}
				onShowIdCards={() => setRosterView("cards")}
				onAssignHomework={canWriteHomework ? () => setHomeworkSheetOpen(true) : undefined}
				onScheduleAssessment={canWriteAssessments ? () => setAssessmentSheetOpen(true) : undefined}
			/>

			{tenantId && canWriteHomework ? (
				<ClassHomeworkAssignSheet
					open={homeworkSheetOpen}
					onOpenChange={setHomeworkSheetOpen}
					tenantId={tenantId}
					campusId={campusId}
					sectionId={sectionId}
					sectionSubjectId={sectionSubjectId}
					classLabel={sectionLabel}
					subjectName={section.subjectName}
				/>
			) : null}
			{tenantId && canWriteAssessments ? (
				<ClassAssessmentScheduleSheet
					open={assessmentSheetOpen}
					onOpenChange={setAssessmentSheetOpen}
					tenantId={tenantId}
					campusId={campusId}
					sectionId={sectionId}
					sectionSubjectId={sectionSubjectId}
					classLabel={sectionLabel}
					subjectName={section.subjectName}
				/>
			) : null}

			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={rosterSearch}
						onSearchChange={(value) => {
							setRosterSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search students by name, code, email…"
						filters={[
							{
								id: "status",
								label: "Status",
								value: statusFilter,
								onChange: (value) => {
									setStatusFilter(value);
									table.setFilter("status", value);
								},
								items: [
									{ label: "Active", value: "active" },
									{ label: "Inactive", value: "inactive" },
									{ label: "Graduated", value: "graduated" },
									{ label: "Withdrawn", value: "withdrawn" },
								],
							},
						]}
					>
						<ToggleGroup
							value={[rosterView]}
							onValueChange={(next) => {
								const selected = next[0] as RosterView | undefined;
								if (selected) setRosterView(selected);
							}}
							variant="outline"
							size="sm"
							spacing={0}
							aria-label="Roster view"
						>
							<ToggleGroupItem value="table" className="gap-1.5 px-2.5">
								<HugeiconsIcon icon={TableIcon} strokeWidth={2} className="size-3.5" />
								<span className="hidden sm:inline">Table</span>
							</ToggleGroupItem>
							<ToggleGroupItem value="cards" className="gap-1.5 px-2.5">
								<HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} className="size-3.5" />
								<span className="hidden sm:inline">ID cards</span>
							</ToggleGroupItem>
						</ToggleGroup>
					</DataTableToolbar>
				}
				footer={
					rosterView === "table" ? (
						<DataTablePagination
							pageIndex={table.pageIndex}
							pageCount={table.pageCount}
							pageSize={table.pageSize}
							totalRows={table.totalRows}
							onPageChange={table.setPageIndex}
							onPageSizeChange={(size) => {
								table.setPageSize(size);
								table.setPageIndex(0);
							}}
						/>
					) : null
				}
			>
				{rosterView === "table" ? (
					<DataTable
						borderless
						columns={columns}
						rows={table.rows}
						getRowId={(row) => row.student.id}
						loading={studentsQuery.isLoading}
						sort={table.sort}
						onSort={table.toggleSort}
						emptyTitle="No students enrolled"
						emptyDescription="Students appear here once enrolled in this section."
					/>
				) : (
					<StudentRosterCards
						students={cardStudents}
						schoolName={activeTenant?.name ?? "School"}
						tenantId={tenantId}
						sectionLabelByStudentId={sectionLabelByStudentId}
						academicYearLabel={activeYearLabel}
						loading={studentsQuery.isLoading}
						onStudentClick={canReadStudents ? (student) => openProfile(student.id) : undefined}
					/>
				)}
			</DataTableShell>

			{canReadStudents ? (
				<ClassStudentProfileDrawer
					open={profileOpen}
					onOpenChange={setProfileOpen}
					tenantId={tenantId}
					schoolName={activeTenant?.name ?? "School"}
					studentId={profileStudentId}
					sectionLabel={sectionLabel}
					academicYearLabel={activeYearLabel}
				/>
			) : null}
		</AdminPageShell>
	);
}
