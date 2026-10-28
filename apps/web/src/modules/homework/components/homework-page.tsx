"use client";

import { Edit02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@school-os/ui/components/sheet";
import { Spinner } from "@school-os/ui/components/spinner";
import { Textarea } from "@school-os/ui/components/textarea";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Avatar } from "@rabtx/ui/avatar";
import { ListPage } from "@/components/list-page";
import { HomeworkCheckAnswers } from "./homework-check-answers";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	defaultSortFn,
	useClientDataTable,
} from "@/components/data-table";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api/client";
import { AssignTargetPanel } from "@/modules/academics/components/assign-target-panel";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { aiService } from "@/modules/ai/ai.service";
import { useAuth } from "@/modules/auth/context/auth-context";
import {
	useCreateHomeworkMutation,
	useHomeworkListQuery,
	useUpdateHomeworkMutation,
} from "@/modules/homework/hooks/use-homework-queries";
import type {
	AssignMode,
	HomeworkAssignment,
	HomeworkStatus,
} from "@/modules/homework/types/homework.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useNow } from "@/lib/use-now";
import {
	dueLabel,
	homeworkState,
	matchesDueFilter,
	StatusTag,
	SubjectChip,
	SubmittedBar,
} from "./homework-cells";
import { NoAccess } from "@/components/states";

const statusOptions = [
	{ label: "All statuses", value: "all" },
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Closed", value: "closed" },
];

const toneOptions = [
	{ label: "Standard", value: "standard" },
	{ label: "Challenge", value: "challenge" },
	{ label: "Support", value: "support" },
];

function homeworkListErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.statusCode === 500) {
			const hint =
				"If you recently pulled homework or assessments code, apply API migrations: bun --cwd=apps/nest-api run db:migrate — then restart the Nest API.";
			return error.detail?.includes("does not exist")
				? `${error.detail}. ${hint}`
				: `${error.message}. ${hint}`;
		}
		return error.message;
	}
	if (error instanceof Error) return error.message;
	return "Failed to load homework";
}

