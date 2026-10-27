import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

interface FloatingActionButtonProps {
	onPress?: () => void;
	color?: string;
}

export function FloatingActionButton({ onPress, color = "#34d399" }: FloatingActionButtonProps) {
	return (
		<View className="absolute bottom-26 right-6 z-50">
			<Pressable
				onPress={onPress}
				className="w-16 h-16 rounded-full items-center justify-center bg-emerald-400 active:scale-95 active:opacity-90 shadow-xl shadow-emerald-400/40"
				style={{ backgroundColor: color }}
			>
				<Plus size={32} color="#09090b" strokeWidth={2.5} />
			</Pressable>
		</View>
	);
}
