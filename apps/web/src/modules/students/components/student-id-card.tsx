"use client";

import { Badge } from "@school-os/ui/components/badge";
import { QRCode } from "react-qr-code";
import { cn } from "@/lib/utils";
import type { Student } from "../types/student.types";
import { studentQrPayload, studentStatusBadgeVariant } from "../utils/student-ui.utils";
import { StudentAvatar } from "./student-avatar";

type Props = {
	student: Student;
	schoolName: string;
	tenantId: string;
	sectionLabel?: string;
	academicYearLabel?: string;
	className?: string;
	compact?: boolean;
};

export function StudentIdCard({
	student,
	schoolName,
	tenantId,
	sectionLabel,
	academicYearLabel,
	className,
	compact = false,
}: Props) {
	const qrValue = studentQrPayload(student, tenantId);

	return (
		<article
			className={cn(
				"relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
				compact ? "max-w-[320px]" : "w-full max-w-[360px]",
				className,
			)}
		>
			<div className="relative bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-3 text-white dark:from-teal-800 dark:to-teal-700">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="truncate font-semibold text-[11px] uppercase tracking-[0.12em] opacity-90">
							Student ID
						</p>
						<p className="truncate font-semibold text-[15px] leading-tight">{schoolName}</p>
					</div>
					<span
						aria-hidden
						className="mt-0.5 size-7 shrink-0 rounded-md bg-white/15 ring-1 ring-white/25"
					/>
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-4 p-4">
				<div className="flex items-start gap-3">
					<StudentAvatar student={student} size={compact ? "md" : "lg"} />
					<div className="min-w-0 flex-1 pt-0.5">
						<p className="truncate font-semibold text-[17px] text-foreground leading-tight">
							{student.fullName}
						</p>
						<p className="mt-1 font-mono text-[12px] text-muted-foreground">
							{student.studentCode}
						</p>
						{sectionLabel ? (
							<p className="mt-1 truncate text-[12px] text-muted-foreground">{sectionLabel}</p>
						) : null}
						<div className="mt-2">
							<Badge variant={studentStatusBadgeVariant(student.status)} className="capitalize">
								{student.status}
							</Badge>
						</div>
					</div>
				</div>

				<div className="flex items-end justify-between gap-3 border-border border-t pt-3">
					<div className="rounded-lg bg-background p-2 ring-1 ring-border">
						<QRCode
							value={qrValue}
							size={compact ? 64 : 72}
							bgColor="transparent"
							fgColor="currentColor"
							className="text-foreground"
						/>
					</div>
					<div className="min-w-0 text-end text-[11px] text-muted-foreground leading-4">
						<p>Scan to verify</p>
						{academicYearLabel ? <p className="mt-1 font-medium">{academicYearLabel}</p> : null}
						{student.admittedOn ? (
							<p className="mt-1 tabular-nums">Admitted {student.admittedOn}</p>
						) : null}
					</div>
				</div>
			</div>
		</article>
	);
}
