"use client";

import { Calendar03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	useClientDataTable,
} from "@/components/data-table";
import { ListPage } from "@/components/list-page";
import { NoAccess, NoResults } from "@/components/states";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { useAssessmentsListQuery } from "@/modules/assessments/hooks/use-assessments-queries";
import type { AssessmentListItem } from "@/modules/assessments/types/assessments.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { isQuiz, type ResultTone, resultSummary, scheduleLabel } from "../lib/assessment-format";
import { AssessmentCreateSheet } from "./assessment-create-sheet";
import { AssessmentPanel } from "./assessment-panel";

type SortKey = "date" | "title" | "class";

const SORT_ITEMS: { label: string; value: SortKey }[] = [
	{ label: "Date", value: "date" },
	{ label: "Title", value: "title" },
	{ label: "Class", value: "class" },
];

const STATUS_ITEMS = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Closed", value: "closed" },
];

const RESULT_TONE: Record<ResultTone, string> = {
	neutral: "text-dashboard-text-secondary",
	warning: "text-[var(--rx-warning)]",
	good: "text-dashboard-text-primary",
};

function sortRows(rows: AssessmentListItem[], sort: SortKey): AssessmentListItem[] {
	if (sort === "title") return rows.toSorted((a, b) => a.title.localeCompare(b.title));
	if (sort === "class") {
		return rows.toSorted(
			(a, b) =>
				a.sectionName.localeCompare(b.sectionName) || b.assessedOn.localeCompare(a.assessedOn),
		);
	}
	// Newest first, so this week's tests sit at the top.
	return rows.toSorted(
		(a, b) =>
			b.assessedOn.localeCompare(a.assessedOn) ||
			(b.startsAt ?? "").localeCompare(a.startsAt ?? ""),
	);
}

