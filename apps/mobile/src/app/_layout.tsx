import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppProviders } from "@/components/providers";
import { useAuth } from "@/modules/auth";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
	initialRouteName: "(modules)",
};

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<AppProviders>
			<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
				<AnimatedSplashOverlay />
				<SplashScreenController />
				<RootNavigator />
			</ThemeProvider>
		</AppProviders>
	);
}

function SplashScreenController() {
	const { loading } = useAuth();
	if (!loading) {
		SplashScreen.hideAsync().catch(() => undefined);
	}
	return null;
}

function RootNavigator() {
	const { loading } = useAuth();

	if (loading) {
		return null;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			{/* <Stack.Protected guard={signedIn}> */}
			<Stack.Screen name="ui" />

			<Stack.Screen name="(modules)" />
			{/* </Stack.Protected> */}
			{/* <Stack.Protected guard={!signedIn}>
				<Stack.Screen name="(auth)" />
			</Stack.Protected> */}
		</Stack>
	);
}
