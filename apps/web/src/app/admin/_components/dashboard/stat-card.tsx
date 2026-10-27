"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
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

const trendTone: Record<Trend, string> = {
	up: "text-dashboard-accent",
	down: "text-destructive",
	flat: "text-dashboard-text-dim",
};

/** Figma "Stat": label and icon chip, value, divider, one-line foot. */
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
		<div
			className={cn(
				"flex min-w-0 flex-col gap-1.5 rounded-[12px] border border-dashboard-border bg-dashboard-surface px-3.5 py-3 tracking-[-0.15px]",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				<div className="min-w-0 flex-1 truncate text-[12px] text-dashboard-text-dim uppercase leading-4">
					{label}
				</div>
				{icon ? (
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-dashboard-hover text-dashboard-text-secondary">
						<HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
					</div>
				) : null}
			</div>
			<div className="font-medium text-[24px] text-dashboard-text-primary leading-8 tabular-nums">
				{unavailable ? formatValue(value) : formatValue(animated)}
			</div>
			<div className="h-px w-full bg-dashboard-border" />
			<div className="flex items-center gap-2 pt-1 text-[13px] leading-5">
				<p className="min-w-0 flex-1 truncate text-dashboard-text-secondary">{detail}</p>
				{trendDelta && !unavailable ? (
					<span className={cn("shrink-0 text-[12px] tabular-nums", trendTone[trend])}>
						{trendDelta}
					</span>
				) : null}
			</div>
		</div>
	);
}
