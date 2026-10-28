export type SegmentTone = "neutral" | "accent" | "warning" | "danger";

const selectedInk: Record<SegmentTone, string> = {
	neutral: "text-(--rx-text)",
	accent: "text-(--rx-accent)",
	warning: "text-(--rx-warning)",
	danger: "text-(--rx-danger)",
};

export const segmentedClass = "inline-flex rounded-[8px] bg-(--rx-app) p-0.5";

/** One segment. The selected one sits on a raised fill in its tone's ink. */
export function segmentClass(selected: boolean, tone: SegmentTone = "neutral") {
	return `h-6 rounded-[6px] px-2.5 text-[13px] tracking-[-0.15px] transition-colors disabled:cursor-default ${
		selected
			? `bg-(--rx-pressed) font-[510] shadow-sm ${selectedInk[tone]}`
			: "text-(--rx-text-tertiary) hover:text-(--rx-text) disabled:hover:text-(--rx-text-tertiary)"
	}`;
}

/** Where the arrow keys move the selection: left and up go back, right and down go on, wrapping. */
export function nextSegment<T>(values: readonly T[], current: T | null, key: string): T | null {
	if (values.length === 0) return null;
	const index = current === null ? -1 : values.indexOf(current);
	if (key === "ArrowRight" || key === "ArrowDown")
		return values[(index + 1) % values.length] ?? null;
	if (key === "ArrowLeft" || key === "ArrowUp") {
		return values[(index - 1 + values.length) % values.length] ?? null;
	}
	if (key === "Home") return values[0] ?? null;
	if (key === "End") return values[values.length - 1] ?? null;
	return null;
}
