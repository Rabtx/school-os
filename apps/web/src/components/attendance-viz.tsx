import { cn } from "@/lib/utils";

const TICKS = 20;

/** Tick colour by position: red at the low end through amber to green, as in the Figma meters. */
function tickColor(index: number): string {
	if (index < 4) return "var(--rx-danger)";
	if (index < 8) return "var(--rx-warning)";
	return "var(--rx-success)";
}

/**
 * Figma attendance meter: 20 ticks with the share filled, then the rate. A null rate means no
 * roll call in the window and reads as a dash.
 */
export function AttendanceMeter({ rate, className }: { rate: number | null; className?: string }) {
	const filled = rate === null ? 0 : Math.round((rate / 100) * TICKS);
	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			<span aria-hidden className="flex h-3.5 items-stretch gap-[2px]">
				{Array.from({ length: TICKS }, (_, index) => (
					<span
						// oxlint-disable-next-line react/no-array-index-key -- fixed tick positions
						key={index}
						className="w-[2px] rounded-full"
						style={{
							background: index < filled ? tickColor(index) : "var(--dashboard-border-strong)",
						}}
					/>
				))}
			</span>
			<span className="text-[13px] text-dashboard-text-primary tabular-nums">
				{rate === null ? "—" : `${Math.round(rate)}%`}
			</span>
		</span>
	);
}

/** Daily rates as small columns, oldest first; a day under 85% shows red. */
export function AttendanceTrend({
	days,
	label,
}: {
	days: { date: string; rate: number }[];
	label: string;
}) {
	if (days.length === 0) {
		return <span className="text-[13px] text-dashboard-text-dim">—</span>;
	}
	const summary = days.map((day) => `${day.date}: ${day.rate}%`).join(", ");
	return (
		<span role="img" aria-label={`${label}: ${summary}`} className="flex h-4 items-end gap-[2px]">
			{days.map((day) => (
				<span
					key={day.date}
					className="w-[3px] rounded-[1px]"
					style={{
						height: `${Math.max(15, day.rate)}%`,
						background: day.rate < 85 ? "var(--rx-danger)" : "var(--rx-success)",
					}}
				/>
			))}
		</span>
	);
}
