import { CheckCircle2, Clock, Target } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function FocusWidget() {
	return (
		<Pressable className="active:opacity-90">
			<NeonCard accentColor={NeonColors.accent.pink}>
				<View className="flex-row justify-between items-center mb-5">
					<View className="flex-row items-center gap-2">
						<Target size={20} color={NeonColors.accent.pink} />
						<Text className="text-white text-lg font-semibold">Deep Work</Text>
					</View>
					<Text className="text-zinc-400 text-sm">Pomodoro</Text>
				</View>

				<View className="items-center my-4">
					<View className="w-[140px] h-[140px] rounded-full border-4 border-pink-500 items-center justify-center bg-pink-500/5">
						<Text className="text-white text-[32px] font-bold">25:00</Text>
						<Text className="text-pink-500 text-xs mt-1 font-semibold">Focus Time</Text>
					</View>
				</View>

				<View className="flex-row justify-around items-center mt-4 pt-4 border-t border-zinc-800/60">
					<View className="items-center gap-1">
						<Clock size={16} color={NeonColors.text.secondary} />
						<Text className="text-white text-base font-semibold">2.5h</Text>
						<Text className="text-zinc-400 text-xs">Today</Text>
					</View>
					<View className="w-[1px] h-6 bg-zinc-800" />
					<View className="items-center gap-1">
						<CheckCircle2 size={16} color={NeonColors.text.secondary} />
						<Text className="text-white text-base font-semibold">4</Text>
						<Text className="text-zinc-400 text-xs">Sessions</Text>
					</View>
				</View>
			</NeonCard>
		</Pressable>
	);
}
