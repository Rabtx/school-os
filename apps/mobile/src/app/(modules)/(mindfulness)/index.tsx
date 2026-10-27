import { Headphones, HeartPulse } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { MindfulnessWidget } from "@/components/widgets/mindfulness-widget";
import { NeonColors } from "@/constants/design-system";

export default function MindfulnessIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Mindfulness</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Tracking mental clarity and emotional state.
							</Text>
						</View>
						<MindfulnessWidget />
						<View className="px-4 mt-3">
							<LogListItem
								icon={HeartPulse}
								iconColor={NeonColors.accent.cyan}
								title="Morning Meditation"
								subtitle="Guided breathing exercise"
								value="DONE"
								delta="07:30 AM"
								deltaColor={NeonColors.text.secondary}
							/>
							<LogListItem
								icon={Headphones}
								iconColor={NeonColors.accent.purple}
								title="Deep Focus Session"
								subtitle="Binaural beats, uninterrupted"
								value="45 min"
								delta="Completed"
								deltaColor={NeonColors.accent.green}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.cyan} />
		</View>
	);
}
