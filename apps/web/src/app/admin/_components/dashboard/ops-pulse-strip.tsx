"use client";

import { cn } from "@/lib/utils";
import type { DashboardOpsPulseItem } from "@/modules/dashboard";
import { useDashboardT } from "@/modules/dashboard";

type Props = {
	items: DashboardOpsPulseItem[];
	className?: string;
};

/**
 * Quiet operational depth under the greeting — same idea as chat's
 * title + description + status line, without adding another card.
 */
export function OpsPulseStrip({ items, className }: Props) {
	const t = useDashboardT();
	return (
		<section
			aria-label={t("opsPulse.aria")}
			className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}
		>
			{items.map((item) => (
				<div
					key={item.id}
					className="flex min-w-0 flex-col gap-1.5 rounded-[12px] border border-dashboard-border bg-dashboard-surface px-3.5 py-3 tracking-[-0.15px]"
				>
					<div className="truncate text-[12px] text-dashboard-text-dim uppercase leading-4">
						{item.label}
					</div>
					<div className="font-medium text-[20px] text-dashboard-text-primary leading-7 tabular-nums">
						{item.value}
					</div>
					<p className="line-clamp-2 text-[13px] text-dashboard-text-secondary leading-5">
						{item.hint}
					</p>
				</div>
			))}
		</section>
	);
}
