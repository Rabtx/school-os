"use client";

import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { EmptyState } from "@school-os/ui/components/empty-state";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Skeleton } from "@school-os/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-os/ui/components/table";
import { useToast } from "@school-os/ui/components/toaster";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
	useBulkUpdateSubmissionsMutation,
	useHomeworkSubmissionsQuery,
} from "@/modules/homework/hooks/use-homework-queries";
import type {
	HomeworkSubmission,
	HomeworkSubmissionStatus,
	SubmissionUpdateItem,
} from "@/modules/homework/types/homework-submissions.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";

const statusOptions: { label: string; value: HomeworkSubmissionStatus }[] = [
	{ label: "Pending", value: "pending" },
	{ label: "Submitted", value: "submitted" },
	{ label: "Late", value: "late" },
	{ label: "Graded", value: "graded" },
	{ label: "Excused", value: "excused" },
];

const statusBadgeClass: Record<HomeworkSubmissionStatus, string> = {
	pending: "bg-muted text-muted-foreground",
	submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	late: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
	graded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	excused: "bg-muted text-muted-foreground",
};

const statusSelectClass: Record<HomeworkSubmissionStatus, string> = {
	pending: "border-border",
	submitted: "border-blue-500/50",
	late: "border-amber-500/50",
	graded: "border-emerald-500/50",
	excused: "border-border",
};

type DraftRow = {
	studentId: string;
	studentName: string;
	studentCode: string;
	status: HomeworkSubmissionStatus;
	submittedAt: string | null;
	grade: string;
	marksObtained: string;
	totalMarks: string;
	feedback: string;
};

type Props = {
	homeworkId: string;
};

function toDraftRow(submission: HomeworkSubmission): DraftRow {
	return {
		studentId: submission.studentId,
		studentName: submission.studentName,
		studentCode: submission.studentCode,
		status: submission.status,
		submittedAt: submission.submittedAt,
		grade: submission.grade ?? "",
		marksObtained: submission.marksObtained != null ? String(submission.marksObtained) : "",
		totalMarks: submission.totalMarks != null ? String(submission.totalMarks) : "",
		feedback: submission.feedback ?? "",
	};
}

function isCleared(status: HomeworkSubmissionStatus): boolean {
	return status === "pending" || status === "excused";
}

