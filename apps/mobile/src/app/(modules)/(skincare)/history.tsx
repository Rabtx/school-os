import { Calendar, CheckCircle2, Clock } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";

export default function HistoryScreen() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">History</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Timeline of past routines and skin progress.
							</Text>
						</View>

						<View className="px-4 mt-3">
							<LogListItem
								icon={CheckCircle2}
								iconColor={NeonColors.accent.green}
								title="Morning Routine"
								subtitle="Cleanser → Serum → SPF"
								value="DONE"
								delta="Today, 08:00"
								deltaColor={NeonColors.text.secondary}
							/>
							<LogListItem
								icon={Clock}
								iconColor={NeonColors.accent.purple}
								title="Night Routine"
								subtitle="Double cleanse → Retinol → Moisturizer"
								value="DONE"
								delta="Yesterday, 22:30"
								deltaColor={NeonColors.text.secondary}
							/>
							<LogListItem
								icon={Calendar}
								iconColor={NeonColors.accent.blue}
								title="Weekly Mask"
								subtitle="Clay mask — 15 min session"
								value="DONE"
								delta="May 4"
								deltaColor={NeonColors.text.secondary}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}
