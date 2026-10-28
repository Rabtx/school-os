/** Figma list tables: 32px header row in dim 12px, 13px body rows with a hairline between. */
export const tableParts = {
	/** Card frame for a table that is not edge to edge. */
	card: "rounded-(--rx-r-box) border border-(--rx-border) bg-(--rx-surface)",
	scroller: "relative w-full overflow-x-auto",
	table: "rx-table w-full caption-bottom text-[13px] tracking-[-0.15px]",
	headRow: "border-b border-(--rx-border)",
	head: "h-8 px-4 align-middle font-normal whitespace-nowrap text-xs text-(--rx-text-tertiary)",
	row: "border-b border-(--rx-border) transition-colors last:border-0 hover:bg-(--rx-selected)/60 data-[state=selected]:bg-(--rx-selected)",
	cell: "px-4 py-2.5 align-middle text-(--rx-text)",
	checkCell: "w-10 pe-0 [&>input]:block",
	sortButton:
		"inline-flex items-center gap-1 rounded-sm text-xs font-normal text-(--rx-text-tertiary) outline-none hover:text-(--rx-text) focus-visible:ring-2 focus-visible:ring-(--rx-focus)",
	skeleton: "h-4 w-full max-w-[180px] animate-pulse rounded-sm bg-(--rx-selected)",
	empty: "h-32 px-4 text-center align-middle whitespace-normal",
	emptyTitle: "text-sm font-[510] text-(--rx-text)",
	emptyDescription: "mx-auto mt-1 max-w-sm text-[13px] text-(--rx-text-tertiary)",
	inlineRow: "border-b border-(--rx-border) bg-(--rx-selected)/40",
};

/** Edge to edge (the Figma list layout): sticky header on the app background, 24px outer padding. */
export const fullBleedParts = {
	header: "sticky top-0 z-[1] bg-(--rx-app)",
	headRow: "border-b-0 shadow-[inset_0_-1px_0_var(--rx-border)]",
	edge: "first:ps-4 last:pe-4 sm:first:ps-6 sm:last:pe-6",
	lastEdge: "last:pe-4 sm:last:pe-6",
	cell: "whitespace-nowrap",
};
