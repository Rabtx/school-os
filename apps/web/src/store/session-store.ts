"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizeTenantContext } from "@/modules/auth/lib/normalize-tenant-context";
import type { AuthSession } from "@/modules/auth/types/auth.types";
import type { PermissionCode } from "@/modules/tenants/constants/permission-codes";
import type { Campus, Tenant, TenantMembership } from "@/modules/tenants/types/tenant.types";
import type { User } from "@/modules/users/types/user.types";

const TENANT_STORAGE_KEY = "school-os.active-tenant-id";
const CAMPUS_STORAGE_KEY = "school-os.active-campus-id";
const SESSION_PERSIST_KEY = "school-os.session";

type SessionState = {
	token: string | null;
	tokenExpiresAt: string | null;
	user: User | null;
	tenantContext: TenantMembership | null;
	membership: TenantMembership | null;
	authLoading: boolean;
	authError: string | null;
	/** True once the persist middleware has rehydrated from sessionStorage. */
	hydrated: boolean;

	tenants: Tenant[];
	tenantsLoading: boolean;
	/** True once the tenant list has loaded for the current session (not merely "not loading"). */
	tenantsLoaded: boolean;
	activeTenantId: string | null;
	activeCampusId: string | null;
	campuses: Campus[];
	campusesLoading: boolean;
	/** Tenant whose campus list is in `campuses` (null until the first load finishes). */
	campusesTenantId: string | null;
	tenantSwitching: boolean;
	membershipLoading: boolean;

	establishSession: (session: AuthSession) => void;
	clearSession: () => void;
	setAuthLoading: (loading: boolean) => void;
	setAuthError: (error: string | null) => void;
	setUser: (user: User | null) => void;
	setMembership: (membership: TenantMembership | null) => void;
	setMembershipLoading: (loading: boolean) => void;
	setTenants: (tenants: Tenant[], loaded: boolean) => void;
	setTenantsLoading: (loading: boolean) => void;
	setCampuses: (campuses: Campus[], tenantId: string | null) => void;
	setCampusesLoading: (loading: boolean) => void;
	setTenantSwitching: (switching: boolean) => void;
	setActiveTenantId: (tenantId: string) => void;
	setActiveCampusId: (campusId: string) => void;
	syncActiveTenantFromList: (tenants: Tenant[]) => void;
	syncActiveCampusFromList: (campuses: Campus[]) => void;
};

function readStoredId(key: string): string | null {
	if (typeof window === "undefined") return null;
	return window.sessionStorage.getItem(key);
}

function writeStoredId(key: string, value: string | null) {
	if (typeof window === "undefined") return;
	if (value) window.sessionStorage.setItem(key, value);
	else window.sessionStorage.removeItem(key);
}

