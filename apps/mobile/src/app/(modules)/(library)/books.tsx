import { BookMarked } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AddEntryModal } from "@/components/ui/add-entry-modal";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { LogListItem } from "@/components/ui/log-list-item";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";
import { useAppStore } from "@/store/use-app-store";

export default function LibraryBooksScreen() {
	const [modalVisible, setModalVisible] = useState(false);
	const books = useAppStore((state) => state.libraryBooks);
	const addEntry = useAppStore((state) => state.addEntry);
	const deleteEntry = useAppStore((state) => state.deleteEntry);

	const handleSave = (title: string, subtitle: string, value: string, delta: string) => {
		addEntry("library", { title, subtitle, value, delta });
	};

	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />

				<ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-10">
					<View className="px-4 pt-2">
						<View className="mb-6">
							<Text className="text-white text-[32px] font-light">Books</Text>
							<Text className="text-zinc-400 text-sm mt-1">Your reading list and progress.</Text>
						</View>

						<View className="px-4 mt-3">
							{books.length === 0 ? (
								<Text className="text-zinc-500 text-base text-center mt-8">
									No books in library yet.
								</Text>
							) : (
								books.map((item) => (
									<LogListItem
										key={item.id}
										icon={BookMarked}
										iconColor={NeonColors.accent.teal}
										title={item.title}
										subtitle={item.subtitle}
										value={item.value}
										delta={item.delta}
										deltaColor={NeonColors.text.secondary}
										onPress={() => deleteEntry("library", item.id)}
									/>
								))
							)}
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>

			<FloatingActionButton color={NeonColors.accent.teal} onPress={() => setModalVisible(true)} />

			<AddEntryModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSave={handleSave}
				color={NeonColors.accent.teal}
				titleLabel="Add Book to Library"
			/>
		</View>
	);
}