/** Figma teacher "Tests" (`181:49526`): tests and quizzes with results and a detail panel. */
export function AssessmentsPage() {
	const searchParams = useSearchParams();
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);
	const todayIso = useNow().toLocaleDateString("en-CA");

	const tab = searchParams.get("tab") === "quizzes" ? "quizzes" : "tests";
	const [sort, setSort] = useState<SortKey>("date");
	const [classFilter, setClassFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [search, setSearch] = useState("");
	const [openId, setOpenId] = useState<string | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	const { options: sectionSubjectOptions } = useSectionSubjectOptions(tenantId, campusId);
	const listQuery = useAssessmentsListQuery(tenantId, {}, canRead);
	const all = useMemo(() => listQuery.data ?? [], [listQuery.data]);
	const inTab = useMemo(
		() => all.filter((row) => (tab === "quizzes" ? isQuiz(row) : !isQuiz(row))),
		[all, tab],
	);
	const rows = useMemo(() => sortRows(inTab, sort), [inTab, sort]);

	const table = useClientDataTable({
		data: rows,
		pageSize: 50,
		searchQuery: search,
		searchFn: (row, query) =>
			row.title.toLowerCase().includes(query) ||
			row.sectionName.toLowerCase().includes(query) ||
			row.subjectName.toLowerCase().includes(query),
		filterFn: (row, filters) =>
			(!filters.class || row.sectionSubjectId === filters.class) &&
			(!filters.status || row.status === filters.status),
	});

	const open = all.find((row) => row.id === openId) ?? null;
	const drafts = inTab.filter((row) => row.status === "draft").length;
	const awaitingMarks = inTab.filter(
		(row) => resultSummary(row, todayIso).label === "Waiting for marks",
	).length;
	const averages = table.filteredRows
		.map((row) => row.results.averagePercentage)
		.filter((value): value is number => value !== null);
	const classAverage =
		averages.length > 0
			? Math.round((averages.reduce((sum, value) => sum + value, 0) / averages.length) * 10) / 10
			: null;
	const noun = tab === "quizzes" ? "quizzes" : "tests";

	const columns: DataTableColumn<AssessmentListItem>[] = [
		{
			id: "title",
			header: tab === "quizzes" ? "Quiz" : "Test",
			renderCell: (row) => (
				<button
					type="button"
					onClick={() => setOpenId(row.id)}
					className="text-start font-medium hover:underline"
				>
					{row.title}
				</button>
			),
		},
		{
			id: "class",
			header: "Class",
			renderCell: (row) => (
				<span className="flex items-center gap-1.5 whitespace-nowrap">
					<Chip>{row.sectionName}</Chip>
					<span className="text-dashboard-text-dim">{row.subjectName}</span>
					{row.status === "draft" ? <Chip>Draft</Chip> : null}
					{row.type === "exam" ? <Chip>Exam</Chip> : null}
				</span>
			),
		},
		{
			id: "date",
			header: "Date",
			renderCell: (row) => <span className="whitespace-nowrap">{scheduleLabel(row)}</span>,
		},
		{
			id: "duration",
			header: "Duration",
			renderCell: (row) =>
				row.durationMinutes ? (
					<span className="tabular-nums">{row.durationMinutes} min</span>
				) : (
					<span className="text-dashboard-text-dim">—</span>
				),
		},
		{
			id: "students",
			header: "Students",
			renderCell: (row) => <span className="tabular-nums">{row.recipientCount}</span>,
		},
		{
			id: "result",
			header: "Result",
			renderCell: (row) => {
				const result = resultSummary(row, todayIso);
				return (
					<span className={cn("whitespace-nowrap", RESULT_TONE[result.tone])}>{result.label}</span>
				);
			},
		},
	];

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
				title="Tests and exams are not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	const statusLabel = STATUS_ITEMS.find((item) => item.value === statusFilter)?.label;
	const classLabel = sectionSubjectOptions.find((option) => option.value === classFilter)?.label;

	return (
		<ListPage
			title="Tests & exams"
			tabs={[
				{ label: "Tests", href: "/admin/assessments", active: tab === "tests" },
				{ label: "Quizzes", href: "/admin/assessments?tab=quizzes", active: tab === "quizzes" },
			]}
			banner={
				listQuery.error ? (
					<Alert variant="destructive">
						<AlertDescription>
							{listQuery.error instanceof Error ? listQuery.error.message : "Could not load tests"}
						</AlertDescription>
					</Alert>
				) : drafts > 0 || awaitingMarks > 0 ? (
					<Alert>
						<AlertDescription>
							{[
								drafts > 0
									? `${drafts} ${drafts === 1 ? "draft is" : "drafts are"} not sent yet`
									: null,
								awaitingMarks > 0
									? `${awaitingMarks} past ${awaitingMarks === 1 ? "one is" : "ones are"} waiting for marks`
									: null,
							]
								.filter(Boolean)
								.join(" and ")}
							. Open one to publish it or enter marks.
						</AlertDescription>
					</Alert>
				) : undefined
			}
			toolbar={
				<DataTableToolbar
					className="border-0 px-4 sm:px-6"
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder={`Search ${noun}`}
					filters={[
						{
							id: "sort",
							label: "Sort by",
							value: sort,
							onChange: (value) => setSort(value as SortKey),
							items: SORT_ITEMS,
						},
						{
							id: "class",
							label: "Class",
							value: classFilter,
							placeholder: "All",
							nullable: true,
							onChange: (value) => {
								setClassFilter(value);
								table.setFilter("class", value);
							},
							items: sectionSubjectOptions.map((option) => ({
								label: option.label,
								value: option.value,
							})),
						},
						{
							id: "status",
							label: "Status",
							value: statusFilter,
							placeholder: "Any",
							nullable: true,
							onChange: (value) => {
								setStatusFilter(value);
								table.setFilter("status", value);
							},
							items: STATUS_ITEMS,
						},
					]}
				>
					<Button
						size="sm"
						variant="outline"
						className="h-7 rounded-full"
						nativeButton={false}
						render={<Link href="/admin/test-planner" />}
					>
						<HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" strokeWidth={2} />
						Test planner
					</Button>
					{canWrite ? (
						<Button size="sm" className="h-7 rounded-full" onClick={() => setSheetOpen(true)}>
							<HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" strokeWidth={2} />
							{tab === "quizzes" ? "New quiz" : "New test"}
						</Button>
					) : null}
				</DataTableToolbar>
			}
			footer={
				<DataTableFooterBar
					shown={table.rows.length}
					total={table.totalRows}
					noun={noun}
					stats={[
						{ label: "Drafts", value: drafts },
						{ label: "Class average", value: classAverage === null ? "—" : `${classAverage}%` },
					]}
					pageIndex={table.pageIndex}
					pageCount={table.pageCount}
					pageSize={table.pageSize}
					onPageChange={table.setPageIndex}
					onPageSizeChange={table.setPageSize}
				/>
			}
		>
			<DataTable
				fullBleed
				columns={columns}
				rows={table.rows}
				getRowId={(row) => row.id}
				loading={listQuery.isLoading}
				emptyState={
					search.trim() || classFilter || statusFilter ? (
						<NoResults
							noun={noun}
							filters={[
								...(search.trim()
									? [{ key: "search", label: `"${search.trim()}"`, onRemove: () => setSearch("") }]
									: []),
								...(classFilter
									? [
											{
												key: "class",
												label: classLabel ?? "Class",
												onRemove: () => {
													setClassFilter("");
													table.setFilter("class", "");
												},
											},
										]
									: []),
								...(statusFilter
									? [
											{
												key: "status",
												label: statusLabel ?? "Status",
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
								setClassFilter("");
								setStatusFilter("");
								table.setFilter("class", "");
								table.setFilter("status", "");
							}}
						/>
					) : undefined
				}
				emptyTitle={tab === "quizzes" ? "No quizzes yet" : "No tests yet"}
				emptyDescription={
					canWrite
						? `Create one with ${tab === "quizzes" ? "New quiz" : "New test"}, then enter marks once it is done.`
						: `No ${noun} to show.`
				}
			/>

			<AssessmentPanel
				tenantId={tenantId}
				row={open}
				todayIso={todayIso}
				canWrite={canWrite}
				onClose={() => setOpenId(null)}
			/>
			<AssessmentCreateSheet
				key={tab}
				tenantId={tenantId}
				campusId={campusId}
				open={sheetOpen}
				defaultType={tab === "quizzes" ? "quiz" : "test"}
				onOpenChange={setSheetOpen}
			/>
		</ListPage>
	);
}

function Chip({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex h-6 items-center rounded-full border border-dashboard-border-strong px-2.5 text-[12px] text-dashboard-text-secondary">
			{children}
		</span>
	);
}
