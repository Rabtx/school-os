import { BarChart3, TrendingUp, Zap } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";

export default function InsightsScreen() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Insights</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								AI-powered analysis of your daily patterns.
							</Text>
						</View>

						<View className="mt-3">
							<LogListItem
								icon={TrendingUp}
								iconColor={NeonColors.accent.green}
								title="Weekly Trend"
								subtitle="Consistency up 12% this week"
								value="+12%"
								delta="vs last week"
								deltaColor={NeonColors.text.secondary}
							/>
							<LogListItem
								icon={Zap}
								iconColor={NeonColors.accent.orange}
								title="Peak Energy"
								subtitle="Best performance window detected"
								value="10 AM"
								delta="Optimal"
								deltaColor={NeonColors.accent.green}
							/>
							<LogListItem
								icon={BarChart3}
								iconColor={NeonColors.accent.blue}
								title="Sleep Quality"
								subtitle="REM cycles improving steadily"
								value="87%"
								delta="+3%"
								deltaColor={NeonColors.accent.green}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}
