"use client";

import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { useMemo, useState } from "react";
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
import { AcademicPageShell } from "@/modules/academic/components/academic-page-shell";
import {
	useCreateSubjectMutation,
	useSubjectsQuery,
} from "@/modules/staff/hooks/use-staff-queries";
import type { Subject } from "@/modules/staff/types/staff.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";

type SubjectFormState = {
	code: string;
	name: string;
	description: string;
};

const emptyForm: SubjectFormState = { code: "", name: "", description: "" };

export function SubjectsPage() {
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.STAFF_READ);
	const canWrite = can(PermissionCodes.STAFF_WRITE);

	const subjectsQuery = useSubjectsQuery(tenantId, canRead);
	const createSubject = useCreateSubjectMutation(tenantId ?? "");

	const [search, setSearch] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [form, setForm] = useState<SubjectFormState>(emptyForm);
	const [error, setError] = useState<string | null>(null);

	const columns = useMemo(
		(): DataTableColumn<Subject>[] => [
			{
				id: "code",
				header: "Code",
				sortable: true,
				sortValue: (row) => row.code,
				renderCell: (subject) => <span className="font-medium">{subject.code}</span>,
			},
			{
				id: "name",
				header: "Name",
				sortable: true,
				sortValue: (row) => row.name,
				renderCell: (subject) => subject.name,
			},
			{
				id: "description",
				header: "Description",
				sortable: true,
				sortValue: (row) => row.description ?? "",
				renderCell: (subject) => (
					<span className="text-dashboard-text-secondary">{subject.description ?? "—"}</span>
				),
			},
		],
		[],
	);

	const table = useClientDataTable({
		data: subjectsQuery.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => {
			const haystack = [row.code, row.name, row.description]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	function openCreate() {
		setForm(emptyForm);
		setError(null);
		setDrawerOpen(true);
	}

	async function handleCreate() {
		if (!tenantId || !canWrite) return;
		setError(null);
		try {
			await createSubject.mutateAsync({
				code: form.code,
				name: form.name,
				description: form.description || undefined,
			});
			setDrawerOpen(false);
			setForm(emptyForm);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not create subject");
		}
	}

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage subjects.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AcademicPageShell
			title="Subjects"
			description="Subject catalog used when assigning teachers to sections."
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search subjects…"
						canAdd={canWrite}
						onAdd={openCreate}
						addLabel="Add subject"
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
					loading={subjectsQuery.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					emptyTitle="No subjects yet"
					emptyDescription="Add your first subject using the button above."
				/>
			</DataTableShell>

			<FormDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				title="Add subject"
				description="Subjects can be assigned to teachers and sections."
				onSubmit={() => void handleCreate()}
				submitLabel="Create subject"
				saving={createSubject.isPending}
				error={error}
				submitDisabled={!form.code.trim() || !form.name.trim()}
			>
				<FieldGroup className="grid gap-4">
					<Field>
						<FieldLabel>Code</FieldLabel>
						<Input
							value={form.code}
							onChange={(event) => setForm({ ...form, code: event.target.value })}
							placeholder="MATH"
							required
						/>
					</Field>
					<Field>
						<FieldLabel>Name</FieldLabel>
						<Input
							value={form.name}
							onChange={(event) => setForm({ ...form, name: event.target.value })}
							placeholder="Mathematics"
							required
						/>
					</Field>
					<Field>
						<FieldLabel>Description</FieldLabel>
						<Input
							value={form.description}
							onChange={(event) => setForm({ ...form, description: event.target.value })}
							placeholder="Optional"
						/>
					</Field>
				</FieldGroup>
			</FormDrawer>
		</AcademicPageShell>
	);
}
