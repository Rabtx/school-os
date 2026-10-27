"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card frame shared by the report KPIs and charts: title and subtitle, then content. */
export function ReportCard({
	title,
	subtitle,
	icon,
	actions,
	children,
	className,
	id,
}: {
	title: string;
	subtitle: string;
	icon?: IconSvgElement;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	id?: string;
}) {
	return (
		<section
			id={id}
			className={cn(
				"flex min-w-0 scroll-mt-4 flex-col rounded-[12px] border border-dashboard-border bg-dashboard-surface tracking-[-0.15px]",
				className,
			)}
		>
			<header className="flex items-center gap-3 border-dashboard-border border-b px-4 py-3">
				{icon ? (
					<span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[color-mix(in_oklab,var(--rx-accent)_16%,transparent)] text-[var(--rx-accent)]">
						<HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<h2 className="truncate font-medium text-[14px] text-dashboard-text-primary leading-5">
						{title}
					</h2>
					<p className="truncate text-[12px] text-dashboard-text-dim leading-4">{subtitle}</p>
				</div>
				{actions}
			</header>
			{children}
		</section>
	);
}

export type KpiDelta = {
	/** Signed change against the previous period, already formatted ("+1.4", "−12"). */
	label: string;
	tone: "good" | "bad" | "neutral";
};

const DELTA_TONE: Record<KpiDelta["tone"], string> = {
	good: "bg-[color-mix(in_oklab,var(--rx-success)_18%,transparent)] text-[var(--rx-success)]",
	bad: "bg-[color-mix(in_oklab,var(--rx-danger)_18%,transparent)] text-[var(--rx-danger)]",
	neutral: "bg-dashboard-hover text-dashboard-text-secondary",
};

/** Figma report KPI: icon, title and rule, the value with its change, and a details link. */
export function ReportKpiCard({
	title,
	subtitle,
	icon,
	value,
	delta,
	comparison,
	href,
}: {
	title: string;
	subtitle: string;
	icon: IconSvgElement;
	value: string;
	delta: KpiDelta | null;
	comparison: string;
	href: string;
}) {
	return (
		<ReportCard title={title} subtitle={subtitle} icon={icon}>
			<div className="px-4 pt-3.5 pb-3">
				<p className="flex items-center gap-2">
					<span className="font-medium text-[24px] text-dashboard-text-primary tabular-nums leading-8">
						{value}
					</span>
					{delta ? (
						<span
							className={cn(
								"rounded-[4px] px-1.5 text-[12px] tabular-nums leading-5",
								DELTA_TONE[delta.tone],
							)}
						>
							{delta.label}
						</span>
					) : null}
				</p>
				<p className="text-[12px] text-dashboard-text-dim leading-4">{comparison}</p>
			</div>
			<a
				href={href}
				className="flex items-center justify-between border-dashboard-border border-t px-4 py-2.5 text-[13px] text-dashboard-text-secondary hover:text-dashboard-text-primary"
			>
				View details
				<HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
			</a>
		</ReportCard>
	);
}

export type Bar = { key: string; label: string; value: number; title: string; display: string };

/**
 * Single-series vertical bars with value labels and a light grid. `max` fixes the axis
 * (100 for rates); otherwise it rounds up from the largest bar.
 */
export function BarChart({
	bars,
	max,
	emptyText,
}: {
	bars: Bar[];
	max?: number;
	emptyText: string;
}) {
	if (bars.every((bar) => bar.value === 0)) {
		return (
			<div className="flex h-[220px] items-center justify-center px-4 text-center text-[13px] text-dashboard-text-dim">
				{emptyText}
			</div>
		);
	}
	// Past six columns the value labels collide, so many bars read as labelled rows instead.
	if (bars.length > 6) return <BarRows bars={bars} max={max} />;
	const top = max ?? niceCeiling(Math.max(...bars.map((bar) => bar.value)));
	const ticks = [top, top / 2, 0];

	return (
		<div className="flex h-[220px] gap-2 px-4 pt-4 pb-3">
			<div className="flex w-7 shrink-0 flex-col justify-between pb-6 text-end text-[12px] text-dashboard-text-dim tabular-nums leading-none">
				{ticks.map((tick) => (
					<span key={tick} className="-translate-y-1/2 last:translate-y-1/2">
						{Number.isInteger(tick) ? tick : tick.toFixed(1)}
					</span>
				))}
			</div>
			<div className="relative flex min-w-0 flex-1 flex-col">
				<div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
					{ticks.map((tick) => (
						<span key={tick} className="border-dashboard-border border-t border-dashed" />
					))}
				</div>
				<div className="relative flex min-h-0 flex-1 items-end gap-[6%] px-[3%]">
					{bars.map((bar) => (
						<div
							key={bar.key}
							title={bar.title}
							className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
						>
							<span className="mb-1 whitespace-nowrap text-[12px] text-dashboard-text-secondary tabular-nums leading-4">
								{bar.display}
							</span>
							<span
								className="w-full max-w-4 rounded-t-[4px] bg-[var(--rx-accent)]"
								style={{ height: `${Math.max((bar.value / top) * 100, bar.value > 0 ? 1.5 : 0)}%` }}
							/>
						</div>
					))}
				</div>
				<div className="flex h-6 shrink-0 items-end gap-[6%] px-[3%]">
					{bars.map((bar) => (
						<span
							key={bar.key}
							className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[12px] text-dashboard-text-dim leading-4"
						>
							{bar.label}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

function BarRows({ bars, max }: { bars: Bar[]; max?: number }) {
	const top = max ?? Math.max(...bars.map((bar) => bar.value));
	return (
		<ul className="flex min-h-[220px] flex-col justify-center-safe gap-1 px-4 py-3">
			{bars.map((bar) => (
				<li
					key={bar.key}
					title={bar.title}
					className="flex items-center gap-3 text-[12px] leading-4"
				>
					<span className="w-20 shrink-0 truncate text-dashboard-text-dim">{bar.label}</span>
					<span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-dashboard-hover">
						<span
							className="block h-full rounded-full bg-[var(--rx-accent)]"
							style={{ width: `${(bar.value / top) * 100}%` }}
						/>
					</span>
					<span className="w-12 shrink-0 text-end text-dashboard-text-secondary tabular-nums">
						{bar.display}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Round up to a readable axis end (12, 15, 20, 60…) whose half is also readable. */
function niceCeiling(value: number): number {
	if (value <= 0) return 1;
	const power = 10 ** Math.floor(Math.log10(value));
	const step =
		[1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10].find((multiple) => multiple * power >= value) ?? 10;
	return Math.max(2, Math.round(step * power));
}
