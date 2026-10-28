"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useEffect, useMemo, useState } from "react";
import { InitialsAvatar } from "@/components/initials-avatar";
import { cn } from "@/lib/utils";
import {
	useAcademicYearsQuery,
	useSectionsQuery,
} from "@/modules/academic/hooks/use-academic-queries";
import { useStudentAttendanceHistoryQuery } from "@/modules/attendance/hooks/use-attendance-queries";
import { useGradebookGridQuery } from "@/modules/gradebook/hooks/use-gradebook-queries";
import type {
	GradebookGrid,
	GradebookGridRow,
	GradebookTerm,
} from "@/modules/gradebook/types/gradebook.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { NoAccess } from "@/components/states";

const TERMS: { label: string; value: GradebookTerm }[] = [
	{ label: "Term 1", value: "term1" },
	{ label: "Term 2", value: "term2" },
	{ label: "Term 3", value: "term3" },
	{ label: "Final", value: "final" },
];

/** Same scale as the API (`gradeFromPercentage`). */
function gradeFromPercentage(percentage: number): string {
	if (percentage >= 90) return "A+";
	if (percentage >= 80) return "A";
	if (percentage >= 70) return "B";
	if (percentage >= 60) return "C";
	if (percentage >= 50) return "D";
	if (percentage >= 40) return "E";
	return "F";
}

type RowState = { label: string; tone: "success" | "warning" | "neutral" };

function overallGrade(row: GradebookGridRow): string | null {
	const cells = Object.values(row.cells);
	if (cells.length === 0) return null;
	const average = cells.reduce((sum, cell) => sum + cell.percentage, 0) / cells.length;
	return gradeFromPercentage(average);
}

function rowState(row: GradebookGridRow, subjectCount: number): RowState {
	const graded = Object.keys(row.cells).length;
	if (graded === 0) return { label: "Not started", tone: "neutral" };
	if (graded < subjectCount) return { label: "Missing grade", tone: "warning" };
	return { label: "Complete", tone: "success" };
}

const toneClass = {
	success: "bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]",
	warning: "bg-[color-mix(in_oklab,var(--rx-warning)_16%,transparent)] text-[var(--rx-warning)]",
	neutral: "bg-dashboard-hover text-dashboard-text-secondary",
};

function gradeTone(grade: string | undefined): string {
	if (!grade) return "text-dashboard-text-dim";
	if (grade === "F" || grade === "E") return "text-[var(--rx-danger)]";
	return "text-dashboard-text-primary";
}

/** Figma "Report cards" (gradebook `77:90702`): class grade matrix and a student panel. */
export function GradebookPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);

	const [sectionId, setSectionId] = useState("");
	const [term, setTerm] = useState<GradebookTerm>("term1");
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const sectionsQuery = useSectionsQuery(tenantId, campusId, canRead);
	const yearsQuery = useAcademicYearsQuery(tenantId, canRead);
	const activeYearId = yearsQuery.data?.find((year) => year.status === "active")?.id;
	const sectionOptions = useMemo(
		() =>
			(sectionsQuery.data ?? [])
				.filter((section) => !activeYearId || section.academicYearId === activeYearId)
				.map((section) => ({ label: section.name, value: section.id })),
		[activeYearId, sectionsQuery.data],
	);

	useEffect(() => {
		if (!sectionId && sectionOptions[0]) setSectionId(sectionOptions[0].value);
	}, [sectionId, sectionOptions]);

	const gridQuery = useGradebookGridQuery(
		tenantId,
		sectionId ? { sectionId, term } : null,
		canRead && Boolean(sectionId),
	);
	const grid = gridQuery.data;
	const rows = grid?.rows ?? [];
	const selectedIndex = Math.max(
		0,
		rows.findIndex((row) => row.studentId === selectedId),
	);
	const selected = rows[selectedIndex];
	const sectionLabel = sectionOptions.find((option) => option.value === sectionId)?.label;
	const termLabel = TERMS.find((option) => option.value === term)?.label ?? "";
	const complete = rows.filter(
		(row) => rowState(row, grid?.subjects.length ?? 0).label === "Complete",
	).length;

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
				title="The gradebook is not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-4 px-4 py-5 tracking-[-0.15px] sm:px-6">
			<header className="flex flex-wrap items-end gap-3">
				<div className="min-w-0 flex-1">
					<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
						Report cards · {termLabel}
					</h1>
					<p className="text-[14px] text-dashboard-text-dim leading-5">
						{sectionLabel ? `Class ${sectionLabel} · ` : ""}
						{grid ? `${complete} of ${rows.length} students fully graded` : "Choose a class"}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Pill label="Class">
						<SelectField
							aria-label="Class"
							items={sectionOptions}
							value={sectionId}
							onValueChange={(value) => {
								setSectionId(value);
								setSelectedId(null);
							}}
							placeholder="Select"
							className={PILL_CONTROL}
						/>
					</Pill>
					<Pill label="Term">
						<SelectField
							aria-label="Term"
							items={TERMS}
							value={term}
							onValueChange={(value) => setTerm(value as GradebookTerm)}
							className={PILL_CONTROL}
						/>
					</Pill>
				</div>
			</header>

			<div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
				<section className="min-h-0 overflow-auto rounded-[12px] border border-dashboard-border bg-dashboard-surface">
					{gridQuery.isLoading || !sectionId ? (
						<div className="flex h-40 items-center justify-center text-[13px] text-dashboard-text-dim">
							{sectionId ? <Spinner className="size-5" /> : "Choose a class to see its grades."}
						</div>
					) : !grid || rows.length === 0 ? (
						<div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
							<p className="font-medium text-[14px] text-dashboard-text-primary">No grades yet</p>
							<p className="text-[13px] text-dashboard-text-dim">
								Grades appear here as tests are marked and homework is graded.
							</p>
						</div>
					) : (
						<GradeTable
							grid={grid}
							selectedId={selected?.studentId ?? null}
							onSelect={setSelectedId}
						/>
					)}
				</section>

				{grid && selected ? (
					<StudentPanel
						tenantId={tenantId}
						grid={grid}
						row={selected}
						position={selectedIndex + 1}
						total={rows.length}
						sectionLabel={sectionLabel}
						onPrevious={() => setSelectedId(rows[selectedIndex - 1]?.studentId ?? null)}
						onNext={() => setSelectedId(rows[selectedIndex + 1]?.studentId ?? null)}
					/>
				) : null}
			</div>
		</div>
	);
}

