"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/modules/dashboard";

const COLS_PER_MONTH = 6;
const ROWS = 26;
const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const PAD_X = 2;
const PAD_Y = 2;

const COLOR_GRID = "var(--dashboard-chart-grid)";
const COLOR_NEW = "var(--dashboard-accent)";
const COLOR_EXISTING = "var(--dashboard-chart-dot)";

type Col = {
	idx: number;
	monthIdx: number;
	month: string;
	newCells: number;
	existingCells: number;
};

type Props = {
	months: DashboardMetrics["enrollmentMonths"];
	highlightMonth?: string;
	className?: string;
};

function cellsForCount(count: number, maxCount: number): number {
	if (count <= 0 || maxCount <= 0) return 0;
	return Math.max(1, Math.round((count / maxCount) * (ROWS - 2)));
}

function buildColumns(months: DashboardMetrics["enrollmentMonths"]): Col[] {
	const maxNew = Math.max(...months.map((month) => month.newAdmissions), 1);
	const maxReturning = Math.max(...months.map((month) => month.returning), 1);
	const cols: Col[] = [];

	for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
		const month = months[monthIdx];
		if (!month) continue;

		for (let inner = 0; inner < COLS_PER_MONTH; inner++) {
			const phase = inner / Math.max(COLS_PER_MONTH - 1, 1);
			const newCells = Math.max(
				0,
				Math.round(cellsForCount(month.newAdmissions, maxNew) * (0.65 + phase * 0.35)),
			);
			const existingCells = Math.max(
				1,
				Math.round(cellsForCount(month.returning, maxReturning) * (0.75 + phase * 0.25)),
			);

			cols.push({
				idx: cols.length,
				monthIdx,
				month: month.month,
				newCells,
				existingCells,
			});
		}
	}

	return cols;
}

