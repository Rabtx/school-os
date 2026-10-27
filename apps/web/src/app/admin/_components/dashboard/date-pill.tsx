"use client";

import { DatePicker } from "@school-os/ui/components/date-picker";
import { cn } from "@/lib/utils";

type Props = {
	date?: Date;
	onChange?: (date: Date) => void;
	className?: string;
};

function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function DatePill({ date, onChange, className }: Props) {
	const value = date ? toIsoDate(date) : "";

	return (
		<DatePicker
			value={value}
			onValueChange={(next) => {
				if (!next) return;
				const [year, month, day] = next.split("-").map(Number);
				if (!year || !month || !day) return;
				onChange?.(new Date(year, month - 1, day));
			}}
			align="end"
			className={cn("h-7 w-auto rounded-full border-dashboard-border-strong", className)}
		/>
	);
}