const PILL_CONTROL =
	"h-full min-w-[96px] rounded-none border-0 bg-transparent font-medium text-[13px] text-dashboard-text-primary shadow-none dark:bg-transparent";

function Pill({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex h-7 items-center overflow-hidden rounded-full border border-dashboard-border-strong bg-dashboard-surface text-[13px]">
			<span className="flex h-full items-center border-dashboard-border border-e px-3 text-dashboard-text-dim">
				{label}
			</span>
			{children}
		</div>
	);
}

function GradeTable({
	grid,
	selectedId,
	onSelect,
}: {
	grid: GradebookGrid;
	selectedId: string | null;
	onSelect: (studentId: string) => void;
}) {
	return (
		<table className="w-full text-[13px]">
			<thead className="sticky top-0 bg-dashboard-surface">
				<tr className="text-[12px] text-dashboard-text-dim shadow-[inset_0_-1px_0_var(--dashboard-border)]">
					<th className="h-10 px-4 text-start font-normal">Student</th>
					{grid.subjects.map((subject) => (
						<th key={subject.id} className="h-10 px-3 text-start font-normal" title={subject.name}>
							{subject.code}
						</th>
					))}
					<th className="h-10 px-3 text-start font-normal">Overall</th>
					<th className="h-10 px-4 text-start font-normal">Grades</th>
				</tr>
			</thead>
			<tbody>
				{grid.rows.map((row) => {
					const state = rowState(row, grid.subjects.length);
					const selected = row.studentId === selectedId;
					return (
						<tr
							key={row.studentId}
							aria-selected={selected}
							onClick={() => onSelect(row.studentId)}
							className={cn(
								"cursor-pointer border-dashboard-border border-b last:border-0 hover:bg-dashboard-hover/60",
								selected && "bg-dashboard-hover",
							)}
						>
							<td className="px-4 py-2">
								<button
									type="button"
									onClick={() => onSelect(row.studentId)}
									className="flex items-center gap-2.5 whitespace-nowrap text-start font-medium text-dashboard-text-primary"
								>
									<InitialsAvatar name={row.studentName} />
									{row.studentName}
								</button>
							</td>
							{grid.subjects.map((subject) => {
								const cell = row.cells[subject.id];
								return (
									<td key={subject.id} className={cn("px-3 py-2", gradeTone(cell?.grade))}>
										{cell?.grade ?? "—"}
									</td>
								);
							})}
							<td className="px-3 py-2 font-medium text-dashboard-text-primary">
								{overallGrade(row) ?? "—"}
							</td>
							<td className="px-4 py-2">
								<span
									className={cn(
										"inline-flex h-5 items-center gap-1.5 rounded-[4px] px-1.5 text-[12px]",
										toneClass[state.tone],
									)}
								>
									{state.tone !== "neutral" ? (
										<span aria-hidden className="size-1.5 rounded-full bg-current" />
									) : null}
									{state.label}
								</span>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

function StudentPanel({
	tenantId,
	grid,
	row,
	position,
	total,
	sectionLabel,
	onPrevious,
	onNext,
}: {
	tenantId: string | null;
	grid: GradebookGrid;
	row: GradebookGridRow;
	position: number;
	total: number;
	sectionLabel?: string;
	onPrevious: () => void;
	onNext: () => void;
}) {
	const { can } = usePermissions();
	const historyQuery = useStudentAttendanceHistoryQuery(
		tenantId,
		row.studentId,
		can(PermissionCodes.ATTENDANCE_READ),
	);
	const attendance = useMemo(() => {
		const recent = (historyQuery.data ?? []).slice(0, 30);
		if (recent.length === 0) return null;
		const attended = recent.filter((entry) =>
			["present", "late", "excused"].includes(entry.mark.status),
		).length;
		const late = recent.filter((entry) => entry.mark.status === "late").length;
		return { rate: Math.round((attended / recent.length) * 100), late, sessions: recent.length };
	}, [historyQuery.data]);

	return (
		<aside className="flex min-h-0 flex-col gap-4 overflow-auto rounded-[12px] border border-dashboard-border bg-dashboard-surface p-4">
			<header className="flex items-center gap-3">
				<InitialsAvatar name={row.studentName} tone="accent" className="size-8 text-[12px]" />
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-[14px] text-dashboard-text-primary">
						{row.studentName}
					</p>
					<p className="truncate text-[12px] text-dashboard-text-dim">
						{[sectionLabel, row.studentCode, `${position} of ${total}`].filter(Boolean).join(" · ")}
					</p>
				</div>
				<div className="flex gap-1">
					<PanelNavButton label="Previous student" disabled={position <= 1} onClick={onPrevious}>
						<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.8} />
					</PanelNavButton>
					<PanelNavButton label="Next student" disabled={position >= total} onClick={onNext}>
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />
					</PanelNavButton>
				</div>
			</header>

			<div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
				{grid.subjects.map((subject) => {
					const cell = row.cells[subject.id];
					return (
						<div
							key={subject.id}
							className="flex flex-col items-center rounded-[8px] bg-dashboard-hover/60 px-2 py-2"
							title={
								cell ? `${cell.obtainedMarks}/${cell.totalMarks} (${cell.percentage}%)` : undefined
							}
						>
							<span className={cn("font-medium text-[15px]", gradeTone(cell?.grade))}>
								{cell?.grade ?? "—"}
							</span>
							<span className="max-w-full truncate text-[12px] text-dashboard-text-dim">
								{subject.name}
							</span>
						</div>
					);
				})}
			</div>

			<section>
				<p className="mb-2 text-[12px] text-dashboard-text-dim uppercase">What School OS used</p>
				<dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px]">
					<dt className="text-dashboard-text-dim">Attendance</dt>
					<dd className="text-dashboard-text-primary">
						{attendance
							? `${attendance.rate}% · ${attendance.late} late (last ${attendance.sessions} sessions)`
							: "No attendance marked yet"}
					</dd>
					<dt className="text-dashboard-text-dim">Grades</dt>
					<dd className="text-dashboard-text-primary">
						{Object.keys(row.cells).length} of {grid.subjects.length} subjects graded
					</dd>
				</dl>
			</section>

			<section className="rounded-[8px] border border-dashboard-border border-dashed p-3">
				<div className="flex items-start gap-2.5">
					<HugeiconsIcon
						icon={SparklesIcon}
						size={16}
						strokeWidth={1.8}
						className="mt-0.5 shrink-0 text-dashboard-text-dim"
					/>
					<div>
						<p className="font-medium text-[13px] text-dashboard-text-primary">Teacher comment</p>
						<p className="text-[12px] text-dashboard-text-dim leading-4">
							Drafted comments with approve and publish to parents arrive with the learning loop.
							Grades above are already live.
						</p>
					</div>
				</div>
			</section>
		</aside>
	);
}

function PanelNavButton({
	label,
	disabled,
	onClick,
	children,
}: {
	label: string;
	disabled: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className="flex size-7 items-center justify-center rounded-md border border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover disabled:opacity-40"
		>
			{children}
		</button>
	);
}
