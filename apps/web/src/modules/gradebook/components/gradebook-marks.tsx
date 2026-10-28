"use client";

import { Download04Icon, MoreHorizontalIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertAction, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Meter, Trend } from "@rabtx/ui/meter";
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
import { useNow } from "@/lib/use-now";
import { downloadCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useMarksheetQuery } from "../hooks/use-gradebook-queries";
import {
	assessmentLabel,
	gradeTone,
	latestHomework,
	type MarkTone,
	type MarksSort,
	sortMarksRows,
} from "../lib/marks-format";
import type { MarksheetRow } from "../types/gradebook.types";

/** Test columns shown before the averages; older tests stay in the overall and the export. */
const VISIBLE_TESTS = 3;

const SORT_ITEMS: { label: string; value: MarksSort }[] = [
	{ label: "Overall", value: "overall" },
	{ label: "Name", value: "name" },
	{ label: "Needs marking", value: "waiting" },
];

const PILL_TONE: Record<MarkTone, string> = {
	neutral: "border-dashboard-border-strong text-dashboard-text-secondary",
	warning:
		"border-[color-mix(in_oklab,var(--rx-warning)_45%,transparent)] text-[var(--rx-warning)]",
	danger: "border-[color-mix(in_oklab,var(--rx-danger)_45%,transparent)] text-[var(--rx-danger)]",
};

const GRADE_TONE = {
	good: "text-[var(--rx-success)]",
	neutral: "text-dashboard-text-secondary",
	low: "text-[var(--rx-warning)]",
};

function checkAnswersHref(homeworkId: string): string {
	return `/admin/homework?tab=submissions&homeworkId=${homeworkId}`;
}

