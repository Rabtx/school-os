export const METER_TICKS = 20;

export type MeterTick = { filled: boolean; color: string };

/** Tick color by position: red at the low end, then amber, then green, as in the Figma meters. */
function tickColor(index: number, count: number): string {
	const share = index / count;
	if (share < 0.2) return "var(--rx-danger)";
	if (share < 0.4) return "var(--rx-warning)";
	return "var(--rx-success)";
}

/** The ticks of a meter for a 0–100 rate. A null rate fills nothing. */
export function meterTicks(rate: number | null, count = METER_TICKS): MeterTick[] {
	const clamped = rate === null ? 0 : Math.min(100, Math.max(0, rate));
	const filled = Math.round((clamped / 100) * count);
	return Array.from({ length: count }, (_, index) => ({
		filled: index < filled,
		color: index < filled ? tickColor(index, count) : "var(--rx-border-strong)",
	}));
}

export type TrendBar = { key: string; height: string; color: string; label: string };

/** Columns for a run of rates, oldest first; one under `threshold` reads red. */
export function trendBars(values: { label: string; rate: number }[], threshold = 85): TrendBar[] {
	return values.map((value, index) => ({
		key: `${index}-${value.label}`,
		height: `${Math.max(15, Math.min(100, value.rate))}%`,
		color: value.rate < threshold ? "var(--rx-danger)" : "var(--rx-success)",
		label: `${value.label}: ${value.rate}%`,
	}));
}

export const meterParts = {
	root: "inline-flex items-center gap-2",
	ticks: "flex h-3.5 items-stretch gap-[2px]",
	tick: "w-[2px] rounded-full",
	value: "text-[13px] tabular-nums text-(--rx-text)",
	trend: "flex h-4 items-end gap-[2px]",
	bar: "w-[3px] rounded-[1px]",
	empty: "text-[13px] text-(--rx-text-tertiary)",
};
