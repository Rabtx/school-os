"use client";

import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Spinner } from "@school-os/ui/components/spinner";
import { useMemo } from "react";
import { RecentAdmissionsCard } from "@/app/admin/_components/dashboard/admissions/recent-admissions-card";
import { DashboardHeader } from "@/app/admin/_components/dashboard/dashboard-header";
import { EnrollmentTrendCard } from "@/app/admin/_components/dashboard/enrollment-trend/enrollment-trend-card";
import { FadeIn } from "@/app/admin/_components/dashboard/fade-in";
import { GradeDistributionCard } from "@/app/admin/_components/dashboard/grade-distribution/grade-distribution-card";
import { OpsPulseStrip } from "@/app/admin/_components/dashboard/ops-pulse-strip";
import { StatCardsRow } from "@/app/admin/_components/dashboard/stat-cards-row";
import { useDashboardMetricsQuery } from "../hooks/use-dashboard-queries";
import { useDashboardI18n } from "../i18n/dashboard-i18n-provider";
import { localizeDashboardMetrics } from "../i18n/localize-dashboard-metrics";

type Props = {
	enabled?: boolean;
	embedded?: boolean;
	/** Load school-wide attendance pulse for leadership dashboards. */
	schoolPulse?: boolean;
};

export function AdminDashboard({ enabled = true, embedded = false, schoolPulse = false }: Props) {
	const { t } = useDashboardI18n();
	const { metrics, isLoading, isError, tenantName, campuses } = useDashboardMetricsQuery(enabled, {
		schoolPulse,
	});
	const localized = useMemo(
		() => (metrics ? localizeDashboardMetrics(metrics, t) : null),
		[metrics, t],
	);

	if (isError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{t("adminDashboard.loadError")}</AlertDescription>
			</Alert>
		);
	}

	if (isLoading || !metrics || !localized) {
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<Spinner className="size-8" />
			</div>
		);
	}

	return (
		<div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 px-4 py-5 sm:px-6">
			{!embedded ? (
				<FadeIn>
					<DashboardHeader
						tenantName={tenantName}
						campuses={campuses}
						insights={metrics.insights}
					/>
				</FadeIn>
			) : null}
			<FadeIn delay={0.04}>
				<OpsPulseStrip items={localized.opsPulse} />
			</FadeIn>
			<FadeIn delay={0.08}>
				<StatCardsRow stats={localized.stats} />
			</FadeIn>
			<div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
				<FadeIn delay={0.12} className="min-w-0 xl:col-span-8">
					<EnrollmentTrendCard months={metrics.enrollmentMonths} insights={metrics.insights} />
				</FadeIn>
				<FadeIn delay={0.16} className="min-w-0 xl:col-span-4">
					<GradeDistributionCard grades={metrics.gradeRows} insights={metrics.insights} />
				</FadeIn>
			</div>
			<FadeIn delay={0.2} className="min-w-0">
				<RecentAdmissionsCard
					admissions={metrics.recentAdmissions}
					summary={metrics.admissionSummary}
					updatedAt={metrics.insights.updatedAt}
				/>
			</FadeIn>
		</div>
	);
}
