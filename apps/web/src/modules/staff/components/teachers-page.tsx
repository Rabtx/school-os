"use client";

import {
	CreditCardIcon,
	MoreHorizontalIcon,
	TableIcon,
	TeacherIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
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
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin";
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
import { useTeacherQuery, useTeachersQuery } from "../hooks/use-staff-queries";
import type { TeacherSummary } from "../types/staff.types";
import {
	formatTeacherStatus,
	teacherDisplayName,
	teacherStatusBadgeVariant,
} from "../utils/teacher-ui.utils";
import { TeacherAvatar } from "./teacher-avatar";
import { TeacherIdCard } from "./teacher-id-card";
import { TeacherRosterCards } from "./teacher-roster-cards";

type RosterView = "table" | "cards";

export function TeachersPage() {
	const { activeTenant, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.STAFF_READ);
	const query = useTeachersQuery(tenantId, canRead);

	const [rosterView, setRosterView] = useState<RosterView>("table");
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
				id: "avatar",
				header: "",
				className: "w-[52px]",
				renderCell: (teacher) => <TeacherAvatar teacher={teacher} size="sm" />,
			},
			{
				id: "teacher",
				header: "Teacher",
				sortable: true,
				sortValue: (row) => teacherDisplayName(row),
				renderCell: (teacher) => (
					<div className="min-w-[140px]">
						<p className="font-medium text-foreground">{teacherDisplayName(teacher)}</p>
						<p className="truncate text-[12px] text-muted-foreground">{teacher.email}</p>
					</div>
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
				id: "qualification",
				header: "Qualification",
				sortable: true,
				sortValue: (row) => row.profile.qualification ?? "",
				renderCell: (teacher) => (
					<span className="max-w-[160px] truncate text-muted-foreground text-sm">
						{teacher.profile.qualification ?? "—"}
					</span>
				),
			},
			{
				id: "specialization",
				header: "Specialization",
				sortable: true,
				sortValue: (row) => row.profile.specialization ?? "",
				renderCell: (teacher) => (
					<span className="max-w-[160px] truncate text-muted-foreground text-sm">
						{teacher.profile.specialization ?? "—"}
					</span>
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
					<Badge variant={teacherStatusBadgeVariant(teacher.profile.status)} className="capitalize">
						{formatTeacherStatus(teacher.profile.status)}
					</Badge>
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
	});

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
			<Alert>
				<AlertDescription>You do not have permission to view teachers.</AlertDescription>
			</Alert>
		);
	}

	return (
		<AdminPageShell
			title="Teachers"
			description="Browse staff in table or ID-card view. Assign homerooms and subjects from the full profile."
			icon={TeacherIcon}
			maxWidth="7xl"
		>
			<DataTableShell
				toolbar={
					<DataTableToolbar
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search teachers…"
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
								<span className="hidden sm:inline">Staff cards</span>
							</ToggleGroupItem>
						</ToggleGroup>
					</DataTableToolbar>
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
				{rosterView === "table" ? (
					<DataTable
						borderless
						columns={columns}
						rows={table.rows}
						getRowId={(row) => row.membershipId}
						loading={query.isLoading}
						sort={table.sort}
						onSort={table.toggleSort}
						emptyTitle="No teachers found"
						emptyDescription="Try clearing your search or invite teachers from Members."
					/>
				) : (
					<TeacherRosterCards
						teachers={table.rows}
						schoolName={activeTenant?.name ?? "School"}
						tenantId={tenantId}
						campusNameById={campusNameById}
						loading={query.isLoading}
					/>
				)}
			</DataTableShell>

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
		</AdminPageShell>
	);
}
