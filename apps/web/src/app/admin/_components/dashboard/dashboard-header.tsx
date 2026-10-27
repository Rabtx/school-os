"use client";

import { userFirstName } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/modules/dashboard";
import { useDashboardI18n } from "@/modules/dashboard";
import type { Campus } from "@/modules/tenants";
import { useSessionStore } from "@/store";
import { DatePill } from "./date-pill";
import { ExportButton } from "./export-button";
import { PeriodSelect } from "./period-select";
import { useNow } from "@/lib/use-now";

type Props = {
	name?: string;
	tenantName?: string | null;
	campuses?: Campus[];
	insights?: DashboardMetrics["insights"];
	className?: string;
	onExport?: () => void;
};

const NO_CAMPUSES: Campus[] = [];

export function DashboardHeader({
	name,
	tenantName,
	campuses = NO_CAMPUSES,
	insights,
	className,
	onExport,
}: Props) {
	const user = useSessionStore((state) => state.user);
	const { t, intlLocale } = useDashboardI18n();
	const greetingName = name ?? (user ? userFirstName(user.username) : "there");
	const now = useNow();
	const today = now.toLocaleDateString(intlLocale, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
	const todayLong = now.toLocaleDateString(intlLocale, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	const campusLine =
		campuses.length > 0
			? campuses
					.slice(0, 3)
					.map((campus) => campus.name)
					.join(", ")
			: t("header.addCampuses");

	const statusLine = insights
		? t("header.statusLine", {
				total: insights.totalStudents.toLocaleString(intlLocale),
				new: insights.newThisMonth,
				year: insights.activeYearLabel,
			})
		: t("header.statusLoading");

	const orgLabel = tenantName ?? t("header.organization");

	return (
		<section
			className={cn(
				"flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-2",
				className,
			)}
		>
			<div className="flex min-w-0 flex-col gap-0.5 tracking-[-0.15px]">
				<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
					{t("header.welcome", { name: greetingName })}
				</h1>
				<p className="text-[14px] text-dashboard-text-dim leading-5 sm:hidden">
					{today} · {statusLine}
				</p>
				<p
					className="hidden max-w-2xl truncate text-[14px] text-dashboard-text-dim leading-5 sm:block"
					title={`${orgLabel} · ${campusLine}${insights ? ` · ${t("header.updated", { time: insights.updatedAt })}` : ""}`}
				>
					{todayLong} · {campusLine}. {statusLine}
				</p>
			</div>

			<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
				<PeriodSelect className="w-full justify-between sm:w-auto sm:justify-center" />
				<div className="flex gap-2">
					<DatePill className="min-w-0 flex-1 justify-center sm:flex-none" />
					<ExportButton onClick={onExport} className="shrink-0 justify-center px-3" />
				</div>
			</div>
		</section>
	);
}
