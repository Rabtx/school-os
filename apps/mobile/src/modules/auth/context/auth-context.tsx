import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ApiError } from "@/lib/api/client";
import { usersService } from "@/modules/users/services/users.service";
import type { User } from "@/modules/users/types/user.types";
import { authService } from "../services/auth.service";
import { tokenStorage } from "../services/token-storage";
import type {
	AuthSession,
	LoginInput,
	LoginResult,
	RegisterInput,
	RegistrationResult,
	TwoFactorInput,
} from "../types/auth.types";

interface AuthContextValue {
	token: string | null;
	user: User | null;
	loading: boolean;
	error: string | null;
	login: (input: LoginInput) => Promise<LoginResult>;
	verifyTwoFactor: (input: TwoFactorInput) => Promise<void>;
	register: (input: RegisterInput) => Promise<RegistrationResult>;
	consumeMagicLink: (token: string) => Promise<void>;
	establishSession: (session: AuthSession) => Promise<void>;
	logout: () => Promise<void>;
	logoutAll: () => Promise<void>;
	refreshUser: () => Promise<void>;
	clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const clearSession = useCallback(async () => {
		setToken(null);
		setTokenExpiresAt(null);
		setUser(null);
		await tokenStorage.setRefreshToken(null);
	}, []);

	const establishSession = useCallback(async (session: AuthSession) => {
		setToken(session.accessToken);
		setTokenExpiresAt(session.accessTokenExpiresAt);
		setUser(session.user);
		if (session.refreshToken) {
			await tokenStorage.setRefreshToken(session.refreshToken);
		}
		// Auth session payloads omit profile; hydrate from /users/me like web.
		try {
			setUser(await usersService.getCurrent(session.accessToken));
		} catch {
			// Keep session.user if profile fetch fails (offline, transient errors).
		}
	}, []);

	const refreshSession = useCallback(async () => {
		const session = await authService.refresh();
		await establishSession(session);
		return session;
	}, [establishSession]);

	useEffect(() => {
		// oxlint-disable-next-line react/set-state-in-effect
		refreshSession()
			.catch(() => clearSession())
			.finally(() => setLoading(false));
	}, [clearSession, refreshSession]);

	useEffect(() => {
		if (!tokenExpiresAt) return;
		const delay = Math.max(1_000, new Date(tokenExpiresAt).getTime() - Date.now() - 60_000);
		const timer = setTimeout(() => {
			refreshSession().catch(() => {
				void clearSession();
			});
		}, delay);
		return () => clearTimeout(timer);
	}, [clearSession, refreshSession, tokenExpiresAt]);

	const login = useCallback(
		async (input: LoginInput) => {
			setError(null);
			try {
				const result = await authService.login(input);
				if (!("requiresTwoFactor" in result)) await establishSession(result);
				return result;
			} catch (caught) {
				setError(toMessage(caught, "Login failed"));
				throw caught;
			}
		},
		[establishSession],
	);

	const verifyTwoFactor = useCallback(
		async (input: TwoFactorInput) => {
			await establishSession(await authService.verifyTwoFactor(input));
		},
		[establishSession],
	);

	const register = useCallback(async (input: RegisterInput) => {
		setError(null);
		try {
			return await authService.register(input);
		} catch (caught) {
			setError(toMessage(caught, "Registration failed"));
			throw caught;
		}
	}, []);

	const consumeMagicLink = useCallback(
		async (magicToken: string) => {
			await establishSession(await authService.consumeMagicLink(magicToken));
		},
		[establishSession],
	);

	const logout = useCallback(async () => {
		try {
			await authService.logout();
		} finally {
			await clearSession();
		}
	}, [clearSession]);

	const logoutAll = useCallback(async () => {
		try {
			if (token) await authService.logoutAll(token);
		} finally {
			await clearSession();
		}
	}, [clearSession, token]);

	const refreshUser = useCallback(async () => {
		if (!token) return;
		try {
			setUser(await usersService.getCurrent(token));
		} catch (caught) {
			if (caught instanceof ApiError && caught.statusCode === 401) {
				await refreshSession();
				return;
			}
			throw caught;
		}
	}, [refreshSession, token]);

	const clearError = useCallback(() => setError(null), []);

	const value = useMemo(
		() => ({
			token,
			user,
			loading,
			error,
			login,
			verifyTwoFactor,
			register,
			consumeMagicLink,
			establishSession,
			logout,
			logoutAll,
			refreshUser,
			clearError,
		}),
		[
			token,
			user,
			loading,
			error,
			login,
			verifyTwoFactor,
			register,
			consumeMagicLink,
			establishSession,
			logout,
			logoutAll,
			refreshUser,
			clearError,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
}

function toMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
