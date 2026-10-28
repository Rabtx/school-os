"use client";

import { Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { useCallback, useMemo, useState } from "react";
import { FormDrawer } from "@/components/admin";
import { useConfirmedAction } from "@/components/states";
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
	useCreateAcademicYearMutation,
	useDeleteAcademicYearMutation,
	useUpdateAcademicYearMutation,
} from "@/modules/academic/hooks/use-academic-queries";
import type { AcademicYear, AcademicYearStatus } from "@/modules/academic/types/academic.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { AcademicPageShell } from "./academic-page-shell";

const statusItems = [
	{ label: "Draft", value: "draft" },
	{ label: "Active", value: "active" },
	{ label: "Archived", value: "archived" },
];

type YearFormState = {
	name: string;
	startsOn: string;
	endsOn: string;
	status: AcademicYearStatus;
};

const emptyForm: YearFormState = { name: "", startsOn: "", endsOn: "", status: "draft" };

export function AcademicYearsPage() {
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.ACADEMIC_READ);
	const canWrite = can(PermissionCodes.ACADEMIC_WRITE);

	const yearsQuery = useAcademicYearsQuery(tenantId, canRead);
	const createYear = useCreateAcademicYearMutation(tenantId ?? "");
	const updateYear = useUpdateAcademicYearMutation(tenantId ?? "");
	const deleteYear = useDeleteAcademicYearMutation(tenantId ?? "");
	const confirmedAction = useConfirmedAction();

	const [search, setSearch] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<YearFormState>(emptyForm);
	const [error, setError] = useState<string | null>(null);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(emptyForm);
		setError(null);
		setDrawerOpen(true);
	}, []);

	const openEdit = useCallback((year: AcademicYear) => {
		setEditingId(year.id);
		setForm({
			name: year.name,
			startsOn: year.startsOn,
			endsOn: year.endsOn,
			status: year.status,
		});
		setError(null);
		setDrawerOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<AcademicYear>[] => [
			{
				id: "name",
				header: "Name",
				sortable: true,
				sortValue: (row) => row.name,
				renderCell: (year) => <span className="font-medium">{year.name}</span>,
			},
			{
				id: "dates",
				header: "Dates",
				sortable: true,
				sortValue: (row) => row.startsOn,
				className: "tabular-nums",
				renderCell: (year) => (
					<span className="text-muted-foreground">
						{year.startsOn} → {year.endsOn}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				sortable: true,
				sortValue: (row) => row.status,
				renderCell: (year) => <Badge variant="outline">{year.status}</Badge>,
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (year) =>
					canWrite ? (
						<div className="flex justify-end gap-1">
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								aria-label={`Edit ${year.name}`}
								onClick={() => openEdit(year)}
							>
								<HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
							</Button>
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								aria-label={`Delete ${year.name}`}
								onClick={() =>
									void confirmedAction({
										title: `Delete ${year.name}?`,
										consequences: [
											{ label: "Classes", value: "A year with classes cannot be deleted" },
											{ label: "Records", value: "Kept; the year is hidden, not erased" },
										],
										confirmLabel: "Delete year",
										action: () => deleteYear.mutateAsync(year.id),
										success: `${year.name} deleted`,
										failure: `Could not delete ${year.name}`,
									})
								}
							>
								<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
							</Button>
						</div>
					) : null,
			},
		],
		[canWrite, confirmedAction, deleteYear, openEdit],
	);

	const table = useClientDataTable({
		data: yearsQuery.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => row.name.toLowerCase().includes(queryText),
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	async function handleSave() {
		if (!tenantId || !canWrite) return;
		setError(null);
		try {
			if (editingId) {
				await updateYear.mutateAsync({
					academicYearId: editingId,
					input: form,
				});
			} else {
				await createYear.mutateAsync(form);
			}
			setDrawerOpen(false);
			setEditingId(null);
			setForm(emptyForm);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save academic year");
		}
	}

	const saving = createYear.isPending || updateYear.isPending;

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage academic years.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AcademicPageShell
			title="Academic years"
			description="Create and maintain school years. Only one year can be active at a time."
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search academic years…"
						canAdd={canWrite}
						onAdd={openCreate}
						addLabel="Add year"
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
					loading={yearsQuery.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					emptyTitle="No academic years yet"
					emptyDescription="Add a school year to organize terms, sections, and enrollments."
				/>
			</DataTableShell>

			<FormDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				title={editingId ? "Edit academic year" : "Add academic year"}
				description="Only one year can be active at a time."
				onSubmit={() => void handleSave()}
				submitLabel={editingId ? "Save changes" : "Create year"}
				saving={saving}
				error={error}
				submitDisabled={!form.name.trim() || !form.startsOn || !form.endsOn}
			>
				<FieldGroup className="grid gap-4">
					<Field>
						<FieldLabel>Name</FieldLabel>
						<Input
							value={form.name}
							onChange={(event) => setForm({ ...form, name: event.target.value })}
							placeholder="2025–2026"
							required
						/>
					</Field>
					<Field>
						<FieldLabel>Status</FieldLabel>
						<SelectField
							value={form.status}
							onValueChange={(value) => setForm({ ...form, status: value as AcademicYearStatus })}
							items={statusItems}
						/>
					</Field>
					<Field>
						<FieldLabel>Starts on</FieldLabel>
						<Input
							type="date"
							value={form.startsOn}
							onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
							required
						/>
					</Field>
					<Field>
						<FieldLabel>Ends on</FieldLabel>
						<Input
							type="date"
							value={form.endsOn}
							onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
							required
						/>
					</Field>
				</FieldGroup>
			</FormDrawer>
		</AcademicPageShell>
	);
}
