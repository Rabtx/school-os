"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Textarea } from "@school-os/ui/components/textarea";
import { useToast } from "@school-os/ui/components/toaster";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	useClientDataTable,
} from "@/components/data-table";
import { Avatar } from "@rabtx/ui/avatar";
import { type ListPageTab, ListPage } from "@/components/list-page";
import { NoResults } from "@/components/states";
import { cn } from "@/lib/utils";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import {
	useBulkUpdateSubmissionsMutation,
	useHomeworkSubmissionsQuery,
} from "../hooks/use-homework-queries";
import type { HomeworkAssignment } from "../types/homework.types";
import type {
	HomeworkSubmission,
	HomeworkSubmissionStatus,
	SubmissionUpdateItem,
} from "../types/homework-submissions.types";

type StatusFilter = "" | "to_mark" | "marked" | "missing";

const STATUS: Record<HomeworkSubmissionStatus, { label: string; tone: string; order: number }> = {
	submitted: { label: "Needs marking", tone: "text-[var(--rx-warning)]", order: 0 },
	late: { label: "Late · needs marking", tone: "text-[var(--rx-warning)]", order: 0 },
	graded: { label: "Marked", tone: "text-[var(--rx-success)]", order: 1 },
	pending: { label: "Not handed in", tone: "text-dashboard-text-dim", order: 2 },
	excused: { label: "Excused", tone: "text-[var(--rx-accent)]", order: 3 },
};

const needsMarking = (row: HomeworkSubmission) =>
	row.status === "submitted" || row.status === "late";

function handedInLabel(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString(undefined, {
		weekday: "short",
		hour: "numeric",
		minute: "2-digit",
	});
}

function marksLabel(row: HomeworkSubmission): string {
	if (row.marksObtained == null) return "—";
	return row.totalMarks == null
		? String(row.marksObtained)
		: `${row.marksObtained}/${row.totalMarks}`;
}

/**
 * Figma "Teacher · Check answers" (`165:36039`): one assignment's submissions, students who need
 * marking first, and a side panel to mark one student at a time. The AI marking columns arrive
 * with Phase 7; marks here are the teacher's own.
 */
