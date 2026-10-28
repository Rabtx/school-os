"use client";

import { Download04Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
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
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
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
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useTeacherQuery, useTeachersQuery } from "../hooks/use-staff-queries";
import type { TeacherSummary } from "../types/staff.types";
import { formatTeacherStatus, teacherDisplayName } from "../utils/teacher-ui.utils";
import { TeacherAvatar } from "./teacher-avatar";
import { TeacherIdCard } from "./teacher-id-card";
import { TeacherRosterCards } from "./teacher-roster-cards";
import { NoAccess } from "@/components/states";

type RosterView = "table" | "cards";

const teacherStatusTone: Record<TeacherSummary["profile"]["status"], string> = {
	active: "text-[var(--rx-success)]",
	on_leave: "text-[var(--rx-warning)]",
	inactive: "text-dashboard-text-dim",
};

export function TeachersPage() {
	const { activeTenant, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.STAFF_READ);
	const query = useTeachersQuery(tenantId, canRead);

	const searchParams = useSearchParams();
	const rosterView: RosterView = searchParams.get("view") === "cards" ? "cards" : "table";
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [search, setSearch] = useState("");
	const [manageOpen, setManageOpen] = useState(false);
	const [manageMembershipId, setManageMembershipId] = useState("");

	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);

	const openManage = useCallback((membershipId: string) => {
		setManageMembershipId(membershipId);
		setManageOpen(true);
	}, []);

	const columns = useMemo(
		(): DataTableColumn<TeacherSummary>[] => [
			{
				id: "teacher",
				header: "Teacher",
				sortable: true,
				sortValue: (row) => teacherDisplayName(row),
				renderCell: (teacher) => (
					<span className="flex min-w-[160px] items-center gap-2.5 whitespace-nowrap">
						<TeacherAvatar teacher={teacher} size="sm" className="size-6 text-[10px]" />
						<span className="font-medium text-dashboard-text-primary">
							{teacherDisplayName(teacher)}
						</span>
					</span>
				),
			},
			{
				id: "email",
				header: "Email",
				sortable: true,
				sortValue: (row) => row.email ?? "",
				renderCell: (teacher) => (
					<span className="block max-w-[220px] truncate text-dashboard-text-secondary">
						{teacher.email ?? "—"}
					</span>
				),
			},
			{
				id: "employeeCode",
				header: "Employee code",
				sortable: true,
				sortValue: (row) => row.profile.employeeCode ?? "",
				className: "font-mono text-sm",
				renderCell: (teacher) => (
					<span className="text-muted-foreground">{teacher.profile.employeeCode ?? "—"}</span>
				),
			},
			{
				id: "phone",
				header: "Phone",
				sortable: true,
				sortValue: (row) => row.profile.phone ?? "",
				renderCell: (teacher) => (
					<span className="text-muted-foreground text-sm">{teacher.profile.phone ?? "—"}</span>
				),
			},
			{
				id: "campus",
				header: "Campus",
				sortable: true,
				sortValue: (row) => (row.campusId ? (campusNameById.get(row.campusId) ?? "") : ""),
				renderCell: (teacher) => (
					<span className="text-muted-foreground text-sm">
						{teacher.campusId ? (campusNameById.get(teacher.campusId) ?? "—") : "All campuses"}
					</span>
				),
			},
			{
				id: "homeroom",
				header: "Homerooms",
				sortable: true,
				sortValue: (row) => row.homeroomSectionCount,
				className: "tabular-nums",
				renderCell: (teacher) => (
					<span className="text-muted-foreground text-sm">{teacher.homeroomSectionCount}</span>
				),
			},
			{
				id: "subjects",
				header: "Subjects",
				sortable: true,
				sortValue: (row) => row.subjectAssignmentCount,
				className: "tabular-nums",
				renderCell: (teacher) => (
					<span className="text-muted-foreground text-sm">{teacher.subjectAssignmentCount}</span>
				),
			},
			{
				id: "status",
				header: "Status",
				sortable: true,
				sortValue: (row) => row.profile.status,
				renderCell: (teacher) => (
					<span className={cn("capitalize", teacherStatusTone[teacher.profile.status])}>
						{formatTeacherStatus(teacher.profile.status)}
					</span>
				),
			},
			{
				id: "actions",
				header: <span className="sr-only">Actions</span>,
				headerClassName: "text-right",
				className: "text-right",
				renderCell: (teacher) => (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`Actions for ${teacherDisplayName(teacher)}`}
								/>
							}
						>
							<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => openManage(teacher.membershipId)}>
								View profile & ID
							</DropdownMenuItem>
							<DropdownMenuItem
								render={
									<Link href={`/admin/teachers/${teacher.membershipId}`}>Manage assignments</Link>
								}
							/>
						</DropdownMenuContent>
					</DropdownMenu>
				),
			},
		],
		[campusNameById, openManage],
	);

	const table = useClientDataTable({
		data: query.data ?? [],
		searchQuery: search,
		searchFn: (row, queryText) => {
			const haystack = [
				teacherDisplayName(row),
				row.email,
				row.profile.employeeCode,
				row.profile.phone,
				row.profile.qualification,
				row.profile.specialization,
				row.campusId ? campusNameById.get(row.campusId) : "",
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return haystack.includes(queryText);
		},
		sortFn: (rows, sort) => defaultSortFn(rows, sort, columns),
		pageSize: 50,
	});

	const selected = table.filteredRows.filter((row) => selectedIds.has(row.membershipId));
	const exportRows = selected.length > 0 ? selected : table.filteredRows;
	const onLeave = table.filteredRows.filter((row) => row.profile.status === "on_leave").length;
	const activeCount = table.filteredRows.filter((row) => row.profile.status === "active").length;

	const manageTeacherQuery = useTeacherQuery(
		tenantId,
		manageMembershipId || null,
		Boolean(manageOpen && manageMembershipId),
	);

	const manageTeacherSummary = useMemo(
		() => (query.data ?? []).find((teacher) => teacher.membershipId === manageMembershipId),
		[manageMembershipId, query.data],
	);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage teachers.</AlertDescription>
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
			<NoAccess
				title="Teachers are not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	return (
		<>
			<ListPage
				title="Teachers"
				tabs={[
					{ label: "Teachers", href: "/admin/teachers", active: rosterView === "table" },
					{
						label: "Staff cards",
						href: "/admin/teachers?view=cards",
						active: rosterView === "cards",
					},
					...(can(PermissionCodes.TENANT_MEMBERSHIP_READ)
						? [{ label: "Members", href: "/admin/settings/members" }]
						: []),
				]}
				toolbar={
					<DataTableToolbar
						className="border-0 px-4 sm:px-6"
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search teachers"
					>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 rounded-full"
							disabled={exportRows.length === 0}
							onClick={() =>
								downloadCsv(
									"teachers.csv",
									[
										{ header: "Name", value: (row) => teacherDisplayName(row) },
										{ header: "Email", value: (row) => row.email },
										{ header: "Employee code", value: (row) => row.profile.employeeCode },
										{ header: "Phone", value: (row) => row.profile.phone },
										{ header: "Qualification", value: (row) => row.profile.qualification },
										{ header: "Specialization", value: (row) => row.profile.specialization },
										{
											header: "Campus",
											value: (row) => (row.campusId ? campusNameById.get(row.campusId) : ""),
										},
										{ header: "Status", value: (row) => formatTeacherStatus(row.profile.status) },
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
						noun="teachers"
						stats={[
							{ label: "Active", value: activeCount },
							{ label: "On leave", value: onLeave, tone: onLeave > 0 ? "warning" : undefined },
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
				{rosterView === "table" ? (
					<DataTable
						fullBleed
						columns={columns}
						rows={table.rows}
						getRowId={(row) => row.membershipId}
						loading={query.isLoading}
						sort={table.sort}
						onSort={table.toggleSort}
						selection={{
							selectedIds,
							onChange: setSelectedIds,
							label: (row) => teacherDisplayName(row),
						}}
						emptyTitle="No teachers found"
						emptyDescription="Try clearing your search or invite teachers from Members."
					/>
				) : (
					<div className="p-4 sm:p-6">
						<TeacherRosterCards
							teachers={table.rows}
							schoolName={activeTenant?.name ?? "School"}
							tenantId={tenantId}
							campusNameById={campusNameById}
							loading={query.isLoading}
						/>
					</div>
				)}
			</ListPage>

			<Drawer open={manageOpen} onOpenChange={setManageOpen} direction="right">
				<DrawerContent className="h-full max-h-none data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg">
					<DrawerHeader className="border-border border-b text-start">
						<DrawerTitle>Teacher profile</DrawerTitle>
						<DrawerDescription>
							Staff ID card, contact details, and current assignments.
						</DrawerDescription>
					</DrawerHeader>
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
						{!manageTeacherSummary || manageTeacherQuery.isLoading ? (
							<div className="flex justify-center py-10">
								<Spinner className="size-6" />
							</div>
						) : (
							<div className="space-y-6">
								<TeacherIdCard
									teacher={manageTeacherSummary}
									schoolName={activeTenant?.name ?? "School"}
									tenantId={tenantId}
									campusName={
										manageTeacherSummary.campusId
											? campusNameById.get(manageTeacherSummary.campusId)
											: undefined
									}
									className="mx-auto"
								/>

								<dl className="grid gap-3 sm:grid-cols-2 text-sm">
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Role</dt>
										<dd className="capitalize">{manageTeacherSummary.role}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Hire date</dt>
										<dd>{manageTeacherSummary.profile.hireDate ?? "—"}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Qualification</dt>
										<dd>{manageTeacherSummary.profile.qualification ?? "—"}</dd>
									</div>
									<div>
										<dt className="text-muted-foreground text-xs uppercase">Phone</dt>
										<dd>{manageTeacherSummary.profile.phone ?? "—"}</dd>
									</div>
								</dl>

								{manageTeacherQuery.data ? (
									<>
										<div>
											<p className="mb-2 font-medium text-sm">Homeroom sections</p>
											{manageTeacherQuery.data.homeroomSections.length === 0 ? (
												<p className="text-muted-foreground text-sm">No homeroom assigned.</p>
											) : (
												<ul className="space-y-1 text-muted-foreground text-sm">
													{manageTeacherQuery.data.homeroomSections.map((section) => (
														<li key={section.id}>{section.name}</li>
													))}
												</ul>
											)}
										</div>
										<div>
											<p className="mb-2 font-medium text-sm">Subject assignments</p>
											{manageTeacherQuery.data.subjectAssignments.length === 0 ? (
												<p className="text-muted-foreground text-sm">No subject assignments yet.</p>
											) : (
												<ul className="space-y-1 text-muted-foreground text-sm">
													{manageTeacherQuery.data.subjectAssignments.map((item) => (
														<li key={item.id}>
															{item.subjectName}{" "}
															<span className="text-[12px]">({item.sectionName})</span>
														</li>
													))}
												</ul>
											)}
										</div>
									</>
								) : null}
							</div>
						)}
					</div>
					<DrawerFooter className="border-border border-t sm:flex-row sm:justify-between">
						<Button
							type="button"
							variant="outline"
							render={<Link href={`/admin/teachers/${manageMembershipId}`} />}
						>
							Manage assignments
						</Button>
						<DrawerClose asChild>
							<Button type="button" variant="outline">
								Close
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	);
}
