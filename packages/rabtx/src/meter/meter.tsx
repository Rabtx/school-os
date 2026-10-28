import { meterParts, meterTicks, trendBars } from "./meter.styles";

export type MeterProps = {
	/** 0–100, or null when there is nothing to measure yet (reads as a dash). */
	rate: number | null;
	className?: string;
};

/** Figma meter: 20 ticks with the share filled, then the rate as text. */
export function Meter({ rate, className }: MeterProps) {
	return (
		<span className={`${meterParts.root} ${className ?? ""}`}>
			<span aria-hidden="true" className={meterParts.ticks}>
				{meterTicks(rate).map((tick, index) => (
					<span
						// oxlint-disable-next-line react/no-array-index-key -- fixed tick positions
						key={index}
						className={meterParts.tick}
						style={{ background: tick.color }}
					/>
				))}
			</span>
			<span className={meterParts.value}>{rate === null ? "—" : `${Math.round(rate)}%`}</span>
		</span>
	);
}

export type TrendProps = {
	/** Rates oldest first. Each label names its point for screen readers ("Mon 26 Oct"). */
	values: { label: string; rate: number }[];
	/** What the trend is of, read before the values ("Attendance, last 10 days"). */
	label: string;
	/** A rate under this reads red. Default 85. */
	threshold?: number;
};

/** Rates as small columns, oldest first. Screen readers hear every value. */
export function Trend({ values, label, threshold }: TrendProps) {
	if (values.length === 0) return <span className={meterParts.empty}>—</span>;
	const bars = trendBars(values, threshold);
	return (
		<span
			role="img"
			aria-label={`${label}: ${bars.map((bar) => bar.label).join(", ")}`}
			className={meterParts.trend}
		>
			{bars.map((bar) => (
				<span
					key={bar.key}
					className={meterParts.bar}
					style={{ height: bar.height, background: bar.color }}
				/>
			))}
		</span>
	);
}
