import { Calendar, Sparkles } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function SkincareWidget() {
	const routine = [
		{ name: "Cleanser", time: "08:00 AM", status: "Done", color: NeonColors.accent.blue },
		{ name: "Moisturizer", time: "08:15 AM", status: "Done", color: NeonColors.accent.green },
		{ name: "Sunscreen", time: "09:00 AM", status: "Pending", color: NeonColors.accent.orange },
	];

	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<View className="flex-row justify-between items-center mb-2">
					<Text className="text-zinc-400 text-xs font-bold tracking-[2px]">DAILY ROUTINE</Text>
					<Sparkles size={18} color={NeonColors.accent.purple} />
				</View>

				<View className="flex-row justify-between items-center mb-6">
					<Text className="text-white text-[32px] font-light">
						Morning <Text className="text-lg text-zinc-400">Set</Text>
					</Text>
					<View className="flex-row items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800/50">
						<Calendar size={12} color={NeonColors.text.secondary} />
						<Text className="text-zinc-400 text-xs font-semibold">May 7</Text>
					</View>
				</View>

				<View className="gap-4">
					{routine.map((item) => (
						<View key={item.name} className="flex-row justify-between items-center">
							<View className="flex-row items-center gap-3">
								<View className="w-1 h-6 rounded-sm" style={{ backgroundColor: item.color }} />
								<View>
									<Text className="text-white text-[15px] font-semibold">{item.name}</Text>
									<Text className="text-zinc-400 text-xs">{item.time}</Text>
								</View>
							</View>
							<View
								className="px-2 py-1 rounded-lg"
								style={{
									backgroundColor:
										item.status === "Done" ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 109, 0, 0.1)",
								}}
							>
								<Text
									className="text-[11px] font-bold uppercase"
									style={{
										color:
											item.status === "Done" ? NeonColors.accent.green : NeonColors.accent.orange,
									}}
								>
									{item.status}
								</Text>
							</View>
						</View>
					))}
				</View>
			</NeonCard>
		</Pressable>
	);
}