function parseMarks(value: string): number | null {
	if (value.trim() === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatSubmitted(value: string | null): string {
	if (!value) return "—";
	return new Date(value).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function formatSaveError(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Could not save submissions";
}

function StatusBadge({ status }: { status: HomeworkSubmissionStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClass[status]}>
			{status}
		</Badge>
	);
}

export function HomeworkSubmissionsPanel({ homeworkId }: Props) {
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const toast = useToast();
	const tenantId = activeTenant?.id ?? null;
	const canWrite = can(PermissionCodes.HOMEWORK_WRITE);

	const submissionsQuery = useHomeworkSubmissionsQuery(tenantId, homeworkId);
	const saveMutation = useBulkUpdateSubmissionsMutation(tenantId ?? "", homeworkId);

	const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
	const [savedRows, setSavedRows] = useState<DraftRow[]>([]);

	useEffect(() => {
		if (!submissionsQuery.data) return;
		const mapped = submissionsQuery.data.submissions.map(toDraftRow);
		setDraftRows(mapped);
		setSavedRows(mapped);
	}, [submissionsQuery.data]);

	const savedByStudentId = useMemo(
		() => new Map(savedRows.map((row) => [row.studentId, row])),
		[savedRows],
	);

	const rowIsDirty = useCallback(
		(row: DraftRow): boolean => {
			const original = savedByStudentId.get(row.studentId);
			if (!original) return true;
			return (
				row.status !== original.status ||
				row.grade !== original.grade ||
				row.marksObtained !== original.marksObtained ||
				row.totalMarks !== original.totalMarks ||
				row.feedback !== original.feedback
			);
		},
		[savedByStudentId],
	);

	const dirtyRows = useMemo(() => draftRows.filter(rowIsDirty), [draftRows, rowIsDirty]);
	const hasChanges = dirtyRows.length > 0;

	const stats = useMemo(() => {
		const counts = { pending: 0, submitted: 0, late: 0, graded: 0, excused: 0 };
		for (const row of draftRows) counts[row.status] += 1;
		const turnedIn = counts.submitted + counts.late + counts.graded;
		return { total: draftRows.length, turnedIn, ...counts };
	}, [draftRows]);

	function updateRow(studentId: string, patch: Partial<DraftRow>) {
		setDraftRows((rows) =>
			rows.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row)),
		);
	}

	function handleDiscard() {
		setDraftRows(savedRows);
	}

	async function handleSave() {
		for (const row of dirtyRows) {
			if (isCleared(row.status)) continue;
			const obtained = parseMarks(row.marksObtained);
			const total = parseMarks(row.totalMarks);
			if (Number.isNaN(obtained) || (obtained != null && obtained < 0)) {
				toast.show({
					title: "Invalid marks",
					description: `${row.studentName}: marks obtained must be a number of 0 or more.`,
					status: "error",
				});
				return;
			}
			if (Number.isNaN(total) || (total != null && total < 0)) {
				toast.show({
					title: "Invalid marks",
					description: `${row.studentName}: total marks must be a number of 0 or more.`,
					status: "error",
				});
				return;
			}
			if (obtained != null && total != null && obtained > total) {
				toast.show({
					title: "Invalid marks",
					description: `${row.studentName}: marks obtained cannot exceed total marks.`,
					status: "error",
				});
				return;
			}
		}

		const updates: SubmissionUpdateItem[] = dirtyRows.map((row) => {
			const cleared = isCleared(row.status);
			return {
				studentId: row.studentId,
				status: row.status,
				grade: cleared ? null : row.grade.trim() || null,
				marksObtained: cleared ? null : parseMarks(row.marksObtained),
				totalMarks: cleared ? null : parseMarks(row.totalMarks),
				feedback: cleared ? null : row.feedback.trim() || null,
			};
		});

		try {
			await saveMutation.mutateAsync({ submissions: updates });
			toast.show({
				title: "Submissions saved",
				description: `${updates.length} ${updates.length === 1 ? "entry" : "entries"} updated.`,
				status: "success",
			});
		} catch (error) {
			toast.show({
				title: "Could not save submissions",
				description: formatSaveError(error),
				status: "error",
			});
		}
	}

	if (submissionsQuery.isLoading) {
		return (
			<div className="space-y-2">
				<div className="grid gap-3 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
						<Skeleton key={index} className="h-16 w-full rounded-xl" />
					))}
				</div>
				<div className="space-y-2 rounded-md border border-border p-2">
					{Array.from({ length: 6 }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
						<Skeleton key={index} className="h-10 w-full" />
					))}
				</div>
			</div>
		);
	}

	if (submissionsQuery.error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					{submissionsQuery.error instanceof Error
						? submissionsQuery.error.message
						: "Failed to load submissions"}
				</AlertDescription>
			</Alert>
		);
	}

	if (draftRows.length === 0) {
		return (
			<EmptyState
				title="No submissions yet"
				description="No students are tracked for this assignment. Submissions appear here once homework is published to a class or selected students."
			/>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-4">
				{[
					{ label: "Submitted", value: `${stats.turnedIn}/${stats.total}` },
					{ label: "Graded", value: stats.graded },
					{ label: "Pending", value: stats.pending },
					{ label: "Excused", value: stats.excused },
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

			<div className="overflow-x-auto rounded-md border border-border bg-card">
				<Table>
					<TableHeader className="bg-muted/40">
						<TableRow>
							<TableHead>Student</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Submitted</TableHead>
							<TableHead>Grade &amp; marks</TableHead>
							<TableHead className="w-full">Feedback</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{draftRows.map((row) => {
							const cleared = isCleared(row.status);
							const gradeDisabled = !canWrite || cleared;
							return (
								<TableRow key={row.studentId} data-state={rowIsDirty(row) ? "dirty" : undefined}>
									<TableCell>
										<div className="font-medium">{row.studentName}</div>
										<div className="text-dashboard-text-muted text-[12px]">{row.studentCode}</div>
									</TableCell>
									<TableCell>
										{canWrite ? (
											<SelectField
												aria-label={`Status for ${row.studentName}`}
												items={statusOptions}
												value={row.status}
												size="sm"
												onValueChange={(value) =>
													updateRow(row.studentId, {
														status: value as HomeworkSubmissionStatus,
													})
												}
												triggerClassName={statusSelectClass[row.status]}
												className="min-w-[130px]"
											/>
										) : (
											<StatusBadge status={row.status} />
										)}
									</TableCell>
									<TableCell className="text-dashboard-text-secondary text-[13px]">
										{formatSubmitted(row.submittedAt)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1.5">
											<Input
												aria-label={`Grade for ${row.studentName}`}
												value={row.grade}
												disabled={gradeDisabled}
												onChange={(event) =>
													updateRow(row.studentId, { grade: event.target.value })
												}
												placeholder="A"
												className="h-8 w-14"
											/>
											<Input
												aria-label={`Marks obtained for ${row.studentName}`}
												type="number"
												min={0}
												value={row.marksObtained}
												disabled={gradeDisabled}
												onChange={(event) =>
													updateRow(row.studentId, { marksObtained: event.target.value })
												}
												className="h-8 w-16 text-end"
											/>
											<span className="text-dashboard-text-muted">/</span>
											<Input
												aria-label={`Total marks for ${row.studentName}`}
												type="number"
												min={0}
												value={row.totalMarks}
												disabled={gradeDisabled}
												onChange={(event) =>
													updateRow(row.studentId, { totalMarks: event.target.value })
												}
												className="h-8 w-16 text-end"
											/>
										</div>
									</TableCell>
									<TableCell>
										<Input
											aria-label={`Feedback for ${row.studentName}`}
											value={row.feedback}
											disabled={!canWrite}
											onChange={(event) =>
												updateRow(row.studentId, { feedback: event.target.value })
											}
											placeholder="Optional feedback"
											className="h-8 min-w-[200px]"
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{canWrite ? (
				<div className="flex flex-wrap items-center justify-end gap-3">
					<p className="me-auto text-dashboard-text-secondary text-[13px]">
						{hasChanges
							? `${dirtyRows.length} unsaved ${dirtyRows.length === 1 ? "change" : "changes"}`
							: "All changes saved"}
					</p>
					<Button variant="outline" size="sm" onClick={handleDiscard} disabled={!hasChanges}>
						Discard
					</Button>
					<Button
						size="sm"
						onClick={() => void handleSave()}
						disabled={!hasChanges || saveMutation.isPending}
					>
						{saveMutation.isPending ? "Saving…" : "Save all"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
