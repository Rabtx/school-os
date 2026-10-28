"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type SegmentOption, SegmentedControl } from "@rabtx/ui/segmented";
import { Button } from "@school-os/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import Link from "next/link";
import { Avatar } from "@rabtx/ui/avatar";
import { cn } from "@/lib/utils";
import type { AttendanceMarkStatus, AttendanceStudentContext } from "../types/attendance.types";

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
	/** Guardian and check-in source per student, from the session. */
	context: Map<string, AttendanceStudentContext>;
	/** When each saved mark was made, per student. */
	markedAt: Map<string, string>;
	highlightStudentId?: string | null;
	canMark: boolean;
	/** Where a student's name leads: the profile panel or the class page. */
	profileHref: (studentId: string) => string;
	onStatusChange: (studentId: string, status: AttendanceMarkStatus) => void;
};

const SEGMENTS: SegmentOption<AttendanceMarkStatus>[] = [
	{ value: "present", label: "Present" },
	{ value: "late", label: "Late", tone: "warning" },
	{ value: "absent", label: "Absent", tone: "danger" },
	{ value: "excused", label: "Excused", tone: "accent" },
];

const METHOD: Record<string, string> = {
	manual: "Roll call",
	gate: "QR at gate",
	qr: "QR at gate",
	front_desk: "Front desk",
};

function timeLabel(iso: string | undefined): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Figma "Roll call" table (`76:62188`, teacher `160:32559`): roll, student, guardian, check-in
 * time and method, segmented status, and a row menu (`200:85320`).
 */
export function AttendanceRollCallTable({
	roster,
	rollNumbers,
	markDraft,
	context,
	markedAt,
	highlightStudentId,
	canMark,
	profileHref,
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
		<div className="overflow-x-auto">
			<table className="w-full min-w-[880px] text-[13px] tracking-[-0.15px]">
				<thead className="sticky top-0 z-[1] bg-dashboard-bg">
					<tr className="border-dashboard-border border-b text-start text-[12px] text-dashboard-text-dim">
						<th className="h-9 w-16 ps-4 pe-2 text-start font-normal sm:ps-6">Roll</th>
						<th className="h-9 px-2 text-start font-normal">Student</th>
						<th className="h-9 px-2 text-start font-normal">Guardian</th>
						<th className="h-9 px-2 text-start font-normal">Check-in</th>
						<th className="h-9 px-2 text-start font-normal">Method</th>
						<th className="h-9 px-2 text-start font-normal">Status</th>
						<th className="h-9 w-12 pe-4 sm:pe-6">
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{roster.map((student) => {
						const status = markDraft[student.id] ?? "unknown";
						const roll = rollNumbers.get(student.id) ?? 0;
						const info = context.get(student.id);
						const marked =
							status !== "unknown" && status !== "absent" ? markedAt.get(student.id) : undefined;
						return (
							<tr
								key={student.id}
								className={cn(
									"border-dashboard-border border-b hover:bg-dashboard-hover/60",
									highlightStudentId === student.id &&
										"animate-[attendance-scan-pulse_0.9s_ease-out_forwards] bg-dashboard-accent-soft",
								)}
							>
								<td className="py-2 ps-4 pe-2 text-dashboard-text-secondary tabular-nums sm:ps-6">
									#{String(roll).padStart(2, "0")}
								</td>
								<td className="px-2 py-2">
									<Link
										href={profileHref(student.id)}
										className="font-medium text-dashboard-text-primary hover:underline"
									>
										{student.fullName}
									</Link>
								</td>
								<td className="px-2 py-2">
									{info?.guardianName ? (
										<span className="flex items-center gap-2 text-dashboard-text-secondary">
											<Avatar name={info.guardianName} />
											<span className="truncate">{info.guardianName}</span>
										</span>
									) : (
										<span className="text-dashboard-text-dim">—</span>
									)}
								</td>
								<td className="px-2 py-2 text-dashboard-text-primary tabular-nums">
									{timeLabel(marked)}
								</td>
								<td className="px-2 py-2 text-dashboard-text-secondary">
									{marked && info?.checkInSource
										? (METHOD[info.checkInSource] ?? info.checkInSource)
										: "—"}
								</td>
								<td className="px-2 py-2">
									<SegmentedControl
										label={`Attendance for ${student.fullName}`}
										options={SEGMENTS}
										value={SEGMENTS.some((segment) => segment.value === status) ? status : null}
										disabled={!canMark}
										onChange={(next) => onStatusChange(student.id, next)}
									/>
									{status === "left_early" ? (
										<span className="ms-2 text-[12px] text-[var(--rx-warning)]">Left early</span>
									) : null}
								</td>
								<td
									className="py-2 pe-4 text-end sm:pe-6"
									aria-label={`Actions for ${student.fullName}`}
								>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													aria-label={`Actions for ${student.fullName}`}
												/>
											}
										>
											<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="min-w-[200px]">
											<DropdownMenuGroup>
												<DropdownMenuLabel className="font-normal text-[12px] text-dashboard-text-dim">
													{student.fullName}
												</DropdownMenuLabel>
												{canMark
													? SEGMENTS.map((segment) => (
															<DropdownMenuItem
																key={segment.value}
																onClick={() => onStatusChange(student.id, segment.value)}
															>
																Mark {segment.label.toLowerCase()}
															</DropdownMenuItem>
														))
													: null}
											</DropdownMenuGroup>
											{canMark ? <DropdownMenuSeparator /> : null}
											<DropdownMenuItem
												render={<Link href={profileHref(student.id)}>Open profile</Link>}
											/>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
