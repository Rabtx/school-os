import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function WaterWidget() {
	const days = ["S", "M", "T", "W", "T", "F", "S"];
	const data = [0.4, 0.6, 0.3, 0.5, 0.7, 0.9, 0.4];

	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				<View className="flex-row justify-between items-center mb-5">
					<View>
						<Text className="text-white text-5xl font-light">
							1.9 <Text className="text-xl text-zinc-400">L today</Text>
						</Text>
					</View>
					<View className="relative justify-center items-center">
						<Svg height="50" width="50" viewBox="0 0 50 50">
							<G rotation="-90" origin="25, 25">
								<Circle
									cx="25"
									cy="25"
									r="20"
									stroke={NeonColors.text.muted}
									strokeWidth="4"
									fill="none"
								/>
								<Circle
									cx="25"
									cy="25"
									r="20"
									stroke={NeonColors.accent.green}
									strokeWidth="4"
									fill="none"
									strokeDasharray={`${2 * Math.PI * 20}`}
									strokeDashoffset={`${2 * Math.PI * 20 * (1 - 0.76)}`}
									strokeLinecap="round"
								/>
							</G>
						</Svg>
						<Text className="absolute text-white text-[10px] font-bold">76%</Text>
					</View>
				</View>

				<View className="flex-row justify-between mb-2">
					<Text className="text-zinc-400 text-xs font-bold tracking-[2px]">GOAL</Text>
					<Text className="text-white text-xs font-bold">2.5L</Text>
				</View>
				<View className="h-[1px] bg-zinc-800 mb-5" />

				{/* Bar Chart */}
				<View className="flex-row justify-between items-end h-20 mb-5">
					{data.map((val, i) => (
						<View key={`water-${i}`} className="items-center gap-2">
							<View className="h-[60px] w-6 justify-end rounded-md overflow-hidden bg-zinc-900">
								<LinearGradient
									colors={[NeonColors.accent.blue, "#1A237E"]}
									style={{
										width: "100%",
										borderRadius: 6,
										position: "relative",
										height: `${val * 100}%`,
									}}
								>
									{i === 5 && (
										<View className="absolute top-0 left-0 right-0 h-2.5 bg-emerald-400/80" />
									)}
								</LinearGradient>
							</View>
							<View
								className={`w-6 h-6 justify-center items-center rounded-full ${i === 5 ? "border border-zinc-400" : ""}`}
							>
								<Text
									className={`text-[10px] font-semibold ${i === 5 ? "text-white" : "text-zinc-400"}`}
								>
									{days[i]}
								</Text>
							</View>
						</View>
					))}
				</View>

				<View className="items-center">
					<Text className="text-zinc-400 text-xs font-semibold tracking-wide">
						💧 1.7 L/DAY AVERAGE
					</Text>
				</View>
			</NeonCard>
		</Pressable>
	);
}
