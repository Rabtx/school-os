import { ActivityIndicator, Pressable, Text, type ViewStyle } from "react-native";

interface AuthButtonProps {
	label: string;
	onPress: () => void;
	pending?: boolean;
	disabled?: boolean;
	variant?: "primary" | "outline" | "ghost";
	style?: ViewStyle;
}

export function AuthButton({
	label,
	onPress,
	pending = false,
	disabled = false,
	variant = "primary",
	style,
}: AuthButtonProps) {
	const isDisabled = disabled || pending;
	return (
		<Pressable
			onPress={onPress}
			disabled={isDisabled}
			style={style}
			className={`min-h-[48px] rounded-2xl items-center justify-center px-4 active:opacity-85 ${
				variant === "primary"
					? "bg-teal-500"
					: variant === "outline"
						? "border border-zinc-800 bg-transparent"
						: "bg-transparent"
			} ${isDisabled ? "opacity-50" : ""}`}
		>
			{pending ? (
				<ActivityIndicator color={variant === "primary" ? "#000" : "#14b8a6"} />
			) : (
				<Text
					className={`text-base font-bold ${
						variant === "primary" ? "text-zinc-950" : "text-zinc-100"
					}`}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
}
