"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type Period = "Daily" | "Weekly" | "Monthly" | "Yearly";

const periods: Period[] = ["Daily", "Weekly", "Monthly", "Yearly"];

type Props = {
	value?: Period;
	onChange?: (value: Period) => void;
	className?: string;
};

export function PeriodSelect({ value: controlled, onChange, className }: Props) {
	const [internal, setInternal] = useState<Period>("Daily");
	const value = controlled ?? internal;

	const handleSelect = (next: Period) => {
		setInternal(next);
		onChange?.(next);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={(props) => (
					<button
						type="button"
						{...props}
						className={cn(
							"group flex h-7 items-center gap-1.5 rounded-full border border-dashboard-border-strong bg-dashboard-surface px-3 text-[13px] text-dashboard-text-primary shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.35)] transition-colors hover:bg-dashboard-surface-hover",
							className,
						)}
					>
						<span className="font-medium">{value}</span>
						<HugeiconsIcon
							icon={ArrowDown01Icon}
							size={14}
							strokeWidth={2}
							className="text-dashboard-text-muted transition-transform group-data-popup-open:rotate-180"
						/>
					</button>
				)}
			/>
			<DropdownMenuContent
				align="end"
				sideOffset={6}
				className="w-[140px] border-dashboard-border bg-dashboard-surface text-dashboard-text-secondary"
			>
				{periods.map((p) => (
					<DropdownMenuItem
						key={p}
						onClick={() => handleSelect(p)}
						className={cn(
							"text-[13px] focus:bg-dashboard-hover-strong",
							p === value && "font-medium text-dashboard-text-primary",
						)}
					>
						{p}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
