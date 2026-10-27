import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddEntryModal } from "@/components/ui/add-entry-modal";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { OSHeader } from "@/components/ui/os-header";
import { FocusWidget } from "@/components/widgets/focus-widget";
import { NeonColors } from "@/constants/design-system";
import { useAppStore } from "@/store/use-app-store";

export default function FocusIndex() {
	const [modalVisible, setModalVisible] = useState(false);
	const addEntry = useAppStore((state) => state.addEntry);

	const handleSave = (title: string, subtitle: string, value: string, delta: string) => {
		addEntry("focus", { title, subtitle, value, delta });
	};

	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-3xl font-light">Focus</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Pomodoro, deep work tracking, and task management.
							</Text>
						</View>
						<FocusWidget />
					</View>
				</ScrollView>
			</SafeAreaView>

			<FloatingActionButton color={NeonColors.accent.pink} onPress={() => setModalVisible(true)} />

			<AddEntryModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSave={handleSave}
				color={NeonColors.accent.pink}
				titleLabel="Add Task"
			/>
		</View>
	);
}
