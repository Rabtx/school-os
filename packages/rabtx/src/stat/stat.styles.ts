export type StatDeltaTone = "good" | "bad" | "neutral";

const deltaInk: Record<StatDeltaTone, string> = {
	good: "text-(--rx-accent)",
	bad: "text-(--rx-danger)",
	neutral: "text-(--rx-text-tertiary)",
};

/** Figma "Stat": label and icon chip, value, a rule, then a one-line foot. */
export const statParts = {
	root: "flex min-w-0 flex-col gap-1.5 rounded-(--rx-r-box) border border-(--rx-border) bg-(--rx-surface) px-3.5 py-3 tracking-[-0.15px]",
	head: "flex items-center gap-2",
	label: "min-w-0 flex-1 truncate text-xs/4 uppercase text-(--rx-text-tertiary)",
	icon: "flex size-6 shrink-0 items-center justify-center rounded-md bg-(--rx-selected) text-(--rx-text-secondary)",
	value: "text-2xl/8 font-[510] tabular-nums text-(--rx-text)",
	rule: "h-px w-full bg-(--rx-border)",
	foot: "flex items-center gap-2 pt-1 text-[13px]/5",
	detail: "min-w-0 flex-1 truncate text-(--rx-text-secondary)",
};

/** The change beside the detail: good reads accent, bad reads red. */
export function statDeltaClass(tone: StatDeltaTone = "neutral") {
	return `shrink-0 text-xs tabular-nums ${deltaInk[tone]}`;
}
