"use client";

import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/use-now";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

type Props = {
	value?: Date;
	onChange?: (date: Date) => void;
	className?: string;
};

function startOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
	return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** Build a 6×7 calendar matrix anchored on Monday. */
function buildMatrix(view: Date) {
	const first = startOfMonth(view);
	// Convert getDay() (Sun=0) to Monday-first index (Mon=0..Sun=6)
	const offset = (first.getDay() + 6) % 7;
	const start = new Date(first);
	start.setDate(first.getDate() - offset);

	const cells: Date[] = [];
	for (let i = 0; i < 42; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		cells.push(d);
	}
	return cells;
}

export function CalendarPicker({ value, onChange, className }: Props) {
	const today = useNow();
	const [view, setView] = useState<Date>(value ?? today);
	const [selected, setSelected] = useState<Date | undefined>(value);

	const cells = useMemo(() => buildMatrix(view), [view]);

	const handleSelect = (d: Date) => {
		setSelected(d);
		onChange?.(d);
	};

	const goToday = () => {
		setView(today);
		setSelected(today);
		onChange?.(today);
	};

	return (
		<div
			className={cn(
				"rounded-xl border border-dashboard-border bg-dashboard-surface p-3",
				className,
			)}
		>
			{/* Header */}
			<div className="mb-3 flex items-center gap-2 px-1">
				<div className="font-semibold text-[15px] text-dashboard-text-primary">
					{MONTH_NAMES[view.getMonth()]}, {view.getFullYear()}
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={goToday}
					className="ms-1 h-auto rounded-full border-dashboard-border-strong bg-dashboard-hover px-3 py-1 text-[11px] text-dashboard-text-secondary hover:bg-dashboard-hover-strong dark:border-dashboard-border-strong dark:bg-dashboard-hover dark:hover:bg-dashboard-hover-strong"
				>
					Today
				</Button>
				<div className="ms-1 flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Previous month"
						onClick={() => setView(addMonths(view, -1))}
						className="size-7 rounded-full text-dashboard-text-muted hover:bg-dashboard-hover hover:text-dashboard-text-primary dark:hover:bg-dashboard-hover"
					>
						<HugeiconsIcon
							icon={ArrowLeft01Icon}
							size={14}
							strokeWidth={2}
							className="rtl:rotate-180"
						/>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Next month"
						onClick={() => setView(addMonths(view, 1))}
						className="size-7 rounded-full text-dashboard-text-muted hover:bg-dashboard-hover hover:text-dashboard-text-primary dark:hover:bg-dashboard-hover"
					>
						<HugeiconsIcon
							icon={ArrowRight01Icon}
							size={14}
							strokeWidth={2}
							className="rtl:rotate-180"
						/>
					</Button>
				</div>
				<Button
					size="icon"
					aria-label="Add"
					className="ms-auto size-8 rounded-full bg-dashboard-accent text-white hover:bg-dashboard-accent-hover active:scale-95"
				>
					<HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2.4} />
				</Button>
			</div>

			{/* Weekday pills */}
			<div className="mb-2 grid grid-cols-7 gap-1.5">
				{WEEKDAYS.map((d) => (
					<div
						key={d}
						className="rounded-md bg-dashboard-surface-hover py-1.5 text-center font-medium text-[10.5px] text-dashboard-text-muted"
					>
						{d}
					</div>
				))}
			</div>

			{/* Days grid */}
			<div className="grid grid-cols-7 gap-1.5">
				{cells.map((d) => {
					const inMonth = d.getMonth() === view.getMonth();
					const isToday = sameDay(d, today);
					const isSelected = selected ? sameDay(d, selected) : false;
					return (
						<button
							type="button"
							key={d.toISOString()}
							onClick={() => handleSelect(d)}
							className={cn(
								"relative flex aspect-square items-center justify-center rounded-lg border text-[12.5px] tabular-nums transition-all",
								isSelected
									? "border-dashboard-accent bg-dashboard-accent/10 font-semibold text-dashboard-accent"
									: cn(
											"border-dashboard-border-subtle bg-dashboard-surface hover:border-dashboard-border hover:bg-dashboard-surface-elevated",
											inMonth
												? isToday
													? "font-semibold text-dashboard-text-primary"
													: "text-dashboard-text-secondary"
												: "text-dashboard-text-faint",
										),
							)}
						>
							<span className="absolute top-1.5 start-2">{d.getDate()}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
