import { Cancel01Icon, CheckIcon, EyeIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type React from "react";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const SPRING_PRESS = {
	stiffness: 500,
	damping: 30,
	mass: 0.6,
};

export interface MobileMotionInputProps {
	label?: string;
	error?: string | boolean;
	success?: boolean;
	placeholder?: string;
	value?: string;
	onChangeText?: (text: string) => void;
	secureTextEntry?: boolean;
	clearable?: boolean;
	onClear?: () => void;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	disabled?: boolean;
	style?: object;
}

export function MobileMotionInput({
	label,
	error,
	success,
	placeholder,
	value,
	onChangeText,
	secureTextEntry = false,
	clearable = false,
	onClear,
	leftIcon,
	rightIcon,
	disabled = false,
	style,
}: MobileMotionInputProps) {
	const [isFocused, setIsFocused] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const scale = useSharedValue(1);
	const shakeX = useSharedValue(0);
	const borderProgress = useSharedValue(0);

	const hasError = Boolean(error);

	// Trigger error shake animation
	// oxlint-disable-next-line react-hooks/exhaustive-deps -- trigger shake on error change
	useEffect(() => {
		if (hasError) {
			shakeX.value = withSequence(
				withTiming(-8, { duration: 60 }),
				withTiming(8, { duration: 60 }),
				withTiming(-6, { duration: 60 }),
				withTiming(6, { duration: 60 }),
				withTiming(-3, { duration: 60 }),
				withTiming(0, { duration: 60 }),
			);
		}
	}, [hasError]);

	const handleFocus = () => {
		setIsFocused(true);
		scale.value = withSpring(1.02, SPRING_PRESS);
		borderProgress.value = withTiming(1, { duration: 200 });
	};

	const handleBlur = () => {
		setIsFocused(false);
		scale.value = withSpring(1, SPRING_PRESS);
		borderProgress.value = withTiming(0, { duration: 200 });
	};

	const animatedWrapperStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }, { translateX: shakeX.value }],
	}));

	const isPassword = secureTextEntry;

	return (
		<View className="w-full gap-1.5">
			{label && <Text className="text-xs font-semibold text-white">{label}</Text>}

			<Animated.View
				className={`flex-row items-center h-11 rounded-xl border bg-zinc-900 px-3 ${
					hasError
						? "border-red-500"
						: success
							? "border-emerald-500"
							: isFocused
								? "border-white"
								: "border-zinc-800"
				} ${disabled ? "opacity-50" : ""}`}
				style={[animatedWrapperStyle, style]}
			>
				{leftIcon && <View className="mr-2">{leftIcon}</View>}

				<TextInput
					placeholder={placeholder}
					placeholderTextColor="#71717a"
					value={value}
					onChangeText={onChangeText}
					onFocus={handleFocus}
					onBlur={handleBlur}
					editable={!disabled}
					secureTextEntry={isPassword && !showPassword}
					className="flex-1 text-sm text-white p-0"
				/>

				{success ? (
					<View className="p-1 ml-1">
						<HugeiconsIcon icon={CheckIcon} size={16} color="#10b981" />
					</View>
				) : clearable && value ? (
					<Pressable onPress={onClear} hitSlop={8} className="p-1 ml-1">
						<HugeiconsIcon icon={Cancel01Icon} size={15} color="#a1a1aa" />
					</Pressable>
				) : isPassword ? (
					<Pressable
						onPress={() => setShowPassword(!showPassword)}
						hitSlop={8}
						className="p-1 ml-1"
					>
						<HugeiconsIcon icon={showPassword ? ViewOffIcon : EyeIcon} size={16} color="#a1a1aa" />
					</Pressable>
				) : rightIcon ? (
					<View className="ml-2">{rightIcon}</View>
				) : null}
			</Animated.View>

			{typeof error === "string" && (
				<Text className="text-[11px] font-medium text-red-500">{error}</Text>
			)}
		</View>
	);
}
