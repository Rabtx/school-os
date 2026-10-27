"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import type { AttendanceOverviewDay } from "@/modules/attendance/types/attendance.types";
import { DashboardCard } from "./dashboard-card";

type Props = {
	/** 14 days, Monday to Sunday twice: last week, then this week. */
	days: AttendanceOverviewDay[];
	/** The day being viewed; its weekday is the default crosshair position. */
	sessionDate: string;
	todayRate: number | null;
	loading: boolean;
};

const MIN_HEIGHT = 196;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function weekdayLabel(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

function longDateLabel(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
		weekday: "long",
		day: "numeric",
		month: "short",
	});
}

function sliderText(day: AttendanceOverviewDay | undefined): string {
	if (!day) return "No data";
	const rate = day.attendanceRate === null ? "not marked" : `${day.attendanceRate}%`;
	return `${longDateLabel(day.date)}: ${rate}`;
}

/** Content box of the plot area, so the chart fills whatever height the card row gives it. */
function usePlotSize() {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 0, height: MIN_HEIGHT });
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			setSize({
				width: entry.contentRect.width,
				height: Math.max(MIN_HEIGHT, entry.contentRect.height),
			});
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);
	return { ref, ...size };
}

/** Days with a rate, as (position in the week, rate) points. */
function ratePoints(week: AttendanceOverviewDay[]): { index: number; rate: number }[] {
	return week.flatMap((day, index) =>
		day.attendanceRate === null ? [] : [{ index, rate: day.attendanceRate }],
	);
}

/** Lower bound of the y axis: a step below the lowest rate, so small dips stay visible. */
function axisFloor(rates: number[]): number {
	if (rates.length === 0) return 90;
	const lowest = Math.min(...rates);
	return Math.max(0, Math.floor((lowest - 2.5) / 2.5) * 2.5);
}

