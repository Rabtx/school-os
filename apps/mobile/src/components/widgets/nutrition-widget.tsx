import { Apple, Beef, Flame, Wheat } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function NutritionWidget() {
	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<View className="flex-row items-center mb-5">
					<View className="w-10 h-10 rounded-full bg-yellow-500/10 justify-center items-center mr-3">
						<Flame size={20} color={NeonColors.accent.yellow} />
					</View>
					<Text className="text-white text-base font-semibold flex-1">Daily Macros</Text>
					<Text className="text-yellow-400 text-sm font-bold">1,450 / 2,200 kcal</Text>
				</View>

				<View className="mb-6">
					<View className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
						<View className="h-full bg-yellow-400 rounded-full w-[65%]" />
					</View>
				</View>

				<View className="flex-row justify-between px-2">
					<View className="items-center gap-1.5">
						<Beef size={18} color={NeonColors.accent.red} />
						<Text className="text-white text-base font-bold">120g</Text>
						<Text className="text-zinc-400 text-xs font-medium">Protein</Text>
					</View>
					<View className="items-center gap-1.5">
						<Wheat size={18} color={NeonColors.accent.orange} />
						<Text className="text-white text-base font-bold">160g</Text>
						<Text className="text-zinc-400 text-xs font-medium">Carbs</Text>
					</View>
					<View className="items-center gap-1.5">
						<Apple size={18} color={NeonColors.accent.green} />
						<Text className="text-white text-base font-bold">45g</Text>
						<Text className="text-zinc-400 text-xs font-medium">Fats</Text>
					</View>
				</View>
			</NeonCard>
		</Pressable>
	);
}
