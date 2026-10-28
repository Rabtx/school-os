import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/auth-context";
import { authQueryKeys } from "../queries/auth-query-keys";
import { authService } from "../services/auth.service";
import { assertPasskeysAvailable } from "../services/passkey-native";
import { tokenStorage } from "../services/token-storage";
import type { ChangePasswordInput, LoginInput, TwoFactorInput } from "../types/auth.types";

export function useLoginMutation() {
	const auth = useAuth();
	return useMutation({ mutationFn: (input: LoginInput) => auth.login(input) });
}

export function useTwoFactorMutation() {
	const auth = useAuth();
	return useMutation({ mutationFn: (input: TwoFactorInput) => auth.verifyTwoFactor(input) });
}

export function useMagicLinkRequestMutation() {
	return useMutation({ mutationFn: (email: string) => authService.requestMagicLink(email) });
}

export function useMagicLinkConsumeMutation() {
	const { consumeMagicLink } = useAuth();
	return useMutation({ mutationFn: (token: string) => consumeMagicLink(token) });
}

export function usePasskeyLoginMutation() {
	const { establishSession } = useAuth();
	return useMutation({
		mutationFn: async (email?: string) => {
			const Passkey = await assertPasskeysAvailable();
			const ceremony = await authService.beginPasskeyLogin(email);
			const response = await Passkey.get(
				ceremony.options as unknown as Parameters<typeof Passkey.get>[0],
			);
			if (!response) {
				throw new Error("Passkey sign-in was cancelled");
			}
			const session = await authService.finishPasskeyLogin({
				challengeId: ceremony.challengeId,
				response: response as unknown as Record<string, unknown>,
			});
			await establishSession(session);
			return session;
		},
	});
}

export function useChangePasswordMutation() {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ChangePasswordInput) =>
			authService.changePassword(requireToken(token), input),
		onSuccess: async (result) => {
			// The server rotated this session's refresh token; the old one would now read as reuse.
			if (result.refreshToken) await tokenStorage.setRefreshToken(result.refreshToken);
			await queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
		},
	});
}

export function useRevokeSessionMutation() {
	const { token, user } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (sessionId: string) => authService.revokeSession(requireToken(token), sessionId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.sessions(user?.id) }),
	});
}

export function useBeginTotpSetupMutation() {
	const { token } = useAuth();
	return useMutation({ mutationFn: () => authService.beginTotpSetup(requireToken(token)) });
}

export function useConfirmTotpSetupMutation() {
	const { token, user } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (code: string) => authService.confirmTotpSetup(requireToken(token), code),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.security(user?.id) }),
	});
}

export function useDisableTotpMutation() {
	const { token, user } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (code: string) => authService.disableTotp(requireToken(token), code),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.security(user?.id) }),
	});
}

export function useRegisterPasskeyMutation() {
	const { token, user } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (name: string) => {
			const accessToken = requireToken(token);
			const Passkey = await assertPasskeysAvailable();
			const ceremony = await authService.beginPasskeyRegistration(accessToken);
			const response = await Passkey.create(
				ceremony.options as unknown as Parameters<typeof Passkey.create>[0],
			);
			if (!response) {
				throw new Error("Passkey registration was cancelled");
			}
			return authService.finishPasskeyRegistration(accessToken, {
				challengeId: ceremony.challengeId,
				name,
				response: response as unknown as Record<string, unknown>,
			});
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.security(user?.id) }),
	});
}

export function useDeletePasskeyMutation() {
	const { token, user } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (passkeyId: string) => authService.deletePasskey(requireToken(token), passkeyId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.security(user?.id) }),
	});
}

function requireToken(token: string | null): string {
	if (!token) throw new Error("Authentication required");
	return token;
}
