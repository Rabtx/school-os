import type { ReactNode } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeonCard } from "@/components/ui/neon-card";

interface AuthScreenProps {
	brand?: string;
	title: string;
	description: string;
	children?: ReactNode;
	footer?: ReactNode;
	busy?: boolean;
}

export function AuthScreen({
	brand = "School OS",
	title,
	description,
	children,
	footer,
	busy = false,
}: AuthScreenProps) {
	if (busy) {
		return (
			<SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "bottom"]}>
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color="#14b8a6" size="large" />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-zinc-950" edges={["top", "bottom"]}>
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === "ios" ? "padding" : undefined}
			>
				<ScrollView
					contentContainerClassName="flex-grow justify-center px-5 py-8"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<NeonCard className="w-full max-w-[420px] self-center">
						<Text className="text-zinc-400 text-[13px] font-semibold text-center mb-2">
							{brand}
						</Text>
						<Text className="text-zinc-100 text-2xl font-bold text-center mb-2">{title}</Text>
						<Text className="text-zinc-400 text-[15px] text-center mb-6 leading-relaxed">
							{description}
						</Text>
						<View className="gap-4">{children}</View>
					</NeonCard>
					{footer ? <View className="mt-5 items-center">{footer}</View> : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
