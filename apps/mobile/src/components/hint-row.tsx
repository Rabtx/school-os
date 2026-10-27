import type { ReactNode } from "react";
import { View } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

type HintRowProps = {
	title?: string;
	hint?: ReactNode;
};

export function HintRow({ title = "Try editing", hint = "app/index.tsx" }: HintRowProps) {
	return (
		<View className="flex-row justify-between">
			<ThemedText type="small">{title}</ThemedText>
			<ThemedView type="backgroundSelected" className="rounded-lg py-1 px-3">
				<ThemedText themeColor="textSecondary">{hint}</ThemedText>
			</ThemedView>
		</View>
	);
}
