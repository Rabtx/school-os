"use client";

import { InitialsAvatar } from "@/components/initials-avatar";
import { cn } from "@/lib/utils";
import type { AttendanceMarkStatus } from "../types/attendance.types";

export type RosterStudent = {
	id: string;
	fullName: string;
	studentCode: string;
};

type Props = {
	roster: RosterStudent[];
	/** Roll number by student id, from the full roster order (filters keep numbers stable). */
	rollNumbers: Map<string, number>;
	markDraft: Record<string, AttendanceMarkStatus>;
	highlightStudentId?: string | null;
	canMark: boolean;
	onStatusChange: (studentId: string, status: AttendanceMarkStatus) => void;
};

const SEGMENTS: { status: AttendanceMarkStatus; label: string; tone: string }[] = [
	{ status: "present", label: "Present", tone: "text-dashboard-text-primary" },
	{ status: "late", label: "Late", tone: "text-[var(--rx-warning)]" },
	{ status: "absent", label: "Absent", tone: "text-[var(--rx-danger)]" },
	{ status: "excused", label: "Excused", tone: "text-[var(--rx-accent)]" },
];

/** Figma "Roll call" table (`76:62188`): roll, student, segmented status. */
export function AttendanceRollCallTable({
	roster,
	rollNumbers,
	markDraft,
	highlightStudentId,
	canMark,
	onStatusChange,
}: Props) {
	if (roster.length === 0) {
		return (
			<p className="py-10 text-center text-[13px] text-dashboard-text-dim">
				No students match your search or filter.
			</p>
		);
	}

	return (
		<table className="w-full text-[13px] tracking-[-0.15px]">
			<thead>
				<tr className="border-dashboard-border border-b text-start text-[12px] text-dashboard-text-dim">
					<th className="h-8 w-16 px-4 text-start font-normal">Roll</th>
					<th className="h-8 px-2 text-start font-normal">Student</th>
					<th className="h-8 px-4 text-start font-normal">Status</th>
				</tr>
			</thead>
			<tbody>
				{roster.map((student) => {
					const status = markDraft[student.id] ?? "unknown";
					const roll = rollNumbers.get(student.id) ?? 0;
					return (
						<tr
							key={student.id}
							className={cn(
								"border-dashboard-border border-b last:border-0 hover:bg-dashboard-hover/60",
								highlightStudentId === student.id &&
									"animate-[attendance-scan-pulse_0.9s_ease-out_forwards] bg-dashboard-accent-soft",
							)}
						>
							<td className="px-4 py-2 text-dashboard-text-secondary tabular-nums">
								#{String(roll).padStart(2, "0")}
							</td>
							<td className="px-2 py-2">
								<div className="flex min-w-0 items-center gap-2.5">
									<InitialsAvatar name={student.fullName} tone="accent" />
									<div className="min-w-0">
										<p className="truncate font-medium text-dashboard-text-primary">
											{student.fullName}
										</p>
										<p className="truncate font-mono text-[11px] text-dashboard-text-dim">
											{student.studentCode}
										</p>
									</div>
								</div>
							</td>
							<td className="px-4 py-2">
								<div
									role="radiogroup"
									aria-label={`Attendance for ${student.fullName}`}
									className="inline-flex rounded-[8px] bg-dashboard-bg p-0.5"
								>
									{SEGMENTS.map((segment) => {
										const selected = status === segment.status;
										return (
											<button
												key={segment.status}
												type="button"
												role="radio"
												aria-checked={selected}
												disabled={!canMark}
												onClick={() => onStatusChange(student.id, segment.status)}
												className={cn(
													"h-6 rounded-[6px] px-2.5 text-[13px] transition-colors",
													selected
														? cn("bg-dashboard-surface-strong font-medium shadow-sm", segment.tone)
														: "text-dashboard-text-dim hover:text-dashboard-text-primary",
													!canMark && "cursor-default",
												)}
											>
												{segment.label}
											</button>
										);
									})}
								</div>
								{status === "left_early" ? (
									<span className="ms-2 text-[12px] text-[var(--rx-warning)]">Left early</span>
								) : null}
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
