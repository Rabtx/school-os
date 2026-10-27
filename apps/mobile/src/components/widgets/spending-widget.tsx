import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function SpendingWidget() {
	const categories = [
		{ name: "Groceries", amount: 78.46, color: NeonColors.accent.orange },
		{ name: "Entertainment", amount: 56.2, color: NeonColors.accent.purple },
		{ name: "Transportation", amount: 33.58, color: NeonColors.accent.blue },
		{ name: "Utilities", amount: 24.21, color: NeonColors.accent.green },
	];

	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<Text className="text-zinc-400 text-xs font-bold tracking-[2px] mb-2">TODAY SPENDING</Text>
				<View className="flex-row justify-between items-baseline mb-5">
					<Text className="text-white text-[42px] font-medium">
						$192<Text className="text-2xl text-zinc-400">.45</Text>
					</Text>
					<Text className="text-zinc-400 text-xl font-normal">78%</Text>
				</View>

				{/* Segmented Progress Bar */}
				<View className="flex-row justify-between mb-6">
					{[...Array(30)].map((_, i) => {
						let color = NeonColors.text.muted;
						if (i < 8) color = NeonColors.accent.orange;
						else if (i < 15) color = NeonColors.accent.purple;
						else if (i < 20) color = NeonColors.accent.blue;
						else if (i < 24) color = NeonColors.accent.green;

						return (
							<View
								key={`segment-${i}`}
								className="w-[3px] h-3.5 rounded-sm"
								style={{ backgroundColor: color }}
							/>
						);
					})}
				</View>

				{/* Legend */}
				<View className="gap-3">
					{categories.map((cat) => (
						<View key={cat.name} className="flex-row justify-between items-center">
							<View className="flex-row items-center gap-3">
								<View className="w-1 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
								<Text className="text-white text-sm font-medium">{cat.name}</Text>
							</View>
							<Text className="text-zinc-400 text-sm font-normal font-mono">
								${cat.amount.toFixed(2)}
							</Text>
						</View>
					))}
				</View>
			</NeonCard>
		</Pressable>
	);
}
