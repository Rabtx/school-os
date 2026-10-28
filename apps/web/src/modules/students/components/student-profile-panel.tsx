"use client";

import { Call02Icon, Cancel01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
import { Spinner } from "@school-os/ui/components/spinner";
import { useMemo, type ReactNode } from "react";
import { Avatar } from "@rabtx/ui/avatar";
import { cn } from "@/lib/utils";
import { useStudentAttendanceHistoryQuery } from "@/modules/attendance/hooks/use-attendance-queries";
import { PermissionCodes, usePermissions } from "@/modules/tenants";
import { useStudentEnrollmentsQuery, useStudentQuery } from "../hooks/use-student-queries";
import { studentStatusTone } from "../utils/student-ui.utils";
import { StudentAvatar } from "./student-avatar";
import { StudentIdCard } from "./student-id-card";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenantId: string;
	studentId: string;
	schoolName: string;
	academicYearLabel?: string;
	sectionLabel: (sectionId: string) => string | undefined;
	currentSectionLabel?: string;
	onEnroll?: () => void;
	/** Rendered under the guardians list, e.g. the link-guardian form. */
	guardianActions?: ReactNode;
};

/** Attendance over the last 30 marked sessions. */
const ATTENDANCE_WINDOW = 30;

function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
	return (
		<div className="mb-2 flex items-center justify-between gap-2 text-[12px] leading-4">
			<span className="text-dashboard-text-dim uppercase">{children}</span>
			{aside ? <span className="text-dashboard-text-dim">{aside}</span> : null}
		</div>
	);
}

