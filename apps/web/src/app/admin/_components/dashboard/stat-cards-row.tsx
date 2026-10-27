"use client";

import {
	Building03Icon,
	CheckmarkCircle02Icon,
	Mail01Icon,
	Money03Icon,
	TeacherIcon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { DashboardStatCard } from "@/modules/dashboard";
import { useDashboardT } from "@/modules/dashboard";
import { StatCard } from "./stat-card";

const statIcons = {
	students: UserGroupIcon,
	attendance: CheckmarkCircle02Icon,
	staff: TeacherIcon,
	fees: Money03Icon,
	invites: Mail01Icon,
	sections: Building03Icon,
};

type Props = {
	stats: DashboardStatCard[];
	className?: string;
};

export function StatCardsRow({ stats, className }: Props) {
	const t = useDashboardT();
	return (
		<section
			aria-label={t("stats.aria")}
			className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}
		>
			{stats.map((stat) => (
				<StatCard
					key={stat.id}
					label={stat.label}
					value={stat.value}
					formatValue={stat.formatValue}
					detail={stat.detail}
					trend={stat.trend}
					trendDelta={stat.trendDelta}
					icon={statIcons[stat.id as keyof typeof statIcons]}
					unavailable={stat.unavailable}
				/>
			))}
		</section>
	);
}