export function HomeworkCheckAnswers({
	assignments,
	loading,
	tabs,
}: {
	assignments: HomeworkAssignment[];
	loading: boolean;
	tabs: ListPageTab[];
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canWrite = can(PermissionCodes.HOMEWORK_WRITE);

	const published = useMemo(
		() => assignments.filter((row) => row.status !== "draft"),
		[assignments],
	);
	const requestedId = searchParams.get("homeworkId");
	const homework =
		published.find((row) => row.id === requestedId) ??
		published.find((row) => row.submittedCount > 0) ??
		published[0];
	const homeworkId = homework?.id ?? "";

	const submissionsQuery = useHomeworkSubmissionsQuery(tenantId, homeworkId, Boolean(homeworkId));
	const mutation = useBulkUpdateSubmissionsMutation(tenantId ?? "", homeworkId);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
	const [openStudentId, setOpenStudentId] = useState<string | null>(null);

	const submissions = useMemo(
		() =>
			(submissionsQuery.data?.submissions ?? []).toSorted(
				(a, b) =>
					STATUS[a.status].order - STATUS[b.status].order ||
					a.studentName.localeCompare(b.studentName),
			),
		[submissionsQuery.data],
	);

	const table = useClientDataTable({
		data: submissions,
		pageSize: 50,
		searchQuery: search,
		searchFn: (row, query) =>
			row.studentName.toLowerCase().includes(query) ||
			row.studentCode.toLowerCase().includes(query),
		filterFn: (row, filters) => {
			if (filters.status === "to_mark") return needsMarking(row);
			if (filters.status === "marked") return row.status === "graded";
			if (filters.status === "missing") return row.status === "pending";
			return true;
		},
	});

	const toMark = submissions.filter(needsMarking).length;
	const marked = submissions.filter((row) => row.status === "graded").length;
	const handedIn = submissions.filter((row) => row.submittedAt).length;

	const columns: DataTableColumn<HomeworkSubmission>[] = [
		{
			id: "student",
			header: "Student",
			renderCell: (row) => (
				<button
					type="button"
					onClick={() => setOpenStudentId(row.studentId)}
					className="flex items-center gap-2.5 text-start font-medium hover:underline"
				>
					<Avatar name={row.studentName} />
					{row.studentName}
				</button>
			),
		},
		{
			id: "handedIn",
			header: "Handed in",
			renderCell: (row) =>
				row.submittedAt ? (
					<span className="inline-flex h-6 items-center rounded-full border border-dashboard-border-strong px-2.5 text-[12px] text-dashboard-text-secondary">
						{handedInLabel(row.submittedAt)}
					</span>
				) : (
					<span className="text-dashboard-text-dim">—</span>
				),
		},
		{
			id: "marks",
			header: "Marks",
			renderCell: (row) => <span className="tabular-nums">{marksLabel(row)}</span>,
		},
		{
			id: "status",
			header: "Status",
			renderCell: (row) => (
				<span className={cn("whitespace-nowrap", STATUS[row.status].tone)}>
					{STATUS[row.status].label}
				</span>
			),
		},
	];

	const statusItems = [
		{ label: `Needs marking · ${toMark}`, value: "to_mark" },
		{ label: `Marked · ${marked}`, value: "marked" },
		{ label: `Not handed in · ${submissions.length - handedIn}`, value: "missing" },
	];

	return (
		<ListPage
			title="Homework"
			tabs={tabs}
			banner={
				homework && toMark > 0 ? (
					<Alert>
						<AlertDescription>
							{handedIn} of {submissions.length} handed in. {toMark}{" "}
							{toMark === 1 ? "answer needs" : "answers need"} your marks; nothing reaches students
							or parents until you mark it.
						</AlertDescription>
					</Alert>
				) : undefined
			}
			toolbar={
				<DataTableToolbar
					className="border-0 px-4 sm:px-6"
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search students"
					filters={[
						{
							id: "homework",
							label: "Homework",
							value: homeworkId,
							onChange: (value) => {
								setOpenStudentId(null);
								router.replace(`/admin/homework?tab=submissions&homeworkId=${value}`);
							},
							items: published.map((row) => ({
								label: `${row.title} · ${row.sectionName}`,
								value: row.id,
							})),
						},
						{
							id: "status",
							label: "Status",
							value: statusFilter,
							placeholder: "Any",
							onChange: (value) => {
								setStatusFilter(value as StatusFilter);
								table.setFilter("status", value);
							},
							items: statusItems,
						},
					]}
				/>
			}
			footer={
				homework ? (
					<DataTableFooterBar
						shown={table.rows.length}
						total={table.totalRows}
						noun="students"
						stats={[
							{ label: "Handed in", value: handedIn },
							{ label: "Marked", value: marked },
							{ label: "Need you", value: toMark, tone: toMark > 0 ? "warning" : undefined },
						]}
						pageIndex={table.pageIndex}
						pageCount={table.pageCount}
						pageSize={table.pageSize}
						onPageChange={table.setPageIndex}
						onPageSizeChange={table.setPageSize}
					/>
				) : undefined
			}
		>
			<DataTable
				fullBleed
				columns={columns}
				rows={table.rows}
				getRowId={(row) => row.studentId}
				loading={loading || submissionsQuery.isLoading}
				emptyState={
					search.trim() || statusFilter ? (
						<NoResults
							noun="students"
							filters={[
								...(search.trim()
									? [{ key: "search", label: `"${search.trim()}"`, onRemove: () => setSearch("") }]
									: []),
								...(statusFilter
									? [
											{
												key: "status",
												label: statusItems.find((item) => item.value === statusFilter)?.label ?? "",
												onRemove: () => {
													setStatusFilter("");
													table.setFilter("status", "");
												},
											},
										]
									: []),
							]}
							onClearAll={() => {
								setSearch("");
								setStatusFilter("");
								table.setFilter("status", "");
							}}
						/>
					) : undefined
				}
				emptyTitle={homework ? "No students on this homework" : "No published homework yet"}
				emptyDescription={
					homework
						? "Students appear once the homework is published to them."
						: "Publish homework from the Assigned tab, then check answers here."
				}
			/>

			{homework ? (
				<MarkingPanel
					homework={homework}
					submissions={submissions}
					studentId={openStudentId}
					canWrite={canWrite}
					saving={mutation.isPending}
					onClose={() => setOpenStudentId(null)}
					onNavigate={setOpenStudentId}
					onSave={async (item) => {
						await mutation.mutateAsync({ submissions: [item] });
					}}
				/>
			) : null}
		</ListPage>
	);
}

function MarkingPanel({
	homework,
	submissions,
	studentId,
	canWrite,
	saving,
	onClose,
	onNavigate,
	onSave,
}: {
	homework: HomeworkAssignment;
	submissions: HomeworkSubmission[];
	studentId: string | null;
	canWrite: boolean;
	saving: boolean;
	onClose: () => void;
	onNavigate: (studentId: string | null) => void;
	onSave: (item: SubmissionUpdateItem) => Promise<void>;
}) {
	const toast = useToast();
	const index = submissions.findIndex((row) => row.studentId === studentId);
	const row = index >= 0 ? submissions[index] : undefined;
	const lastTotal = submissions.find((item) => item.totalMarks != null)?.totalMarks ?? 10;
	const [draftFor, setDraftFor] = useState<string | null>(null);
	const [marks, setMarks] = useState("");
	const [total, setTotal] = useState("");
	const [feedback, setFeedback] = useState("");

	// Load the open student's saved marks whenever the panel moves to another student.
	if (row && draftFor !== row.studentId) {
		setDraftFor(row.studentId);
		setMarks(row.marksObtained == null ? "" : String(row.marksObtained));
		setTotal(String(row.totalMarks ?? lastTotal));
		setFeedback(row.feedback ?? "");
	}

	const nextToMark = submissions.find((item, position) => position !== index && needsMarking(item));
	const marksNumber = Number(marks);
	const totalNumber = Number(total);
	const marksValid =
		marks.trim() !== "" &&
		Number.isFinite(marksNumber) &&
		Number.isFinite(totalNumber) &&
		totalNumber > 0 &&
		marksNumber >= 0 &&
		marksNumber <= totalNumber;

	const save = async (status: HomeworkSubmissionStatus, moveOn: boolean) => {
		if (!row) return;
		try {
			await onSave(
				status === "graded"
					? {
							studentId: row.studentId,
							status,
							marksObtained: marksNumber,
							totalMarks: totalNumber,
							feedback: feedback.trim() || null,
						}
					: { studentId: row.studentId, status },
			);
			toast.show({ title: `Saved ${row.studentName}`, status: "success" });
			if (moveOn) onNavigate(nextToMark?.studentId ?? null);
		} catch (error) {
			toast.show({
				title: `Could not save ${row.studentName}`,
				description: error instanceof Error ? error.message : undefined,
				status: "error",
			});
		}
	};

	return (
		<Drawer open={Boolean(row)} onOpenChange={(open) => !open && onClose()} direction="right">
			<DrawerContent className="h-full max-h-none gap-0 border-dashboard-border bg-dashboard-sidebar-bg text-[13px] tracking-[-0.15px] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
				{row ? (
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex items-start gap-3 border-dashboard-border border-b px-5 py-4">
							<Avatar name={row.studentName} />
							<div className="min-w-0 flex-1">
								<DrawerTitle className="font-medium text-[15px] text-dashboard-text-primary">
									{row.studentName}
								</DrawerTitle>
								<DrawerDescription className="truncate text-[12px] text-dashboard-text-dim">
									{homework.sectionName} · {row.studentCode} · {homework.title}
								</DrawerDescription>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="rounded-[6px] px-2 py-1 text-[12px] text-dashboard-text-dim hover:bg-dashboard-hover"
							>
								Close
							</button>
						</header>

						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={cn(
										"rounded-[6px] bg-dashboard-hover px-2 py-0.5 text-[12px]",
										STATUS[row.status].tone,
									)}
								>
									{STATUS[row.status].label}
								</span>
								{row.submittedAt ? (
									<span className="flex items-center gap-1.5 rounded-[6px] bg-dashboard-hover px-2 py-0.5 text-[12px] text-dashboard-text-secondary">
										<HugeiconsIcon icon={Calendar03Icon} size={12} strokeWidth={1.8} />
										Handed in {handedInLabel(row.submittedAt)}
									</span>
								) : null}
								{row.attachmentUrl ? (
									<a
										href={row.attachmentUrl}
										target="_blank"
										rel="noreferrer"
										className="rounded-[6px] bg-dashboard-hover px-2 py-0.5 text-[12px] text-[var(--rx-accent)] hover:underline"
									>
										Open their work
									</a>
								) : null}
							</div>

							<section>
								<p className="mb-2 text-[12px] text-dashboard-text-dim uppercase">Marks</p>
								<div className="flex items-center gap-2">
									<Input
										aria-label="Marks obtained"
										inputMode="decimal"
										value={marks}
										disabled={!canWrite}
										onChange={(event) => setMarks(event.target.value)}
										className="h-9 w-24"
									/>
									<span className="text-dashboard-text-dim">out of</span>
									<Input
										aria-label="Total marks"
										inputMode="decimal"
										value={total}
										disabled={!canWrite}
										onChange={(event) => setTotal(event.target.value)}
										className="h-9 w-24"
									/>
								</div>
								{marks.trim() !== "" && !marksValid ? (
									<p className="mt-1.5 text-[12px] text-[var(--rx-danger)]">
										Marks must be between 0 and the total.
									</p>
								) : null}
							</section>

							<section>
								<label
									htmlFor="marking-feedback"
									className="mb-2 block text-[12px] text-dashboard-text-dim uppercase"
								>
									Comment {row.studentName.split(" ")[0]} will see
								</label>
								<Textarea
									id="marking-feedback"
									rows={4}
									value={feedback}
									disabled={!canWrite}
									onChange={(event) => setFeedback(event.target.value)}
									placeholder="What went well, and one thing to fix"
								/>
							</section>

							{canWrite ? (
								<section className="flex flex-wrap gap-2">
									<button
										type="button"
										disabled={saving}
										onClick={() => void save("excused", true)}
										className="inline-flex h-7 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover disabled:opacity-50"
									>
										Excused
									</button>
									<button
										type="button"
										disabled={saving}
										onClick={() => void save("pending", true)}
										className="inline-flex h-7 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover disabled:opacity-50"
									>
										Not handed in
									</button>
								</section>
							) : null}
						</div>

						<footer className="flex flex-wrap items-center gap-2 border-dashboard-border border-t px-5 py-3">
							<SelectField
								aria-label="Jump to student"
								items={submissions.map((item) => ({
									label: item.studentName,
									value: item.studentId,
								}))}
								value={row.studentId}
								onValueChange={(value) => onNavigate(value)}
								className="h-8 min-w-0 flex-1"
							/>
							{canWrite ? (
								<button
									type="button"
									disabled={!marksValid || saving}
									onClick={() => void save("graded", true)}
									className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
								>
									{nextToMark ? "Save and next" : "Save marks"}
								</button>
							) : null}
						</footer>
					</div>
				) : (
					<>
						<DrawerTitle className="sr-only">Mark answers</DrawerTitle>
						<DrawerDescription className="sr-only">No student selected</DrawerDescription>
					</>
				)}
			</DrawerContent>
		</Drawer>
	);
}
