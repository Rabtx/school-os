"use client";

import { BookOpen01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
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
import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { useSectionsQuery } from "@/modules/academic/hooks/use-academic-queries";
import { useGradebookGridQuery } from "@/modules/gradebook/hooks/use-gradebook-queries";
import type { GradebookTerm } from "@/modules/gradebook/types/gradebook.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";

const termOptions = [
	{ label: "Term 1", value: "term1" },
	{ label: "Term 2", value: "term2" },
	{ label: "Term 3", value: "term3" },
	{ label: "Final", value: "final" },
];

function gradeBadgeVariant(grade: string): "default" | "secondary" | "destructive" | "outline" {
	if (grade.startsWith("A")) return "default";
	if (grade.startsWith("B") || grade.startsWith("C")) return "secondary";
	if (grade === "F") return "destructive";
	return "outline";
}

export function GradebookPage() {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);

	const [sectionId, setSectionId] = useState("");
	const [term, setTerm] = useState<GradebookTerm>("term1");

	const sectionsQuery = useSectionsQuery(tenantId, null, canRead);
	const gridQuery = useGradebookGridQuery(
		tenantId,
		sectionId ? { sectionId, term } : null,
		canRead && Boolean(sectionId),
	);

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
			<AdminPageShell title="Gradebook" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<AdminPageShell
				title="Gradebook"
				description="You do not have permission to view the gradebook."
			>
				<Alert variant="destructive">
					<AlertDescription>Missing assessments.read permission.</AlertDescription>
				</Alert>
			</AdminPageShell>
		);
	}

	return (
		<AdminPageShell
			title="Gradebook"
			description="Aggregated grades across assessments and terms"
			icon={BookOpen01Icon}
		>
			<div className="mb-4 flex flex-wrap gap-3">
				<SelectField
					items={sectionOptions}
					value={sectionId}
					onValueChange={setSectionId}
					placeholder="Select section"
					className="min-w-[180px]"
				/>
				<SelectField
					items={termOptions}
					value={term}
					onValueChange={(value) => setTerm(value as GradebookTerm)}
					className="min-w-[140px]"
				/>
			</div>

			{!sectionId ? (
				<EmptyState
					title="Select a section"
					description="Choose a section and term to view the gradebook grid."
				/>
			) : gridQuery.isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, index) => (
						// oxlint-disable-next-line react/no-array-index-key -- skeleton placeholders
						<Skeleton key={index} className="h-10 w-full" />
					))}
				</div>
			) : gridQuery.data && gridQuery.data.rows.length > 0 ? (
				<div className="overflow-x-auto rounded-md border border-border bg-card">
					<Table>
						<TableHeader className="bg-muted/40">
							<TableRow>
								<TableHead className="sticky start-0 bg-muted/40">Student</TableHead>
								{gridQuery.data.subjects.map((subject) => (
									<TableHead key={subject.id} className="text-center">
										{subject.code}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{gridQuery.data.rows.map((row) => (
								<TableRow key={row.studentId}>
									<TableCell className="sticky start-0 bg-card font-medium">
										{row.studentName}
									</TableCell>
									{gridQuery.data.subjects.map((subject) => {
										const cell = row.cells[subject.id];
										return (
											<TableCell key={subject.id} className="text-center">
												{cell ? (
													<Badge variant={gradeBadgeVariant(cell.grade)}>{cell.grade}</Badge>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
											</TableCell>
										);
									})}
								</TableRow>
							))}
							<TableRow className="bg-muted/30 font-medium">
								<TableCell className="sticky start-0 bg-muted/30">Class average</TableCell>
								{gridQuery.data.subjects.map((subject) => {
									const avg = gridQuery.data.averages[subject.id];
									return (
										<TableCell key={subject.id} className="text-center">
											{avg != null ? `${avg}%` : "—"}
										</TableCell>
									);
								})}
							</TableRow>
						</TableBody>
					</Table>
				</div>
			) : (
				<EmptyState
					title="No grades yet"
					description="No gradebook entries found for this section and term."
				/>
			)}
		</AdminPageShell>
	);
}