export function HomeworkPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialStatus = searchParams.get("status");
	const { token } = useAuth();
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.HOMEWORK_READ);
	const canWrite = can(PermissionCodes.HOMEWORK_WRITE);

	const tabParam = searchParams.get("tab");
	const tab: "assigned" | "drafts" | "submissions" =
		tabParam === "submissions"
			? "submissions"
			: tabParam === "drafts" || initialStatus === "draft"
				? "drafts"
				: "assigned";
	const [sectionSubjectFilter, setSectionSubjectFilter] = useState("");
	const [dueFilter, setDueFilter] = useState("");
	const [search, setSearch] = useState("");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editing, setEditing] = useState<HomeworkAssignment | null>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [materials, setMaterials] = useState("");
	const [dueAt, setDueAt] = useState("");
	const [status, setStatus] = useState<HomeworkStatus>("draft");
	const [estimatedMinutes, setEstimatedMinutes] = useState("");
	const [sectionSubjectId, setSectionSubjectId] = useState("");
	const [assignMode, setAssignMode] = useState<AssignMode>("whole_class");
	const [studentIds, setStudentIds] = useState<string[]>([]);
	const [aiTopic, setAiTopic] = useState("");
	const [aiTone, setAiTone] = useState<"standard" | "challenge" | "support">("standard");
	const [aiBusy, setAiBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { options: sectionSubjectOptions, isLoading: sectionSubjectsLoading } =
		useSectionSubjectOptions(tenantId, campusId);
	const selectedSectionSubject = sectionSubjectOptions.find(
		(option) => option.value === sectionSubjectId,
	);

	const listQuery = useHomeworkListQuery(tenantId, {}, canRead);
	const createMutation = useCreateHomeworkMutation(tenantId ?? "");
	const updateMutation = useUpdateHomeworkMutation(tenantId ?? "");

	const nowMs = useNow().getTime();
	// Figma order: due today and upcoming first (soonest first), then past work (most recent first).
	const rows = useMemo(() => {
		const today = new Date(nowMs).setHours(0, 0, 0, 0);
		const dueMs = (row: HomeworkAssignment) =>
			row.dueAt ? new Date(row.dueAt).getTime() : Number.POSITIVE_INFINITY;
		return (listQuery.data ?? [])
			.filter((row) => (tab === "drafts" ? row.status === "draft" : row.status !== "draft"))
			.toSorted((a, b) => {
				const aUpcoming = dueMs(a) >= today;
				const bUpcoming = dueMs(b) >= today;
				if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
				return aUpcoming ? dueMs(a) - dueMs(b) : dueMs(b) - dueMs(a);
			});
	}, [listQuery.data, nowMs, tab]);

	const columns: DataTableColumn<HomeworkAssignment>[] = [
		{
			id: "title",
			header: "Homework",
			sortable: true,
			sortValue: (row) => row.title,
			renderCell: (row) => (
				<Link
					href={`/admin/homework/${row.id}`}
					className="font-medium text-dashboard-text-primary hover:underline"
				>
					{row.title}
				</Link>
			),
		},
		{
			id: "subject",
			header: "Subject",
			sortable: true,
			sortValue: (row) => row.subjectName,
			renderCell: (row) => <SubjectChip name={row.subjectName} />,
		},
		{
			id: "class",
			header: "Class",
			sortable: true,
			sortValue: (row) => row.sectionName,
			renderCell: (row) => (
				<span className="inline-flex h-6 items-center rounded-md border border-dashboard-border-strong px-2 text-[12px] text-dashboard-text-secondary">
					{row.sectionName}
				</span>
			),
		},
		{
			id: "due",
			header: "Due",
			sortable: true,
			sortValue: (row) => row.dueAt ?? "",
			renderCell: (row) => {
				const due = dueLabel(row.dueAt, nowMs);
				const missingWork = row.submittedCount < row.recipientCount;
				return (
					<span
						className={cn(
							due.overdue && row.status === "published" && missingWork && "text-[var(--rx-danger)]",
						)}
					>
						{due.label}
					</span>
				);
			},
		},
		{
			id: "submitted",
			header: "Submitted",
			sortable: true,
			sortValue: (row) => (row.recipientCount ? row.submittedCount / row.recipientCount : 0),
			renderCell: (row) =>
				row.status === "draft" ? (
					<span className="text-dashboard-text-dim">Not published</span>
				) : (
					<SubmittedBar submitted={row.submittedCount} total={row.recipientCount} />
				),
		},
		{
			id: "status",
			header: "Status",
			sortable: true,
			sortValue: (row) => homeworkState(row, nowMs).label,
			renderCell: (row) => <StatusTag state={homeworkState(row, nowMs)} />,
		},
		{
			id: "teacher",
			header: "Teacher",
			sortable: true,
			sortValue: (row) => row.teacherName ?? "",
			renderCell: (row) =>
				row.teacherName ? (
					<span className="flex items-center gap-2">
						<Avatar name={row.teacherName.replaceAll("_", " ")} />
						{row.teacherName}
					</span>
				) : (
					<span className="text-dashboard-text-dim">—</span>
				),
		},
		{
			id: "actions",
			header: <span className="sr-only">Actions</span>,
			headerClassName: "text-right",
			className: "text-right",
			renderCell: (row) => (
				<span className="inline-flex items-center gap-1">
					{row.status !== "draft" ? (
						<Button
							size="sm"
							variant="ghost"
							nativeButton={false}
							render={<Link href={`/admin/homework?tab=submissions&homeworkId=${row.id}`} />}
						>
							Check answers
						</Button>
					) : null}
					{canWrite ? (
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label={`Edit ${row.title}`}
							onClick={() => openEditSheet(row)}
						>
							<HugeiconsIcon icon={Edit02Icon} strokeWidth={1.8} />
						</Button>
					) : null}
				</span>
			),
		},
	];

	const table = useClientDataTable({
		data: rows,
		pageSize: 50,
		searchQuery: search,
		searchFn: (row, queryText) =>
			`${row.title} ${row.subjectName} ${row.sectionName} ${row.teacherName ?? ""}`
				.toLowerCase()
				.includes(queryText),
		filterFn: (row, filters) => {
			if (filters.class && row.sectionSubjectId !== filters.class) return false;
			if (filters.due && !matchesDueFilter(row.dueAt, filters.due, nowMs)) return false;
			return true;
		},
		sortFn: (sorted, sort) => defaultSortFn(sorted, sort, columns),
	});

	const footerStats = useMemo(() => {
		const published = table.filteredRows.filter(
			(row) => row.status !== "draft" && row.recipientCount > 0,
		);
		const submitted = published.reduce((sum, row) => sum + row.submittedCount, 0);
		const expected = published.reduce((sum, row) => sum + row.recipientCount, 0);
		const missing = published
			.filter((row) => row.dueAt && new Date(row.dueAt).getTime() < nowMs)
			.reduce((sum, row) => sum + Math.max(0, row.recipientCount - row.submittedCount), 0);
		return {
			avgSubmitted: expected ? Math.round((submitted / expected) * 100) : null,
			missing,
		};
	}, [nowMs, table.filteredRows]);

	function resetForm() {
		setTitle("");
		setDescription("");
		setMaterials("");
		setDueAt("");
		setStatus("draft");
		setEstimatedMinutes("");
		setSectionSubjectId(sectionSubjectOptions[0]?.value ?? "");
		setAssignMode("whole_class");
		setStudentIds([]);
		setAiTopic("");
		setEditing(null);
		setError(null);
	}

	function openCreateSheet() {
		resetForm();
		setSheetOpen(true);
	}

	function openEditSheet(item: HomeworkAssignment) {
		setEditing(item);
		setTitle(item.title);
		setDescription(item.description ?? "");
		setMaterials(item.materials ?? "");
		setDueAt(item.dueAt ? item.dueAt.slice(0, 16) : "");
		setStatus(item.status);
		setEstimatedMinutes(item.estimatedMinutes ? String(item.estimatedMinutes) : "");
		setSectionSubjectId(item.sectionSubjectId);
		setAssignMode(item.assignMode);
		setStudentIds([]);
		setError(null);
		setSheetOpen(true);
	}

	async function handleAiDraft() {
		if (!token || !tenantId || !aiTopic.trim()) return;
		setAiBusy(true);
		setError(null);
		try {
			const draft = await aiService.draftAcademics(token, tenantId, {
				kind: "homework",
				topic: aiTopic.trim(),
				subjectName: selectedSectionSubject?.subjectName,
				sectionName: selectedSectionSubject?.sectionName,
				durationMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
				tone: aiTone,
			});
			setTitle(draft.title);
			setDescription(draft.description);
			if (draft.materials) setMaterials(draft.materials);
		} catch (draftError) {
			setError(draftError instanceof Error ? draftError.message : "AI draft failed");
		} finally {
			setAiBusy(false);
		}
	}

	async function handleSubmit() {
		if (!tenantId) return;
		setError(null);

		try {
			const dueAtIso = dueAt ? new Date(dueAt).toISOString() : undefined;
			const minutes = estimatedMinutes ? Number(estimatedMinutes) : undefined;

			if (editing) {
				await updateMutation.mutateAsync({
					homeworkId: editing.id,
					input: {
						title,
						description: description.trim() ? description.trim() : null,
						materials: materials.trim() ? materials.trim() : null,
						dueAt: dueAtIso ?? null,
						status,
						assignMode,
						studentIds: assignMode === "selected_students" ? studentIds : undefined,
						estimatedMinutes: minutes ?? null,
					},
				});
				setSheetOpen(false);
				resetForm();
				return;
			}

			if (!sectionSubjectId) {
				setError("Select a class and subject");
				return;
			}
			if (assignMode === "selected_students" && studentIds.length === 0) {
				setError("Select at least one student");
				return;
			}

			const response = await createMutation.mutateAsync({
				sectionSubjectId,
				title,
				description: description.trim() || undefined,
				materials: materials.trim() || undefined,
				dueAt: dueAtIso,
				status,
				assignMode,
				studentIds: assignMode === "selected_students" ? studentIds : undefined,
				estimatedMinutes: minutes,
			});

			setSheetOpen(false);
			resetForm();
			router.push(`/admin/homework/${response.assignment.id}`);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Could not save homework");
		}
	}

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Homework" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<NoAccess
				title="Homework is not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	const tabs = [
		{ label: "Assigned", href: "/admin/homework", active: tab === "assigned" },
		{ label: "Drafts", href: "/admin/homework?tab=drafts", active: tab === "drafts" },
		{
			label: "Submissions",
			href: "/admin/homework?tab=submissions",
			active: tab === "submissions",
		},
	];

	if (tab === "submissions") {
		return (
			<HomeworkCheckAnswers
				assignments={listQuery.data ?? []}
				loading={listQuery.isLoading}
				tabs={tabs}
			/>
		);
	}

	return (
		<>
			<ListPage
				title="Homework"
				tabs={tabs}
				banner={
					listQuery.error ? (
						<Alert variant="destructive">
							<AlertDescription>{homeworkListErrorMessage(listQuery.error)}</AlertDescription>
						</Alert>
					) : null
				}
				toolbar={
					<DataTableToolbar
						className="border-0 px-4 sm:px-6"
						search={search}
						onSearchChange={(value) => {
							setSearch(value);
							table.resetPage();
						}}
						searchPlaceholder="Search homework"
						filters={[
							{
								id: "class",
								label: "Class",
								value: sectionSubjectFilter,
								placeholder: "All",
								onChange: (value) => {
									setSectionSubjectFilter(value);
									table.setFilter("class", value);
								},
								items: sectionSubjectOptions,
							},
							{
								id: "due",
								label: "Due",
								value: dueFilter,
								placeholder: "Any",
								onChange: (value) => {
									setDueFilter(value);
									table.setFilter("due", value);
								},
								items: [
									{ label: "Today", value: "today" },
									{ label: "This week", value: "week" },
									{ label: "Overdue", value: "overdue" },
								],
							},
						]}
						canAdd={canWrite}
						onAdd={openCreateSheet}
						addLabel="New homework"
					>
						{canWrite ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-7 rounded-full"
								onClick={openCreateSheet}
							>
								<HugeiconsIcon icon={SparklesIcon} data-icon="inline-start" strokeWidth={1.8} />
								Draft with AI
							</Button>
						) : null}
					</DataTableToolbar>
				}
				footer={
					<DataTableFooterBar
						shown={table.rows.length}
						total={table.totalRows}
						noun="assignments"
						stats={[
							...(footerStats.avgSubmitted === null
								? []
								: [{ label: "Avg submitted", value: `${footerStats.avgSubmitted}%` }]),
							{
								label: "Missing",
								value: footerStats.missing,
								tone: footerStats.missing > 0 ? ("danger" as const) : undefined,
							},
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
					loading={listQuery.isLoading}
					sort={table.sort}
					onSort={table.toggleSort}
					selection={{ selectedIds, onChange: setSelectedIds, label: (row) => row.title }}
					emptyTitle={tab === "drafts" ? "No drafts" : "No homework yet"}
					emptyDescription={
						canWrite
							? "Create an assignment for a class, or draft one with AI."
							: "No assignments to show."
					}
				/>
			</ListPage>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>{editing ? "Edit homework" : "New homework"}</SheetTitle>
						<SheetDescription>
							Publish when ready — students see assignments on their schedule (coming soon).
						</SheetDescription>
					</SheetHeader>

					<FieldGroup className="space-y-4 px-4 py-4">
						{!editing ? (
							<Field>
								<FieldLabel>Class & subject</FieldLabel>
								<SelectField
									items={sectionSubjectOptions}
									value={sectionSubjectId}
									onValueChange={setSectionSubjectId}
									placeholder={sectionSubjectsLoading ? "Loading…" : "Select class"}
									disabled={sectionSubjectsLoading}
								/>
							</Field>
						) : null}

						<div className="rounded-xl border border-dashed border-dashboard-accent/40 bg-dashboard-accent-soft/20 p-4">
							<div className="mb-3 flex items-center gap-2">
								<HugeiconsIcon icon={SparklesIcon} size={18} className="text-dashboard-accent" />
								<p className="font-medium text-[13px]">Draft with AI</p>
							</div>
							<div className="grid gap-3">
								<Input
									placeholder="Topic, e.g. fractions word problems"
									value={aiTopic}
									onChange={(event) => setAiTopic(event.target.value)}
								/>
								<SelectField
									items={toneOptions}
									value={aiTone}
									onValueChange={(v) => setAiTone(v as typeof aiTone)}
								/>
								<Button
									type="button"
									variant="secondary"
									onClick={() => void handleAiDraft()}
									disabled={aiBusy || !aiTopic.trim()}
								>
									{aiBusy ? "Drafting…" : "Generate draft"}
								</Button>
							</div>
						</div>

						<Field>
							<FieldLabel>Title</FieldLabel>
							<Input value={title} onChange={(event) => setTitle(event.target.value)} />
						</Field>
						<Field>
							<FieldLabel>Instructions</FieldLabel>
							<Textarea
								value={description}
								onChange={(event) => setDescription(event.target.value)}
								rows={5}
							/>
						</Field>
						<Field>
							<FieldLabel>Materials / resources</FieldLabel>
							<Textarea
								value={materials}
								onChange={(event) => setMaterials(event.target.value)}
								rows={2}
								placeholder="Textbook pages, links, worksheets…"
							/>
						</Field>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel>Due date</FieldLabel>
								<Input
									type="datetime-local"
									value={dueAt}
									onChange={(event) => setDueAt(event.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel>Est. minutes</FieldLabel>
								<Input
									type="number"
									min={1}
									value={estimatedMinutes}
									onChange={(event) => setEstimatedMinutes(event.target.value)}
								/>
							</Field>
						</div>

						<AssignTargetPanel
							tenantId={tenantId}
							campusId={campusId}
							sectionId={selectedSectionSubject?.sectionId ?? editing?.sectionId ?? null}
							assignMode={assignMode}
							studentIds={studentIds}
							onAssignModeChange={setAssignMode}
							onStudentIdsChange={setStudentIds}
						/>

						<Field>
							<FieldLabel>Status</FieldLabel>
							<SelectField
								items={statusOptions.filter((option) => option.value !== "all")}
								value={status}
								onValueChange={(value) => setStatus(value as HomeworkStatus)}
							/>
						</Field>

						{error ? (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}
					</FieldGroup>

					<SheetFooter className="border-dashboard-border border-t px-4 py-3">
						<Button variant="outline" onClick={() => setSheetOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => void handleSubmit()}
							disabled={createMutation.isPending || updateMutation.isPending || !title.trim()}
						>
							{editing ? "Save changes" : "Create assignment"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
