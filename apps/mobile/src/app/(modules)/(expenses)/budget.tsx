import { AlertCircle, PiggyBank, Target } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";

export default function BudgetScreen() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Budget</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Spending limits and savings goals overview.
							</Text>
						</View>

						<View className="px-4 mt-3">
							<LogListItem
								icon={Target}
								iconColor={NeonColors.accent.blue}
								title="Monthly Target"
								subtitle="$1,200 of $2,000 remaining"
								value="60%"
								delta="On track"
								deltaColor={NeonColors.accent.green}
							/>
							<LogListItem
								icon={PiggyBank}
								iconColor={NeonColors.accent.green}
								title="Savings Goal"
								subtitle="Emergency fund progress"
								value="$8,420"
								delta="84%"
								deltaColor={NeonColors.accent.green}
							/>
							<LogListItem
								icon={AlertCircle}
								iconColor={NeonColors.accent.orange}
								title="Food & Dining"
								subtitle="Category nearing limit"
								value="$380/$400"
								delta="95%"
								deltaColor={NeonColors.accent.red}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}
