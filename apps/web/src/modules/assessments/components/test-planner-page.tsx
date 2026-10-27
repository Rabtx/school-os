"use client";

import { Calendar03Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
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
import { useNow } from "@/lib/use-now";

function startOfWeek(date: Date) {
	const copy = new Date(date);
	const day = copy.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	copy.setDate(copy.getDate() + diff);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

function addDays(date: Date, days: number) {
	const copy = new Date(date);
	copy.setDate(copy.getDate() + days);
	return copy;
}

function formatDayLabel(date: Date) {
	return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function typeBadge(type: Assessment["type"]) {
	const label = type.charAt(0).toUpperCase() + type.slice(1);
	return <Badge variant="outline">{label}</Badge>;
}

export function TestPlannerPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);

	const [weekOffset, setWeekOffset] = useState(0);
	const [sectionSubjectFilter, setSectionSubjectFilter] = useState("all");

	const now = useNow();
	const todayKey = now.toLocaleDateString("en-CA");
	const weekStart = useMemo(() => addDays(startOfWeek(now), weekOffset * 7), [now, weekOffset]);
	const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
	const from = weekStart.toLocaleDateString("en-CA");
	const to = weekEnd.toLocaleDateString("en-CA");

	const { options: sectionSubjectOptions } = useSectionSubjectOptions(tenantId, campusId);
	const plannerQuery = useAssessmentsPlannerQuery(
		tenantId,
		{
			from,
			to,
			sectionSubjectId: sectionSubjectFilter === "all" ? undefined : sectionSubjectFilter,
		},
		canRead,
	);

	const days = useMemo(
		() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
		[weekStart],
	);

	const byDay = useMemo(() => {
		const map = new Map<string, Assessment[]>();
		for (const day of days) {
			map.set(day.toLocaleDateString("en-CA"), []);
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
			<AdminPageShell title="Test planner" description="Loading…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<AdminPageShell title="Test planner">
				<Alert variant="destructive">
					<AlertDescription>Missing assessments.read permission.</AlertDescription>
				</Alert>
			</AdminPageShell>
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
				<div className="flex items-center gap-2">
					<Button size="sm" variant="outline" onClick={() => setWeekOffset((value) => value - 1)}>
						Previous
					</Button>
					<Button size="sm" variant="outline" onClick={() => setWeekOffset(0)}>
						This week
					</Button>
					<Button size="sm" variant="outline" onClick={() => setWeekOffset((value) => value + 1)}>
						Next
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
					const key = day.toLocaleDateString("en-CA");
					const items = byDay.get(key) ?? [];
					const isToday = key === todayKey;

					return (
						<div
							key={key}
							className={`min-h-[220px] rounded-xl border p-3 ${
								isToday
									? "border-dashboard-accent/50 bg-dashboard-accent-soft/25"
									: "border-dashboard-border bg-dashboard-surface/40"
							}`}
						>
							<p className="mb-3 font-medium text-[12px] text-dashboard-text-secondary">
								{formatDayLabel(day)}
							</p>
							<div className="space-y-2">
								{items.length === 0 ? (
									<p className="text-[11px] text-dashboard-text-muted">No tests</p>
								) : (
									items.map((assessment) => (
										<Link
											key={assessment.id}
											href={`/admin/assessments/${assessment.id}`}
											className="block rounded-lg border border-dashboard-border/80 bg-background/80 p-2.5 transition hover:border-dashboard-accent/40 hover:shadow-sm"
										>
											<div className="mb-1 flex items-center justify-between gap-1">
												{typeBadge(assessment.type)}
												<Badge variant="secondary" className="text-[10px]">
													{assessment.status}
												</Badge>
											</div>
											<p className="line-clamp-2 font-medium text-[12px]">{assessment.title}</p>
											<p className="mt-1 text-[11px] text-dashboard-text-muted">
												{assessment.sectionName} · {assessment.subjectName}
											</p>
											{assessment.startsAt ? (
												<p className="mt-1 text-[11px] text-dashboard-text-muted">
													{new Date(assessment.startsAt).toLocaleTimeString(undefined, {
														hour: "2-digit",
														minute: "2-digit",
													})}
													{assessment.room ? ` · ${assessment.room}` : ""}
												</p>
											) : null}
											<p className="mt-1 text-[10px] text-dashboard-text-faint">
												{assessment.assignMode === "selected_students"
													? `${assessment.recipientCount} students`
													: "Whole class"}
											</p>
										</Link>
									))
								)}
							</div>
						</div>
					);
				})}
			</div>
		</AdminPageShell>
	);
}
