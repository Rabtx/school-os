"use client";

import { Calendar03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldLabel } from "@school-os/ui/components/field";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { useAssessmentsPlannerQuery } from "@/modules/assessments/hooks/use-assessments-queries";
import type { Assessment } from "@/modules/assessments/types/assessments.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { NoAccess } from "@/components/states";

function startOfWeek(date: Date) {
	const copy = new Date(date);
	const day = copy.getDay();
	const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
	copy.setDate(diff);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function addDays(date: Date, days: number) {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
}

function toDateKey(date: Date) {
	return date.toLocaleDateString("en-CA");
}

function formatDayLabel(date: Date) {
	return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function typeBadge(type: Assessment["type"]) {
	const label = type === "quiz" ? "Quiz" : type === "exam" ? "Exam" : "Test";
	return <Badge variant="outline">{label}</Badge>;
}

export function TestPlannerPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);

	const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
	const [sectionSubjectFilter, setSectionSubjectFilter] = useState("all");
	const { options: sectionSubjectOptions } = useSectionSubjectOptions(tenantId, campusId);

	const range = useMemo(() => {
		const from = toDateKey(weekStart);
		const to = toDateKey(addDays(weekStart, 6));
		return {
			from,
			to,
			sectionSubjectId: sectionSubjectFilter === "all" ? undefined : sectionSubjectFilter,
		};
	}, [sectionSubjectFilter, weekStart]);

	const plannerQuery = useAssessmentsPlannerQuery(tenantId, range, canRead);

	const days = useMemo(
		() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
		[weekStart],
	);

	const assessmentsByDay = useMemo(() => {
		const map = new Map<string, Assessment[]>();
		for (const day of days) {
			map.set(toDateKey(day), []);
		}
		for (const assessment of plannerQuery.data ?? []) {
			const bucket = map.get(assessment.assessedOn) ?? [];
			bucket.push(assessment);
			map.set(assessment.assessedOn, bucket);
		}
		return map;
	}, [days, plannerQuery.data]);

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Test planner" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<NoAccess
				title="The test planner is not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	return (
		<AdminPageShell
			title="Test planner"
			description="Schedule tests and exams, assign them to classes or selected students."
			icon={Calendar03Icon}
			maxWidth="7xl"
			loading={plannerQuery.isLoading}
			actions={
				canWrite ? (
					<Button size="sm" nativeButton={false} render={<Link href="/admin/assessments" />}>
						<HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" strokeWidth={2} />
						Schedule test
					</Button>
				) : null
			}
		>
			<div className="mb-5 flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>
						Previous week
					</Button>
					<Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>
						This week
					</Button>
					<Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>
						Next week
					</Button>
				</div>
				<Field className="min-w-[220px]">
					<FieldLabel>Class & subject</FieldLabel>
					<SelectField
						items={[{ label: "All classes", value: "all" }, ...sectionSubjectOptions]}
						value={sectionSubjectFilter}
						onValueChange={setSectionSubjectFilter}
					/>
				</Field>
			</div>

			<div className="grid gap-3 lg:grid-cols-7">
				{days.map((day) => {
					const key = toDateKey(day);
					const items = assessmentsByDay.get(key) ?? [];
					return (
						<div
							key={key}
							className="min-h-[220px] rounded-xl border border-dashboard-border bg-dashboard-surface/40 p-3"
						>
							<div className="mb-3 border-dashboard-border border-b pb-2">
								<p className="font-medium text-[13px]">{formatDayLabel(day)}</p>
								<p className="text-[11px] text-dashboard-text-muted">{items.length} scheduled</p>
							</div>
							<ul className="space-y-2">
								{items.map((assessment) => (
									<li key={assessment.id}>
										<Link
											href={`/admin/assessments/${assessment.id}`}
											className="block rounded-lg border border-dashboard-border/80 bg-background/80 p-3 transition hover:border-dashboard-accent/50 hover:shadow-sm"
										>
											<div className="mb-2 flex flex-wrap items-center gap-1.5">
												{typeBadge(assessment.type)}
												<Badge variant="secondary">{assessment.status}</Badge>
											</div>
											<p className="font-medium text-[13px] leading-snug">{assessment.title}</p>
											<p className="mt-1 text-[11px] text-dashboard-text-muted">
												{assessment.sectionName} · {assessment.subjectName}
											</p>
											<p className="mt-1 text-[11px] text-dashboard-text-muted">
												{assessment.startsAt
													? new Date(assessment.startsAt).toLocaleTimeString(undefined, {
															timeStyle: "short",
														})
													: "Time TBD"}
												{assessment.room ? ` · ${assessment.room}` : ""}
											</p>
											<p className="mt-1 text-[11px] text-dashboard-text-muted">
												{assessment.assignMode === "selected_students"
													? `${assessment.recipientCount} students`
													: "Whole class"}
											</p>
										</Link>
									</li>
								))}
							</ul>
						</div>
					);
				})}
			</div>
		</AdminPageShell>
	);
}
