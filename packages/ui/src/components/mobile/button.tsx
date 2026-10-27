import type React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface MobileButtonProps {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	disabled?: boolean;
	onPress?: () => void;
	children?: React.ReactNode;
	style?: object;
	textStyle?: object;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
	default: "bg-white",
	destructive: "bg-red-500",
	outline: "bg-transparent border border-zinc-800",
	secondary: "bg-zinc-800",
	ghost: "bg-transparent",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
	default: "h-10 px-4 rounded-lg",
	sm: "h-8 px-3 rounded-md",
	lg: "h-12 px-6 rounded-xl",
	icon: "w-10 h-10 px-0 rounded-lg",
};

const TEXT_VARIANT_CLASS: Record<ButtonVariant, string> = {
	default: "text-black",
	destructive: "text-white",
	outline: "text-white",
	secondary: "text-white",
	ghost: "text-zinc-400",
};

export function MobileButton({
	variant = "default",
	size = "default",
	loading = false,
	disabled = false,
	onPress,
	children,
	style,
	textStyle,
}: MobileButtonProps) {
	const isDisabled = disabled || loading;

	return (
		<Pressable
			onPress={isDisabled ? undefined : onPress}
			disabled={isDisabled}
			className={`flex-row items-center justify-center ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${
				isDisabled ? "opacity-50" : "active:opacity-80"
			}`}
			style={style}
		>
			{loading ? (
				<View className="flex-row items-center gap-2">
					<ActivityIndicator size="small" color={variant === "default" ? "#000" : "#fff"} />
					{typeof children === "string" ? (
						<Text
							className={`text-sm font-semibold ${TEXT_VARIANT_CLASS[variant]}`}
							style={textStyle}
						>
							{children}
						</Text>
					) : (
						children
					)}
				</View>
			) : typeof children === "string" ? (
				<Text className={`text-sm font-semibold ${TEXT_VARIANT_CLASS[variant]}`} style={textStyle}>
					{children}
				</Text>
			) : (
				children
			)}
		</Pressable>
	);
}
