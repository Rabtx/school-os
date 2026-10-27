"use client";

import { Edit02Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { useCallback, useMemo, useState } from "react";
import { AdminPageShell, FormDrawer } from "@/components/admin";
import {
	DataTable,
	type DataTableColumn,
	DataTablePagination,
	DataTableShell,
	DataTableToolbar,
	defaultSortFn,
	useClientDataTable,
} from "@/components/data-table";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import {
	useCreateGuardianMutation,
	useGuardiansQuery,
	useUpdateGuardianMutation,
} from "../hooks/use-guardian-queries";
import type { Guardian } from "../types/guardian.types";

const channelItems = [
	{ label: "Email", value: "email" },
	{ label: "Phone", value: "phone" },
	{ label: "WhatsApp", value: "whatsapp" },
	{ label: "SMS", value: "sms" },
];

type GuardianFormState = {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	occupation: string;
	preferredChannel: Guardian["preferredChannel"];
};

const emptyForm: GuardianFormState = {
	firstName: "",
	lastName: "",
	email: "",
	phone: "",
	occupation: "",
	preferredChannel: "email",
};

function GuardianFormFields({
	value,
	onChange,
}: {
	value: GuardianFormState;
	onChange: (next: GuardianFormState) => void;
}) {
	return (
		<FieldGroup className="grid gap-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel>First name</FieldLabel>
					<Input
						value={value.firstName}
						onChange={(event) => onChange({ ...value, firstName: event.target.value })}
						required
					/>
				</Field>
				<Field>
					<FieldLabel>Last name</FieldLabel>
					<Input
						value={value.lastName}
						onChange={(event) => onChange({ ...value, lastName: event.target.value })}
						required
					/>
				</Field>
			</div>
			<Field>
				<FieldLabel>Email</FieldLabel>
				<Input
					type="email"
					value={value.email}
					onChange={(event) => onChange({ ...value, email: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel>Phone</FieldLabel>
				<Input
					value={value.phone}
					onChange={(event) => onChange({ ...value, phone: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel>Occupation</FieldLabel>
				<Input
					value={value.occupation}
					onChange={(event) => onChange({ ...value, occupation: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel>Preferred contact</FieldLabel>
				<SelectField
					value={value.preferredChannel}
					onValueChange={(channel) =>
						onChange({ ...value, preferredChannel: channel as Guardian["preferredChannel"] })
					}
					items={channelItems}
				/>
			</Field>
		</FieldGroup>
	);
}

export function GuardiansPage() {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.GUARDIANS_READ);
	const canWrite = can(PermissionCodes.GUARDIANS_WRITE);

	const query = useGuardiansQuery(tenantId, canRead);
	const createGuardian = useCreateGuardianMutation(tenantId ?? "");
	const updateGuardian = useUpdateGuardianMutation(tenantId ?? "");

	const [search, setSearch] = useState("");
	const [portalFilter, setPortalFilter] = useState("");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<GuardianFormState>(emptyForm);
	const [error, setError] = useState<string | null>(null);

	const openCreate = useCallback(() => {
		setEditingId(null);
		setForm(emptyForm);
		setError(null);
		setDrawerOpen(true);
	}, []);

	const openEdit = useCallback((guardian: Guardian) => {
		setEditingId(guardian.id);
		setForm({
			firstName: guardian.firstName,
			lastName: guardian.lastName,
			email: guardian.email ?? "",
			phone: guardian.phone ?? "",
			occupation: guardian.occupation ?? "",
			preferredChannel: guardian.preferredChannel,
		});
		setError(null);
		setDrawerOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<Guardian>[] => [
			{
				id: "name",
				header: "Name",
				sortable: true,
				sortValue: (row) => row.fullName,
				renderCell: (guardian) => <span className="font-medium">{guardian.fullName}</span>,
			},
			{
				id: "phone",
				header: "Phone",
				sortable: true,
				sortValue: (row) => row.phone ?? "",
				renderCell: (guardian) => (
					<span className="text-dashboard-text-secondary">{guardian.phone ?? "—"}</span>
				),
			},
			{
				id: "email",
				header: "Email",
				sortable: true,
				sortValue: (row) => row.email ?? "",
				renderCell: (guardian) => (
					<span className="text-dashboard-text-secondary">{guardian.email ?? "—"}</span>
				),
			},
			{
				id: "portal",
				header: "Portal",
				renderCell: (guardian) =>
					guardian.membershipId ? (
						<Badge variant="outline">Linked account</Badge>
					) : (
						<span className="text-dashboard-text-muted">Contact only</span>
					),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (guardian) =>
					canWrite ? (
						<Button
							type="button"
							size="icon-sm"
							variant="ghost"
							aria-label={`Edit ${guardian.fullName}`}
							onClick={() => openEdit(guardian)}
						>
							<HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
						</Button>
					) : null,
			},
		],
		[canWrite, openEdit],
	);

	const table = useClientDataTable({
		data: query.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => {
			const haystack = [row.fullName, row.email, row.phone, row.occupation]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		filterFn: (row, filters) => {
			if (filters.portal === "linked") return Boolean(row.membershipId);
			if (filters.portal === "contact") return !row.membershipId;
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	async function handleSave() {
		if (!tenantId || !canWrite) return;
		setError(null);
		try {
			if (editingId) {
				await updateGuardian.mutateAsync({
					guardianId: editingId,
					input: {
						firstName: form.firstName,
						lastName: form.lastName,
						email: form.email || undefined,
						phone: form.phone || undefined,
						occupation: form.occupation || undefined,
						preferredChannel: form.preferredChannel,
					},
				});
			} else {
				await createGuardian.mutateAsync({
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email || undefined,
					phone: form.phone || undefined,
					occupation: form.occupation || undefined,
					preferredChannel: form.preferredChannel,
				});
			}
			setDrawerOpen(false);
			setEditingId(null);
			setForm(emptyForm);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save guardian");
		}
	}

	const saving = createGuardian.isPending || updateGuardian.isPending;

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage guardians.</AlertDescription>
			</Alert>
		);
	}

	if (!canRead && !permissionsLoading) {
		return (
			<Alert>
				<AlertDescription>You do not have permission to view guardians.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AdminPageShell
			title="Guardians"
			description="Parent and guardian contacts linked to students."
			icon={UserMultiple02Icon}
			loading={permissionsLoading}
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search guardians…"
						filters={[
							{
								id: "portal",
								label: "Portal",
								value: portalFilter,
								onChange: (value) => {
									setPortalFilter(value);
									table.setFilter("portal", value);
								},
								items: [
									{ label: "Linked account", value: "linked" },
									{ label: "Contact only", value: "contact" },
								],
							},
						]}
						canAdd={canWrite}
						onAdd={openCreate}
						addLabel="Add guardian"
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
					loading={query.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					emptyTitle="No guardians found"
					emptyDescription="Add a guardian or adjust your filters."
				/>
			</DataTableShell>

			<FormDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				title={editingId ? "Edit guardian" : "Add guardian"}
				description={
					editingId
						? "Update contact details for this guardian."
						: "Create a guardian contact record for student linking."
				}
				onSubmit={() => void handleSave()}
				submitLabel={editingId ? "Save changes" : "Create guardian"}
				saving={saving}
				error={error}
				submitDisabled={!form.firstName.trim() || !form.lastName.trim()}
			>
				<GuardianFormFields value={form} onChange={setForm} />
			</FormDrawer>
		</AdminPageShell>
	);
}
