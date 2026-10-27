import { Cancel01Icon, CheckIcon, Loading01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type React from "react";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
	createAnimatedComponent,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "outline"
	| "destructive"
	| "default";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const AnimatedPressable = createAnimatedComponent(Pressable);

const SPRING_PRESS = {
	stiffness: 500,
	damping: 30,
	mass: 0.6,
};

export interface MobileMotionButtonProps {
	variant?: ButtonVariant;
	size?: ButtonSize;
	pressScale?: number;
	loading?: boolean;
	disabled?: boolean;
	elevated?: boolean;
	onPress?: () => void;
	children?: React.ReactNode;
	style?: object;
	textStyle?: object;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
	primary: "bg-white",
	default: "bg-white",
	secondary: "bg-zinc-900 border border-zinc-700",
	outline: "bg-transparent border border-zinc-800",
	ghost: "bg-transparent",
	destructive: "bg-red-500",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
	sm: "h-8 px-3.5",
	md: "h-10 px-5",
	lg: "h-12 px-6",
	icon: "w-9 h-9 px-0",
};

const TEXT_VARIANT_CLASS: Record<ButtonVariant, string> = {
	primary: "text-black",
	default: "text-black",
	secondary: "text-white",
	outline: "text-white",
	ghost: "text-zinc-400",
	destructive: "text-white",
};

export function MobileMotionButton({
	variant = "primary",
	size = "md",
	pressScale = 0.93,
	loading = false,
	disabled = false,
	elevated = true,
	onPress,
	children,
	style,
	textStyle,
}: MobileMotionButtonProps) {
	const isDisabled = disabled || loading;
	const scale = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	const handlePressIn = () => {
		if (!isDisabled) {
			scale.value = withSpring(pressScale, SPRING_PRESS);
		}
	};

	const handlePressOut = () => {
		if (!isDisabled) {
			scale.value = withSpring(1, SPRING_PRESS);
		}
	};

	return (
		<AnimatedPressable
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			onPress={isDisabled ? undefined : onPress}
			disabled={isDisabled}
			className={`flex-row items-center justify-center rounded-full ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${
				isDisabled ? "opacity-50" : ""
			} ${elevated && (variant === "primary" || variant === "default") ? "shadow-sm shadow-black" : ""}`}
			style={[animatedStyle, style]}
		>
			{loading ? (
				<View className="flex-row items-center gap-2">
					<HugeiconsIcon
						icon={Loading01Icon}
						size={size === "sm" ? 14 : 16}
						color={variant === "primary" || variant === "default" ? "#000000" : "#ffffff"}
					/>
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
		</AnimatedPressable>
	);
}

export type MobileButtonState = "idle" | "loading" | "success" | "error";

export interface MobileStatefulButtonProps extends Omit<MobileMotionButtonProps, "children"> {
	state?: MobileButtonState;
	children: string;
	loadingText?: string;
	successText?: string;
	errorText?: string;
	icon?: React.ReactNode;
}

export function MobileStatefulButton({
	state = "idle",
	children,
	loadingText = "Loading",
	successText = "Done",
	errorText = "Try again",
	icon,
	variant = "primary",
	size = "md",
	...props
}: MobileStatefulButtonProps) {
	const textOpacity = useSharedValue(1);
	const textTranslateY = useSharedValue(0);

	// oxlint-disable-next-line react-hooks/exhaustive-deps -- trigger text animation on state change
	useEffect(() => {
		textOpacity.value = 0;
		textTranslateY.value = 8;
		textOpacity.value = withTiming(1, { duration: 180 });
		textTranslateY.value = withSpring(0, SPRING_PRESS);
	}, [state]);

	const animatedTextStyle = useAnimatedStyle(() => ({
		opacity: textOpacity.value,
		transform: [{ translateY: textTranslateY.value }],
	}));

	const isBusy = state === "loading";
	const currentText =
		state === "loading"
			? loadingText
			: state === "success"
				? successText
				: state === "error"
					? errorText
					: children;

	const isPrimary = variant === "primary" || variant === "default";
	const iconColor = isPrimary ? "#000000" : "#ffffff";

	return (
		<MobileMotionButton variant={variant} size={size} loading={false} disabled={isBusy} {...props}>
			<View className="flex-row items-center gap-2">
				{state === "loading" && (
					<HugeiconsIcon icon={Loading01Icon} size={size === "sm" ? 14 : 16} color={iconColor} />
				)}
				{state === "success" && (
					<HugeiconsIcon icon={CheckIcon} size={size === "sm" ? 14 : 16} color="#10b981" />
				)}
				{state === "error" && (
					<HugeiconsIcon icon={Cancel01Icon} size={size === "sm" ? 14 : 16} color="#ef4444" />
				)}
				{state === "idle" && icon}

				<Animated.View style={animatedTextStyle}>
					<Text
						className={`text-sm font-semibold ${TEXT_VARIANT_CLASS[variant]}`}
						style={props.textStyle}
					>
						{currentText}
					</Text>
				</Animated.View>
			</View>
		</MobileMotionButton>
	);
}
