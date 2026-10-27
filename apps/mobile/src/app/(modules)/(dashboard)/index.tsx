import { CheckCircle2, Coffee, Droplet, Mic, TrendingUp, Zap } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { QuickAction } from "@/components/ui/quick-action";
import { HeartRateWidget } from "@/components/widgets/heart-rate-widget";
import { MindfulnessWidget } from "@/components/widgets/mindfulness-widget";
import { NutritionWidget } from "@/components/widgets/nutrition-widget";
import { RecorderWidget } from "@/components/widgets/recorder-widget";
import { SpendingWidget } from "@/components/widgets/spending-widget";
import { WaterWidget } from "@/components/widgets/water-widget";
import { NeonColors } from "@/constants/design-system";

export default function DashboardIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					{/* Status Section */}
					<View className="px-4 mt-3 mb-5">
						<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] mb-1">
							SYSTEM READINESS
						</Text>
						<View className="flex-row items-baseline gap-3">
							<Text className="text-white text-5xl font-light">
								94.2<Text className="text-2xl text-zinc-400">%</Text>
							</Text>
							<View className="flex-row items-center gap-1 bg-[#00E67626] px-2 py-1 rounded-xl">
								<TrendingUp size={12} color={NeonColors.accent.green} />
								<Text className="text-[#00E676] text-xs font-bold">+2.4%</Text>
							</View>
						</View>
					</View>

					{/* Quick Actions */}
					<View className="flex-row justify-between px-4 mb-8">
						<QuickAction icon={Zap} label="Workout" />
						<QuickAction icon={Droplet} label="Log Water" />
						<QuickAction icon={Mic} label="Record" />
						<QuickAction icon={Coffee} label="Mood" />
					</View>

					{/* Vital Signs Carousel */}
					<View className="flex-row justify-between items-center px-4 mb-4">
						<Text className="text-white text-sm font-bold tracking-[1px]">VITAL SIGNS</Text>
					</View>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerClassName="px-4 gap-3 mb-8"
						snapToAlignment="center"
						decelerationRate="fast"
					>
						<View className="w-[320px]">
							<WaterWidget />
						</View>
						<View className="w-[320px]">
							<HeartRateWidget />
						</View>
						<View className="w-[320px]">
							<SpendingWidget />
						</View>
						<View className="w-[320px]">
							<RecorderWidget />
						</View>
						<View className="w-[320px]">
							<NutritionWidget />
						</View>
						<View className="w-[320px]">
							<MindfulnessWidget />
						</View>
					</ScrollView>

					{/* Recent Activity */}
					<View className="flex-row justify-between items-center px-4 mb-4">
						<Text className="text-white text-sm font-bold tracking-[1px]">RECENT ACTIVITY</Text>
					</View>

					<View className="px-4 mt-3">
						<LogListItem
							icon={CheckCircle2}
							iconColor={NeonColors.accent.green}
							title="Design System"
							subtitle="Architecture finalized"
							value="DONE"
							delta="Just now"
							deltaColor={NeonColors.text.secondary}
						/>
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.green} />
		</View>
	);
}
