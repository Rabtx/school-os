import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { devCodeRouteParams, readDevCodeParam } from "@/modules/auth/lib/dev-auth-code";
import { authService } from "@/modules/auth/services/auth.service";
import { AuthAlert } from "./auth-alert";
import { AuthButton } from "./auth-button";
import { AuthField } from "./auth-field";
import { AuthScreen } from "./auth-screen";

export function VerifyEmailForm() {
	const params = useLocalSearchParams<{ email?: string; devCode?: string }>();
	const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [resending, setResending] = useState(false);
	const [developmentCode, setDevelopmentCode] = useState<string | null>(() =>
		readDevCodeParam(params.devCode),
	);

	async function handleSubmit() {
		setError(null);
		setSubmitting(true);
		try {
			await authService.verifyEmail({ email, code });
			router.replace({ pathname: "/login", params: { verified: "true" } });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Verification failed");
		} finally {
			setSubmitting(false);
		}
	}

	async function handleResend() {
		setError(null);
		setResending(true);
		try {
			const result = await authService.resendVerification(email);
			if (result.developmentCode) {
				setDevelopmentCode(result.developmentCode);
				router.replace({
					pathname: "/verify-email",
					params: { email, ...devCodeRouteParams(result.developmentCode) },
				});
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Could not resend code");
		} finally {
			setResending(false);
		}
	}

	return (
		<AuthScreen
			title="Verify your email"
			description="Enter the six-digit code sent to your email address."
		>
			{developmentCode ? <AuthAlert title="Development code" message={developmentCode} /> : null}
			{error ? (
				<AuthAlert variant="destructive" title="Could not verify email" message={error} />
			) : null}
			<AuthField
				label="Email"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoComplete="email"
			/>
			<AuthField
				label="Verification code"
				value={code}
				onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
				keyboardType="number-pad"
				autoComplete="one-time-code"
				maxLength={6}
			/>
			<AuthButton label="Verify email" onPress={handleSubmit} pending={submitting} />
			<AuthButton
				label={resending ? "Sending..." : "Send a new code"}
				variant="outline"
				onPress={handleResend}
				pending={resending}
				disabled={!email}
			/>
			<Text className="text-center text-sm mt-2 text-zinc-400">
				<Link href="/login" className="text-emerald-400 underline font-medium">
					Back to sign in
				</Link>
			</Text>
		</AuthScreen>
	);
}
