"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { StatCard as RabtxStatCard } from "@rabtx/ui/stat";
import type { ComponentProps } from "react";
import { useCountUp } from "./use-count-up";

export type Trend = "up" | "down" | "flat";

type IconType = ComponentProps<typeof HugeiconsIcon>["icon"];

type Props = {
	label: string;
	value: number;
	formatValue: (n: number) => string;
	detail?: string;
	trendDelta?: string;
	trend?: Trend;
	icon?: IconType;
	unavailable?: boolean;
	className?: string;
};

const deltaTone = { up: "good", down: "bad", flat: "neutral" } as const;

/** Figma "Stat" from `@rabtx/ui`, with the value counting up on first paint. */
export function StatCard({
	label,
	value,
	formatValue,
	detail,
	trendDelta,
	trend = "flat",
	icon,
	unavailable = false,
	className,
}: Props) {
	const animated = useCountUp(unavailable ? 0 : value);

	return (
		<RabtxStatCard
			label={label}
			value={unavailable ? formatValue(value) : formatValue(animated)}
			detail={detail}
			delta={trendDelta && !unavailable ? { label: trendDelta, tone: deltaTone[trend] } : undefined}
			icon={icon ? <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} /> : undefined}
			className={className}
		/>
	);
}
