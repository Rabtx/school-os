"use client";

import { CreditCardIcon, StudentIcon, TableIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Spinner } from "@school-os/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import { useMemo, useState } from "react";
import { LeaveRequests } from "@/modules/approvals";
import { StudentIdCard } from "@/modules/students/components/student-id-card";
import { StudentRosterCards } from "@/modules/students/components/student-roster-cards";
import { useTenantContext } from "@/modules/tenants";
import { useMyChildrenQuery } from "../hooks/use-guardian-queries";
import { linkedStudentToCardStudent } from "../utils/linked-student.utils";
import { ParentChildHomeworkPanel } from "./parent-child-homework-panel";

type ChildrenView = "cards" | "list";

export function MyChildrenPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? "";
	const query = useMyChildrenQuery(tenantId);
	const [view, setView] = useState<ChildrenView>("cards");

	const children = useMemo(() => query.data ?? [], [query.data]);

	const cardStudents = useMemo(() => {
		if (!tenantId || !campusId) return [];
		return children.map((child) => linkedStudentToCardStudent(child, tenantId, campusId));
	}, [campusId, children, tenantId]);

	const sectionLabelByStudentId = useMemo(() => new Map<string, string>(), []);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Switch to an organization to view linked children.</AlertDescription>
			</Alert>
		);
	}

	if (query.isLoading) {
		return (
			<div className="flex justify-center py-10">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
			<header className="mb-6 border-dashboard-border border-b pb-5">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-dashboard-accent-soft text-dashboard-accent">
							<HugeiconsIcon icon={StudentIcon} size={20} strokeWidth={1.8} />
						</div>
						<div>
							<h1 className="font-semibold text-[24px] text-dashboard-text-primary">My children</h1>
							<p className="text-[13px] text-dashboard-text-muted">
								ID cards, homework and leave for each child.
							</p>
						</div>
					</div>
					{children.length > 0 ? (
						<ToggleGroup
							value={[view]}
							onValueChange={(next) => {
								const selected = next[0] as ChildrenView | undefined;
								if (selected) setView(selected);
							}}
							variant="outline"
							size="sm"
							spacing={0}
							aria-label="Children view"
						>
							<ToggleGroupItem value="list" className="gap-1.5 px-2.5">
								<HugeiconsIcon icon={TableIcon} strokeWidth={2} className="size-3.5" />
								List
							</ToggleGroupItem>
							<ToggleGroupItem value="cards" className="gap-1.5 px-2.5">
								<HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} className="size-3.5" />
								ID cards
							</ToggleGroupItem>
						</ToggleGroup>
					) : null}
				</div>
			</header>

			{children.length > 0 ? (
				<LeaveRequests
					tenantId={tenantId}
					childOptions={children.map((child) => ({
						studentId: child.studentId,
						name: `${child.firstName} ${child.lastName}`.trim(),
					}))}
				/>
			) : null}

			{children.length === 0 ? (
				<Alert>
					<AlertDescription>
						No linked students yet. Ask your school admin to connect your guardian profile to your
						children, or request a parent role on your membership.
					</AlertDescription>
				</Alert>
			) : view === "cards" ? (
				<>
					<StudentRosterCards
						students={cardStudents}
						schoolName={activeTenant?.name ?? "School"}
						tenantId={tenantId}
						sectionLabelByStudentId={sectionLabelByStudentId}
					/>
					<div className="mt-8 grid gap-6 lg:grid-cols-2">
						{children.map((child) => (
							<ParentChildHomeworkPanel
								key={child.studentId}
								tenantId={tenantId}
								studentId={child.studentId}
								studentName={child.firstName}
							/>
						))}
					</div>
				</>
			) : (
				<div className="grid gap-4">
					{children.map((child) => (
						<article
							key={child.studentId}
							className="rounded-[14px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5"
						>
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
								<StudentIdCard
									student={linkedStudentToCardStudent(child, tenantId, campusId)}
									schoolName={activeTenant?.name ?? "School"}
									tenantId={tenantId}
									className="mx-auto w-full max-w-[360px] shrink-0 lg:mx-0"
									compact
								/>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap gap-2">
										<Badge variant="outline" className="capitalize">
											{child.relationship}
										</Badge>
										{child.isPrimary ? <Badge>Primary contact</Badge> : null}
										<Badge variant="secondary" className="capitalize">
											{child.status}
										</Badge>
									</div>
									<ParentChildHomeworkPanel
										tenantId={tenantId}
										studentId={child.studentId}
										studentName={child.firstName}
									/>
								</div>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
