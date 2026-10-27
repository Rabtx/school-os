import { Brain, Heart, Moon, Sun } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function MindfulnessWidget() {
	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<View className="flex-row items-center mb-6">
					<View className="w-10 h-10 rounded-full bg-cyan-500/10 justify-center items-center mr-3">
						<Brain size={20} color={NeonColors.accent.cyan} />
					</View>
					<Text className="text-white text-base font-semibold flex-1">Mental Clarity</Text>
					<Text className="text-cyan-400 text-sm font-bold">Optimum</Text>
				</View>

				<View className="flex-row justify-between items-center px-1">
					<View className="items-center gap-2 flex-1">
						<Sun size={20} color={NeonColors.accent.yellow} />
						<Text className="text-white text-[15px] font-bold">15m</Text>
						<Text className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
							Meditation
						</Text>
					</View>

					<View className="w-[1px] h-10 bg-zinc-800" />

					<View className="items-center gap-2 flex-1">
						<Heart size={20} color={NeonColors.accent.red} />
						<Text className="text-white text-[15px] font-bold">Calm</Text>
						<Text className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
							Avg Mood
						</Text>
					</View>

					<View className="w-[1px] h-10 bg-zinc-800" />

					<View className="items-center gap-2 flex-1">
						<Moon size={20} color={NeonColors.accent.purple} />
						<Text className="text-white text-[15px] font-bold">7h 45m</Text>
						<Text className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider">
							Deep Sleep
						</Text>
					</View>
				</View>
			</NeonCard>
		</Pressable>
	);
}
