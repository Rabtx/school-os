import { CheckCircle2, Info } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NutritionWidget } from "@/components/widgets/nutrition-widget";
import { NeonColors } from "@/constants/design-system";

export default function NutritionIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Nutrition</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Tracking your body's fuel and hydration.
							</Text>
						</View>
						<NutritionWidget />
						<View className="px-4 mt-3">
							<LogListItem
								icon={CheckCircle2}
								iconColor={NeonColors.accent.green}
								title="Daily Protein Goal"
								subtitle="120g of 150g consumed"
								value="80%"
								delta="On track"
								deltaColor={NeonColors.text.secondary}
							/>
							<LogListItem
								icon={Info}
								iconColor={NeonColors.accent.yellow}
								title="Fasting Window"
								subtitle="Intermittent Fasting (16:8)"
								value="Active"
								delta="4h left"
								deltaColor={NeonColors.text.secondary}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.yellow} />
		</View>
	);
}
