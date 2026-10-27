"use client";

import { cn } from "@/lib/utils";
import type { Student } from "../types/student.types";
import { studentInitials } from "../utils/student-ui.utils";

type Props = {
	student: Pick<Student, "firstName" | "lastName" | "photoUrl">;
	size?: "sm" | "md" | "lg";
	className?: string;
};

const sizeClasses = {
	sm: "size-7 text-[11px] rounded-full",
	md: "size-12 text-[13px] rounded-full",
	lg: "size-20 text-[22px] rounded-full",
};

export function StudentAvatar({ student, size = "md", className }: Props) {
	if (student.photoUrl) {
		return (
			// oxlint-disable-next-line nextjs/no-img-element -- tenant-hosted photo URLs are dynamic
			<img
				src={student.photoUrl}
				alt=""
				className={cn("inline-flex shrink-0 object-cover", sizeClasses[size], className)}
			/>
		);
	}

	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--rx-accent)_22%,transparent)] font-medium text-[var(--rx-accent)]",
				sizeClasses[size],
				className,
			)}
		>
			{studentInitials(student)}
		</span>
	);
}
