"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect } from "react";
import { ApiError } from "@/lib/api/client";
import { authService } from "@/modules/auth/services/auth.service";
import type {
	AuthSession,
	LoginInput,
	LoginResult,
	RegisterInput,
	RegistrationResult,
	TwoFactorInput,
} from "@/modules/auth/types/auth.types";
import { tenantQueryKeys } from "@/modules/tenants/queries/tenant-query-keys";
import { campusesService } from "@/modules/tenants/services/campuses.service";
import { tenantsService } from "@/modules/tenants/services/tenants.service";
import { usersService } from "@/modules/users/services/users.service";
import { useSessionStore } from "./session-store";

export function SessionProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();

	const token = useSessionStore((state) => state.token);
	const tokenExpiresAt = useSessionStore((state) => state.tokenExpiresAt);
	const user = useSessionStore((state) => state.user);
	const activeTenantId = useSessionStore((state) => state.activeTenantId);
	const tenantContext = useSessionStore((state) => state.tenantContext);

	const establishSession = useSessionStore((state) => state.establishSession);
	const clearSession = useSessionStore((state) => state.clearSession);
	const setAuthLoading = useSessionStore((state) => state.setAuthLoading);
	const setTenants = useSessionStore((state) => state.setTenants);
	const setTenantsLoading = useSessionStore((state) => state.setTenantsLoading);
	const setCampuses = useSessionStore((state) => state.setCampuses);
	const setCampusesLoading = useSessionStore((state) => state.setCampusesLoading);
	const setMembership = useSessionStore((state) => state.setMembership);
	const setMembershipLoading = useSessionStore((state) => state.setMembershipLoading);
	const setTenantSwitching = useSessionStore((state) => state.setTenantSwitching);
	const syncActiveTenantFromList = useSessionStore((state) => state.syncActiveTenantFromList);
	const syncActiveCampusFromList = useSessionStore((state) => state.syncActiveCampusFromList);

	const refreshSession = useCallback(async () => {
		const session = await authService.refresh();
		establishSession(session);
		return session;
	}, [establishSession]);

	// Initial session bootstrap: only show loading if there is no persisted session.
	// When a session was rehydrated from sessionStorage, refresh silently in the
	// background so the user never sees a flash of unauthenticated/loading state.
	useEffect(() => {
		const { token: existingToken, hydrated } = useSessionStore.getState();
		if (!hydrated || !existingToken) {
			// First visit or no stored session — show loading while we try to refresh.
			setAuthLoading(true);
			refreshSession()
				.catch(() => clearSession())
				.finally(() => setAuthLoading(false));
		} else {
			// Session was restored from sessionStorage — validate silently.
			refreshSession().catch(() => clearSession());
		}
	}, [clearSession, refreshSession, setAuthLoading]);

	useEffect(() => {
		if (!tokenExpiresAt) return;
		const expiresAtMs = new Date(tokenExpiresAt).getTime();
		if (Number.isNaN(expiresAtMs)) return;
		const delay = Math.max(1_000, expiresAtMs - Date.now() - 60_000);
		let attempts = 0;
		const maxAttempts = 3;

		const attemptRefresh = async () => {
			try {
				await refreshSession();
			} catch {
				attempts += 1;
				if (attempts < maxAttempts) {
					const backoff = Math.min(30_000, 2 ** attempts * 1_000);
					timer = window.setTimeout(attemptRefresh, backoff);
				} else {
					clearSession();
				}
			}
		};

		let timer = window.setTimeout(attemptRefresh, delay);
		return () => window.clearTimeout(timer);
	}, [clearSession, refreshSession, tokenExpiresAt]);

	useEffect(() => {
		if (!token || !user) {
			setTenants([], false);
			setTenantsLoading(false);
			return;
		}

		let cancelled = false;
		setTenantsLoading(true);
		void tenantsService
			.list(token)
			.then((response) => {
				if (cancelled) return;
				setTenants(response.tenants, true);
				syncActiveTenantFromList(response.tenants);
			})
			.catch(() => {
				// A failed load is not "no schools": keep it unloaded so the gate does not redirect.
				if (!cancelled) setTenants([], false);
			})
			.finally(() => {
				if (!cancelled) setTenantsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [setTenants, setTenantsLoading, syncActiveTenantFromList, token, user]);

	useEffect(() => {
		if (!token || !activeTenantId) {
			setCampuses([], null);
			setCampusesLoading(false);
			return;
		}

		let cancelled = false;
		setCampusesLoading(true);
		void campusesService
			.list(token, activeTenantId)
			.then((response) => {
				if (cancelled) return;
				setCampuses(response.campuses, activeTenantId);
				syncActiveCampusFromList(response.campuses);
			})
			.catch(() => {
				// A failed load is not "no campuses": leave the tenant unset so nothing redirects on it.
				if (!cancelled) setCampuses([], null);
			})
			.finally(() => {
				if (!cancelled) setCampusesLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [activeTenantId, setCampuses, setCampusesLoading, syncActiveCampusFromList, token]);

	useEffect(() => {
		if (!token || !activeTenantId) {
			setMembershipLoading(false);
			setTenantSwitching(false);
			return;
		}

		const sessionTenantId = tenantContext?.tenantId ?? null;
		if (sessionTenantId !== activeTenantId) {
			let cancelled = false;
			setTenantSwitching(true);
			void authService
				.switchTenant(token, activeTenantId)
				.then((session) => {
					if (cancelled) return;
					establishSession(session);
					void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
				})
				.catch(() => undefined)
				.finally(() => {
					if (!cancelled) setTenantSwitching(false);
				});

			return () => {
				cancelled = true;
			};
		}

		setTenantSwitching(false);
		return undefined;
	}, [
		activeTenantId,
		establishSession,
		queryClient,
		setMembershipLoading,
		setTenantSwitching,
		tenantContext?.tenantId,
		token,
	]);

	useEffect(() => {
		if (!token || !activeTenantId) {
			setMembership(null);
			setMembershipLoading(false);
			return;
		}

		let cancelled = false;
		setMembershipLoading(true);
		void tenantsService
			.getMembership(token, activeTenantId)
			.then((response) => {
				if (cancelled) return;
				setMembership(response.membership);
			})
			.catch(() => undefined)
			.finally(() => {
				if (!cancelled) setMembershipLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [activeTenantId, setMembership, setMembershipLoading, token]);

	return children;
}

export function useSessionAuthActions() {
	const queryClient = useQueryClient();
	const token = useSessionStore((state) => state.token);
	const establishSession = useSessionStore((state) => state.establishSession);
	const clearSession = useSessionStore((state) => state.clearSession);
	const setAuthError = useSessionStore((state) => state.setAuthError);

	const login = useCallback(
		async (input: LoginInput): Promise<LoginResult> => {
			setAuthError(null);
			try {
				const result = await authService.login(input);
				if (!("requiresTwoFactor" in result)) establishSession(result);
				return result;
			} catch (error) {
				setAuthError(toMessage(error, "Login failed"));
				throw error;
			}
		},
		[establishSession, setAuthError],
	);

	const verifyTwoFactor = useCallback(
		async (input: TwoFactorInput) => establishSession(await authService.verifyTwoFactor(input)),
		[establishSession],
	);

	const register = useCallback(
		async (input: RegisterInput): Promise<RegistrationResult> => authService.register(input),
		[],
	);

	const googleLogin = useCallback(
		async (credential: string) => establishSession(await authService.googleLogin(credential)),
		[establishSession],
	);

	const consumeMagicLink = useCallback(
		async (magicToken: string) => establishSession(await authService.consumeMagicLink(magicToken)),
		[establishSession],
	);

	const logout = useCallback(async () => {
		try {
			await authService.logout();
		} finally {
			clearSession();
			void queryClient.clear();
		}
	}, [clearSession, queryClient]);

	const logoutAll = useCallback(async () => {
		try {
			if (token) await authService.logoutAll(token);
		} finally {
			clearSession();
			void queryClient.clear();
		}
	}, [clearSession, queryClient, token]);

	const refreshUser = useCallback(async () => {
		if (!token) return;
		try {
			useSessionStore.getState().setUser(await usersService.getCurrent(token));
		} catch (error) {
			if (error instanceof ApiError && error.statusCode === 401) {
				establishSession(await authService.refresh());
				return;
			}
			throw error;
		}
	}, [establishSession, token]);

	const clearError = useCallback(() => setAuthError(null), [setAuthError]);

	return {
		login,
		verifyTwoFactor,
		register,
		googleLogin,
		consumeMagicLink,
		establishSession: (session: AuthSession) => {
			establishSession(session);
			void queryClient.invalidateQueries({ queryKey: tenantQueryKeys.all });
		},
		logout,
		logoutAll,
		refreshUser,
		clearError,
	};
}

function toMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
