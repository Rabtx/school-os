"use client";

import { userFirstName } from "@/lib/user-display";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useSessionStore } from "@/store";
import { useDashboardI18n } from "../i18n/dashboard-i18n-provider";
import { AdminDashboard } from "./admin-dashboard";
import { PrincipalSchoolPulse } from "./principal-school-pulse";

export function PrincipalDashboard() {
	const { activeTenant, campuses } = useTenantContext();
	const { can, role } = usePermissions();
	const { t } = useDashboardI18n();
	const user = useSessionStore((state) => state.user);
	const metricsEnabled = can(PermissionCodes.STUDENTS_READ);
	const isVice = role === "vice_principal";
	const locationWord = campuses.length === 1 ? t("principal.location") : t("principal.locations");
	const greetingName = user ? userFirstName(user.username) : "there";

	return (
		<div className="mx-auto w-full min-w-0 max-w-[1600px]">
			<div className="flex flex-col gap-0.5 px-4 pt-5 tracking-[-0.15px] sm:px-6">
				<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
					{t("header.welcome", { name: greetingName })}
				</h1>
				<p className="max-w-2xl text-[14px] text-dashboard-text-dim leading-5">
					{isVice ? t("vicePrincipal.commandCenter") : t("principal.commandCenter")} ·{" "}
					{activeTenant?.name ?? t("common.yourSchool")} · {campuses.length} {locationWord}
				</p>
			</div>

			<PrincipalSchoolPulse tenantName={activeTenant?.name ?? null} enabled={metricsEnabled} />

			<div className="px-4 pt-1 sm:px-6">
				<h2 className="font-medium text-[14px] text-dashboard-text-primary leading-5 tracking-[-0.15px]">
					{t("principal.enrollmentDetail")}
				</h2>
			</div>
			<AdminDashboard enabled={metricsEnabled} embedded schoolPulse />
		</div>
	);
}
