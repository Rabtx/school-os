"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";

const ONBOARDING_PREFIX = "/admin/onboarding";

export function TenantOnboardingGate({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const {
		tenants,
		tenantsLoading,
		tenantsLoaded,
		campuses,
		campusesLoading,
		campusesReady,
		activeTenant,
	} = useTenantContext();
	const { can } = usePermissions();
	const canCreateCampus = can(PermissionCodes.TENANT_CAMPUS_CREATE);

	const onOnboarding = pathname.startsWith(ONBOARDING_PREFIX);
	const onCampuses = pathname.includes("/campuses") || pathname.startsWith("/admin/tenants/");

	useEffect(() => {
		// Wait for real data: on a fresh page load this effect runs before the session provider has
		// started fetching, when both lists are still empty and nothing reports "loading".
		if (tenantsLoading || campusesLoading || !tenantsLoaded) return;

		if (tenants.length === 0 && !onOnboarding && !onCampuses) {
			router.replace("/admin/onboarding/tenant");
			return;
		}

		if (tenants.length > 0 && onOnboarding) {
			const tenantId = activeTenant?.id ?? tenants[0]?.id;
			if (tenantId) {
				router.replace(`/admin/tenants/${tenantId}/campuses`);
			} else {
				router.replace("/admin");
			}
			return;
		}

		// Only send someone to campus setup once their campus list has really loaded: on a fresh
		// page load this effect runs before the campus fetch starts, when the list is still empty.
		if (
			!onOnboarding &&
			!onCampuses &&
			tenants.length > 0 &&
			campusesReady &&
			campuses.length === 0 &&
			activeTenant &&
			canCreateCampus
		) {
			router.replace(`/admin/tenants/${activeTenant.id}/campuses`);
		}
	}, [
		activeTenant,
		campuses.length,
		campusesLoading,
		campusesReady,
		canCreateCampus,
		onCampuses,
		onOnboarding,
		router,
		tenants,
		tenantsLoaded,
		tenantsLoading,
	]);

	if (tenantsLoading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Spinner className="size-6 text-dashboard-accent" />
			</div>
		);
	}

	if (tenants.length === 0 && !onOnboarding && !onCampuses) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Spinner className="size-6 text-dashboard-accent" />
			</div>
		);
	}

	return children;
}
