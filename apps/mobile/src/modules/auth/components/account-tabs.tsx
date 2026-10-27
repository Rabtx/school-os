import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

type AccountTab = "profile" | "security" | "billing";

export function AccountTabs({ active }: { active: AccountTab }) {
	return (
		<View className="flex-row gap-1.5 p-1 rounded-2xl border border-zinc-800 bg-white/5">
			<Tab
				label="Profile"
				active={active === "profile"}
				onPress={() => router.replace("/(modules)/(profile)")}
			/>
			<Tab
				label="Security"
				active={active === "security"}
				onPress={() => router.replace("/(modules)/(profile)/security")}
			/>
			<Tab
				label="Billing"
				active={active === "billing"}
				onPress={() => router.replace("/(modules)/(profile)/billing")}
			/>
		</View>
	);
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
	return (
		<Pressable
			onPress={onPress}
			className={`flex-1 min-h-[40px] rounded-xl items-center justify-center px-1 active:opacity-85 ${active ? "bg-teal-500/10 border border-teal-500/35" : ""}`}
		>
			<Text className={`text-[13px] font-semibold ${active ? "text-teal-400" : "text-zinc-400"}`}>
				{label}
			</Text>
		</Pressable>
	);
}
