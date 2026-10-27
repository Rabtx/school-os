import { Sparkles } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { SkincareWidget } from "@/components/widgets/skincare-widget";
import { NeonColors } from "@/constants/design-system";

export default function SkincareIndex() {
	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Skin Health</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Managing your daily dermatological routine.
							</Text>
						</View>
						<SkincareWidget />
						<View className="px-4 mt-3">
							<LogListItem
								icon={Sparkles}
								iconColor={NeonColors.accent.purple}
								title="Face Wash"
								subtitle="Completed morning set"
								value="DONE"
								delta="08:00 AM"
								deltaColor={NeonColors.text.secondary}
							/>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
			<FloatingActionButton color={NeonColors.accent.purple} />
		</View>
	);
}
