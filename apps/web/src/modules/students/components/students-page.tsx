"use client";

import { Download04Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormDrawer } from "@/components/admin";
import { ListPage } from "@/components/list-page";
import { downloadCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	defaultSortFn,
	useClientDataTable,
} from "@/components/data-table";
import { useAcademicYearsQuery, useClassesQuery, useSectionsQuery } from "@/modules/academic";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
import { useGuardiansQuery, useLinkStudentGuardianMutation } from "@/modules/guardians";
import {
	useCreateEnrollmentMutation,
	useStudentEnrollmentsQuery,
	useStudentQuery,
	useStudentsQuery,
	useTenantEnrollmentsQuery,
} from "@/modules/students";
import type { Student } from "@/modules/students/types/student.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { formatStudentGender, studentStatusTone } from "../utils/student-ui.utils";
import { AdmitStudentWizard } from "./admit-student-wizard";
import { StudentAvatar } from "./student-avatar";
import { StudentProfilePanel } from "./student-profile-panel";
import { StudentRosterCards } from "./student-roster-cards";

type RosterView = "table" | "cards";

export function StudentsPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canWrite = can(PermissionCodes.STUDENTS_WRITE);
	const canWriteGuardians = can(PermissionCodes.GUARDIANS_WRITE);
	const canRead = can(PermissionCodes.STUDENTS_READ);
	const canReadGuardians = can(PermissionCodes.GUARDIANS_READ);
	const canReadAcademic = can(PermissionCodes.ACADEMIC_READ);
	const canInviteParent = can(PermissionCodes.TENANT_MEMBERSHIP_INVITE);

	const studentsQuery = useStudentsQuery(tenantId, campusId, canRead);
	const guardiansQuery = useGuardiansQuery(tenantId, canReadGuardians);
	const yearsQuery = useAcademicYearsQuery(tenantId, canReadAcademic);
	const sectionsQuery = useSectionsQuery(tenantId, campusId, canReadAcademic);
	const classesQuery = useClassesQuery(tenantId, canReadAcademic);
	const createEnrollment = useCreateEnrollmentMutation(tenantId ?? "");

	const searchParams = useSearchParams();
	const rosterView: RosterView = searchParams.get("view") === "cards" ? "cards" : "table";
	const [sectionFilter, setSectionFilter] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [rosterSearch, setRosterSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const [admitOpen, setAdmitOpen] = useState(false);

	useEffect(() => {
		if (searchParams.get("admit") === "1" && canWrite) {
			setAdmitOpen(true);
		}
	}, [searchParams, canWrite]);

	const [enrollOpen, setEnrollOpen] = useState(false);
	const [enrollStudentId, setEnrollStudentId] = useState("");
	const [enrollSectionId, setEnrollSectionId] = useState("");
	const [enrollYearId, setEnrollYearId] = useState("");

	const [manageOpen, setManageOpen] = useState(false);
	const [manageStudentId, setManageStudentId] = useState("");

	const [linkGuardianId, setLinkGuardianId] = useState("");
	const [linkRelationship, setLinkRelationship] = useState("mother");
	const [linkNewFirstName, setLinkNewFirstName] = useState("");
	const [linkNewLastName, setLinkNewLastName] = useState("");
	const [linkNewPhone, setLinkNewPhone] = useState("");
	const [useNewGuardian, setUseNewGuardian] = useState(false);
	const [linkFormOpen, setLinkFormOpen] = useState(false);

	const activeYearId = useMemo(() => {
		const activeYear = yearsQuery.data?.find((year) => year.status === "active");
		return activeYear?.id ?? yearsQuery.data?.[0]?.id ?? "";
	}, [yearsQuery.data]);

	const activeYearLabel = useMemo(() => {
		const year = yearsQuery.data?.find((item) => item.id === activeYearId);
		return year?.name;
	}, [activeYearId, yearsQuery.data]);

	const tenantEnrollmentsQuery = useTenantEnrollmentsQuery(
		tenantId,
		activeYearId || null,
		Boolean(activeYearId),
	);

	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);
	const sectionLabelById = useMemo(
		() =>
			new Map(
				(sectionsQuery.data ?? []).map((section) => [
					section.id,
					formatSectionLabel(
						section,
						classNameById.get(section.classId),
						campusNameById.get(section.campusId),
					),
				]),
			),
		[campusNameById, classNameById, sectionsQuery.data],
	);

	const sectionLabelByStudentId = useMemo(() => {
		const map = new Map<string, string>();
		for (const enrollment of tenantEnrollmentsQuery.data ?? []) {
			if (enrollment.status !== "active") continue;
			const label = sectionLabelById.get(enrollment.sectionId);
			if (label) map.set(enrollment.studentId, label);
		}
		return map;
	}, [sectionLabelById, tenantEnrollmentsQuery.data]);

	/** Short "Grade 5 · 5-B" labels for the table (the campus is already selected). */
	const classLabelByStudentId = useMemo(() => {
		const sectionById = new Map((sectionsQuery.data ?? []).map((section) => [section.id, section]));
		const map = new Map<string, string>();
		for (const enrollment of tenantEnrollmentsQuery.data ?? []) {
			if (enrollment.status !== "active") continue;
			const section = sectionById.get(enrollment.sectionId);
			if (!section) continue;
			const className = classNameById.get(section.classId);
			const label =
				!className || section.name.startsWith(className)
					? section.name
					: `${className} · ${section.name}`;
			map.set(enrollment.studentId, label);
		}
		return map;
	}, [classNameById, sectionsQuery.data, tenantEnrollmentsQuery.data]);

	const sectionIdByStudentId = useMemo(() => {
		const map = new Map<string, string>();
		for (const enrollment of tenantEnrollmentsQuery.data ?? []) {
			if (enrollment.status === "active") map.set(enrollment.studentId, enrollment.sectionId);
		}
		return map;
	}, [tenantEnrollmentsQuery.data]);

	const sectionFilterItems = useMemo(
		() =>
			(sectionsQuery.data ?? [])
				.filter((section) => section.academicYearId === activeYearId)
				.map((section) => ({
					label: classNameById.get(section.classId)
						? `${classNameById.get(section.classId)} · ${section.name}`
						: section.name,
					value: section.id,
				})),
		[activeYearId, classNameById, sectionsQuery.data],
	);

	const openEnroll = useCallback((studentId: string) => {
		setEnrollStudentId(studentId);
		setEnrollSectionId("");
		setEnrollYearId("");
		setEnrollOpen(true);
	}, []);

	const openManage = useCallback((studentId: string) => {
		setManageStudentId(studentId);
		setLinkGuardianId("");
		setLinkNewFirstName("");
		setLinkNewLastName("");
		setLinkNewPhone("");
		setUseNewGuardian(false);
		setLinkFormOpen(false);
		setManageOpen(true);
	}, []);

	const studentColumns = useMemo(
		(): DataTableColumn<Student>[] => [
			{
				id: "name",
				header: "Student",
				sortable: true,
				sortValue: (row) => row.fullName,
				renderCell: (student) => (
					<span className="flex min-w-[160px] items-center gap-2.5 whitespace-nowrap">
						<StudentAvatar student={student} size="sm" className="size-6 text-[10px]" />
						<span className="font-medium text-dashboard-text-primary">{student.fullName}</span>
					</span>
				),
			},
			{
				id: "code",
				header: "ID",
				sortable: true,
				sortValue: (row) => row.studentCode,
				renderCell: (student) => (
					<span className="whitespace-nowrap font-mono text-[12px] text-dashboard-text-dim">
						{student.studentCode}
					</span>
				),
			},
			{
				id: "section",
				header: "Class",
				sortable: true,
				sortValue: (row) => classLabelByStudentId.get(row.id) ?? "",
				renderCell: (student) => {
					const label = classLabelByStudentId.get(student.id);
					return label ? (
						<span className="inline-flex h-6 items-center whitespace-nowrap rounded-md border border-dashboard-border-strong px-2 text-[12px] text-dashboard-text-secondary">
							{label}
						</span>
					) : (
						<span className="text-dashboard-text-dim">—</span>
					);
				},
			},
			{
				id: "phone",
				header: "Phone",
				sortable: true,
				sortValue: (row) => row.phone ?? "",
				renderCell: (student) => (
					<span className="whitespace-nowrap text-dashboard-text-secondary">
						{student.phone ?? "—"}
					</span>
				),
			},
			{
				id: "dateOfBirth",
				header: "DOB",
				sortable: true,
				sortValue: (row) => row.dateOfBirth ?? "",
				className: "tabular-nums",
				renderCell: (student) => (
					<span className="whitespace-nowrap text-dashboard-text-secondary">
						{student.dateOfBirth ?? "—"}
					</span>
				),
			},
			{
				id: "gender",
				header: "Gender",
				sortable: true,
				sortValue: (row) => row.gender ?? "",
				renderCell: (student) => (
					<span className="text-dashboard-text-secondary capitalize">
						{formatStudentGender(student.gender)}
					</span>
				),
			},
			{
				id: "emergency",
				header: "Emergency",
				sortable: true,
				sortValue: (row) => row.emergencyContactName ?? "",
				renderCell: (student) => (
					<span
						className="block max-w-[220px] truncate whitespace-nowrap text-dashboard-text-secondary"
						title={student.emergencyContactPhone ?? undefined}
					>
						{student.emergencyContactName ?? "—"}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				sortable: true,
				sortValue: (row) => row.status,
				renderCell: (student) => (
					<span className={cn("capitalize", studentStatusTone(student.status))}>
						{student.status}
					</span>
				),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (student) => (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`Actions for ${student.fullName}`}
								/>
							}
						>
							<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => openManage(student.id)}>
								View profile & ID
							</DropdownMenuItem>
							{canWrite ? (
								<DropdownMenuItem onClick={() => openEnroll(student.id)}>
									Enroll in section
								</DropdownMenuItem>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[canWrite, classLabelByStudentId, openEnroll, openManage],
	);

	const rosterTable = useClientDataTable({
		data: studentsQuery.data ?? [],
		pageSize: 50,
		searchQuery: rosterSearch,
		searchFn: (row, queryText) => {
			const haystack = [
				row.fullName,
				row.studentCode,
				row.email,
				row.phone,
				sectionLabelByStudentId.get(row.id),
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		filterFn: (row, filters) => {
			if (filters.status && row.status !== filters.status) return false;
			if (filters.section && sectionIdByStudentId.get(row.id) !== filters.section) return false;
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, studentColumns),
	});

	const manageStudentQuery = useStudentQuery(
		tenantId,
		manageStudentId || null,
		Boolean(manageOpen && manageStudentId),
	);
	const enrollEnrollmentsQuery = useStudentEnrollmentsQuery(
		tenantId,
		enrollStudentId || null,
		Boolean(enrollOpen && enrollStudentId),
	);
	const linkGuardian = useLinkStudentGuardianMutation(tenantId ?? "", manageStudentId);

	const guardianItems = useMemo(
		() =>
			(guardiansQuery.data ?? []).map((guardian) => ({
				label: guardian.fullName,
				value: guardian.id,
			})),
		[guardiansQuery.data],
	);

	const sectionOptions = useMemo(() => {
		const yearId = enrollYearId || activeYearId;
		return (sectionsQuery.data ?? []).filter((section) => section.academicYearId === yearId);
	}, [sectionsQuery.data, enrollYearId, activeYearId]);

	const enrollStudent = useMemo(
		() => (studentsQuery.data ?? []).find((student) => student.id === enrollStudentId),
		[enrollStudentId, studentsQuery.data],
	);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage students.</AlertDescription>
			</Alert>
		);
	}

	if (permissionsLoading) {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (!canRead) {
		return (
			<Alert>
				<AlertDescription>You do not have permission to view student records.</AlertDescription>
			</Alert>
		);
	}

	async function handleCreateEnrollment() {
		setError(null);
		setMessage(null);
		const academicYearId = enrollYearId || activeYearId;
		if (!enrollStudentId || !enrollSectionId || !academicYearId) {
			setError("Select a section and academic year");
			return;
		}
		try {
			await createEnrollment.mutateAsync({
				studentId: enrollStudentId,
				input: { sectionId: enrollSectionId, academicYearId },
			});
			setEnrollOpen(false);
			setEnrollStudentId("");
			await tenantEnrollmentsQuery.refetch();
			setMessage("Student enrolled successfully");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not enroll student");
		}
	}

	async function handleLinkGuardian() {
		if (!manageStudentId || !canWriteGuardians) return;
		setError(null);
		setMessage(null);
		try {
			if (useNewGuardian) {
				await linkGuardian.mutateAsync({
					guardian: {
						firstName: linkNewFirstName,
						lastName: linkNewLastName,
						phone: linkNewPhone || undefined,
					},
					relationship: linkRelationship as
						| "father"
						| "mother"
						| "guardian"
						| "step_parent"
						| "grandparent"
						| "sibling"
						| "other",
				});
			} else {
				if (!linkGuardianId) {
					setError("Select a guardian or add a new one");
					return;
				}
				await linkGuardian.mutateAsync({
					guardianId: linkGuardianId,
					relationship: linkRelationship as
						| "father"
						| "mother"
						| "guardian"
						| "step_parent"
						| "grandparent"
						| "sibling"
						| "other",
				});
			}
			setLinkGuardianId("");
			setLinkNewFirstName("");
			setLinkNewLastName("");
			setLinkNewPhone("");
			setMessage("Guardian linked to student");
			await manageStudentQuery.refetch();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not link guardian");
		}
	}

	const selectedStudents = rosterTable.filteredRows.filter((row) => selectedIds.has(row.id));
	const exportRows = selectedStudents.length > 0 ? selectedStudents : rosterTable.filteredRows;
	const notInSection = rosterTable.filteredRows.filter(
		(row) => !sectionLabelByStudentId.has(row.id),
	).length;

	return (
		<>
			<ListPage
				title="Students"
				tabs={[
					{ label: "Students", href: "/admin/students", active: rosterView === "table" },
					...(canReadGuardians ? [{ label: "Guardians", href: "/admin/guardians" }] : []),
					{ label: "ID cards", href: "/admin/students?view=cards", active: rosterView === "cards" },
				]}
				banner={
					message || error ? (
						<Alert variant={error ? "destructive" : "default"}>
							<AlertDescription>{error ?? message}</AlertDescription>
						</Alert>
					) : null
				}
				toolbar={
					<DataTableToolbar
						className="border-0 px-4 sm:px-6"
						search={rosterSearch}
						onSearchChange={(value) => {
							setRosterSearch(value);
							rosterTable.resetPage();
						}}
						searchPlaceholder="Search students"
						filters={[
							{
								id: "section",
								label: "Class",
								value: sectionFilter,
								placeholder: "All",
								onChange: (value) => {
									setSectionFilter(value);
									rosterTable.setFilter("section", value);
								},
								items: sectionFilterItems,
							},
							{
								id: "status",
								label: "Status",
								value: statusFilter,
								onChange: (value) => {
									setStatusFilter(value);
									rosterTable.setFilter("status", value);
								},
								items: [
									{ label: "Active", value: "active" },
									{ label: "Inactive", value: "inactive" },
									{ label: "Graduated", value: "graduated" },
									{ label: "Withdrawn", value: "withdrawn" },
								],
							},
						]}
						canAdd={canWrite}
						onAdd={() => setAdmitOpen(true)}
						addLabel="New student"
					>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 rounded-full"
							disabled={exportRows.length === 0}
							onClick={() =>
								downloadCsv(
									"students.csv",
									[
										{ header: "Student code", value: (row) => row.studentCode },
										{ header: "Name", value: (row) => row.fullName },
										{ header: "Class", value: (row) => sectionLabelByStudentId.get(row.id) },
										{ header: "Status", value: (row) => row.status },
										{ header: "Phone", value: (row) => row.phone },
										{ header: "Emergency contact", value: (row) => row.emergencyContactName },
										{ header: "Emergency phone", value: (row) => row.emergencyContactPhone },
									],
									exportRows,
								)
							}
						>
							<HugeiconsIcon icon={Download04Icon} data-icon="inline-start" strokeWidth={1.8} />
							{selectedStudents.length > 0 ? `Export ${selectedStudents.length}` : "Export"}
						</Button>
					</DataTableToolbar>
				}
				footer={
					<DataTableFooterBar
						shown={rosterTable.rows.length}
						total={rosterTable.totalRows}
						noun="students"
						stats={[
							{ label: "In a class", value: rosterTable.totalRows - notInSection },
							{
								label: "Not in a class",
								value: notInSection,
								tone: notInSection > 0 ? "warning" : undefined,
							},
							...(selectedIds.size > 0 ? [{ label: "Selected", value: selectedIds.size }] : []),
						]}
						pageIndex={rosterTable.pageIndex}
						pageCount={rosterTable.pageCount}
						pageSize={rosterTable.pageSize}
						onPageChange={rosterTable.setPageIndex}
						onPageSizeChange={(size) => {
							rosterTable.setPageSize(size);
							rosterTable.setPageIndex(0);
						}}
					/>
				}
			>
				{rosterView === "table" ? (
					<DataTable
						fullBleed
						columns={studentColumns}
						rows={rosterTable.rows}
						getRowId={(row) => row.id}
						loading={studentsQuery.isLoading}
						sort={rosterTable.sort}
						onSort={rosterTable.toggleSort}
						selection={{
							selectedIds,
							onChange: setSelectedIds,
							label: (row) => row.fullName,
						}}
						emptyTitle="No students yet"
						emptyDescription={
							campusId
								? "Admit a student to start building your campus roster."
								: "Select a campus to filter the roster."
						}
					/>
				) : (
					<div className="p-4 sm:p-6">
						<StudentRosterCards
							students={rosterTable.rows}
							schoolName={activeTenant?.name ?? "School"}
							tenantId={tenantId}
							sectionLabelByStudentId={sectionLabelByStudentId}
							academicYearLabel={activeYearLabel}
							loading={studentsQuery.isLoading}
						/>
					</div>
				)}
			</ListPage>

			{tenantId ? (
				<AdmitStudentWizard
					open={admitOpen}
					onOpenChange={setAdmitOpen}
					tenantId={tenantId}
					campusId={campusId}
					canWrite={canWrite}
					canInviteParent={canInviteParent}
					onAdmitted={(text) => {
						setError(null);
						setMessage(text);
					}}
					onError={(text) => {
						setMessage(null);
						setError(text);
					}}
				/>
			) : null}

			<FormDrawer
				open={enrollOpen}
				onOpenChange={setEnrollOpen}
				title="Enroll student"
				description={
					enrollStudent
						? `Assign ${enrollStudent.fullName} to a section for the selected year.`
						: "Assign the student to a section."
				}
				onSubmit={() => void handleCreateEnrollment()}
				submitLabel="Enroll student"
				saving={createEnrollment.isPending}
				submitDisabled={!enrollSectionId}
			>
				<FieldGroup className="grid gap-4">
					<Field>
						<FieldLabel>Academic year</FieldLabel>
						<SelectField
							value={enrollYearId || activeYearId}
							onValueChange={setEnrollYearId}
							items={(yearsQuery.data ?? []).map((year) => ({
								label: year.name,
								value: year.id,
							}))}
						/>
					</Field>
					<Field>
						<FieldLabel>Section</FieldLabel>
						<SelectField
							value={enrollSectionId}
							onValueChange={setEnrollSectionId}
							nullable
							placeholder="Select section"
							items={sectionOptions.map((section) => ({
								label: sectionLabelById.get(section.id) ?? section.name,
								value: section.id,
							}))}
						/>
					</Field>
					{enrollEnrollmentsQuery.data?.length ? (
						<div className="rounded-lg border border-border bg-muted/30 p-3">
							<p className="mb-2 font-medium text-sm">Current enrollments</p>
							<ul className="space-y-1 text-muted-foreground text-sm">
								{enrollEnrollmentsQuery.data.map((enrollment) => (
									<li key={enrollment.id}>
										{sectionLabelById.get(enrollment.sectionId) ?? enrollment.sectionId.slice(0, 8)}{" "}
										· {enrollment.status}
									</li>
								))}
							</ul>
						</div>
					) : null}
				</FieldGroup>
			</FormDrawer>

			{manageStudentId ? (
				<StudentProfilePanel
					open={manageOpen}
					onOpenChange={setManageOpen}
					tenantId={tenantId}
					studentId={manageStudentId}
					schoolName={activeTenant?.name ?? "School"}
					academicYearLabel={activeYearLabel}
					sectionLabel={(sectionId) => sectionLabelById.get(sectionId)}
					currentSectionLabel={sectionLabelByStudentId.get(manageStudentId)}
					onEnroll={
						canWrite
							? () => {
									setManageOpen(false);
									openEnroll(manageStudentId);
								}
							: undefined
					}
					guardianActions={
						!canWriteGuardians ? null : !linkFormOpen ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-7 rounded-full"
								onClick={() => setLinkFormOpen(true)}
							>
								Link guardian
							</Button>
						) : (
							<form
								className="rounded-[8px] border border-dashboard-border p-3"
								onSubmit={(event) => {
									event.preventDefault();
									void handleLinkGuardian();
								}}
							>
								<p className="mb-3 font-medium text-dashboard-text-primary">Link guardian</p>
								<FieldGroup className="gap-3">
									<Field>
										<FieldLabel>Source</FieldLabel>
										<SelectField
											value={useNewGuardian ? "new" : "existing"}
											onValueChange={(value) => setUseNewGuardian(value === "new")}
											items={[
												{ label: "Existing guardian", value: "existing" },
												{ label: "New guardian", value: "new" },
											]}
										/>
									</Field>
									{useNewGuardian ? (
										<>
											<Field>
												<FieldLabel>First name</FieldLabel>
												<Input
													value={linkNewFirstName}
													onChange={(event) => setLinkNewFirstName(event.target.value)}
													required
												/>
											</Field>
											<Field>
												<FieldLabel>Last name</FieldLabel>
												<Input
													value={linkNewLastName}
													onChange={(event) => setLinkNewLastName(event.target.value)}
													required
												/>
											</Field>
											<Field>
												<FieldLabel>Phone</FieldLabel>
												<Input
													value={linkNewPhone}
													onChange={(event) => setLinkNewPhone(event.target.value)}
												/>
											</Field>
										</>
									) : (
										<Field>
											<FieldLabel>Guardian</FieldLabel>
											<SelectField
												value={linkGuardianId}
												onValueChange={setLinkGuardianId}
												placeholder="Select guardian"
												items={guardianItems}
											/>
										</Field>
									)}
									<Field>
										<FieldLabel>Relationship</FieldLabel>
										<SelectField
											value={linkRelationship}
											onValueChange={setLinkRelationship}
											items={[
												{ label: "Father", value: "father" },
												{ label: "Mother", value: "mother" },
												{ label: "Guardian", value: "guardian" },
												{ label: "Step parent", value: "step_parent" },
												{ label: "Grandparent", value: "grandparent" },
												{ label: "Other", value: "other" },
											]}
										/>
									</Field>
									<Button type="submit" size="sm" disabled={linkGuardian.isPending}>
										{linkGuardian.isPending ? "Linking…" : "Link guardian"}
									</Button>
								</FieldGroup>
							</form>
						)
					}
				/>
			) : null}
		</>
	);
}
