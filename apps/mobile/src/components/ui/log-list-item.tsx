import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

interface LogListItemProps {
	icon: LucideIcon;
	iconColor: string;
	title: string;
	subtitle: string;
	value: string;
	delta?: string;
	deltaColor?: string;
	onPress?: () => void;
}

export function LogListItem({
	icon: Icon,
	iconColor,
	title,
	subtitle,
	value,
	delta,
	deltaColor = "#34d399",
	onPress,
}: LogListItemProps) {
	return (
		<Pressable
			className="flex-row justify-between items-center py-3.5 border-b border-white/5 active:opacity-70"
			onPress={onPress}
		>
			<View className="flex-row items-center gap-4">
				<View
					className="w-11 h-11 rounded-full justify-center items-center"
					style={{ backgroundColor: `${iconColor}15` }}
				>
					<Icon size={20} color={iconColor} strokeWidth={2} />
				</View>
				<View className="gap-0.5">
					<Text className="text-white text-base font-semibold">{title}</Text>
					<Text className="text-zinc-400 text-xs font-normal">{subtitle}</Text>
				</View>
			</View>
			<View className="items-end gap-0.5">
				<Text className="text-white text-base font-semibold font-mono">{value}</Text>
				{delta && (
					<Text className="text-xs font-medium" style={{ color: deltaColor }}>
						{delta}
					</Text>
				)}
			</View>
		</Pressable>
	);
}
