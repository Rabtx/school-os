import { BookMarked, Bookmark, BookOpen } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonColors } from "@/constants/design-system";

export function LibraryWidget() {
	return (
		<Pressable className="active:opacity-90">
			<NeonCard accentColor={NeonColors.accent.teal}>
				<View className="flex-row justify-between items-center mb-5">
					<View className="flex-row items-center gap-2">
						<BookOpen size={20} color={NeonColors.accent.teal} />
						<Text className="text-white text-lg font-semibold">Currently Reading</Text>
					</View>
					<Text className="text-zinc-400 text-sm">2 Books</Text>
				</View>

				<View className="flex-row items-center gap-4 my-2">
					<View className="w-[60px] h-[80px] bg-teal-500 rounded-lg items-center justify-center">
						<BookMarked size={24} color={NeonColors.background} />
					</View>
					<View className="flex-1">
						<Text className="text-white text-base font-semibold mb-1">Atomic Habits</Text>
						<Text className="text-zinc-400 text-sm mb-3">James Clear</Text>
						<View className="flex-row items-center gap-3">
							<View className="flex-1 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
								<View className="h-full bg-teal-500 rounded-full w-[70%]" />
							</View>
							<Text className="text-teal-500 text-xs font-semibold">70%</Text>
						</View>
					</View>
				</View>

				<View className="flex-row justify-around items-center mt-5 pt-4 border-t border-zinc-800/60">
					<View className="items-center gap-1">
						<Bookmark size={16} color={NeonColors.text.secondary} />
						<Text className="text-white text-base font-semibold">14</Text>
						<Text className="text-zinc-400 text-xs">Completed</Text>
					</View>
					<View className="w-[1px] h-6 bg-zinc-800" />
					<View className="items-center gap-1">
						<BookOpen size={16} color={NeonColors.text.secondary} />
						<Text className="text-white text-base font-semibold">32</Text>
						<Text className="text-zinc-400 text-xs">Wishlist</Text>
					</View>
				</View>
			</NeonCard>
		</Pressable>
	);
}
