import { Link, router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { devCodeRouteParams } from "@/modules/auth/lib/dev-auth-code";
import { authService } from "@/modules/auth/services/auth.service";
import { AuthAlert } from "./auth-alert";
import { AuthButton } from "./auth-button";
import { AuthField } from "./auth-field";
import { AuthScreen } from "./auth-screen";

export function ForgotPasswordForm() {
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit() {
		setError(null);
		setSubmitting(true);
		try {
			const result = await authService.forgotPassword(email.trim().toLowerCase());
			const normalizedEmail = email.trim().toLowerCase();
			router.push({
				pathname: "/reset-password",
				params: { email: normalizedEmail, ...devCodeRouteParams(result.developmentCode) },
			});
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Request failed");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<AuthScreen
			title="Forgot your password?"
			description="We will send a reset code if an account exists."
		>
			{error ? <AuthAlert variant="destructive" title="Request failed" message={error} /> : null}
			<AuthField
				label="Email"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoComplete="email"
			/>
			<AuthButton label="Send reset code" onPress={handleSubmit} pending={submitting} />
			<Text className="text-center text-sm">
				<Link href="/login" className="text-teal-500 underline">
					Back to sign in
				</Link>
			</Text>
		</AuthScreen>
	);
}