export function PixelGridChart({ months, highlightMonth, className }: Props) {
	const cols = useMemo(() => buildColumns(months), [months]);
	const [hoverCol, setHoverCol] = useState<number | null>(null);

	const monthLabels = months.map((month) => month.month);
	const highlightIdx = Math.max(0, monthLabels.indexOf(highlightMonth ?? monthLabels[0] ?? "JAN"));
	const defaultIdx = Math.floor((highlightIdx + 0.5) * COLS_PER_MONTH);
	const activeColIdx = hoverCol ?? defaultIdx;
	const activeCol = cols[activeColIdx];
	const activeMonth = activeCol?.month ?? monthLabels[highlightIdx] ?? "JAN";

	const monthTotals = useMemo(() => {
		const map = new Map<string, { newAdmissions: number; returning: number }>();
		for (const month of months) {
			map.set(month.month, {
				newAdmissions: month.newAdmissions,
				returning: month.returning,
			});
		}
		return map;
	}, [months]);

	const maxTotal = Math.max(...months.map((month) => month.total), 1);
	// Keyed by level: small totals round several levels to the same value.
	const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((level) => ({
		level,
		value: Math.round(maxTotal * level),
	}));

	const tip = monthTotals.get(activeMonth);
	const COLS = cols.length;
	const CHART_W = COLS * STEP - GAP + PAD_X * 2;
	const CHART_H = ROWS * STEP - GAP + PAD_Y * 2;

	const stackTopRow = ROWS - 1 - (activeCol?.existingCells ?? 0) - (activeCol?.newCells ?? 0);
	const lineX = PAD_X + activeColIdx * STEP + CELL / 2;
	const dotY = PAD_Y + Math.max(stackTopRow, 0) * STEP;
	const lineXPct = COLS > 0 ? (lineX / CHART_W) * 100 : 50;
	const dotYPct = (dotY / CHART_H) * 100;
	const tipOnRight = activeColIdx < COLS - 14;

	return (
		<div className={cn("flex flex-col", className)}>
			<div className="flex">
				<div className="flex w-[68px] shrink-0 flex-col-reverse justify-between py-1">
					{yTicks.map((tick) => (
						<div key={tick.level} className="flex items-center gap-1.5 leading-none">
							<span className="w-7 text-end font-medium text-[10.5px] text-dashboard-text-muted">
								{tick.value}
							</span>
							<span
								aria-hidden
								className="size-[3px] shrink-0 rounded-full bg-dashboard-chart-dot"
							/>
							<span
								aria-hidden
								className="h-px flex-1"
								style={{
									backgroundImage:
										"repeating-linear-gradient(to right, var(--dashboard-chart-leader) 0 1.5px, transparent 1.5px 4px)",
								}}
							/>
						</div>
					))}
				</div>

				<div className="relative min-w-0 flex-1">
					<svg
						viewBox={`0 0 ${CHART_W} ${CHART_H}`}
						preserveAspectRatio="xMidYMid meet"
						className="block h-auto w-full"
						role="img"
						aria-label="Enrollment trend pixel chart"
					>
						{Array.from({ length: ROWS * COLS }).map((_, idx) => {
							const r = Math.floor(idx / COLS);
							const c = idx % COLS;
							return (
								<rect
									key={`bg-${r}-${c}`}
									x={PAD_X + c * STEP}
									y={PAD_Y + r * STEP}
									width={CELL}
									height={CELL}
									rx={0.75}
									fill={COLOR_GRID}
								/>
							);
						})}

						{cols.map((col) => {
							const startBottom = ROWS - 1;
							const filled: { r: number; color: string }[] = [];
							for (let i = 0; i < col.existingCells; i++) {
								filled.push({ r: startBottom - i, color: COLOR_EXISTING });
							}
							for (let i = 0; i < col.newCells; i++) {
								filled.push({
									r: startBottom - col.existingCells - i,
									color: COLOR_NEW,
								});
							}
							return filled.map((f) => (
								<rect
									key={`fg-${col.idx}-${f.r}-${f.color}`}
									x={PAD_X + col.idx * STEP}
									y={PAD_Y + f.r * STEP}
									width={CELL}
									height={CELL}
									rx={0.75}
									fill={f.color}
								/>
							));
						})}

						{cols.map((col) => (
							<rect
								key={`hit-${col.idx}`}
								x={PAD_X + col.idx * STEP - GAP / 2}
								y={0}
								width={STEP}
								height={CHART_H}
								fill="transparent"
								onMouseEnter={() => setHoverCol(col.idx)}
								onMouseLeave={() => setHoverCol(null)}
								style={{ cursor: "crosshair" }}
							/>
						))}
					</svg>

					{tip && (
						<>
							<div
								className="pointer-events-none absolute top-0 bottom-0 w-px"
								style={{
									left: `${lineXPct}%`,
									backgroundImage:
										"repeating-linear-gradient(to bottom, var(--dashboard-chart-line) 0 2px, transparent 2px 5px)",
								}}
							/>
							<div
								className="pointer-events-none absolute size-2.5 rounded-full border-2 border-dashboard-surface bg-dashboard-tooltip-bg"
								style={{
									left: `${lineXPct}%`,
									top: `${dotYPct}%`,
									transform: "translate(-50%, -50%)",
								}}
							/>
							<div
								className="pointer-events-none absolute z-10 w-[230px] rounded-xl border border-dashboard-border bg-dashboard-tooltip-bg/95 p-2.5 backdrop-blur-sm"
								style={{
									left: `calc(${lineXPct}% + ${tipOnRight ? 18 : -18}px)`,
									top: `${dotYPct}%`,
									transform: tipOnRight ? "translate(0, -50%)" : "translate(-100%, -50%)",
								}}
							>
								<div className="border-dashboard-border-subtle border-b px-3.5 py-2 font-medium text-[14px] text-dashboard-text-secondary">
									{activeMonth.charAt(0) + activeMonth.slice(1).toLowerCase()}
								</div>
								<div className="space-y-2.5 px-3.5 pt-3 pb-2">
									<div className="flex items-center gap-2.5">
										<span
											aria-hidden
											className="size-1.5 rounded-full"
											style={{ backgroundColor: COLOR_NEW }}
										/>
										<span className="text-[13.5px] text-dashboard-text-muted">New admissions</span>
										<span className="ms-auto font-semibold text-[15px] text-dashboard-text-primary tabular-nums">
											{tip.newAdmissions}
										</span>
									</div>
									<div className="flex items-center gap-2.5">
										<span
											aria-hidden
											className="size-1.5 rounded-full"
											style={{ backgroundColor: COLOR_EXISTING }}
										/>
										<span className="text-[13.5px] text-dashboard-text-muted">Returning</span>
										<span className="ms-auto font-semibold text-[15px] text-dashboard-text-primary tabular-nums">
											{tip.returning}
										</span>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			<div
				className="mt-3 ms-[68px] grid"
				style={{ gridTemplateColumns: `repeat(${monthLabels.length}, minmax(0, 1fr))` }}
			>
				{monthLabels.map((month, index) => {
					const isActive = index === highlightIdx;
					return (
						<div key={month} className="flex items-center justify-center gap-2">
							<span
								className={cn(
									"font-medium text-[11px]",
									isActive ? "text-dashboard-text-primary" : "text-dashboard-text-muted",
								)}
							>
								{month}
							</span>
							{index < monthLabels.length - 1 && (
								<span aria-hidden className="size-[3px] rounded-full bg-dashboard-text-faint" />
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
