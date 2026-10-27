import { Pause, Settings2, Square } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function RecorderWidget() {
	// Mock waveform heights
	const waveform = [10, 20, 15, 40, 60, 30, 80, 50, 40, 90, 30, 20, 10, 15, 25, 35, 15, 10];

	return (
		<Pressable className="active:opacity-90">
			<NeonCard>
				{/* Waveform Visualizer */}
				<View className="h-25 justify-center mb-5 relative">
					<View className="flex-row items-center justify-center gap-1">
						{waveform.map((h, i) => (
							<View
								key={`wave-${i}`}
								className="w-0.5 rounded-sm"
								style={{
									height: h,
									backgroundColor: i > 10 ? NeonColors.text.muted : NeonColors.text.primary,
								}}
							/>
						))}
						<View className="absolute left-[60%] top-0 bottom-0 w-0.5 bg-orange-500 z-10" />
					</View>
					<View className="absolute left-[62%] right-0 top-1/2 h-0.5 border-t border-dotted border-zinc-500" />
				</View>

				<View className="flex-row justify-between items-center mb-8">
					<View className="flex-row items-center gap-3">
						<View className="w-2 h-2 rounded-full bg-red-500" />
						<Text className="text-white text-[36px] font-medium font-mono">01:49</Text>
					</View>
					<View>
						<Text className="text-zinc-400 text-[10px] font-bold tracking-[2px] text-right">
							NEW AUDIO
						</Text>
						<Text className="text-zinc-400 text-[10px] font-bold tracking-[2px] text-right">
							RECORDING...
						</Text>
					</View>
				</View>

				{/* Controls */}
				<View className="flex-row justify-center items-center gap-5">
					<Pressable className="w-12 h-12 rounded-full bg-zinc-800 justify-center items-center">
						<Settings2 size={20} color={NeonColors.text.primary} />
					</Pressable>

					<Pressable className="w-16 h-16 rounded-full bg-red-500 justify-center items-center shadow-lg shadow-red-500/50">
						<Pause size={24} color={NeonColors.text.primary} fill={NeonColors.text.primary} />
					</Pressable>

					<Pressable className="w-12 h-12 rounded-full bg-zinc-800 justify-center items-center">
						<Square size={20} color={NeonColors.text.primary} fill={NeonColors.text.primary} />
					</Pressable>
				</View>
			</NeonCard>
		</Pressable>
	);
}
