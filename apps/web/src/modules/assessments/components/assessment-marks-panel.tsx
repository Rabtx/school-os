"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
	useAssessmentDetailQuery,
	useUpsertAssessmentResultsMutation,
} from "@/modules/assessments/hooks/use-assessments-queries";
import type {
	AssessmentDetail,
	AssessmentResultStatus,
} from "@/modules/assessments/types/assessments.types";
import { type ApprovalView, useMyApprovalsQuery, useRequestMarksChange } from "@/modules/approvals";
import { PermissionCodes, usePermissions } from "@/modules/tenants";

const statusOptions: { label: string; value: AssessmentResultStatus }[] = [
	{ label: "Pending", value: "pending" },
	{ label: "Graded", value: "graded" },
	{ label: "Absent", value: "absent" },
];

const statusBadgeClass: Record<AssessmentResultStatus, string> = {
	pending: "bg-muted text-muted-foreground",
	graded: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	absent: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

const statusSelectClass: Record<AssessmentResultStatus, string> = {
	pending: "border-border",
	graded: "border-emerald-500/50",
	absent: "border-rose-500/50",
};

type DraftRow = {
	studentId: string;
	studentName: string;
	studentCode: string;
	score: string;
	status: AssessmentResultStatus;
	remarks: string;
};

type ScoreError = {
	message: string;
};

type Props = {
	tenantId: string;
	assessment: AssessmentDetail;
};

function toDraftRow(result: AssessmentDetail["results"][number]): DraftRow {
	return {
		studentId: result.studentId,
		studentName: result.studentName,
		studentCode: result.studentCode,
		score: result.score != null ? String(result.score) : "",
		status: result.status,
		remarks: "",
	};
}

function parseScore(value: string): number | null {
	if (value.trim() === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function validateScore(score: number | null, maxScore: number): ScoreError | null {
	if (score == null) return null;
	if (Number.isNaN(score)) return { message: "Must be a number" };
	if (score < 0) return { message: "Cannot be negative" };
	if (score > maxScore) return { message: `Max is ${maxScore}` };
	return null;
}

function scoreToneClass(score: number, maxScore: number): string {
	const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
	if (percent >= 80) return "text-emerald-600 dark:text-emerald-400";
	if (percent >= 50) return "text-amber-600 dark:text-amber-500";
	return "text-rose-600 dark:text-rose-400";
}

function formatPercent(score: number, maxScore: number): string {
	if (maxScore <= 0) return "—";
	return `${Math.round((score / maxScore) * 100)}%`;
}

function formatSaveError(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Could not save marks";
}

function StatusBadge({ status }: { status: AssessmentResultStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClass[status]}>
			{status}
		</Badge>
	);
}

export function AssessmentMarksPanel({ tenantId, assessment }: Props) {
	const { can } = usePermissions();
	const toast = useToast();
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);
	const isLeadership = can(PermissionCodes.TENANT_SETTINGS_WRITE);

	const detailQuery = useAssessmentDetailQuery(tenantId, assessment.id);
	const saveMutation = useUpsertAssessmentResultsMutation(tenantId, assessment.id);

	const detail = detailQuery.data ?? assessment;
	const maxScore = detail.maxScore;
	// Closed marks feed report cards: teachers still edit, but changes go to the principal.
	const locked = canWrite && detail.status === "closed" && !isLeadership;
	const myApprovals = useMyApprovalsQuery(tenantId, locked);
	const requestChange = useRequestMarksChange(tenantId);
	const [changeNote, setChangeNote] = useState("");
	const askedByStudentId = useMemo(
		() => pendingMarkChanges(myApprovals.data, detail.id, maxScore),
		[detail.id, maxScore, myApprovals.data],
	);

	const [draftRows, setDraftRows] = useState<DraftRow[]>(() => detail.results.map(toDraftRow));
	const [savedRows, setSavedRows] = useState<DraftRow[]>(() => detail.results.map(toDraftRow));

	useEffect(() => {
		const mapped = detail.results.map(toDraftRow);
		setDraftRows(mapped);
		setSavedRows(mapped);
	}, [detail]);

	const savedByStudentId = useMemo(
		() => new Map(savedRows.map((row) => [row.studentId, row])),
		[savedRows],
	);

	const rowIsDirty = useCallback(
		(row: DraftRow): boolean => {
			const original = savedByStudentId.get(row.studentId);
			if (!original) return true;
			return (
				row.score !== original.score ||
				row.status !== original.status ||
				row.remarks !== original.remarks
			);
		},
		[savedByStudentId],
	);

	const dirtyRows = useMemo(() => draftRows.filter(rowIsDirty), [draftRows, rowIsDirty]);
	/** Rows whose mark (not just the remarks) changed: what a closed test sends for approval. */
	const changedMarks = useMemo(
		() =>
			draftRows.filter((row) => {
				const original = savedByStudentId.get(row.studentId);
				return (
					original &&
					(row.status !== original.status ||
						(row.status === "graded" && parseScore(row.score) !== parseScore(original.score)))
				);
			}),
		[draftRows, savedByStudentId],
	);
	const hasChanges = dirtyRows.length > 0;

	const scoreErrorsByStudentId = useMemo(() => {
		const errors = new Map<string, ScoreError>();
		for (const row of draftRows) {
			if (row.status !== "graded") continue;
			const error = validateScore(parseScore(row.score), maxScore);
			if (error) errors.set(row.studentId, error);
		}
		return errors;
	}, [draftRows, maxScore]);

	const hasScoreErrors = scoreErrorsByStudentId.size > 0;

	const updateRow = useCallback((studentId: string, patch: Partial<DraftRow>) => {
		setDraftRows((rows) =>
			rows.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row)),
		);
	}, []);

	function handleDiscard() {
		setDraftRows(savedRows);
	}

	async function handleSave() {
		if (hasScoreErrors) {
			toast.show({
				title: "Invalid marks",
				description: `Fix the highlighted scores before saving. Marks must be between 0 and ${maxScore}.`,
				status: "error",
			});
			return;
		}

		try {
			await saveMutation.mutateAsync({
				results: draftRows.map((row) => ({
					studentId: row.studentId,
					status: row.status,
					score: row.status === "graded" ? parseScore(row.score) : null,
				})),
			});
			toast.show({
				title: "Marks saved",
				description: `${draftRows.length} ${
					draftRows.length === 1 ? "student" : "students"
				} updated for this assessment.`,
				status: "success",
			});
		} catch (error) {
			toast.show({
				title: "Could not save marks",
				description: formatSaveError(error),
				status: "error",
			});
		}
	}

	async function handleRequestChanges() {
		if (hasScoreErrors) {
			toast.show({
				title: "Invalid marks",
				description: `Marks must be between 0 and ${maxScore}.`,
				status: "error",
			});
			return;
		}
		let sent = 0;
		const failed: string[] = [];
		for (const row of changedMarks) {
			try {
				// oxlint-disable-next-line no-await-in-loop -- one request per student, in order
				await requestChange.mutateAsync({
					input: {
						assessmentId: detail.id,
						studentId: row.studentId,
						status: row.status,
						score: row.status === "graded" ? parseScore(row.score) : null,
					},
					note: changeNote.trim(),
				});
				sent += 1;
			} catch (error) {
				failed.push(`${row.studentName}: ${formatSaveError(error)}`);
			}
		}
		setDraftRows(savedRows);
		setChangeNote("");
		if (sent > 0) {
			toast.show({
				title: `Sent ${sent} ${sent === 1 ? "change" : "changes"} to the principal`,
				description: "Marks stay as they are until it is approved.",
				status: "success",
			});
		}
		if (failed.length > 0) {
			toast.show({
				title: "Some changes were not sent",
				description: failed.join(" · "),
				status: "error",
			});
		}
	}

	if (detailQuery.isLoading) {
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

	if (detailQuery.error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					{detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load marks"}
				</AlertDescription>
			</Alert>
		);
	}

	if (draftRows.length === 0) {
		return (
			<EmptyState
				icon={<HugeiconsIcon icon={File02Icon} size={26} strokeWidth={1.8} />}
				title="No students assigned"
				description="Assign this assessment to a class or selected students to start entering marks."
			/>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-4">
				{[
					{ label: "Graded", value: detail.summary.graded },
					{ label: "Pending", value: detail.summary.pending },
					{ label: "Absent", value: detail.summary.absent },
					{
						label: `Class average · out of ${maxScore}`,
						value: detail.summary.averageScore != null ? String(detail.summary.averageScore) : "—",
					},
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
							<TableHead>Marks</TableHead>
							<TableHead className="w-full">Remarks</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{draftRows.map((row) => {
							const graded = row.status === "graded";
							const scoreError = graded ? scoreErrorsByStudentId.get(row.studentId) : undefined;
							const parsedScore = parseScore(row.score);
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
													updateRow(row.studentId, { status: value as AssessmentResultStatus })
												}
												triggerClassName={statusSelectClass[row.status]}
												className="min-w-[130px]"
											/>
										) : (
											<StatusBadge status={row.status} />
										)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<Input
												aria-label={`Marks for ${row.studentName}`}
												aria-invalid={scoreError ? true : undefined}
												type="number"
												inputMode="decimal"
												min={0}
												max={maxScore}
												step="any"
												value={row.score}
												disabled={!canWrite || !graded}
												onChange={(event) =>
													updateRow(row.studentId, { score: event.target.value })
												}
												placeholder="—"
												className="h-8 w-20 text-end"
											/>
											<div className="min-w-[72px]">
												<p className="text-dashboard-text-muted text-[12px]">/ {maxScore}</p>
												{graded && parsedScore != null && !scoreError ? (
													<p
														className={`font-medium text-[12px] ${scoreToneClass(parsedScore, maxScore)}`}
													>
														{formatPercent(parsedScore, maxScore)}
													</p>
												) : null}
											</div>
										</div>
										{scoreError ? (
											<p className="mt-1 text-[12px] text-destructive">{scoreError.message}</p>
										) : null}
										{askedByStudentId.get(row.studentId) ? (
											<p className="mt-1 text-[12px] text-[var(--rx-accent)]">
												Asked to change to {askedByStudentId.get(row.studentId)}
											</p>
										) : null}
									</TableCell>
									<TableCell>
										{/* Remarks are a local drafting aid: the results upsert endpoint is strict and does not persist them yet. */}
										<Input
											aria-label={`Remarks for ${row.studentName}`}
											value={row.remarks}
											disabled={!canWrite}
											onChange={(event) =>
												updateRow(row.studentId, { remarks: event.target.value })
											}
											placeholder="Optional remarks"
											className="h-8 min-w-[180px]"
										/>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{locked ? (
				<div className="space-y-3 rounded-[10px] border border-dashboard-border bg-dashboard-surface p-3">
					<p className="text-[13px] text-dashboard-text-secondary">
						This test is closed, so its marks are on report cards. Change a mark above and send it
						to the principal; it changes once they approve.
					</p>
					{changedMarks.length > 0 ? (
						<Input
							aria-label="Why the marks need changing"
							value={changeNote}
							onChange={(event) => setChangeNote(event.target.value)}
							placeholder="Why (the principal sees this): rechecked the paper, totals were wrong"
							maxLength={500}
							className="h-8"
						/>
					) : null}
					<div className="flex flex-wrap items-center justify-end gap-3">
						<p className="me-auto text-dashboard-text-secondary text-[13px]">
							{changedMarks.length > 0
								? `${changedMarks.length} ${changedMarks.length === 1 ? "mark" : "marks"} to send`
								: "No changes"}
						</p>
						<Button variant="outline" size="sm" onClick={handleDiscard} disabled={!hasChanges}>
							Discard
						</Button>
						<Button
							size="sm"
							onClick={() => void handleRequestChanges()}
							disabled={changedMarks.length === 0 || hasScoreErrors || requestChange.isPending}
						>
							{requestChange.isPending ? "Sending…" : "Send for approval"}
						</Button>
					</div>
				</div>
			) : canWrite ? (
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
						disabled={!hasChanges || hasScoreErrors || saveMutation.isPending}
					>
						{saveMutation.isPending ? "Saving…" : "Save all"}
					</Button>
				</div>
			) : null}
		</div>
	);
}

/** Marks this teacher already asked to change on this test, by student: "21 / 25". */
function pendingMarkChanges(
	requests: ApprovalView[] | undefined,
	assessmentId: string,
	maxScore: number,
): Map<string, string> {
	const asked = new Map<string, string>();
	for (const request of requests ?? []) {
		if (request.type !== "marks_change" || request.status !== "pending") continue;
		if (request.payload.assessmentId !== assessmentId) continue;
		const { studentId, status, score } = request.payload;
		if (typeof studentId !== "string") continue;
		asked.set(
			studentId,
			status === "absent"
				? "absent"
				: typeof score === "number"
					? `${score} / ${maxScore}`
					: "not marked",
		);
	}
	return asked;
}
