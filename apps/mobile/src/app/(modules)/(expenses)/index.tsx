import { ShoppingBag } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { SpendingWidget } from "@/components/widgets/spending-widget";
import { NeonColors } from "@/constants/design-system";

export default function ExpensesIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Capital</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Monitoring daily spend and financial health.
							</Text>
						</View>
						<SpendingWidget />
						<View className="px-4 mt-3">
							<LogListItem
								icon={ShoppingBag}
								iconColor={NeonColors.accent.orange}
								title="Groceries"
								subtitle="Whole Foods Market"
								value="$78.46"
								delta="Today"
								deltaColor={NeonColors.text.secondary}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.orange} />
		</View>
	);
}
