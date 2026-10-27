import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { getApiOrigin } from "@/lib/api/client";
import { useAuth } from "@/modules/auth/context/auth-context";
import {
	useLoginMutation,
	useMagicLinkRequestMutation,
	usePasskeyLoginMutation,
	useTwoFactorMutation,
} from "@/modules/auth/hooks/use-auth-mutations";
import { loginSchema } from "@/modules/auth/schemas/auth.schemas";
import type { TwoFactorChallenge } from "@/modules/auth/types/auth.types";
import { AuthAlert } from "./auth-alert";
import { AuthButton } from "./auth-button";
import { AuthScreen } from "./auth-screen";
import { LoginCredentialsForm } from "./presentation/login-credentials-form";
import { TwoFactorForm } from "./presentation/two-factor-form";

export function LoginForm() {
	const { user, loading, error, clearError } = useAuth();
	const login = useLoginMutation();
	const twoFactor = useTwoFactorMutation();
	const magicLink = useMagicLinkRequestMutation();
	const passkey = usePasskeyLoginMutation();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
	const [code, setCode] = useState("");
	const [notice, setNotice] = useState<string | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);

	if (loading || user) {
		return <AuthScreen busy title="" description="" />;
	}

	const currentError =
		localError ??
		(error
			? error
			: (login.error?.message ??
				twoFactor.error?.message ??
				magicLink.error?.message ??
				passkey.error?.message ??
				null));

	const isSubmitting =
		login.isPending || twoFactor.isPending || magicLink.isPending || passkey.isPending;

	return (
		<AuthScreen
			title={challenge ? "Two-Factor Auth" : "Welcome Back"}
			description={
				challenge
					? "Enter the code from your authenticator app"
					: "Sign in to access your workspace"
			}
		>
			{notice ? <AuthAlert message={notice} variant="info" /> : null}
			{currentError ? <AuthAlert message={currentError} variant="destructive" /> : null}

			{challenge ? (
				<TwoFactorForm
					code={code}
					onCodeChange={setCode}
					pending={twoFactor.isPending}
					onCancel={() => setChallenge(null)}
					onSubmit={() => {
						setLocalError(null);
						twoFactor.mutate(
							{ challengeToken: challenge.challengeToken, code },
							{
								onError: (err) => setLocalError(err.message),
							},
						);
					}}
				/>
			) : (
				<>
					<LoginCredentialsForm
						email={email}
						onEmailChange={(val) => {
							setEmail(val);
							clearError();
							setLocalError(null);
						}}
						password={password}
						onPasswordChange={(val) => {
							setPassword(val);
							clearError();
							setLocalError(null);
						}}
						showPassword={showPassword}
						onTogglePassword={() => setShowPassword(!showPassword)}
						onForgotPassword={() => router.push("/forgot-password")}
						pending={isSubmitting}
						onSubmit={() => {
							clearError();
							setLocalError(null);
							const result = loginSchema.safeParse({ email, password });
							if (!result.success) {
								setLocalError(result.error.issues[0]?.message ?? "Invalid input");
								return;
							}
							login.mutate(
								{ email, password },
								{
									onSuccess: (data) => {
										if ("requiresTwoFactor" in data && data.requiresTwoFactor) {
											setChallenge(data);
										}
									},
									onError: (err) => setLocalError(err.message),
								},
							);
						}}
					/>

					<View className="border-t border-zinc-800 pt-4 mt-1 gap-2.5">
						<AuthButton
							label="Sign In with Passkey"
							variant="outline"
							pending={passkey.isPending}
							onPress={() => {
								clearError();
								setLocalError(null);
								passkey.mutate(undefined, {
									onError: (err) => setLocalError(err.message),
								});
							}}
						/>

						<AuthButton
							label="Email Me Magic Link"
							variant="outline"
							pending={magicLink.isPending}
							onPress={() => {
								clearError();
								setLocalError(null);
								if (!email.trim()) {
									setLocalError("Enter your email address first");
									return;
								}
								magicLink.mutate(email, {
									onSuccess: (result) => {
										setNotice(`Magic link sent! Check your inbox. API: ${getApiOrigin()}`);
										if (result.developmentToken) {
											router.push({
												pathname: "/magic-link",
												params: { token: result.developmentToken },
											});
										}
									},
								});
							}}
						/>
						<AuthButton
							label="Explore Mobile UI Showcase (Motion Tabs)"
							variant="outline"
							onPress={() => router.push("/ui")}
						/>
					</View>
					<Text className="text-zinc-400 text-center text-sm">
						Don't have an account?{" "}
						<Link href="/register" className="text-emerald-400 underline">
							Create one
						</Link>
					</Text>
				</>
			)}
		</AuthScreen>
	);
}
