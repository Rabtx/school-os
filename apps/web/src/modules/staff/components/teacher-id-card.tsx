"use client";

import { Badge } from "@school-os/ui/components/badge";
import { QRCode } from "react-qr-code";
import { cn } from "@/lib/utils";
import type { TeacherSummary } from "../types/staff.types";
import {
	formatTeacherStatus,
	teacherDisplayName,
	teacherQrPayload,
	teacherStatusBadgeVariant,
} from "../utils/teacher-ui.utils";
import { TeacherAvatar } from "./teacher-avatar";

type Props = {
	teacher: TeacherSummary;
	schoolName: string;
	tenantId: string;
	campusName?: string;
	className?: string;
	compact?: boolean;
};

export function TeacherIdCard({
	teacher,
	schoolName,
	tenantId,
	campusName,
	className,
	compact = false,
}: Props) {
	const qrValue = teacherQrPayload(teacher, tenantId);
	const displayName = teacherDisplayName(teacher);

	return (
		<article
			className={cn(
				"relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
				compact ? "max-w-[320px]" : "w-full max-w-[360px]",
				className,
			)}
		>
			<div className="relative bg-gradient-to-r from-slate-800 to-indigo-800 px-4 py-3 text-white dark:from-slate-900 dark:to-indigo-950">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="truncate font-semibold text-[11px] uppercase tracking-[0.12em] opacity-90">
							Staff ID
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
					<TeacherAvatar teacher={teacher} size={compact ? "md" : "lg"} />
					<div className="min-w-0 flex-1 pt-0.5">
						<p className="truncate font-semibold text-[17px] text-foreground leading-tight">
							{displayName}
						</p>
						<p className="mt-1 truncate text-[12px] text-muted-foreground">{teacher.email}</p>
						<p className="mt-1 font-mono text-[12px] text-muted-foreground">
							{teacher.profile.employeeCode ?? "No employee code"}
						</p>
						<div className="mt-2 flex flex-wrap gap-1.5">
							<Badge variant="secondary" className="capitalize">
								{teacher.role}
							</Badge>
							<Badge
								variant={teacherStatusBadgeVariant(teacher.profile.status)}
								className="capitalize"
							>
								{formatTeacherStatus(teacher.profile.status)}
							</Badge>
						</div>
					</div>
				</div>

				{teacher.profile.specialization ? (
					<p className="text-[12px] text-muted-foreground leading-snug">
						<span className="font-medium text-foreground">Specialization:</span>{" "}
						{teacher.profile.specialization}
					</p>
				) : null}

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
						{campusName ? <p className="mt-1 font-medium">{campusName}</p> : null}
						{teacher.profile.hireDate ? (
							<p className="mt-1 tabular-nums">Since {teacher.profile.hireDate}</p>
						) : null}
					</div>
				</div>
			</div>
		</article>
	);
}
