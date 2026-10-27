"use client";

import { AlertCircleIcon, BookOpen02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@school-os/ui/components/badge";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useMemo } from "react";
import { useStudentAttendanceHistoryQuery } from "@/modules/attendance/hooks/use-attendance-queries";
import type { AttendanceMarkStatus } from "@/modules/attendance/types/attendance.types";
import { useHomeworkListQuery } from "@/modules/homework/hooks/use-homework-queries";
import { PermissionCodes, usePermissions } from "@/modules/tenants";

function countLeadingAbsentStreak(
	entries: Array<{ sessionDate: string; status: AttendanceMarkStatus }>,
): number {
	const sorted = entries.toSorted((a, b) => b.sessionDate.localeCompare(a.sessionDate));
	let streak = 0;
	for (const entry of sorted) {
		if (entry.status === "absent") streak += 1;
		else break;
	}
	return streak;
}

type Props = {
	tenantId: string;
	studentId: string;
	enabled?: boolean;
};

export function TeacherStudentInsights({ tenantId, studentId, enabled = true }: Props) {
	const { can } = usePermissions();
	const canReadAttendance = can(PermissionCodes.ATTENDANCE_READ);
	const canReadHomework = can(PermissionCodes.HOMEWORK_READ);

	const historyQuery = useStudentAttendanceHistoryQuery(
		tenantId,
		studentId,
		enabled && canReadAttendance,
	);
	const homeworkQuery = useHomeworkListQuery(
		tenantId,
		{ studentId, status: "published" },
		enabled && canReadHomework,
	);

	const attendanceSummary = useMemo(() => {
		const history = historyQuery.data ?? [];
		const recent = history.slice(0, 8).map((row) => ({
			sessionDate: row.session.sessionDate,
			status: row.mark.status,
		}));
		const absentStreak = countLeadingAbsentStreak(recent);
		const lastStatus = recent[0]?.status;
		return { recent, absentStreak, lastStatus };
	}, [historyQuery.data]);

	const homeworkRows = homeworkQuery.data ?? [];
	const nextDue = homeworkRows
		.filter((row) => row.dueAt)
		.toSorted((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))[0];

	const loading =
		(canReadAttendance && historyQuery.isLoading) || (canReadHomework && homeworkQuery.isLoading);

	if (!canReadAttendance && !canReadHomework) {
		return null;
	}

	return (
		<div className="rounded-xl border border-border bg-muted/20 p-4">
			<p className="mb-3 font-medium text-sm">Teaching insights</p>
			<p className="mb-3 text-[12px] text-muted-foreground leading-relaxed">
				Read-only signals for your class — no messages are sent automatically.
			</p>

			{loading ? (
				<div className="flex justify-center py-4">
					<Spinner className="size-5" />
				</div>
			) : (
				<div className="space-y-3 text-sm">
					{canReadAttendance ? (
						<div className="flex items-start gap-2">
							<HugeiconsIcon
								icon={AlertCircleIcon}
								strokeWidth={2}
								className="mt-0.5 size-4 shrink-0 text-amber-700"
							/>
							<div>
								<p className="font-medium">Attendance</p>
								{attendanceSummary.recent.length === 0 ? (
									<p className="text-muted-foreground text-[13px]">No recent marks on file.</p>
								) : (
									<p className="text-[13px] text-muted-foreground">
										Last status:{" "}
										<Badge variant="outline" className="ml-1 capitalize">
											{attendanceSummary.lastStatus?.replace("_", " ") ?? "unknown"}
										</Badge>
										{attendanceSummary.absentStreak >= 2 ? (
											<span className="mt-1 block text-amber-800 dark:text-amber-200">
												{attendanceSummary.absentStreak} consecutive absent day
												{attendanceSummary.absentStreak === 1 ? "" : "s"} in recent history
											</span>
										) : null}
									</p>
								)}
							</div>
						</div>
					) : null}

					{canReadHomework ? (
						<div className="flex items-start gap-2">
							<HugeiconsIcon
								icon={BookOpen02Icon}
								strokeWidth={2}
								className="mt-0.5 size-4 shrink-0 text-teal-700"
							/>
							<div>
								<p className="font-medium">Homework</p>
								<p className="text-[13px] text-muted-foreground">
									{homeworkRows.length === 0
										? "No published assignments targeted to this student."
										: `${homeworkRows.length} published assignment${homeworkRows.length === 1 ? "" : "s"} active`}
									{nextDue?.dueAt ? (
										<span className="block">
											Next due: {new Date(nextDue.dueAt).toLocaleDateString()} — {nextDue.title}
										</span>
									) : null}
								</p>
								{homeworkRows.length > 0 ? (
									<Link
										href="/admin/homework"
										className="mt-1 inline-block text-[12px] text-primary hover:underline"
									>
										Open homework list
									</Link>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			)}
		</div>
	);
}
