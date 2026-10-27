import { ArrowDown01Icon, CheckIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";

const SPRING_PRESS = {
	stiffness: 500,
	damping: 30,
	mass: 0.6,
};

const SPRING_SLIDE = {
	stiffness: 350,
	damping: 26,
	mass: 0.8,
};

export interface MobileMotionSelectOption {
	value: string;
	label: string;
	group?: string;
	disabled?: boolean;
}

export interface MobileMotionSelectProps {
	options: MobileMotionSelectOption[];
	value?: string;
	onValueChange?: (val: string) => void;
	placeholder?: string;
	label?: string;
	searchable?: boolean;
	disabled?: boolean;
	error?: boolean | string;
	dir?: "ltr" | "rtl";
	style?: object;
}

export function MobileMotionSelect({
	options,
	value,
	onValueChange,
	placeholder = "Select an option...",
	label,
	searchable = false,
	disabled = false,
	error = false,
	dir = "ltr",
	style,
}: MobileMotionSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const triggerScale = useSharedValue(1);
	const chevronRotate = useSharedValue(0);
	const sheetTranslateY = useSharedValue(300);
	const backdropOpacity = useSharedValue(0);

	const selectedOption = options.find((opt) => opt.value === value);
	const isRtl = dir === "rtl";
	const hasError = Boolean(error);

	// Trigger animation on open state change
	// oxlint-disable-next-line react-hooks/exhaustive-deps -- animate sheet on open
	useEffect(() => {
		if (isOpen) {
			chevronRotate.value = withSpring(180, SPRING_PRESS);
			sheetTranslateY.value = withSpring(0, SPRING_SLIDE);
			backdropOpacity.value = withTiming(1, { duration: 200 });
		} else {
			chevronRotate.value = withSpring(0, SPRING_PRESS);
			sheetTranslateY.value = withTiming(300, { duration: 200 });
			backdropOpacity.value = withTiming(0, { duration: 200 });
			setSearchQuery("");
		}
	}, [isOpen]);

	const handlePressIn = () => {
		if (!disabled) triggerScale.value = withSpring(0.96, SPRING_PRESS);
	};

	const handlePressOut = () => {
		if (!disabled) triggerScale.value = withSpring(1, SPRING_PRESS);
	};

	const animatedTriggerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: triggerScale.value }],
	}));

	const animatedChevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${chevronRotate.value}deg` }],
	}));

	const animatedSheetStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: sheetTranslateY.value }],
	}));

	const animatedBackdropStyle = useAnimatedStyle(() => ({
		opacity: backdropOpacity.value,
	}));

	const filteredOptions = searchQuery
		? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
		: options;

	return (
		<View className="w-full gap-1.5">
			{label && (
				<Text className={`text-xs font-semibold text-white ${isRtl ? "text-right" : ""}`}>
					{label}
				</Text>
			)}

			<Animated.View style={animatedTriggerStyle}>
				<Pressable
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					onPress={() => !disabled && setIsOpen(true)}
					disabled={disabled}
					className={`flex-row items-center justify-between h-11 rounded-xl border bg-zinc-900 px-3 ${
						isRtl ? "flex-row-reverse" : ""
					} ${hasError ? "border-red-500" : "border-zinc-800"} ${disabled ? "opacity-40" : ""}`}
					style={style}
				>
					<Text
						className={`text-sm ${selectedOption ? "text-white" : "text-zinc-400"} ${
							isRtl ? "text-right" : ""
						}`}
					>
						{selectedOption ? selectedOption.label : placeholder}
					</Text>
					<Animated.View style={animatedChevronStyle}>
						<HugeiconsIcon icon={ArrowDown01Icon} size={16} color="#a1a1aa" />
					</Animated.View>
				</Pressable>
			</Animated.View>

			<Modal
				visible={isOpen}
				transparent
				animationType="none"
				onRequestClose={() => setIsOpen(false)}
			>
				<Pressable className="flex-1 justify-end" onPress={() => setIsOpen(false)}>
					<Animated.View className="absolute inset-0 bg-black/70" style={animatedBackdropStyle} />

					<Animated.View
						className="bg-zinc-900 rounded-t-3xl p-5 max-h-[380px] border-t border-zinc-800 gap-3"
						style={animatedSheetStyle}
					>
						<View className="flex-row items-center justify-between pb-2 border-b border-zinc-800">
							<Text className="text-base font-bold text-white">{label || "Select Option"}</Text>
							<View className="w-9 h-1 bg-zinc-700 rounded-full" />
						</View>

						{searchable && (
							<View className="flex-row items-center h-9 rounded-lg bg-zinc-800 px-2.5 gap-2">
								<HugeiconsIcon icon={Search01Icon} size={16} color="#a1a1aa" />
								<TextInput
									placeholder="Search options..."
									placeholderTextColor="#71717a"
									value={searchQuery}
									onChangeText={setSearchQuery}
									className="flex-1 text-xs text-white p-0"
								/>
							</View>
						)}

						<ScrollView className="w-full">
							{filteredOptions.map((opt) => {
								const isSelected = opt.value === value;
								return (
									<Pressable
										key={opt.value}
										onPress={() => {
											if (!opt.disabled) {
												onValueChange?.(opt.value);
												setIsOpen(false);
											}
										}}
										disabled={opt.disabled}
										className={`flex-row items-center justify-between py-3 px-3 rounded-lg mb-1 ${
											isSelected ? "bg-zinc-800" : ""
										} ${opt.disabled ? "opacity-40" : ""}`}
									>
										<Text
											className={`text-sm ${
												isSelected ? "text-white font-semibold" : "text-zinc-400"
											}`}
										>
											{opt.label}
										</Text>
										{isSelected && <HugeiconsIcon icon={CheckIcon} size={16} color="#14b8a6" />}
									</Pressable>
								);
							})}
						</ScrollView>
					</Animated.View>
				</Pressable>
			</Modal>
		</View>
	);
}
