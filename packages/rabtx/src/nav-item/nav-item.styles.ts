/** One sidebar row: 28px tall, icon then label then an optional count; the active row is filled. */
export function navItemClass(active: boolean, collapsed = false) {
	return `group/item relative flex h-7 w-full items-center gap-2 rounded-lg px-2 text-start text-[13px] tracking-[-0.15px] transition-colors duration-150 ${
		collapsed ? "justify-center px-0" : ""
	} ${
		active
			? "bg-(--rx-selected) font-[510] text-(--rx-text)"
			: "font-normal text-(--rx-text-secondary) hover:bg-(--rx-selected) hover:text-(--rx-text)"
	}`;
}

export function navItemIconClass(active: boolean) {
	return `flex shrink-0 transition-colors ${
		active
			? "text-(--rx-text)"
			: "text-(--rx-text-tertiary) group-hover/item:text-(--rx-text-secondary)"
	}`;
}

export const navItemParts = {
	label: "min-w-0 flex-1 truncate",
	count: "shrink-0 text-xs tabular-nums text-(--rx-text-tertiary)",
	section: "flex h-7 items-center justify-between px-2",
	sectionHeading: "text-[11px] font-[510] uppercase tracking-[0.08em] text-(--rx-text-tertiary)",
	collapsedRule: "mx-auto mb-1 h-px w-5 bg-(--rx-border)",
};

/** Counts read as numbers; zero and missing counts show nothing. */
export function navCountLabel(count: number | undefined): string | null {
	if (!count) return null;
	return count > 999 ? "999+" : String(count);
}
