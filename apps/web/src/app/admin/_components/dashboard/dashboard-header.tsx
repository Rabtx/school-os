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
				"flex flex-col gap-3 border-dashboard-border border-b pb-4 sm:gap-4 sm:pb-5 md:flex-row md:items-end md:justify-between",
				className,
			)}
		>
			<div className="min-w-0">
				<div className="mb-1.5 flex items-center gap-2 text-[11px] text-dashboard-text-muted uppercase tracking-[0.08em]">
					<span className="size-1.5 rounded-full bg-emerald-500" />
					<span className="sm:hidden">{t("header.liveMobile", { org: orgLabel })}</span>
					<span className="hidden sm:inline">{t("header.liveDesktop", { org: orgLabel })}</span>
				</div>
				<h1 className="font-semibold text-[22px] text-dashboard-text-primary leading-tight tracking-tight sm:text-[24px]">
					{t("header.welcome", { name: greetingName })}
				</h1>
				<p className="mt-1.5 text-[13px] text-dashboard-text-secondary leading-5 sm:hidden">
					{today} · {statusLine}
				</p>
				<p className="mt-1.5 hidden max-w-xl text-[13px] text-dashboard-text-secondary leading-5 sm:block">
					{todayLong} · {campusLine}. {statusLine}
				</p>
				<p className="mt-1 hidden text-[12px] text-dashboard-text-dim sm:block">
					{t("header.synced")}
					{insights ? t("header.updated", { time: insights.updatedAt }) : ""}
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