/** Figma "Attendance overview": this week (accent area) against last week (dashed). */
export function AttendanceOverviewCard({ days, sessionDate, todayRate, loading }: Props) {
	const { ref, width, height: HEIGHT } = usePlotSize();
	const [hover, setHover] = useState<number | null>(null);
	const lastWeek = days.slice(0, 7);
	const thisWeek = days.slice(7, 14);
	const rates = days.flatMap((day) => (day.attendanceRate === null ? [] : [day.attendanceRate]));
	const floor = axisFloor(rates);
	const ticks = [0, 1, 2, 3, 4].map((step) => floor + ((100 - floor) * step) / 4);
	const plotWidth = Math.max(0, width - PAD.left - PAD.right);
	const plotHeight = HEIGHT - PAD.top - PAD.bottom;
	const x = (index: number) => PAD.left + (plotWidth * index) / 6;
	const y = (rate: number) => PAD.top + plotHeight * (1 - (rate - floor) / (100 - floor));

	const paths = (() => {
		const current = ratePoints(thisWeek);
		const previous = ratePoints(lastWeek);
		const toPath = (points: { index: number; rate: number }[]) =>
			points
				.map((point, i) => `${i === 0 ? "M" : "L"}${x(point.index)},${y(point.rate)}`)
				.join(" ");
		const first = current[0];
		const last = current.at(-1);
		const area =
			first && last
				? `${toPath(current)} L${x(last.index)},${PAD.top + plotHeight} L${x(first.index)},${PAD.top + plotHeight} Z`
				: "";
		return {
			current: toPath(current),
			previous: toPath(previous),
			area,
			lonePoints: [current, previous].filter((points) => points.length === 1).flat(),
		};
	})();

	const viewedIndex = Math.max(
		0,
		thisWeek.findIndex((day) => day.date === sessionDate),
	);
	const hovered = hover === null ? null : thisWeek[hover];

	return (
		<DashboardCard title="Attendance overview" icon={Calendar03Icon} className="lg:col-span-2">
			<div
				ref={ref}
				role="slider"
				tabIndex={0}
				aria-label="Daily attendance rate, this week against last week. Use the arrow keys to read each day."
				aria-valuemin={0}
				aria-valuemax={6}
				aria-valuenow={hover ?? viewedIndex}
				aria-valuetext={sliderText(thisWeek[hover ?? viewedIndex])}
				className="relative min-h-[196px] flex-1 rounded-[8px] px-4 outline-none focus-visible:ring-2 focus-visible:ring-dashboard-border-focus"
				onMouseLeave={() => setHover(null)}
				onMouseMove={(event) => {
					const box = event.currentTarget.getBoundingClientRect();
					const relative = event.clientX - box.left - 16 - PAD.left;
					const index = Math.round((relative / Math.max(plotWidth, 1)) * 6);
					setHover(index >= 0 && index <= 6 ? index : null);
				}}
				onKeyDown={(event) => {
					if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
					event.preventDefault();
					const step = event.key === "ArrowLeft" ? -1 : 1;
					setHover((current) => Math.min(6, Math.max(0, (current ?? viewedIndex) + step)));
				}}
				onBlur={() => setHover(null)}
			>
				{loading ? (
					<div className="h-full min-h-[196px] animate-pulse rounded-[8px] bg-dashboard-hover/50" />
				) : rates.length === 0 ? (
					<div className="flex h-full min-h-[196px] items-center justify-center text-[13px] text-dashboard-text-dim">
						No attendance marked in the last two weeks.
					</div>
				) : width > 0 ? (
					<svg width={width} height={HEIGHT} aria-hidden>
						<defs>
							<linearGradient id="attendance-area" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stopColor="var(--rx-accent)" stopOpacity="0.28" />
								<stop offset="100%" stopColor="var(--rx-accent)" stopOpacity="0" />
							</linearGradient>
						</defs>
						{ticks.map((tick) => (
							<g key={tick}>
								<line
									x1={PAD.left}
									x2={PAD.left + plotWidth}
									y1={y(tick)}
									y2={y(tick)}
									stroke="var(--dashboard-border)"
									strokeDasharray="2 4"
								/>
								<text
									x={PAD.left - 10}
									y={y(tick)}
									textAnchor="end"
									dominantBaseline="middle"
									className="fill-dashboard-text-dim text-[12px]"
								>
									{Number.isInteger(tick) ? tick : tick.toFixed(1)}%
								</text>
							</g>
						))}
						{thisWeek.map((day, index) => (
							<text
								key={day.date}
								x={x(index)}
								y={HEIGHT - 8}
								textAnchor="middle"
								className={
									hover === index
										? "fill-dashboard-text-primary text-[12px]"
										: "fill-dashboard-text-dim text-[12px]"
								}
							>
								{weekdayLabel(day.date)}
							</text>
						))}
						<path d={paths.area} fill="url(#attendance-area)" />
						<path
							d={paths.previous}
							fill="none"
							stroke="var(--rx-text-tertiary)"
							strokeWidth={2}
							strokeDasharray="4 4"
						/>
						<path d={paths.current} fill="none" stroke="var(--rx-accent)" strokeWidth={2} />
						{paths.lonePoints.map((point) => (
							<circle
								key={`${point.index}-${point.rate}`}
								cx={x(point.index)}
								cy={y(point.rate)}
								r={4}
								fill="var(--rx-text-tertiary)"
							/>
						))}
						{hover !== null ? (
							<line
								x1={x(hover)}
								x2={x(hover)}
								y1={PAD.top}
								y2={PAD.top + plotHeight}
								stroke="var(--rx-text-tertiary)"
								strokeWidth={1}
							/>
						) : null}
						{hovered?.attendanceRate != null && hover !== null ? (
							<circle
								cx={x(hover)}
								cy={y(hovered.attendanceRate)}
								r={5}
								fill="var(--rx-accent)"
								stroke="var(--dashboard-surface)"
								strokeWidth={2}
							/>
						) : null}
					</svg>
				) : (
					<div className="h-full min-h-[196px]" />
				)}

				{hovered && hover !== null ? (
					<div
						className="pointer-events-none absolute top-6 z-10 w-[148px] rounded-[8px] border border-dashboard-border-strong bg-dashboard-sidebar-bg px-2.5 py-2 text-[12px] shadow-lg"
						style={{
							// The svg starts after the 16px card padding; sit the tooltip 12px right of the crosshair.
							left: Math.min(16 + x(hover) + 12, Math.max(width - 148, 0)),
						}}
					>
						<p className="mb-1 font-medium text-[13px] text-dashboard-text-primary">
							{longDateLabel(hovered.date)}
						</p>
						{hovered.summary.total === 0 ? (
							<p className="text-dashboard-text-dim">Not marked</p>
						) : (
							[
								["Present", hovered.summary.present],
								["Absent", hovered.summary.absent],
								["Late", hovered.summary.late],
							].map(([label, value]) => (
								<p key={label} className="flex justify-between text-dashboard-text-secondary">
									<span>{label}</span>
									<span className="text-dashboard-text-primary tabular-nums">{value}</span>
								</p>
							))
						)}
					</div>
				) : null}
			</div>

			<footer className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-1 pb-3.5 text-[12px] text-dashboard-text-secondary">
				<span className="flex items-center gap-1.5">
					<span aria-hidden className="h-0.5 w-3 rounded-full bg-[var(--rx-accent)]" />
					This week
				</span>
				<span className="flex items-center gap-1.5">
					<span
						aria-hidden
						className="h-0 w-3 border-[var(--rx-text-tertiary)] border-t-2 border-dashed"
					/>
					Last week
				</span>
				<span className="ms-auto text-dashboard-text-dim">
					{todayRate == null ? "Today not marked yet" : `${todayRate}% attendance today`}
				</span>
			</footer>

			<table className="sr-only">
				<caption>Daily attendance rate</caption>
				<thead>
					<tr>
						<th>Day</th>
						<th>This week</th>
						<th>Last week</th>
					</tr>
				</thead>
				<tbody>
					{thisWeek.map((day, index) => (
						<tr key={day.date}>
							<td>{weekdayLabel(day.date)}</td>
							<td>{day.attendanceRate ?? "—"}</td>
							<td>{lastWeek[index]?.attendanceRate ?? "—"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</DashboardCard>
	);
}
