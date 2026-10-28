"use client";

import { BookOpen02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Spinner } from "@school-os/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@school-os/ui/components/tabs";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { HomeworkSubmissionsPanel } from "@/modules/homework/components/homework-submissions-panel";
import { useHomeworkDetailQuery } from "@/modules/homework/hooks/use-homework-queries";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { NoAccess } from "@/components/states";

type Props = {
	homeworkId: string;
};

export function HomeworkDetailPage({ homeworkId }: Props) {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.HOMEWORK_READ);

	const detailQuery = useHomeworkDetailQuery(tenantId, homeworkId, canRead);
	const assignment = detailQuery.data;

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Homework" description="Loading…">
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

	return (
		<AdminPageShell
			title={assignment?.title ?? "Homework"}
			description={
				assignment ? `${assignment.sectionName} · ${assignment.subjectName}` : "Assignment details"
			}
			icon={BookOpen02Icon}
			breadcrumb={{ label: "Homework", href: "/admin/homework" }}
			loading={detailQuery.isLoading}
			maxWidth="5xl"
		>
			{detailQuery.error ? (
				<Alert variant="destructive">
					<AlertDescription>
						{detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load"}
					</AlertDescription>
				</Alert>
			) : null}

			{assignment ? (
				<Tabs defaultValue="overview" className="w-full">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="submissions">Submissions</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="mt-4">
						<div className="space-y-6">
							<div className="flex flex-wrap gap-2">
								<Badge>{assignment.status}</Badge>
								<Badge variant="secondary">
									{assignment.assignMode === "selected_students"
										? `${assignment.recipientCount} students`
										: "Whole class"}
								</Badge>
								{assignment.estimatedMinutes ? (
									<Badge variant="outline">~{assignment.estimatedMinutes} min</Badge>
								) : null}
							</div>

							<section className="rounded-xl border border-dashboard-border bg-dashboard-surface/50 p-5">
								<h2 className="mb-2 font-medium text-[14px]">Instructions</h2>
								<p className="whitespace-pre-wrap text-[14px] text-dashboard-text-secondary leading-relaxed">
									{assignment.description || "No instructions provided."}
								</p>
							</section>

							{assignment.materials ? (
								<section className="rounded-xl border border-dashboard-border bg-dashboard-surface/50 p-5">
									<h2 className="mb-2 font-medium text-[14px]">Materials</h2>
									<p className="whitespace-pre-wrap text-[14px] text-dashboard-text-secondary">
										{assignment.materials}
									</p>
								</section>
							) : null}

							<section className="rounded-xl border border-dashboard-border bg-dashboard-surface/50 p-5">
								<h2 className="mb-3 font-medium text-[14px]">Assigned students</h2>
								<ul className="grid gap-2 sm:grid-cols-2">
									{assignment.rosterStudents
										.filter((student) => student.isAssigned)
										.map((student) => (
											<li
												key={student.studentId}
												className="flex items-center justify-between rounded-lg border border-dashboard-border/70 px-3 py-2 text-[13px]"
											>
												<span>{student.studentName}</span>
												<span className="text-dashboard-text-muted">{student.studentCode}</span>
											</li>
										))}
								</ul>
							</section>
						</div>
					</TabsContent>

					<TabsContent value="submissions" className="mt-4">
						<HomeworkSubmissionsPanel homeworkId={homeworkId} />
					</TabsContent>
				</Tabs>
			) : null}
		</AdminPageShell>
	);
}
