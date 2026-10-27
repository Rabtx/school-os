import { Heart } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function HeartRateWidget() {
	const chartData = [
		{ h: 30, offset: 20 },
		{ h: 40, offset: 15 },
		{ h: 25, offset: 25 },
		{ h: 50, offset: 10, highlight: NeonColors.accent.purple },
		{ h: 35, offset: 20 },
		{ h: 45, offset: 15, highlight: NeonColors.accent.orange },
		{ h: 60, offset: 5 },
		{ h: 40, offset: 20 },
		{ h: 30, offset: 25 },
		{ h: 55, offset: 10, highlight: NeonColors.accent.green },
		{ h: 40, offset: 15 },
	];

	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<View className="flex-row justify-between items-center mb-1">
					<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px]">TODAY 11:26 PM</Text>
					<Heart size={24} color={NeonColors.text.primary} strokeWidth={1.5} />
				</View>

				<View className="mb-5">
					<Text className="text-white text-[56px] font-light">
						72 <Text className="text-xl text-zinc-400">BPM</Text>
					</Text>
				</View>

				<View className="flex-row gap-10 mb-8">
					<View className="gap-1">
						<View className="flex-row items-center gap-2">
							<View
								className="w-1.5 h-1.5 rounded-full"
								style={{ backgroundColor: NeonColors.accent.purple }}
							/>
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px]">MIN</Text>
						</View>
						<Text className="text-white text-lg font-medium pl-3.5">51 BPM</Text>
					</View>
					<View className="gap-1">
						<View className="flex-row items-center gap-2">
							<View
								className="w-1.5 h-1.5 rounded-full"
								style={{ backgroundColor: NeonColors.accent.orange }}
							/>
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px]">PEAK</Text>
						</View>
						<Text className="text-white text-lg font-medium pl-3.5">97 BPM</Text>
					</View>
				</View>

				<View className="h-[100px] justify-end">
					<View className="flex-row justify-between items-start h-20 mb-2">
						{chartData.map((d, i) => (
							<View key={`bar-${i}`} className="flex-1 items-center">
								<View
									className="w-1 rounded-sm relative items-center"
									style={{
										height: d.h,
										marginTop: d.offset,
										backgroundColor: d.highlight || "#333333",
									}}
								>
									{d.highlight && (
										<View
											className="absolute -top-1 w-1.5 h-1.5 rounded-full shadow-md"
											style={{ backgroundColor: d.highlight }}
										/>
									)}
								</View>
							</View>
						))}
					</View>
					<View className="flex-row justify-between px-1">
						<Text className="text-zinc-500 text-[10px] font-semibold">12AM</Text>
						<Text className="text-zinc-500 text-[10px] font-semibold">6AM</Text>
						<Text className="text-zinc-500 text-[10px] font-semibold">12PM</Text>
						<Text className="text-zinc-500 text-[10px] font-semibold">6PM</Text>
					</View>
				</View>
			</NeonCard>
		</Pressable>
	);
}
