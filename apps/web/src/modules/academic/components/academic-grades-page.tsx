"use client";

import { Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
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
	useClassesQuery,
	useCreateClassMutation,
	useDeleteClassMutation,
	useUpdateClassMutation,
} from "@/modules/academic/hooks/use-academic-queries";
import type { SchoolClass } from "@/modules/academic/types/academic.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { AcademicPageShell } from "./academic-page-shell";

type GradeFormState = { name: string; sortOrder: string };

const emptyForm: GradeFormState = { name: "", sortOrder: "0" };

export function AcademicGradesPage() {
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.ACADEMIC_READ);
	const canWrite = can(PermissionCodes.ACADEMIC_WRITE);

	const classesQuery = useClassesQuery(tenantId, canRead);
	const createClass = useCreateClassMutation(tenantId ?? "");
	const updateClass = useUpdateClassMutation(tenantId ?? "");
	const deleteClass = useDeleteClassMutation(tenantId ?? "");
	const confirmedAction = useConfirmedAction();

	const [search, setSearch] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<GradeFormState>(emptyForm);
	const [error, setError] = useState<string | null>(null);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(emptyForm);
		setError(null);
		setDrawerOpen(true);
	}, []);

	const openEdit = useCallback((item: SchoolClass) => {
		setEditingId(item.id);
		setForm({ name: item.name, sortOrder: String(item.sortOrder) });
		setError(null);
		setDrawerOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<SchoolClass>[] => [
			{
				id: "name",
				header: "Name",
				sortable: true,
				sortValue: (row) => row.name,
				renderCell: (item) => <span className="font-medium">{item.name}</span>,
			},
			{
				id: "sortOrder",
				header: "Sort",
				sortable: true,
				sortValue: (row) => row.sortOrder,
				className: "tabular-nums",
				renderCell: (item) => (
					<span className="text-dashboard-text-secondary">{item.sortOrder}</span>
				),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (item) =>
					canWrite ? (
						<div className="flex justify-end gap-1">
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								aria-label={`Edit ${item.name}`}
								onClick={() => openEdit(item)}
							>
								<HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
							</Button>
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								aria-label={`Delete ${item.name}`}
								onClick={() =>
									void confirmedAction({
										title: `Delete ${item.name}?`,
										consequences: [
											{ label: "Sections", value: "A class with sections cannot be deleted" },
											{ label: "Records", value: "Kept; the class is hidden, not erased" },
										],
										confirmLabel: "Delete class",
										action: () => deleteClass.mutateAsync(item.id),
										success: `${item.name} deleted`,
										failure: `Could not delete ${item.name}`,
									})
								}
							>
								<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
							</Button>
						</div>
					) : null,
			},
		],
		[canWrite, confirmedAction, deleteClass, openEdit],
	);

	const table = useClientDataTable({
		data: classesQuery.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => row.name.toLowerCase().includes(queryText),
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	async function handleSave() {
		if (!tenantId || !canWrite) return;
		setError(null);
		const order = Number.parseInt(form.sortOrder, 10);
		try {
			if (editingId) {
				await updateClass.mutateAsync({
					classId: editingId,
					input: { name: form.name, sortOrder: Number.isNaN(order) ? 0 : order },
				});
			} else {
				await createClass.mutateAsync({
					name: form.name,
					sortOrder: Number.isNaN(order) ? 0 : order,
				});
			}
			setDrawerOpen(false);
			setEditingId(null);
			setForm(emptyForm);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save grade");
		}
	}

	const saving = createClass.isPending || updateClass.isPending;

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage grades.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AcademicPageShell
			title="Grades"
			description="Grade levels (classes) are reused when you create sections and enroll students."
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search grades…"
						canAdd={canWrite}
						onAdd={openCreate}
						addLabel="Add grade"
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
					loading={classesQuery.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					emptyTitle="No grades yet"
					emptyDescription="Add grade levels to organize sections and enrollments."
				/>
			</DataTableShell>

			<FormDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				title={editingId ? "Edit grade" : "Add grade"}
				description="Grade levels sort sections and student enrollments."
				onSubmit={() => void handleSave()}
				submitLabel={editingId ? "Save changes" : "Create grade"}
				saving={saving}
				error={error}
				submitDisabled={!form.name.trim()}
			>
				<FieldGroup className="grid gap-4">
					<Field>
						<FieldLabel>Name</FieldLabel>
						<Input
							value={form.name}
							onChange={(event) => setForm({ ...form, name: event.target.value })}
							placeholder="Grade 5"
							required
						/>
					</Field>
					<Field>
						<FieldLabel>Sort order</FieldLabel>
						<Input
							type="number"
							min={0}
							value={form.sortOrder}
							onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
						/>
					</Field>
				</FieldGroup>
			</FormDrawer>
		</AcademicPageShell>
	);
}
