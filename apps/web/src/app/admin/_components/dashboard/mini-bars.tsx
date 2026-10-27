"use client";

import { cn } from "@/lib/utils";

type Props = {
	data: number[];
	activeIndex?: number;
	activeColor?: string;
	mutedColor?: string;
	className?: string;
};

/**
 * Small fixed-bar chart used inside stat cards.
 * Renders one accent bar surrounded by muted bars.
 */
export function MiniBars({
	data,
	activeIndex,
	activeColor = "var(--dashboard-accent)",
	mutedColor = "var(--dashboard-chart-muted-bar)",
	className,
}: Props) {
	const max = Math.max(...data, 1);
	return (
		<div className={cn("flex h-9 items-end gap-[3px]", className)} aria-hidden>
			{data.map((v, i) => {
				const isActive = i === activeIndex;
				const heightPct = Math.max(18, (v / max) * 100);
				return (
					<span
						// oxlint-disable-next-line react/no-array-index-key -- bar order is stable and meaningful
						key={i}
						className="w-[3px] rounded-[1.5px]"
						style={{
							height: `${heightPct}%`,
							backgroundColor: isActive ? activeColor : mutedColor,
						}}
					/>
				);
			})}
		</div>
	);
}
