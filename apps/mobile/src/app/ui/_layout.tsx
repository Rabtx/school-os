import { Stack } from "expo-router";

export default function UILayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: "#09090b" },
				headerTintColor: "#ffffff",
				headerTitleStyle: { fontWeight: "600" },
				contentStyle: { backgroundColor: "#09090b" },
			}}
		>
			<Stack.Screen name="index" options={{ title: "Mobile UI Catalog" }} />
			<Stack.Screen name="[slug]" options={{ title: "Component Showcase" }} />
		</Stack>
	);
}
