import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const MOBILE_COMPONENT_SLUGS = [
	{
		slug: "bottom-bar",
		name: "Liquid Glass Bottom Bar",
		description:
			"Aave Glass style light-refracting navigation dock with Reanimated spring lens indicator",
		category: "Motion Components",
		status: "New",
	},
	{
		slug: "tabs",
		name: "Motion Tabs",
		description: "React Native Reanimated spring sliding tabs (Pill, Underline, Segment)",
		category: "Motion Components",
		status: "Ready",
	},
	{
		slug: "button",
		name: "Motion Button",
		description: "React Native Reanimated press scale button with loading state",
		category: "Motion Components",
		status: "Ready",
	},
	{
		slug: "input",
		name: "Motion Input",
		description: "React Native Reanimated focus scale input with clear & password toggle",
		category: "Motion Components",
		status: "Ready",
	},
	{
		slug: "select",
		name: "Motion Select",
		description: "React Native Reanimated bottom sheet select picker modal",
		category: "Motion Components",
		status: "Ready",
	},
	{
		slug: "typeset",
		name: "Typeset",
		description: "Typography styling system for HTML & markdown with rhythm controls",
		category: "Typography",
		status: "New",
	},
];

export default function MobileUICatalogScreen() {
	const router = useRouter();

	return (
		<SafeAreaView className="flex-1 bg-zinc-950">
			<ScrollView className="p-5">
				<View className="mb-6">
					<Text className="text-2xl font-bold text-white">Mobile UI Catalog</Text>
					<Text className="text-[13px] text-zinc-400 mt-1">
						Expo Router & Reanimated Component System
					</Text>
				</View>

				<View className="gap-3">
					<Text className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
						Component System
					</Text>

					{MOBILE_COMPONENT_SLUGS.map((item) => (
						<Pressable
							key={item.slug}
							onPress={() => router.push({ pathname: "/ui/[slug]", params: { slug: item.slug } })}
							className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 gap-1.5 active:opacity-80"
						>
							<View className="flex-row items-center justify-between">
								<Text className="text-base font-semibold text-white">{item.name}</Text>
								<Text className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded font-mono overflow-hidden">
									{item.status}
								</Text>
							</View>
							<Text className="text-xs text-zinc-400 leading-[18px]">{item.description}</Text>
							<Text className="text-[10px] text-zinc-500 font-mono mt-1">
								slug: /ui/{item.slug}
							</Text>
						</Pressable>
					))}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
