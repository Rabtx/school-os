import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { OSHeader } from "@/components/ui/os-header";
import { HeartRateWidget } from "@/components/widgets/heart-rate-widget";
import { NeonColors } from "@/constants/design-system";

export default function ExerciseIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Performance</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Tracking biometric data and physical activity.
							</Text>
						</View>
						<HeartRateWidget />
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.blue} />
		</View>
	);
}
