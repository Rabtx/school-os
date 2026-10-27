import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

interface QuickActionProps {
	icon: LucideIcon;
	label: string;
	onPress?: () => void;
}

export function QuickAction({ icon: Icon, label, onPress }: QuickActionProps) {
	return (
		<Pressable className="items-center gap-2 w-18" onPress={onPress}>
			<View className="w-15 h-15 rounded-2xl bg-zinc-900 justify-center items-center border border-white/5">
				<Icon size={24} color="#ffffff" strokeWidth={1.5} />
			</View>
			<Text className="text-zinc-400 text-xs font-medium text-center">{label}</Text>
		</Pressable>
	);
}
