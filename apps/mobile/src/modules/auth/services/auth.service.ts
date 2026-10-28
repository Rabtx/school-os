import { apiClient } from "@/lib/api/client";
import type { User } from "@/modules/users/types/user.types";
import type {
	AuthChallengeResult,
	AuthenticationResponseJSON,
	AuthSession,
	ChangePasswordInput,
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
import { tokenStorage } from "./token-storage";

export const authService = {
	register: (input: RegisterInput) => apiClient.post<RegistrationResult>("/auth/register", input),
	verifyEmail: (input: VerifyEmailInput) => apiClient.post<User>("/auth/verify-email", input),
	resendVerification: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/resend-verification", { email }),
	login: (input: LoginInput) => apiClient.post<LoginResult>("/auth/login", input),
	verifyTwoFactor: (input: TwoFactorInput) =>
		apiClient.post<AuthSession>("/auth/methods/two-factor/verify", input),
	refresh: async () => {
		const refreshToken = await tokenStorage.getRefreshToken();
		if (!refreshToken) {
			throw new Error("No refresh token");
		}
		return apiClient.post<AuthSession>("/auth/refresh", { refreshToken });
	},
	logout: async () => {
		const refreshToken = await tokenStorage.getRefreshToken();
		await apiClient.post<void>("/auth/logout", refreshToken ? { refreshToken } : {});
	},
	logoutAll: (accessToken: string) =>
		apiClient.post<void>("/auth/logout-all", undefined, { accessToken }),
	forgotPassword: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/forgot-password", { email }),
	resetPassword: (input: ResetPasswordInput) =>
		apiClient.post<AuthChallengeResult>("/auth/reset-password", input),
	changePassword: (accessToken: string, input: ChangePasswordInput) =>
		apiClient.post<AuthChallengeResult & { refreshToken?: string }>(
			"/auth/change-password",
			input,
			{
				accessToken,
			},
		),
	requestMagicLink: (email: string) =>
		apiClient.post<AuthChallengeResult>("/auth/methods/magic-link/request", { email }),
	consumeMagicLink: (token: string) =>
		apiClient.post<AuthSession>("/auth/methods/magic-link/consume", { token }),
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
	me: (accessToken: string) => apiClient.get<User>("/auth/me", { accessToken }),
};
