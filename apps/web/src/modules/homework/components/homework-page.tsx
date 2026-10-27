"use client";

import { BookOpen02Icon, PlusSignIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
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
import { useEffect, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { ApiError } from "@/lib/api/client";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
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

function formatDueDate(value: string | null) {
	if (!value) return "No due date";
	return new Date(value).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function statusBadge(status: HomeworkStatus) {
	const variant =
		status === "published" ? "default" : status === "closed" ? "secondary" : "outline";
	return <Badge variant={variant}>{status}</Badge>;
}

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

	const [sectionSubjectFilter, setSectionSubjectFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState(() =>
		initialStatus === "draft" || initialStatus === "published" ? initialStatus : "all",
	);

	useEffect(() => {
		if (initialStatus === "draft" || initialStatus === "published") {
			setStatusFilter(initialStatus);
		}
	}, [initialStatus]);
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

	const listQuery = useHomeworkListQuery(
		tenantId,
		{
			sectionSubjectId: sectionSubjectFilter === "all" ? undefined : sectionSubjectFilter,
			status: statusFilter === "all" ? undefined : statusFilter,
		},
		canRead,
	);
	const createMutation = useCreateHomeworkMutation(tenantId ?? "");
	const updateMutation = useUpdateHomeworkMutation(tenantId ?? "");

	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);

	const nowMs = useNow().getTime();
	const rows = useMemo(() => listQuery.data ?? [], [listQuery.data]);
	const stats = useMemo(() => {
		const now = nowMs;
		const weekMs = 7 * 24 * 60 * 60 * 1000;
		return {
			total: rows.length,
			published: rows.filter((row) => row.status === "published").length,
			draft: rows.filter((row) => row.status === "draft").length,
			dueSoon: rows.filter(
				(row) =>
					row.dueAt && new Date(row.dueAt).getTime() - now <= weekMs && row.status === "published",
			).length,
		};
	}, [nowMs, rows]);

	const columns: DataTableColumn<HomeworkAssignment>[] = [
		{
			id: "title",
			header: "Title",
			renderCell: (row) => (
				<Link
					href={`/admin/homework/${row.id}`}
					className="font-medium text-dashboard-accent hover:underline"
				>
					{row.title}
				</Link>
			),
			sortable: true,
			sortValue: (row) => row.title,
		},
		{
			id: "class",
			header: "Class",
			renderCell: (row) => (
				<span>
					{formatSectionLabel(
						{ name: row.sectionName, campusId: campusId ?? "", classId: "" },
						undefined,
						campusNameById.get(campusId ?? ""),
					)}{" "}
					· {row.subjectName}
				</span>
			),
			sortable: true,
			sortValue: (row) => `${row.sectionName} ${row.subjectName}`,
		},
		{
			id: "students",
			header: "Students",
			renderCell: (row) => (
				<span className="text-dashboard-text-secondary text-[13px]">
					{row.assignMode === "selected_students"
						? `${row.recipientCount} selected`
						: "Whole class"}
				</span>
			),
		},
		{
			id: "dueAt",
			header: "Due",
			renderCell: (row) => formatDueDate(row.dueAt),
			sortable: true,
			sortValue: (row) => row.dueAt ?? "",
		},
		{
			id: "status",
			header: "Status",
			renderCell: (row) => statusBadge(row.status),
			sortable: true,
			sortValue: (row) => row.status,
		},
		{
			id: "actions",
			header: "",
			renderCell: (row) =>
				canWrite ? (
					<Button size="sm" variant="ghost" onClick={() => openEditSheet(row)}>
						Edit
					</Button>
				) : null,
		},
	];

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
			<AdminPageShell title="Homework" description="You do not have permission to view homework.">
				<Alert variant="destructive">
					<AlertDescription>Missing homework.read permission.</AlertDescription>
				</Alert>
			</AdminPageShell>
		);
	}

	return (
		<AdminPageShell
			title="Homework"
			description="Assign work to whole classes or hand-pick students — with AI-assisted drafting."
			icon={BookOpen02Icon}
			maxWidth="7xl"
			loading={listQuery.isLoading}
			actions={
				canWrite ? (
					<Button size="sm" onClick={openCreateSheet}>
						<HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" strokeWidth={2} />
						New assignment
					</Button>
				) : null
			}
		>
			<div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{[
					{ label: "Total assignments", value: stats.total },
					{ label: "Published", value: stats.published },
					{ label: "Drafts", value: stats.draft },
					{ label: "Due this week", value: stats.dueSoon },
				].map((card) => (
					<div
						key={card.label}
						className="rounded-xl border border-dashboard-border bg-gradient-to-br from-dashboard-surface to-dashboard-accent-soft/20 p-4"
					>
						<p className="text-[12px] text-dashboard-text-muted">{card.label}</p>
						<p className="mt-1 font-semibold text-2xl text-foreground">{card.value}</p>
					</div>
				))}
			</div>

			<div className="mb-4 flex flex-wrap gap-3">
				<Field className="min-w-[220px]">
					<FieldLabel>Class & subject</FieldLabel>
					<SelectField
						aria-label="Class and subject filter"
						items={[{ label: "All classes", value: "all" }, ...sectionSubjectOptions]}
						value={sectionSubjectFilter}
						onValueChange={setSectionSubjectFilter}
					/>
				</Field>
				<Field className="min-w-[160px]">
					<FieldLabel>Status</FieldLabel>
					<SelectField
						aria-label="Status filter"
						items={statusOptions}
						value={statusFilter}
						onValueChange={setStatusFilter}
					/>
				</Field>
			</div>

			{listQuery.error ? (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>{homeworkListErrorMessage(listQuery.error)}</AlertDescription>
				</Alert>
			) : null}

			<DataTable
				columns={columns}
				rows={rows}
				getRowId={(row) => row.id}
				emptyTitle="No homework yet"
				emptyDescription={
					canWrite ? "Create your first assignment for a class." : "No assignments to show."
				}
			/>

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
		</AdminPageShell>
	);
}