/** Figma "Student profile" side panel (`77:60454`). */
export function StudentProfilePanel({
	open,
	onOpenChange,
	tenantId,
	studentId,
	schoolName,
	academicYearLabel,
	sectionLabel,
	currentSectionLabel,
	onEnroll,
	guardianActions,
}: Props) {
	const { can } = usePermissions();
	const enabled = open && Boolean(studentId);
	const studentQuery = useStudentQuery(tenantId, studentId || null, enabled);
	const enrollmentsQuery = useStudentEnrollmentsQuery(tenantId, studentId || null, enabled);
	const historyQuery = useStudentAttendanceHistoryQuery(
		tenantId,
		studentId || null,
		enabled && can(PermissionCodes.ATTENDANCE_READ),
	);

	const attendance = useMemo(() => {
		const recent = (historyQuery.data ?? []).slice(0, ATTENDANCE_WINDOW);
		const count = (status: string) => recent.filter((row) => row.mark.status === status).length;
		const present = count("present") + count("late");
		const total = recent.length;
		return {
			total,
			present,
			late: count("late"),
			absent: count("absent"),
			rate: total ? Math.round((present / total) * 100) : null,
		};
	}, [historyQuery.data]);

	const student = studentQuery.data?.student;
	const guardians = studentQuery.data?.guardians ?? [];
	const callable =
		guardians.find((link) => link.isPrimary && link.guardian.phone) ??
		guardians.find((link) => link.guardian.phone);

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="h-full max-h-none gap-0 border-dashboard-border bg-dashboard-sidebar-bg text-[13px] tracking-[-0.15px] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
				{studentQuery.isLoading || !student ? (
					<>
						<DrawerTitle className="sr-only">Student profile</DrawerTitle>
						<DrawerDescription className="sr-only">Loading student</DrawerDescription>
						<div className="flex flex-1 items-center justify-center">
							<Spinner className="size-6" />
						</div>
					</>
				) : (
					<>
						<header className="flex items-start gap-3 px-5 pt-4">
							<StudentAvatar student={student} size="sm" />
							<div className="min-w-0 flex-1">
								<DrawerTitle className="truncate font-medium text-[14px] text-dashboard-text-primary leading-5">
									{student.fullName}
								</DrawerTitle>
								<DrawerDescription className="truncate text-[12px] text-dashboard-text-dim leading-4">
									{[currentSectionLabel, `ID ${student.studentCode}`].filter(Boolean).join(" · ")}
								</DrawerDescription>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Close profile"
								className="text-dashboard-text-dim"
								onClick={() => onOpenChange(false)}
							>
								<HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
							</Button>
						</header>

						<div className="flex flex-wrap gap-1.5 px-5 pt-3">
							<span
								className={cn(
									"rounded-md bg-dashboard-hover px-1.5 text-[12px] leading-5 capitalize",
									studentStatusTone(student.status),
								)}
							>
								{student.status}
							</span>
							{student.gender ? (
								<span className="rounded-md bg-dashboard-hover px-1.5 text-[12px] text-dashboard-text-secondary leading-5 capitalize">
									{student.gender.replaceAll("_", " ")}
								</span>
							) : null}
						</div>

						<div className="flex flex-wrap gap-2 px-5 pt-3 pb-4">
							{callable?.guardian.phone ? (
								<Button
									size="sm"
									className="h-7 rounded-full"
									nativeButton={false}
									render={
										<a
											href={`tel:${callable.guardian.phone}`}
											aria-label={`Call ${callable.guardian.fullName}`}
										/>
									}
								>
									<HugeiconsIcon icon={Call02Icon} data-icon="inline-start" strokeWidth={1.8} />
									Call {callable.guardian.firstName}
								</Button>
							) : null}
							{onEnroll ? (
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 rounded-full"
									onClick={onEnroll}
								>
									<HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" strokeWidth={1.8} />
									Enroll in section
								</Button>
							) : null}
						</div>

						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-dashboard-border border-t px-5 py-4">
							{can(PermissionCodes.ATTENDANCE_READ) ? (
								<section>
									<SectionLabel
										aside={
											attendance.total
												? `${attendance.present} of ${attendance.total} sessions`
												: undefined
										}
									>
										Attendance · last {ATTENDANCE_WINDOW} sessions
									</SectionLabel>
									{historyQuery.isLoading ? (
										<Spinner className="size-4" />
									) : attendance.rate === null ? (
										<p className="text-dashboard-text-dim">No attendance marked yet.</p>
									) : (
										<>
											<div className="h-1.5 overflow-hidden rounded-full bg-dashboard-hover">
												<div
													className="h-full rounded-full bg-[var(--rx-success)]"
													style={{ width: `${attendance.rate}%` }}
												/>
											</div>
											<p className="mt-2 text-dashboard-text-secondary">
												{attendance.rate}% · {attendance.late} late ·{" "}
												{attendance.absent === 0 ? "no absences" : `${attendance.absent} absent`}
											</p>
										</>
									)}
								</section>
							) : null}

							<section>
								<SectionLabel>Guardians</SectionLabel>
								{guardians.length === 0 ? (
									<p className="text-dashboard-text-dim">No guardians linked yet.</p>
								) : (
									<ul className="space-y-1.5">
										{guardians.map((link) => (
											<li
												key={link.id}
												className="flex items-center gap-2.5 rounded-[8px] bg-dashboard-surface px-3 py-2"
											>
												<Avatar name={link.guardian.fullName} tone="success" />
												<div className="min-w-0 flex-1">
													<p className="truncate text-dashboard-text-primary">
														{link.guardian.fullName}
													</p>
													<p className="truncate text-[12px] text-dashboard-text-dim capitalize">
														{[
															link.relationship.replaceAll("_", " "),
															link.isPrimary ? "primary" : null,
															link.guardian.phone,
														]
															.filter(Boolean)
															.join(" · ")}
													</p>
												</div>
												{link.guardian.phone ? (
													<a
														href={`tel:${link.guardian.phone}`}
														aria-label={`Call ${link.guardian.fullName}`}
														className="flex size-7 items-center justify-center rounded-md text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-primary"
													>
														<HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={1.8} />
													</a>
												) : null}
											</li>
										))}
									</ul>
								)}
								{guardianActions ? <div className="mt-3">{guardianActions}</div> : null}
							</section>

							<section>
								<SectionLabel>Enrollments</SectionLabel>
								{enrollmentsQuery.data?.length ? (
									<ul className="space-y-1 text-dashboard-text-secondary">
										{enrollmentsQuery.data.map((enrollment) => (
											<li key={enrollment.id} className="flex justify-between gap-3">
												<span className="truncate">
													{sectionLabel(enrollment.sectionId) ?? enrollment.sectionId.slice(0, 8)}
												</span>
												<span className="shrink-0 text-dashboard-text-dim capitalize">
													{enrollment.status}
												</span>
											</li>
										))}
									</ul>
								) : (
									<p className="text-dashboard-text-dim">Not enrolled in any section yet.</p>
								)}
							</section>

							<section>
								<SectionLabel>Details</SectionLabel>
								<dl className="grid grid-cols-2 gap-x-4 gap-y-2">
									{[
										["Email", student.email],
										["Phone", student.phone],
										["Date of birth", student.dateOfBirth],
										[
											"Address",
											[student.addressLine1, student.city].filter(Boolean).join(", ") || null,
										],
										["Previous school", student.previousSchool],
										["Emergency", student.emergencyContactName],
									].map(([label, value]) => (
										<div key={label} className="min-w-0">
											<dt className="text-[12px] text-dashboard-text-dim">{label}</dt>
											<dd className="truncate text-dashboard-text-primary">{value ?? "—"}</dd>
										</div>
									))}
								</dl>
							</section>

							<section>
								<SectionLabel>ID card</SectionLabel>
								<StudentIdCard
									student={student}
									schoolName={schoolName}
									tenantId={tenantId}
									sectionLabel={currentSectionLabel}
									academicYearLabel={academicYearLabel}
									className="mx-auto"
								/>
							</section>
						</div>
					</>
				)}
			</DrawerContent>
		</Drawer>
	);
}
