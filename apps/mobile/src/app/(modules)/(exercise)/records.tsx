import { Activity } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddEntryModal } from "@/components/ui/add-entry-modal";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";
import { useAppStore } from "@/store/use-app-store";

export default function RecordsScreen() {
	const [modalVisible, setModalVisible] = useState(false);
	const records = useAppStore((state) => state.exerciseRecords);
	const addEntry = useAppStore((state) => state.addEntry);
	const deleteEntry = useAppStore((state) => state.deleteEntry);

	const handleSave = (title: string, subtitle: string, value: string, delta: string) => {
		addEntry("exercise", { title, subtitle, value, delta });
	};

	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Records</Text>
							<Text className="text-zinc-400 text-sm mt-1">
								Personal bests and exercise history.
							</Text>
						</View>

						<View className="px-4 mt-3">
							{records.length === 0 ? (
								<Text className="text-zinc-500 text-base text-center mt-8">
									No exercise records yet.
								</Text>
							) : (
								records.map((item) => (
									<LogListItem
										key={item.id}
										icon={Activity}
										iconColor={NeonColors.accent.blue}
										title={item.title}
										subtitle={item.subtitle}
										value={item.value}
										delta={item.delta}
										deltaColor={NeonColors.accent.green}
										onPress={() => deleteEntry("exercise", item.id)}
									/>
								))
							)}
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>

			<FloatingActionButton color={NeonColors.accent.blue} onPress={() => setModalVisible(true)} />

			<AddEntryModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSave={handleSave}
				color={NeonColors.accent.blue}
				titleLabel="Log New Record"
			/>
		</View>
	);
}
