"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import { useCommandSearch } from "../command-search/command-search";

type Props = {
	placeholder?: string;
	className?: string;
};

/** The topbar search box: looks like a field, opens the ⌘K command search. */
export function GlobalSearch({ placeholder = "Search students", className }: Props) {
	const { open } = useCommandSearch();
	return (
		<button
			type="button"
			onClick={open}
			aria-label="Search (Ctrl+K)"
			className={cn(
				"h-7 items-center gap-2 rounded-md border border-dashboard-border-strong bg-dashboard-surface px-2.5 text-start text-[13px] text-dashboard-text-dim hover:border-dashboard-border-focus",
				className,
			)}
		>
			<HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} className="shrink-0" />
			<span className="min-w-0 flex-1 truncate">{placeholder}</span>
			<kbd className="text-[11px]">⌘K</kbd>
		</button>
	);
}
