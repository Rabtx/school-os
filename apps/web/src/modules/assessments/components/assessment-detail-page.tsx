"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Spinner } from "@school-os/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@school-os/ui/components/tabs";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AssessmentMarksPanel } from "@/modules/assessments/components/assessment-marks-panel";
import { useAssessmentDetailQuery } from "@/modules/assessments/hooks/use-assessments-queries";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { NoAccess } from "@/components/states";

type Props = {
	assessmentId: string;
};

export function AssessmentDetailPage({ assessmentId }: Props) {
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);

	const detailQuery = useAssessmentDetailQuery(tenantId, assessmentId, canRead);
	const assessment = detailQuery.data;

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Assessment" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
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

	return (
		<AdminPageShell
			title={assessment?.title ?? "Assessment"}
			description={
				assessment
					? `${assessment.sectionName} · ${assessment.subjectName} · ${assessment.assessedOn}`
					: "Assessment details"
			}
			icon={File02Icon}
			breadcrumb={{ label: "Tests & exams", href: "/admin/assessments" }}
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

			{assessment && tenantId ? (
				<Tabs defaultValue="marks" className="w-full">
					<TabsList>
						<TabsTrigger value="marks">Marks entry</TabsTrigger>
						<TabsTrigger value="overview">Overview</TabsTrigger>
					</TabsList>

					<TabsContent value="marks" className="mt-4">
						<AssessmentMarksPanel tenantId={tenantId} assessment={assessment} />
					</TabsContent>

					<TabsContent value="overview" className="mt-4">
						<div className="space-y-6">
							<div className="flex flex-wrap gap-2">
								<Badge>{assessment.status}</Badge>
								<Badge variant="secondary">{assessment.type}</Badge>
								<Badge variant="outline">Max score {assessment.maxScore}</Badge>
								<Badge variant="outline">
									{assessment.assignMode === "selected_students"
										? `${assessment.recipientCount} students`
										: "Whole class"}
								</Badge>
							</div>

							<section className="rounded-xl border border-dashboard-border bg-dashboard-surface/50 p-5">
								<h2 className="mb-3 font-medium text-[14px]">Schedule & venue</h2>
								<dl className="grid gap-3 text-[13px] sm:grid-cols-3">
									<div>
										<dt className="text-dashboard-text-muted">Assessed on</dt>
										<dd className="mt-0.5 text-dashboard-text-secondary">
											{assessment.assessedOn}
										</dd>
									</div>
									<div>
										<dt className="text-dashboard-text-muted">Starts at</dt>
										<dd className="mt-0.5 text-dashboard-text-secondary">
											{assessment.startsAt
												? new Date(assessment.startsAt).toLocaleString(undefined, {
														dateStyle: "medium",
														timeStyle: "short",
													})
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="text-dashboard-text-muted">Duration</dt>
										<dd className="mt-0.5 text-dashboard-text-secondary">
											{assessment.durationMinutes != null
												? `${assessment.durationMinutes} min`
												: "—"}
										</dd>
									</div>
									<div>
										<dt className="text-dashboard-text-muted">Room</dt>
										<dd className="mt-0.5 text-dashboard-text-secondary">
											{assessment.room ?? "—"}
										</dd>
									</div>
									<div>
										<dt className="text-dashboard-text-muted">Students</dt>
										<dd className="mt-0.5 text-dashboard-text-secondary">
											{assessment.recipientCount}
										</dd>
									</div>
								</dl>
							</section>

							{assessment.instructions ? (
								<section className="rounded-xl border border-dashboard-border bg-dashboard-surface/50 p-5">
									<h2 className="mb-2 font-medium text-[14px]">Instructions</h2>
									<p className="whitespace-pre-wrap text-[14px] text-dashboard-text-secondary leading-relaxed">
										{assessment.instructions}
									</p>
								</section>
							) : null}
						</div>
					</TabsContent>
				</Tabs>
			) : null}
		</AdminPageShell>
	);
}
