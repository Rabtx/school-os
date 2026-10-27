"use client";

import {
	CreditCardIcon,
	MoreHorizontalIcon,
	StudentIcon,
	TableIcon,
	UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
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
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageShell, FormDrawer } from "@/components/admin";
import { cn } from "@/lib/utils";
import {
	DataTable,
	type DataTableColumn,
	DataTablePagination,
	DataTableShell,
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
import { StudentIdCard } from "./student-id-card";
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

	const [rosterView, setRosterView] = useState<RosterView>("table");
	const [rosterSearch, setRosterSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const [admitOpen, setAdmitOpen] = useState(false);
	const searchParams = useSearchParams();

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
		setManageOpen(true);
	}, []);

	const studentColumns = useMemo(
		(): DataTableColumn<Student>[] => [
			{
				id: "avatar",
				header: "",
				className: "w-[52px]",
				renderCell: (student) => <StudentAvatar student={student} size="sm" />,
			},
			{
				id: "name",
				header: "Student",
				sortable: true,
				sortValue: (row) => row.fullName,
				renderCell: (student) => (
					<div className="min-w-[140px]">
						<p className="font-medium text-dashboard-text-primary">{student.fullName}</p>
						<p className="font-mono text-[12px] text-dashboard-text-dim">{student.studentCode}</p>
					</div>
				),
			},
			{
				id: "section",
				header: "Section",
				sortable: true,
				sortValue: (row) => sectionLabelByStudentId.get(row.id) ?? "",
				renderCell: (student) => (
					<span className="text-dashboard-text-secondary">
						{sectionLabelByStudentId.get(student.id) ?? "—"}
					</span>
				),
			},
			{
				id: "phone",
				header: "Phone",
				sortable: true,
				sortValue: (row) => row.phone ?? "",
				renderCell: (student) => (
					<span className="text-dashboard-text-secondary">{student.phone ?? "—"}</span>
				),
			},
			{
				id: "dateOfBirth",
				header: "DOB",
				sortable: true,
				sortValue: (row) => row.dateOfBirth ?? "",
				className: "tabular-nums",
				renderCell: (student) => (
					<span className="text-dashboard-text-secondary">{student.dateOfBirth ?? "—"}</span>
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
					<div className="min-w-[120px] text-dashboard-text-secondary">
						<p>{student.emergencyContactName ?? "—"}</p>
						{student.emergencyContactPhone ? (
							<p className="text-[12px] text-dashboard-text-dim">{student.emergencyContactPhone}</p>
						) : null}
					</div>
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
		[canWrite, openEnroll, openManage, sectionLabelByStudentId],
	);

	const rosterTable = useClientDataTable({
		data: studentsQuery.data ?? [],
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
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, studentColumns),
	});

	const manageStudentQuery = useStudentQuery(
		tenantId,
		manageStudentId || null,
		Boolean(manageOpen && manageStudentId),
	);
	const manageEnrollmentsQuery = useStudentEnrollmentsQuery(
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

	return (
		<AdminPageShell
			title="Students"
			description="Admit students, browse the roster in table or ID-card view, and enroll them into sections."
			icon={StudentIcon}
			maxWidth="7xl"
		>
			{message ? (
				<Alert className="mb-4">
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			) : null}
			{error ? (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={rosterSearch}
						onSearchChange={(value) => {
							setRosterSearch(value);
							rosterTable.resetPage();
						}}
						searchPlaceholder="Search students…"
						filters={[
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
						addLabel="Admit student"
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
					<DataTablePagination
						pageIndex={rosterTable.pageIndex}
						pageCount={rosterTable.pageCount}
						pageSize={rosterTable.pageSize}
						totalRows={rosterTable.totalRows}
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
						borderless
						columns={studentColumns}
						rows={rosterTable.rows}
						getRowId={(row) => row.id}
						loading={studentsQuery.isLoading}
						sort={rosterTable.sort}
						onSort={rosterTable.toggleSort}
						emptyTitle="No students yet"
						emptyDescription={
							campusId
								? "Admit a student to start building your campus roster."
								: "Select a campus to filter the roster."
						}
					/>
				) : (
					<StudentRosterCards
						students={rosterTable.rows}
						schoolName={activeTenant?.name ?? "School"}
						tenantId={tenantId}
						sectionLabelByStudentId={sectionLabelByStudentId}
						academicYearLabel={activeYearLabel}
						loading={studentsQuery.isLoading}
					/>
				)}
			</DataTableShell>

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

			<Drawer open={manageOpen} onOpenChange={setManageOpen} direction="right">
				<DrawerContent className="h-full max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg">
					<DrawerHeader className="border-border border-b text-start">
						<DrawerTitle>Student profile</DrawerTitle>
						<DrawerDescription>
							ID card, admission details, guardians, and enrollments.
						</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
						{manageStudentQuery.isLoading || !manageStudentQuery.data ? (
							<div className="flex justify-center py-10">
								<Spinner className="size-6" />
							</div>
						) : (
							<div className="space-y-6">
								<StudentIdCard
									student={manageStudentQuery.data.student}
									schoolName={activeTenant?.name ?? "School"}
									tenantId={tenantId}
									sectionLabel={sectionLabelByStudentId.get(manageStudentQuery.data.student.id)}
									academicYearLabel={activeYearLabel}
									className="mx-auto"
								/>

								<dl className="grid gap-3 sm:grid-cols-2 text-sm">
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Email</dt>
										<dd>{manageStudentQuery.data.student.email ?? "—"}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Phone</dt>
										<dd>{manageStudentQuery.data.student.phone ?? "—"}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Address</dt>
										<dd>
											{[
												manageStudentQuery.data.student.addressLine1,
												manageStudentQuery.data.student.city,
											]
												.filter(Boolean)
												.join(", ") || "—"}
										</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Previous school</dt>
										<dd>{manageStudentQuery.data.student.previousSchool ?? "—"}</dd>
									</div>
								</dl>

								<div>
									<p className="mb-2 font-medium text-sm">Enrollments</p>
									{manageEnrollmentsQuery.data?.length ? (
										<ul className="space-y-1 text-muted-foreground text-sm">
											{manageEnrollmentsQuery.data.map((enrollment) => (
												<li key={enrollment.id}>
													{sectionLabelById.get(enrollment.sectionId) ?? enrollment.sectionId} ·{" "}
													{enrollment.status}
												</li>
											))}
										</ul>
									) : (
										<p className="text-muted-foreground text-sm">
											Not enrolled in any section yet.
										</p>
									)}
									{canWrite ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="mt-3"
											onClick={() => {
												setManageOpen(false);
												openEnroll(manageStudentId);
											}}
										>
											<HugeiconsIcon
												icon={UserAdd01Icon}
												data-icon="inline-start"
												strokeWidth={2}
											/>
											Enroll in section
										</Button>
									) : null}
								</div>

								<div>
									<p className="mb-2 font-medium text-sm">Guardians</p>
									{manageStudentQuery.data.guardians.length === 0 ? (
										<p className="text-muted-foreground text-sm">No guardians linked yet.</p>
									) : (
										<ul className="space-y-2">
											{manageStudentQuery.data.guardians.map((link) => (
												<li
													key={link.id}
													className="rounded-lg border border-border px-3 py-2 text-sm"
												>
													<p className="font-medium">{link.guardian.fullName}</p>
													<p className="text-muted-foreground text-xs">
														{link.relationship}
														{link.isPrimary ? " · Primary" : ""}
														{link.guardian.phone ? ` · ${link.guardian.phone}` : ""}
													</p>
												</li>
											))}
										</ul>
									)}
								</div>

								{canWriteGuardians ? (
									<form
										className="rounded-lg border border-border p-3"
										onSubmit={(event) => {
											event.preventDefault();
											void handleLinkGuardian();
										}}
									>
										<p className="mb-3 font-medium text-sm">Link guardian</p>
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
								) : null}
							</div>
						)}
					</div>
					<DrawerFooter className="border-border border-t">
						<DrawerClose asChild>
							<Button type="button" variant="outline">
								Close
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</AdminPageShell>
	);
}