/** Figma teacher "Marks" (`167:37954`): every test and homework mark for one class subject. */
export function GradebookMarks({ tabs }: { tabs: ListPageTab[] }) {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, role } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const isTeacherScoped = role === "teacher" && !can(PermissionCodes.TENANT_MEMBERSHIP_READ);
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);
	const nowMs = useNow().getTime();

	const { options, isLoading: optionsLoading } = useSectionSubjectOptions(tenantId, campusId);
	const [pickedSectionId, setSectionId] = useState("");
	const [pickedSubjectId, setSubjectId] = useState("");
	const [sort, setSort] = useState<MarksSort>("overall");
	const [search, setSearch] = useState("");

	const classItems = useMemo(() => {
		const seen = new Map<string, string>();
		for (const option of options) seen.set(option.sectionId, option.sectionName);
		return [...seen].map(([value, label]) => ({ label, value }));
	}, [options]);
	const sectionId = pickedSectionId || classItems[0]?.value || "";
	const subjectItems = options
		.filter((option) => option.sectionId === sectionId)
		.map((option) => ({ label: option.subjectName, value: option.subjectId }));
	const subjectId = subjectItems.some((item) => item.value === pickedSubjectId)
		? pickedSubjectId
		: (subjectItems[0]?.value ?? "");
	const className = classItems.find((item) => item.value === sectionId)?.label ?? "";

	const marksQuery = useMarksheetQuery(
		tenantId,
		sectionId && subjectId ? { sectionId, subjectId } : null,
	);
	const sheet = marksQuery.data;
	const tests = (sheet?.assessments ?? []).slice(-VISIBLE_TESTS);
	const rows = useMemo(() => sortMarksRows(sheet?.rows ?? [], sort), [sheet?.rows, sort]);

	const table = useClientDataTable({
		data: rows,
		pageSize: 50,
		searchQuery: search,
		searchFn: (row, query) =>
			row.studentName.toLowerCase().includes(query) ||
			row.studentCode.toLowerCase().includes(query),
	});

	// The homework with the most answers waiting is where "Check answers" should land.
	const busiestHomework = useMemo(() => {
		if (!sheet) return null;
		let best: { id: string; title: string; waiting: number } | null = null;
		for (const assignment of sheet.homework) {
			const waiting = sheet.rows.filter((row) => {
				const status = row.homework[assignment.id]?.status;
				return status === "submitted" || status === "late";
			}).length;
			if (waiting > (best?.waiting ?? 0)) best = { ...assignment, waiting };
		}
		return best;
	}, [sheet]);

	const profileHref = (studentId: string) =>
		isTeacherScoped ? `/admin/my-classes/${sectionId}` : `/admin/students?student=${studentId}`;

	const columns: DataTableColumn<MarksheetRow>[] = [
		{
			id: "student",
			header: "Student",
			renderCell: (row) => (
				<span className="flex items-center gap-2.5 whitespace-nowrap font-medium">
					<Avatar name={row.studentName} />
					{row.studentName}
				</span>
			),
		},
		{
			id: "homework",
			header: "Latest homework",
			renderCell: (row) => {
				const pills = latestHomework(row, sheet?.homework ?? [], nowMs);
				if (pills.length === 0) return <span className="text-dashboard-text-dim">—</span>;
				return (
					<span className="flex gap-1.5">
						{pills.map((pill) => (
							<span
								key={pill.id}
								title={pill.title}
								className={cn(
									"inline-flex h-6 max-w-[160px] items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-[12px]",
									PILL_TONE[pill.tone],
								)}
							>
								<span className="truncate">{pill.title}</span>
								<span className="shrink-0">· {pill.label}</span>
							</span>
						))}
					</span>
				);
			},
		},
		...tests.map((test): DataTableColumn<MarksheetRow> => ({
			id: `test-${test.id}`,
			header: (
				<span className="block max-w-[120px] truncate" title={test.title}>
					{test.title}
				</span>
			),
			renderCell: (row) => {
				const label = assessmentLabel(row.assessments[test.id], test.maxScore);
				return (
					<span
						className={cn(
							"whitespace-nowrap tabular-nums",
							label === "—" && "text-dashboard-text-dim",
							label === "Absent" && "text-[var(--rx-warning)]",
						)}
					>
						{label}
					</span>
				);
			},
		})),
		{
			id: "homeworkAverage",
			header: "Homework average",
			renderCell: (row) => <Meter rate={row.homeworkAverage} />,
		},
		{
			id: "trend",
			header: "Trend",
			renderCell: (row) => (
				<Trend
					label={`${row.studentName} marks, oldest first`}
					threshold={60}
					values={row.trend.map((rate, index) => ({ label: `Mark ${index + 1}`, rate }))}
				/>
			),
		},
		{
			id: "overall",
			header: "Overall & grade",
			renderCell: (row) =>
				row.overall ? (
					<span className="flex items-center gap-2 whitespace-nowrap tabular-nums">
						{row.overall.percentage}%
						<span aria-hidden className="h-3 w-px bg-dashboard-border-strong" />
						<span className={GRADE_TONE[gradeTone(row.overall.grade)]}>{row.overall.grade}</span>
					</span>
				) : (
					<span className="text-dashboard-text-dim">Not marked</span>
				),
		},
		{
			id: "actions",
			header: <span className="sr-only">Actions</span>,
			headerClassName: "text-right",
			className: "text-right",
			renderCell: (row) => {
				const waitingOn = sheet?.homework.findLast((assignment) => {
					const status = row.homework[assignment.id]?.status;
					return status === "submitted" || status === "late";
				});
				return (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={`Actions for ${row.studentName}`}
								/>
							}
						>
							<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[200px]">
							<DropdownMenuGroup>
								<DropdownMenuLabel className="font-normal text-[12px] text-dashboard-text-dim">
									{row.studentName}
								</DropdownMenuLabel>
								{waitingOn ? (
									<DropdownMenuItem
										render={
											<Link href={checkAnswersHref(waitingOn.id)}>Mark {waitingOn.title}</Link>
										}
									/>
								) : null}
								<DropdownMenuItem
									render={<Link href={profileHref(row.studentId)}>Open profile</Link>}
								/>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				);
			},
		},
	];

	function exportCsv() {
		if (!sheet) return;
		downloadCsv(
			`marks-${className}-${sheet.subject.code}.csv`.replaceAll(/\s+/g, "-").toLowerCase(),
			[
				{ header: "Student", value: (row) => row.studentName },
				{ header: "Student code", value: (row) => row.studentCode },
				...sheet.homework.map((assignment) => ({
					header: assignment.title,
					value: (row: MarksheetRow) => {
						const mark = row.homework[assignment.id];
						if (!mark) return "";
						return mark.marksObtained !== null && mark.totalMarks !== null
							? `${mark.marksObtained}/${mark.totalMarks}`
							: mark.status;
					},
				})),
				...sheet.assessments.map((test) => ({
					header: test.title,
					value: (row: MarksheetRow) => {
						const label = assessmentLabel(row.assessments[test.id], test.maxScore);
						return label === "—" ? "" : label;
					},
				})),
				{ header: "Homework average %", value: (row) => row.homeworkAverage },
				{ header: "Overall %", value: (row) => row.overall?.percentage },
				{ header: "Grade", value: (row) => row.overall?.grade },
			],
			table.filteredRows,
		);
	}

	const waiting = sheet?.waitingCount ?? 0;

	return (
		<ListPage
			title="Gradebook"
			tabs={tabs}
			banner={
				sheet && waiting > 0 && busiestHomework ? (
					<Alert>
						<AlertDescription>
							{waiting} homework {waiting === 1 ? "answer is" : "answers are"} waiting for your
							marks in {className} {sheet.subject.name}
							{waiting === 1
								? ", on "
								: busiestHomework.waiting === waiting
									? ", all on "
									: `, ${busiestHomework.waiting} of them on `}
							{busiestHomework.title}. They count toward the overall once marked.
						</AlertDescription>
						<AlertAction>
							<Button
								size="sm"
								nativeButton={false}
								render={<Link href={checkAnswersHref(busiestHomework.id)} />}
							>
								Check answers
							</Button>
						</AlertAction>
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
							id: "sort",
							label: "Sort by",
							value: sort,
							onChange: (value) => setSort(value as MarksSort),
							items: SORT_ITEMS,
						},
						{
							id: "class",
							label: "Class",
							value: sectionId,
							onChange: setSectionId,
							items: classItems,
						},
						{
							id: "subject",
							label: "Subject",
							value: subjectId,
							onChange: setSubjectId,
							items: subjectItems,
						},
					]}
				>
					<Button
						size="sm"
						variant="outline"
						className="h-7 rounded-full"
						disabled={!sheet || sheet.rows.length === 0}
						onClick={exportCsv}
					>
						<HugeiconsIcon icon={Download04Icon} data-icon="inline-start" strokeWidth={2} />
						Export
					</Button>
					{canWrite ? (
						<Button
							size="sm"
							className="h-7 rounded-full"
							nativeButton={false}
							render={<Link href="/admin/assessments" />}
						>
							<HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" strokeWidth={2} />
							Add assessment
						</Button>
					) : null}
				</DataTableToolbar>
			}
			footer={
				sheet ? (
					<DataTableFooterBar
						shown={table.rows.length}
						total={table.totalRows}
						noun="students"
						stats={[
							{
								label: "Class average",
								value: sheet.classAverage === null ? "—" : `${sheet.classAverage}%`,
							},
							{ label: "Marks waiting", value: waiting, tone: waiting > 0 ? "warning" : undefined },
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
				loading={optionsLoading || marksQuery.isLoading}
				emptyState={
					search.trim() ? (
						<NoResults
							noun="students"
							filters={[
								{ key: "search", label: `"${search.trim()}"`, onRemove: () => setSearch("") },
							]}
							onClearAll={() => setSearch("")}
						/>
					) : undefined
				}
				emptyTitle={classItems.length === 0 ? "No classes to mark" : "No students in this class"}
				emptyDescription={
					classItems.length === 0
						? "Marks appear here once you are assigned a class subject."
						: "Students appear once they are enrolled in the class."
				}
			/>
		</ListPage>
	);
}
