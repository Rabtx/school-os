"use client";

import { Analytics01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@school-os/ui/components/card";
import { EmptyState } from "@school-os/ui/components/empty-state";
import { SelectField } from "@school-os/ui/components/select-field";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { Spinner } from "@school-os/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@school-os/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@school-os/ui/components/tabs";
import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { cn } from "@/lib/utils";
import { useSectionsQuery } from "@/modules/academic/hooks/use-academic-queries";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import {
	useAttendanceReportQuery,
	useGradesReportQuery,
	useHomeworkReportQuery,
	useReportOverviewQuery,
} from "../hooks/use-reports-queries";
import type { ReportTerm } from "../types/reports.types";

const termOptions = [
	{ label: "Term 1", value: "term1" },
	{ label: "Term 2", value: "term2" },
	{ label: "Term 3", value: "term3" },
	{ label: "Final", value: "final" },
];

function formatPercent(value: number | null): string {
	if (value == null) return "—";
	return `${Math.round(value)}%`;
}

type StatCardProps = {
	label: string;
	value: string;
	hint?: string;
};

function StatCard({ label, value, hint }: StatCardProps) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-muted-foreground text-xs font-medium">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="font-semibold text-2xl tabular-nums">{value}</p>
				{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
			</CardContent>
		</Card>
	);
}

type BarRowProps = {
	label: string;
	value: number;
	total: number;
	className?: string;
};

function BarRow({ label, value, total, className }: BarRowProps) {
	const pct = total > 0 ? Math.round((value / total) * 100) : 0;
	return (
		<div className="flex items-center gap-3">
			<span className="w-24 shrink-0 text-muted-foreground text-xs">{label}</span>
			<div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
				<div
					className={cn("h-full rounded-full transition-all", className ?? "bg-primary")}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="w-14 shrink-0 text-end text-xs tabular-nums">{value}</span>
		</div>
	);
}

function OverviewTab({
	tenantId,
	sectionId,
	canRead,
}: {
	tenantId: string | null;
	sectionId: string;
	canRead: boolean;
}) {
	const query = useReportOverviewQuery(tenantId, sectionId ? { sectionId } : undefined, canRead);

	if (query.isLoading) {
		return (
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}

	if (!query.data) {
		return <EmptyState title="No data" description="No overview data available yet." />;
	}

	const { students, sections, subjects, assessments, attendance } = query.data;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Students" value={String(students)} />
				<StatCard label="Sections" value={String(sections)} />
				<StatCard label="Subjects" value={String(subjects)} />
				<StatCard label="Assessments" value={String(assessments)} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Attendance</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<StatCard
						label="Attendance rate"
						value={formatPercent(attendance.rate)}
						hint={`${attendance.present} present of ${attendance.marked} marked`}
					/>
				</CardContent>
			</Card>
		</div>
	);
}

