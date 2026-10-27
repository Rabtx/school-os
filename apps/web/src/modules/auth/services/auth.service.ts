import { apiClient } from "@/lib/api/client";
import type { User } from "@/modules/users/types/user.types";
import type {
	AuthChallengeResult,
	AuthenticationResponseJSON,
	AuthSession,
	ChangePasswordInput,
	GoogleProviders,
	LoginInput,
	LoginResult,
	PasskeyAuthenticationOptions,
	PasskeyRegistrationOptions,
	PasskeyView,
	RegisterInput,
	RegistrationResponseJSON,
	RegistrationResult,
	ResetPasswordInput,
	SecurityStatus,
	SessionInfo,
	TotpSetup,
	TwoFactorInput,
	VerifyEmailInput,
} from "../types/auth.types";

/**
 * Refresh tokens rotate on every use, and presenting a used one counts as theft (all sessions are
 * revoked). Concurrent callers (StrictMode effects, the bootstrap and the expiry timer) therefore
 * share one in-flight request instead of each sending the same cookie.
 */
let inFlightRefresh: Promise<AuthSession> | null = null;

export const authService = {
	register: (input: RegisterInput) => apiClient.post<RegistrationResult>("/auth/register", input),
	verifyEmail: (input: VerifyEmailInput) => apiClient.post<User>("/auth/verify-email", input),
	resendVerification: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/resend-verification", { email }),
	login: (input: LoginInput) => apiClient.post<LoginResult>("/auth/login", input),
	verifyTwoFactor: (input: TwoFactorInput) =>
		apiClient.post<AuthSession>("/auth/methods/two-factor/verify", input),
	refresh: () => {
		inFlightRefresh ??= apiClient.post<AuthSession>("/auth/refresh").finally(() => {
			inFlightRefresh = null;
		});
		return inFlightRefresh;
	},
	switchTenant: (accessToken: string, tenantId: string) =>
		apiClient.post<AuthSession>("/auth/switch-tenant", { tenantId }, { accessToken }),
	logout: () => apiClient.post<void>("/auth/logout"),
	logoutAll: (accessToken: string) =>
		apiClient.post<void>("/auth/logout-all", undefined, { accessToken }),
	forgotPassword: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/forgot-password", { email }),
	resetPassword: (input: ResetPasswordInput) =>
		apiClient.post<AuthChallengeResult>("/auth/reset-password", input),
	changePassword: (accessToken: string, input: ChangePasswordInput) =>
		apiClient.post<AuthChallengeResult>("/auth/change-password", input, { accessToken }),
	requestMagicLink: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/methods/magic-link/request", { email }),
	consumeMagicLink: (token: string) =>
		apiClient.post<AuthSession>("/auth/methods/magic-link/consume", { token }),
	providers: () => apiClient.get<GoogleProviders>("/auth/methods"),
	googleLogin: (credential: string) =>
		apiClient.post<AuthSession>("/auth/methods/google", { credential }),
	beginPasskeyLogin: (email?: string) =>
		apiClient.post<PasskeyAuthenticationOptions>(
			"/auth/methods/passkeys/options",
			email ? { email } : {},
		),
	finishPasskeyLogin: (input: { challengeId: string; response: AuthenticationResponseJSON }) =>
		apiClient.post<AuthSession>("/auth/methods/passkeys/verify", input),
	listSessions: (accessToken: string) =>
		apiClient.get<SessionInfo[]>("/auth/sessions", { accessToken }),
	revokeSession: (accessToken: string, sessionId: string) =>
		apiClient.delete<{ revoked: true }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
			accessToken,
		}),
	securityStatus: (accessToken: string) =>
		apiClient.get<SecurityStatus>("/auth/security", { accessToken }),
	beginTotpSetup: (accessToken: string) =>
		apiClient.post<TotpSetup>("/auth/security/totp/setup", undefined, { accessToken }),
	confirmTotpSetup: (accessToken: string, code: string) =>
		apiClient.post<{ enabled: true; recoveryCodes: string[] }>(
			"/auth/security/totp/confirm",
			{ code },
			{ accessToken },
		),
	disableTotp: (accessToken: string, code: string) =>
		apiClient.post<{ enabled: false }>("/auth/security/totp/disable", { code }, { accessToken }),
	beginPasskeyRegistration: (accessToken: string) =>
		apiClient.post<PasskeyRegistrationOptions>("/auth/security/passkeys/options", undefined, {
			accessToken,
		}),
	finishPasskeyRegistration: (
		accessToken: string,
		input: { challengeId: string; name: string; response: RegistrationResponseJSON },
	) => apiClient.post<PasskeyView>("/auth/security/passkeys", input, { accessToken }),
	deletePasskey: (accessToken: string, passkeyId: string) =>
		apiClient.delete<{ deleted: true }>(
			`/auth/security/passkeys/${encodeURIComponent(passkeyId)}`,
			{ accessToken },
		),
	linkGoogle: (accessToken: string, credential: string) =>
		apiClient.post<{ linked: true }>("/auth/security/google/link", { credential }, { accessToken }),
};
