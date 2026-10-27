"use client";

import {
	CampusCreateForm,
	CampusList,
	PermissionCodes,
	useCampusesQuery,
	usePermissions,
	useTenantContext,
} from "@/modules/tenants";
import { SettingsHeader, SettingsNotice } from "./settings-parts";

/** Settings · Campuses: the school's campuses, and a new one for those who may add it. */
export function CampusesSettings() {
	const { activeTenant, activeCampus, setActiveCampusId } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusesQuery = useCampusesQuery(tenantId);
	const canWrite = can(PermissionCodes.TENANT_SETTINGS_WRITE);

	return (
		<>
			<SettingsHeader
				title="Campuses"
				description="Each campus keeps its own classes, staff and attendance. Pick one to switch to it."
			/>
			{tenantId ? (
				<div className="flex flex-col gap-6">
					<CampusList
						campuses={campusesQuery.data ?? []}
						loading={campusesQuery.isLoading}
						activeCampusId={activeCampus?.id}
						onSelect={setActiveCampusId}
					/>
					{canWrite ? <CampusCreateForm tenantId={tenantId} /> : null}
				</div>
			) : (
				<SettingsNotice>Create a school first to add campuses.</SettingsNotice>
			)}
		</>
	);
}
