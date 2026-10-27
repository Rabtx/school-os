"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Calendar } from "@school-os/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@school-os/ui/components/popover";
import { cn } from "@school-os/ui/lib/utils";
import { format, isValid, parseISO } from "date-fns";
import { useMemo } from "react";

export type DatePickerProps = {
	id?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	align?: "start" | "center" | "end";
};

function parseDateValue(value?: string): Date | undefined {
	if (!value) return undefined;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
	id,
	value,
	onValueChange,
	placeholder = "Pick a date",
	disabled,
	className,
	align = "start",
}: DatePickerProps) {
	const selected = useMemo(() => parseDateValue(value), [value]);
	const label = selected ? format(selected, "PPP") : placeholder;

	return (
		<Popover>
			<PopoverTrigger
				id={id}
				disabled={disabled}
				render={
					<Button
						variant="outline"
						className={cn(
							"h-9 w-full justify-start gap-2 px-2.5 font-normal text-sm",
							!selected && "text-muted-foreground",
							className,
						)}
					/>
				}
			>
				<HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" strokeWidth={2} />
				<span className="truncate">{label}</span>
			</PopoverTrigger>
			<PopoverContent align={align} className="w-auto p-0">
				<Calendar
					mode="single"
					selected={selected}
					onSelect={(date) => {
						onValueChange?.(date ? format(date, "yyyy-MM-dd") : "");
					}}
					defaultMonth={selected}
				/>
			</PopoverContent>
		</Popover>
	);
}
