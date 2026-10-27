"use client";

import type { ReactNode } from "react";
import { selectActiveCampus, selectActiveTenant, useSessionStore } from "@/store";

type TenantContextValue = {
	tenants: ReturnType<typeof useSessionStore.getState>["tenants"];
	tenantsLoading: boolean;
	/** True once the tenant list has really loaded (it can be empty for a brand-new user). */
	tenantsLoaded: boolean;
	activeTenant: ReturnType<typeof selectActiveTenant>;
	activeCampus: ReturnType<typeof selectActiveCampus>;
	campuses: ReturnType<typeof useSessionStore.getState>["campuses"];
	campusesLoading: boolean;
	/** True once the campus list for the active tenant has loaded. */
	campusesReady: boolean;
	tenantSwitching: boolean;
	setActiveTenantId: (tenantId: string) => void;
	setActiveCampusId: (campusId: string) => void;
	refreshTenants: () => void;
};

/** @deprecated Tenant state lives in the session store; provider is a no-op for compatibility. */
export function TenantProvider({ children }: { children: ReactNode }) {
	return children;
}

export function useTenantContext(): TenantContextValue {
	const tenants = useSessionStore((state) => state.tenants);
	const tenantsLoading = useSessionStore((state) => state.tenantsLoading);
	const tenantsLoaded = useSessionStore((state) => state.tenantsLoaded);
	const campuses = useSessionStore((state) => state.campuses);
	const campusesLoading = useSessionStore((state) => state.campusesLoading);
	const campusesTenantId = useSessionStore((state) => state.campusesTenantId);
	const tenantSwitching = useSessionStore((state) => state.tenantSwitching);
	const activeTenant = useSessionStore(selectActiveTenant);
	const activeCampus = useSessionStore(selectActiveCampus);
	const setActiveTenantId = useSessionStore((state) => state.setActiveTenantId);
	const setActiveCampusId = useSessionStore((state) => state.setActiveCampusId);

	return {
		tenants,
		tenantsLoading,
		tenantsLoaded,
		activeTenant,
		activeCampus,
		campuses,
		campusesLoading,
		campusesReady: !campusesLoading && activeTenant != null && campusesTenantId === activeTenant.id,
		tenantSwitching,
		setActiveTenantId,
		setActiveCampusId,
		refreshTenants: () => {
			// SessionProvider reloads tenants when token/user changes; trigger via store flag if needed later.
		},
	};
}