function GradesTab({
	tenantId,
	sectionId,
	term,
	canRead,
}: {
	tenantId: string | null;
	sectionId: string;
	term: ReportTerm;
	canRead: boolean;
}) {
	const query = useGradesReportQuery(
		tenantId,
		sectionId ? { sectionId, term } : null,
		canRead && Boolean(sectionId),
	);

	if (!sectionId) {
		return (
			<EmptyState title="Select a section" description="Choose a section to view grade reports." />
		);
	}

	if (query.isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 5 }).map((_, index) => (
					// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (!query.data || query.data.subjects.length === 0) {
		return (
			<EmptyState title="No grades yet" description="No gradebook entries for this section." />
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2">
				<StatCard
					label="Overall average"
					value={formatPercent(query.data.overallAveragePercentage)}
				/>
				<StatCard label="Subjects" value={String(query.data.subjects.length)} />
			</div>
			<div className="overflow-x-auto rounded-md border border-border bg-card">
				<Table>
					<TableHeader className="bg-muted/40">
						<TableRow>
							<TableHead>Subject</TableHead>
							<TableHead className="text-center">Students</TableHead>
							<TableHead className="text-center">Entries</TableHead>
							<TableHead className="text-end">Average</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{query.data.subjects.map((subject) => (
							<TableRow key={subject.subjectId}>
								<TableCell className="font-medium">
									{subject.subjectName}
									<span className="ms-2 text-muted-foreground text-xs">{subject.subjectCode}</span>
								</TableCell>
								<TableCell className="text-center tabular-nums">{subject.studentCount}</TableCell>
								<TableCell className="text-center tabular-nums">{subject.entryCount}</TableCell>
								<TableCell className="text-end tabular-nums">
									{formatPercent(subject.averagePercentage)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function AttendanceTab({
	tenantId,
	sectionId,
	canRead,
}: {
	tenantId: string | null;
	sectionId: string;
	canRead: boolean;
}) {
	const query = useAttendanceReportQuery(
		tenantId,
		sectionId ? { sectionId } : null,
		canRead && Boolean(sectionId),
	);

	if (!sectionId) {
		return (
			<EmptyState
				title="Select a section"
				description="Choose a section to view attendance reports."
			/>
		);
	}

	if (query.isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, index) => (
					// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (!query.data || query.data.marked === 0) {
		return (
			<EmptyState title="No attendance yet" description="No attendance marks for this section." />
		);
	}

	const data = query.data;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Attendance rate" value={formatPercent(data.attendanceRate)} />
				<StatCard label="Sessions" value={String(data.sessionCount)} />
				<StatCard label="Present" value={String(data.present)} />
				<StatCard label="Absent" value={String(data.absent)} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Breakdown</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2.5">
					<BarRow
						label="Present"
						value={data.present}
						total={data.marked}
						className="bg-emerald-500"
					/>
					<BarRow label="Late" value={data.late} total={data.marked} className="bg-amber-500" />
					<BarRow label="Absent" value={data.absent} total={data.marked} className="bg-rose-500" />
					<BarRow label="Excused" value={data.excused} total={data.marked} className="bg-sky-500" />
				</CardContent>
			</Card>
		</div>
	);
}

function HomeworkTab({
	tenantId,
	sectionId,
	canRead,
}: {
	tenantId: string | null;
	sectionId: string;
	canRead: boolean;
}) {
	const query = useHomeworkReportQuery(
		tenantId,
		sectionId ? { sectionId } : null,
		canRead && Boolean(sectionId),
	);

	if (!sectionId) {
		return (
			<EmptyState
				title="Select a section"
				description="Choose a section to view homework reports."
			/>
		);
	}

	if (query.isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, index) => (
					// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
					<Skeleton key={index} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (!query.data || query.data.submissionCount === 0) {
		return (
			<EmptyState title="No homework yet" description="No homework submissions for this section." />
		);
	}

	const data = query.data;

	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Assignments" value={String(data.assignmentCount)} />
				<StatCard label="Submission rate" value={formatPercent(data.submissionRate)} />
				<StatCard label="Graded rate" value={formatPercent(data.gradedRate)} />
				<StatCard label="Pending" value={String(data.pending)} />
			</div>
			<Card>
				<CardHeader>
					<CardTitle className="text-sm">Submissions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2.5">
					<BarRow
						label="Graded"
						value={data.graded}
						total={data.submissionCount}
						className="bg-emerald-500"
					/>
					<BarRow
						label="Submitted"
						value={data.submitted}
						total={data.submissionCount}
						className="bg-sky-500"
					/>
					<BarRow
						label="Late"
						value={data.late}
						total={data.submissionCount}
						className="bg-amber-500"
					/>
					<BarRow
						label="Pending"
						value={data.pending}
						total={data.submissionCount}
						className="bg-muted-foreground"
					/>
				</CardContent>
			</Card>
		</div>
	);
}

export function ReportsPage() {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);

	const [sectionId, setSectionId] = useState("");
	const [term, setTerm] = useState<ReportTerm>("term1");

	const sectionsQuery = useSectionsQuery(tenantId, null, canRead);

	const sectionOptions = useMemo(
		() =>
			(sectionsQuery.data ?? []).map((section) => ({
				label: section.name,
				value: section.id,
			})),
		[sectionsQuery.data],
	);

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Reports" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<AdminPageShell title="Reports" description="You do not have permission to view reports.">
				<Alert variant="destructive">
					<AlertDescription>Missing assessments.read permission.</AlertDescription>
				</Alert>
			</AdminPageShell>
		);
	}

	return (
		<AdminPageShell
			title="Reports"
			description="Aggregated insights across grades, attendance, and homework"
			icon={Analytics01Icon}
		>
			<div className="mb-4 flex flex-wrap gap-3">
				<SelectField
					items={sectionOptions}
					value={sectionId}
					onValueChange={setSectionId}
					placeholder="All sections"
					className="min-w-[180px]"
				/>
				<SelectField
					items={termOptions}
					value={term}
					onValueChange={(value) => setTerm(value as ReportTerm)}
					className="min-w-[140px]"
				/>
			</div>

			<Tabs defaultValue="overview" className="w-full">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="grades">Grades</TabsTrigger>
					<TabsTrigger value="attendance">Attendance</TabsTrigger>
					<TabsTrigger value="homework">Homework</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-4">
					<OverviewTab tenantId={tenantId} sectionId={sectionId} canRead={canRead} />
				</TabsContent>
				<TabsContent value="grades" className="mt-4">
					<GradesTab tenantId={tenantId} sectionId={sectionId} term={term} canRead={canRead} />
				</TabsContent>
				<TabsContent value="attendance" className="mt-4">
					<AttendanceTab tenantId={tenantId} sectionId={sectionId} canRead={canRead} />
				</TabsContent>
				<TabsContent value="homework" className="mt-4">
					<HomeworkTab tenantId={tenantId} sectionId={sectionId} canRead={canRead} />
				</TabsContent>
			</Tabs>
		</AdminPageShell>
	);
}