export const useSessionStore = create<SessionState>()(
	persist(
		(set, get) => ({
			token: null,
			tokenExpiresAt: null,
			user: null,
			tenantContext: null,
			membership: null,
			authLoading: true,
			authError: null,
			hydrated: false,

			tenants: [],
			tenantsLoading: false,
			tenantsLoaded: false,
			activeTenantId: null,
			activeCampusId: null,
			campuses: [],
			campusesLoading: false,
			campusesTenantId: null,
			tenantSwitching: false,
			membershipLoading: false,

			establishSession: (session) => {
				const tenantContext = normalizeTenantContext(session.tenantContext ?? undefined);
				set({
					token: session.accessToken,
					tokenExpiresAt: session.accessTokenExpiresAt,
					user: session.user,
					tenantContext,
					membership: tenantContext,
					authLoading: false,
					authError: null,
				});

				if (tenantContext?.tenantId) {
					const { activeTenantId } = get();
					if (!activeTenantId || activeTenantId !== tenantContext.tenantId) {
						set({ activeTenantId: tenantContext.tenantId });
						writeStoredId(TENANT_STORAGE_KEY, tenantContext.tenantId);
					}
				}
			},

			clearSession: () => {
				set({
					token: null,
					tokenExpiresAt: null,
					user: null,
					tenantContext: null,
					membership: null,
					authLoading: false,
					authError: null,
					tenants: [],
					tenantsLoading: false,
					tenantsLoaded: false,
					activeTenantId: null,
					activeCampusId: null,
					campuses: [],
					campusesLoading: false,
					campusesTenantId: null,
					tenantSwitching: false,
					membershipLoading: false,
				});
				writeStoredId(TENANT_STORAGE_KEY, null);
				writeStoredId(CAMPUS_STORAGE_KEY, null);
			},

			setAuthLoading: (authLoading) => set({ authLoading }),
			setAuthError: (authError) => set({ authError }),
			setUser: (user) => set({ user }),

			setMembership: (membership) =>
				set({
					membership,
					tenantContext: membership,
				}),

			setMembershipLoading: (membershipLoading) => set({ membershipLoading }),
			setTenants: (tenants, tenantsLoaded) => set({ tenants, tenantsLoaded }),
			setTenantsLoading: (tenantsLoading) => set({ tenantsLoading }),
			setCampuses: (campuses, campusesTenantId) => set({ campuses, campusesTenantId }),
			setCampusesLoading: (campusesLoading) => set({ campusesLoading }),
			setTenantSwitching: (tenantSwitching) => set({ tenantSwitching }),

			setActiveTenantId: (tenantId) => {
				const { activeTenantId } = get();
				if (activeTenantId === tenantId) return;
				set({
					activeTenantId: tenantId,
					activeCampusId: null,
					campuses: [],
					tenantSwitching: true,
				});
				writeStoredId(TENANT_STORAGE_KEY, tenantId);
				writeStoredId(CAMPUS_STORAGE_KEY, null);
			},

			setActiveCampusId: (campusId) => {
				set({ activeCampusId: campusId });
				writeStoredId(CAMPUS_STORAGE_KEY, campusId);
			},

			syncActiveTenantFromList: (tenants) => {
				if (!tenants.length) {
					set({ activeTenantId: null, activeCampusId: null });
					writeStoredId(TENANT_STORAGE_KEY, null);
					writeStoredId(CAMPUS_STORAGE_KEY, null);
					return;
				}

				const { activeTenantId } = get();
				const storedTenantId = readStoredId(TENANT_STORAGE_KEY);
				const nextTenantId =
					tenants.find((tenant) => tenant.id === activeTenantId)?.id ??
					tenants.find((tenant) => tenant.id === storedTenantId)?.id ??
					tenants[0]?.id ??
					null;

				if (nextTenantId !== activeTenantId) {
					set({ activeTenantId: nextTenantId, activeCampusId: null, campuses: [] });
					writeStoredId(TENANT_STORAGE_KEY, nextTenantId);
					writeStoredId(CAMPUS_STORAGE_KEY, null);
				}
			},

			syncActiveCampusFromList: (campuses) => {
				if (!campuses.length) {
					set({ activeCampusId: null });
					writeStoredId(CAMPUS_STORAGE_KEY, null);
					return;
				}

				const { activeCampusId } = get();
				const storedCampusId = readStoredId(CAMPUS_STORAGE_KEY);
				const nextCampusId =
					campuses.find((campus) => campus.id === activeCampusId)?.id ??
					campuses.find((campus) => campus.id === storedCampusId)?.id ??
					campuses[0]?.id ??
					null;

				if (nextCampusId !== activeCampusId) {
					set({ activeCampusId: nextCampusId });
					writeStoredId(CAMPUS_STORAGE_KEY, nextCampusId);
				}
			},
		}),
		{
			name: SESSION_PERSIST_KEY,
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				token: state.token,
				tokenExpiresAt: state.tokenExpiresAt,
				user: state.user,
				tenantContext: state.tenantContext,
				membership: state.membership,
				activeTenantId: state.activeTenantId,
				activeCampusId: state.activeCampusId,
			}),
			merge: (persistedState, currentState) => {
				const persisted = persistedState as Partial<SessionState> | undefined;
				const merged = { ...currentState, ...persisted };
				return {
					...merged,
					// Session restored from sessionStorage — skip the loading flash.
					// The background refresh will silently validate/rotate the token.
					hydrated: true,
					authLoading: merged.token ? false : currentState.authLoading,
				};
			},
		},
	),
);

export function selectActiveTenant(state: SessionState): Tenant | null {
	return state.tenants.find((tenant) => tenant.id === state.activeTenantId) ?? null;
}

export function selectActiveCampus(state: SessionState): Campus | null {
	return state.campuses.find((campus) => campus.id === state.activeCampusId) ?? null;
}

export function selectCan(state: SessionState, permission: PermissionCode): boolean {
	return state.membership?.permissions.includes(permission) ?? false;
}

export function selectPermissionsLoading(state: SessionState): boolean {
	return Boolean(state.activeTenantId && (state.tenantSwitching || state.membershipLoading));
}
