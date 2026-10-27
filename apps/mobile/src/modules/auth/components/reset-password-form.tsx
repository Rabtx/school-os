import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { readDevCodeParam } from "@/modules/auth/lib/dev-auth-code";
import { authService } from "@/modules/auth/services/auth.service";
import { AuthAlert } from "./auth-alert";
import { AuthButton } from "./auth-button";
import { AuthField } from "./auth-field";
import { AuthScreen } from "./auth-screen";

export function ResetPasswordForm() {
	const params = useLocalSearchParams<{ email?: string; devCode?: string }>();
	const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const developmentCode = readDevCodeParam(params.devCode);

	async function handleSubmit() {
		setError(null);
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (password.length < 12) {
			setError("Password must be at least 12 characters");
			return;
		}
		setSubmitting(true);
		try {
			await authService.resetPassword({ email, code, newPassword: password });
			router.replace({ pathname: "/login", params: { reset: "true" } });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Password reset failed");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<AuthScreen
			title="Reset your password"
			description="Enter your reset code and choose a new password."
		>
			{developmentCode ? <AuthAlert title="Development code" message={developmentCode} /> : null}
			{error ? (
				<AuthAlert variant="destructive" title="Could not reset password" message={error} />
			) : null}
			<AuthField
				label="Email"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoComplete="email"
			/>
			<AuthField
				label="Reset code"
				value={code}
				onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
				keyboardType="number-pad"
				autoComplete="one-time-code"
				maxLength={6}
			/>
			<AuthField
				label="New password"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoComplete="new-password"
				hint="Use at least 12 characters."
			/>
			<AuthField
				label="Confirm new password"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
				secureTextEntry
				autoComplete="new-password"
			/>
			<AuthButton label="Reset password" onPress={handleSubmit} pending={submitting} />
		</AuthScreen>
	);
}
