"use client";

import { Download04Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { useCallback, useMemo, useState } from "react";
import { FormDrawer } from "@/components/admin";
import { ListPage } from "@/components/list-page";
import { downloadCsv } from "@/lib/export-csv";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
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

const channelLabels: Record<Guardian["preferredChannel"], string> = {
	email: "Email",
	phone: "Phone",
	whatsapp: "WhatsApp",
	sms: "SMS",
};

export function GuardiansPage() {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const canReadStudents = can(PermissionCodes.STUDENTS_READ);
	const [channelFilter, setChannelFilter] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
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
				renderCell: (guardian) => (
					<span className="flex items-center gap-2.5">
						<InitialsAvatar name={guardian.fullName} />
						<span className="font-medium">{guardian.fullName}</span>
					</span>
				),
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
				id: "channel",
				header: "Channel",
				sortable: true,
				sortValue: (row) => row.preferredChannel,
				renderCell: (guardian) => (
					<span className="text-dashboard-text-secondary">
						{channelLabels[guardian.preferredChannel]}
					</span>
				),
			},
			{
				id: "portal",
				header: "Portal",
				renderCell: (guardian) =>
					guardian.membershipId ? (
						<span className="text-[var(--rx-success)]">Linked account</span>
					) : (
						<span className="text-dashboard-text-dim">Contact only</span>
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
		pageSize: 50,
		filterFn: (row, filters) => {
			if (filters.portal === "linked" && !row.membershipId) return false;
			if (filters.portal === "contact" && row.membershipId) return false;
			if (filters.channel && row.preferredChannel !== filters.channel) return false;
			return true;
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
	});

	const selected = table.filteredRows.filter((row) => selectedIds.has(row.id));
	const exportRows = selected.length > 0 ? selected : table.filteredRows;
	const linkedCount = table.filteredRows.filter((row) => row.membershipId).length;
	const whatsappCount = table.filteredRows.filter(
		(row) => row.preferredChannel === "whatsapp",
	).length;

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
		<>
			<ListPage
				title="Guardians"
				tabs={[
					...(canReadStudents ? [{ label: "Students", href: "/admin/students" }] : []),
					{ label: "Guardians", href: "/admin/guardians", active: true },
				]}
				toolbar={
					<DataTableToolbar
						className="border-0 px-4 sm:px-6"
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search guardians"
						filters={[
							{
								id: "channel",
								label: "Channel",
								value: channelFilter,
								placeholder: "Any",
								onChange: (value) => {
									setChannelFilter(value);
									table.setFilter("channel", value);
								},
								items: Object.entries(channelLabels).map(([value, label]) => ({ label, value })),
							},
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
					>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 rounded-full"
							disabled={exportRows.length === 0}
							onClick={() =>
								downloadCsv(
									"guardians.csv",
									[
										{ header: "Name", value: (row) => row.fullName },
										{ header: "Phone", value: (row) => row.phone },
										{ header: "Email", value: (row) => row.email },
										{ header: "Channel", value: (row) => channelLabels[row.preferredChannel] },
										{
											header: "Portal",
											value: (row) => (row.membershipId ? "Linked account" : "Contact only"),
										},
									],
									exportRows,
								)
							}
						>
							<HugeiconsIcon icon={Download04Icon} data-icon="inline-start" strokeWidth={1.8} />
							{selected.length > 0 ? `Export ${selected.length}` : "Export"}
						</Button>
					</DataTableToolbar>
				}
				footer={
					<DataTableFooterBar
						shown={table.rows.length}
						total={table.totalRows}
						noun="guardians"
						stats={[
							{ label: "Linked accounts", value: linkedCount },
							{ label: "Prefer WhatsApp", value: whatsappCount },
							...(selectedIds.size > 0 ? [{ label: "Selected", value: selectedIds.size }] : []),
						]}
						pageIndex={table.pageIndex}
						pageCount={table.pageCount}
						pageSize={table.pageSize}
						onPageChange={table.setPageIndex}
						onPageSizeChange={(size) => {
							table.setPageSize(size);
							table.setPageIndex(0);
						}}
					/>
				}
			>
				<DataTable
					fullBleed
					columns={columns}
					rows={table.rows}
					getRowId={(row) => row.id}
					loading={query.isLoading || permissionsLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					selection={{ selectedIds, onChange: setSelectedIds, label: (row) => row.fullName }}
					emptyTitle="No guardians found"
					emptyDescription="Add a guardian or adjust your filters."
				/>
			</ListPage>

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
		</>
	);
}
