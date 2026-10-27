import { Activity, BarChart2, Home, Plus, User } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

export function BottomNav() {
	const tabs = [
		{ icon: Home, label: "Home", active: true },
		{ icon: BarChart2, label: "Stats", active: false },
		{ icon: Plus, label: "Add", isCenter: true },
		{ icon: Activity, label: "Logs", active: false },
		{ icon: User, label: "Me", active: false },
	];

	return (
		<View className="flex-row h-[84px] bg-zinc-950 border-t border-white/5 pb-6 px-3">
			{tabs.map((tab) => (
				<Pressable
					key={tab.label}
					className={`flex-1 items-center ${
						tab.isCenter ? "justify-start -mt-5" : "justify-center gap-1"
					}`}
				>
					{tab.isCenter ? (
						<View className="w-14 h-14 rounded-full bg-emerald-400 items-center justify-center shadow-lg shadow-emerald-400/30">
							<Plus size={28} color="#09090b" strokeWidth={2.5} />
						</View>
					) : (
						<>
							<tab.icon
								size={22}
								color={tab.active ? "#34d399" : "#71717a"}
								strokeWidth={tab.active ? 2 : 1.5}
							/>
							<Text
								className={`text-[10px] font-semibold ${
									tab.active ? "text-emerald-400" : "text-zinc-500"
								}`}
							>
								{tab.label}
							</Text>
						</>
					)}
				</Pressable>
			))}
		</View>
	);
}
