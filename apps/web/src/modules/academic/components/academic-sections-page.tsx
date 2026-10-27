"use client";

import { Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useCallback, useMemo, useState } from "react";
import { FormDrawer } from "@/components/admin";
import {
	DataTable,
	type DataTableColumn,
	DataTablePagination,
	DataTableShell,
	DataTableToolbar,
	defaultSortFn,
	useClientDataTable,
} from "@/components/data-table";
import {
	useAcademicYearsQuery,
	useClassesQuery,
	useCreateSectionMutation,
	useDeleteSectionMutation,
	useSectionsQuery,
	useUpdateSectionMutation,
} from "@/modules/academic/hooks/use-academic-queries";
import type { Section, SectionStatus } from "@/modules/academic/types/academic.types";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
import { useTeachersQuery } from "@/modules/staff";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { AcademicPageShell } from "./academic-page-shell";

const statusItems = [
	{ label: "Active", value: "active" },
	{ label: "Inactive", value: "inactive" },
];

type SectionFormState = {
	name: string;
	academicYearId: string;
	classId: string;
	status: SectionStatus;
	homeroomTeacherId: string;
};

export function AcademicSectionsPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ACADEMIC_READ);
	const canReadStaff = can(PermissionCodes.STAFF_READ);
	const canWrite = can(PermissionCodes.ACADEMIC_WRITE);

	const yearsQuery = useAcademicYearsQuery(tenantId, canRead);
	const classesQuery = useClassesQuery(tenantId, canRead);
	const sectionsQuery = useSectionsQuery(tenantId, campusId, canRead);
	const teachersQuery = useTeachersQuery(tenantId, canReadStaff);
	const createSection = useCreateSectionMutation(tenantId ?? "");
	const updateSection = useUpdateSectionMutation(tenantId ?? "");
	const deleteSection = useDeleteSectionMutation(tenantId ?? "");

	const yearItems = useMemo(
		() => (yearsQuery.data ?? []).map((year) => ({ label: year.name, value: year.id })),
		[yearsQuery.data],
	);
	const classItems = useMemo(
		() => (classesQuery.data ?? []).map((item) => ({ label: item.name, value: item.id })),
		[classesQuery.data],
	);
	const yearNameById = useMemo(
		() => new Map((yearsQuery.data ?? []).map((year) => [year.id, year.name])),
		[yearsQuery.data],
	);
	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const teacherNameById = useMemo(
		() =>
			new Map((teachersQuery.data ?? []).map((teacher) => [teacher.membershipId, teacher.email])),
		[teachersQuery.data],
	);
	const teacherItems = useMemo(
		() =>
			(teachersQuery.data ?? []).map((teacher) => ({
				label: teacher.email,
				value: teacher.membershipId,
			})),
		[teachersQuery.data],
	);

	const [search, setSearch] = useState("");
	const [yearFilter, setYearFilter] = useState("");
	const [gradeFilter, setGradeFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<SectionFormState>({
		name: "",
		academicYearId: "",
		classId: "",
		status: "active",
		homeroomTeacherId: "",
	});
	const [error, setError] = useState<string | null>(null);

	const openEdit = useCallback((section: Section) => {
		setEditingId(section.id);
		setForm({
			name: section.name,
			academicYearId: section.academicYearId,
			classId: section.classId,
			status: section.status,
			homeroomTeacherId: section.homeroomTeacherMembershipId ?? "",
		});
		setError(null);
		setDrawerOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<Section>[] => [
			{
				id: "section",
				header: "Section",
				sortable: true,
				sortValue: (row) => row.name,
				renderCell: (section) => (
					<span className="font-medium">
						{formatSectionLabel(
							section,
							classNameById.get(section.classId),
							campuses.find((campus) => campus.id === section.campusId)?.name,
						)}
					</span>
				),
			},
			{
				id: "year",
				header: "Year",
				sortable: true,
				sortValue: (row) => yearNameById.get(row.academicYearId) ?? "",
				renderCell: (section) => (
					<span className="text-dashboard-text-secondary">
						{yearNameById.get(section.academicYearId) ?? section.academicYearId}
					</span>
				),
			},
			{
				id: "grade",
				header: "Grade",
				sortable: true,
				sortValue: (row) => classNameById.get(row.classId) ?? "",
				renderCell: (section) => (
					<span className="text-dashboard-text-secondary">
						{classNameById.get(section.classId) ?? "Unknown grade"}
					</span>
				),
			},
			{
				id: "homeroom",
				header: "Homeroom",
				renderCell: (section) => (
					<span className="text-dashboard-text-secondary">
						{section.homeroomTeacherMembershipId
							? (teacherNameById.get(section.homeroomTeacherMembershipId) ?? "Assigned")
							: "—"}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				sortable: true,
				sortValue: (row) => row.status,
				renderCell: (section) => (
					<Badge variant="outline" className="capitalize">
						{section.status}
					</Badge>
				),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (section) =>
					canWrite ? (
						<div className="flex justify-end gap-1">
							<Button
								type="button"
								size="icon-sm"
								variant="outline"
								aria-label={`Edit ${section.name}`}
								onClick={() => openEdit(section)}
							>
								<HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
							</Button>
							<Button
								type="button"
								size="icon-sm"
								variant="outline"
								aria-label={`Delete ${section.name}`}
								onClick={() => void deleteSection.mutateAsync(section.id).catch(() => undefined)}
							>
								<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
							</Button>
						</div>
					) : null,
			},
		],
		[campuses, canWrite, classNameById, deleteSection, teacherNameById, yearNameById, openEdit],
	);

	const table = useClientDataTable({
		data: sectionsQuery.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => {
			const label = formatSectionLabel(
				row,
				classNameById.get(row.classId),
				campuses.find((campus) => campus.id === row.campusId)?.name,
			);
			const haystack = [
				label,
				row.name,
				yearNameById.get(row.academicYearId),
				classNameById.get(row.classId),
				teacherNameById.get(row.homeroomTeacherMembershipId ?? ""),
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		filterFn: (row, filters) => {
			if (filters.year && row.academicYearId !== filters.year) return false;
			if (filters.grade && row.classId !== filters.grade) return false;
			if (filters.status && row.status !== filters.status) return false;
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	function resetEditor() {
		setEditingId(null);
		setForm({
			name: "",
			academicYearId: yearItems[0]?.value ?? "",
			classId: classItems[0]?.value ?? "",
			status: "active",
			homeroomTeacherId: "",
		});
		setError(null);
	}

	function openCreate() {
		resetEditor();
		setDrawerOpen(true);
	}

	async function handleSave() {
		if (!tenantId || !campusId || !canWrite) return;
		setError(null);
		try {
			if (!editingId) {
				if (!form.academicYearId || !form.classId) {
					setError("Select an academic year and grade");
					return;
				}
				await createSection.mutateAsync({
					campusId,
					academicYearId: form.academicYearId,
					classId: form.classId,
					name: form.name,
				});
			} else {
				await updateSection.mutateAsync({
					sectionId: editingId,
					input: {
						name: form.name,
						status: form.status,
						homeroomTeacherMembershipId: form.homeroomTeacherId || null,
					},
				});
			}
			setDrawerOpen(false);
			resetEditor();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save section");
		}
	}

	const saving = createSection.isPending || updateSection.isPending;

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage sections.</AlertDescription>
			</Alert>
		);
	}

	if (!campusId) {
		return (
			<Alert>
				<AlertDescription>Add a campus before creating sections.</AlertDescription>
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
				<AlertDescription>You do not have permission to view academic sections.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AcademicPageShell
			title="Sections"
			description="Sections belong to a campus, academic year, and grade. Switch campus from the sidebar to manage another site."
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search sections…"
						filters={[
							{
								id: "year",
								label: "Year",
								value: yearFilter,
								onChange: (value) => {
									setYearFilter(value);
									table.setFilter("year", value);
								},
								items: yearItems,
							},
							{
								id: "grade",
								label: "Grade",
								value: gradeFilter,
								onChange: (value) => {
									setGradeFilter(value);
									table.setFilter("grade", value);
								},
								items: classItems,
							},
							{
								id: "status",
								label: "Status",
								value: statusFilter,
								onChange: (value) => {
									setStatusFilter(value);
									table.setFilter("status", value);
								},
								items: statusItems,
							},
						]}
						canAdd={canWrite}
						onAdd={openCreate}
						addLabel="Add section"
					/>
				}
				footer={
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
				}
			>
				<DataTable
					borderless
					columns={columns}
					rows={table.rows}
					getRowId={(row) => row.id}
					loading={sectionsQuery.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					emptyTitle="No sections found"
					emptyDescription="Add a section or adjust your filters."
				/>
			</DataTableShell>

			<FormDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				title={editingId ? "Edit section" : "Add section"}
				description={
					editingId
						? "Update section details, status, and homeroom teacher."
						: "Create a section for the active campus, year, and grade."
				}
				onSubmit={() => void handleSave()}
				submitLabel={editingId ? "Save changes" : "Create section"}
				saving={saving}
				error={error}
				submitDisabled={!form.name.trim()}
			>
				<SectionFormFields
					mode={editingId ? "edit" : "create"}
					form={form}
					setForm={setForm}
					yearItems={yearItems}
					classItems={classItems}
					teacherItems={teacherItems}
				/>
			</FormDrawer>
		</AcademicPageShell>
	);
}

function SectionFormFields({
	mode,
	form,
	setForm,
	yearItems,
	classItems,
	teacherItems,
}: {
	mode: "create" | "edit";
	form: SectionFormState;
	setForm: (next: SectionFormState) => void;
	yearItems: { label: string; value: string }[];
	classItems: { label: string; value: string }[];
	teacherItems: { label: string; value: string }[];
}) {
	return (
		<FieldGroup className="grid gap-4">
			<Field>
				<FieldLabel>Section name</FieldLabel>
				<Input
					value={form.name}
					onChange={(event) => setForm({ ...form, name: event.target.value })}
					placeholder="5-A"
					required
				/>
			</Field>
			{mode === "create" ? (
				<>
					<Field>
						<FieldLabel>Academic year</FieldLabel>
						<SelectField
							value={form.academicYearId}
							onValueChange={(value) => setForm({ ...form, academicYearId: value })}
							items={yearItems}
							placeholder="Select year"
						/>
					</Field>
					<Field>
						<FieldLabel>Grade</FieldLabel>
						<SelectField
							value={form.classId}
							onValueChange={(value) => setForm({ ...form, classId: value })}
							items={classItems}
							placeholder="Select grade"
						/>
					</Field>
				</>
			) : (
				<>
					<Field>
						<FieldLabel>Status</FieldLabel>
						<SelectField
							value={form.status}
							onValueChange={(value) => setForm({ ...form, status: value as SectionStatus })}
							items={statusItems}
						/>
					</Field>
					<Field>
						<FieldLabel>Homeroom teacher</FieldLabel>
						<SelectField
							value={form.homeroomTeacherId}
							onValueChange={(value) => setForm({ ...form, homeroomTeacherId: value })}
							items={teacherItems}
							nullable
							placeholder="No homeroom teacher"
						/>
					</Field>
				</>
			)}
		</FieldGroup>
	);
}
