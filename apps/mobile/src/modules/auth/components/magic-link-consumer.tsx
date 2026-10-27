import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useMagicLinkConsumeMutation } from "@/modules/auth/hooks/use-auth-mutations";
import { AuthAlert } from "./auth-alert";
import { AuthButton } from "./auth-button";
import { AuthScreen } from "./auth-screen";

export function MagicLinkConsumer() {
	const params = useLocalSearchParams<{ token?: string }>();
	const token = typeof params.token === "string" ? params.token : null;
	const consume = useMagicLinkConsumeMutation();
	const started = useRef(false);

	useEffect(() => {
		if (!token || started.current) return;
		started.current = true;
		consume.mutate(token, {
			onSuccess: () => router.replace("/(modules)/(dashboard)"),
		});
	}, [consume, token]);

	return (
		<AuthScreen title="Secure sign in" description="Verifying your one-time link">
			{!token ? (
				<AuthAlert
					variant="destructive"
					title="Invalid link"
					message="The sign-in token is missing."
				/>
			) : consume.isError ? (
				<AuthAlert
					variant="destructive"
					title="Link expired"
					message={consume.error instanceof Error ? consume.error.message : "Could not sign in"}
				/>
			) : (
				<View className="items-center justify-center gap-3 py-7">
					<ActivityIndicator color="#14b8a6" />
					<Text className="text-zinc-400 text-sm">Signing you in...</Text>
				</View>
			)}
			<AuthButton
				label="Back to login"
				variant="outline"
				onPress={() => router.replace("/login")}
			/>
		</AuthScreen>
	);
}
