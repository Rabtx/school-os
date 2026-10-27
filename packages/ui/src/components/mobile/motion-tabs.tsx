import React, { createContext, useContext, useState } from "react";
import { type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

type Variant = "pill" | "underline" | "segment";

type Ctx = {
	value: string;
	setValue: (v: string) => void;
	variant: Variant;
	registerLayout: (val: string, x: number, width: number) => void;
	indicatorAnimatedStyle: object;
};

const TabsCtx = createContext<Ctx | null>(null);

function useTabs() {
	const ctx = useContext(TabsCtx);
	if (!ctx) throw new Error("MotionTabs.* must be used inside <MotionTabs>");
	return ctx;
}

const SPRING_CONFIG = {
	stiffness: 170,
	damping: 24,
	mass: 1.2,
};

export function MotionTabs({
	defaultValue = "",
	value,
	onValueChange,
	variant = "pill",
	children,
	style,
	className,
}: {
	defaultValue?: string;
	value?: string;
	onValueChange?: (v: string) => void;
	variant?: Variant;
	children: React.ReactNode;
	style?: object;
	className?: string;
}) {
	const [internal, setInternal] = useState(defaultValue);
	const controlled = value !== undefined;
	const current = controlled ? value : internal;

	const indicatorX = useSharedValue(0);
	const indicatorWidth = useSharedValue(0);
	const layoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});

	const registerLayout = React.useCallback(
		(val: string, x: number, width: number) => {
			layoutsRef.current[val] = { x, width };
			if (val === current) {
				indicatorX.value = withSpring(x, SPRING_CONFIG);
				indicatorWidth.value = withSpring(width, SPRING_CONFIG);
			}
		},
		[current, indicatorWidth, indicatorX],
	);

	const setValue = React.useCallback(
		(v: string) => {
			if (!controlled) setInternal(v);
			onValueChange?.(v);

			const layout = layoutsRef.current[v];
			if (layout) {
				indicatorX.value = withSpring(layout.x, SPRING_CONFIG);
				indicatorWidth.value = withSpring(layout.width, SPRING_CONFIG);
			}
		},
		[controlled, indicatorWidth, indicatorX, onValueChange],
	);

	const indicatorAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorX.value }],
		width: indicatorWidth.value,
	}));

	const contextValue = React.useMemo(
		() => ({
			value: current,
			setValue,
			variant,
			registerLayout,
			indicatorAnimatedStyle,
		}),
		[current, setValue, variant, registerLayout, indicatorAnimatedStyle],
	);

	return (
		<TabsCtx.Provider value={contextValue}>
			<View className={className} style={style}>
				{children}
			</View>
		</TabsCtx.Provider>
	);
}

export function MotionTabsList({
	children,
	style,
	className,
}: {
	children: React.ReactNode;
	style?: object;
	className?: string;
}) {
	const { variant, indicatorAnimatedStyle } = useTabs();

	const listVariantClass =
		variant === "pill"
			? "bg-zinc-900 rounded-full p-1"
			: variant === "underline"
				? "border-b border-zinc-800"
				: "bg-zinc-900 rounded-lg p-0.5";

	const indicatorVariantClass =
		variant === "pill"
			? "top-1 bottom-1 bg-white rounded-full"
			: variant === "underline"
				? "bottom-0 h-0.5 bg-white"
				: "top-1 bottom-1 bg-zinc-800 rounded-md";

	return (
		<View
			className={`flex-row items-center self-center relative ${listVariantClass} ${className || ""}`}
			style={style}
		>
			<Animated.View
				className={`absolute z-10 ${indicatorVariantClass}`}
				style={indicatorAnimatedStyle}
			/>
			{children}
		</View>
	);
}

export function MotionTabsTrigger({
	value,
	children,
	style,
	className,
}: {
	value: string;
	children: React.ReactNode;
	style?: object;
	className?: string;
}) {
	const { value: current, setValue, variant, registerLayout } = useTabs();
	const active = current === value;

	const handleLayout = (e: LayoutChangeEvent) => {
		const { x, width } = e.nativeEvent.layout;
		registerLayout(value, x, width);
	};

	const triggerVariantClass =
		variant === "pill"
			? "px-3.5 py-2 rounded-full items-center justify-center z-20"
			: variant === "underline"
				? "px-3.5 py-2 pb-2.5 items-center justify-center z-20"
				: "px-3.5 py-2 items-center justify-center z-20";

	const textColorClass = active
		? variant === "pill"
			? "text-black font-semibold"
			: "text-white font-semibold"
		: "text-zinc-400 font-semibold";

	return (
		<Pressable
			onLayout={handleLayout}
			onPress={() => setValue(value)}
			className={`${triggerVariantClass} ${className || ""}`}
			style={style}
		>
			<Text className={`text-[13px] ${textColorClass}`}>{children}</Text>
		</Pressable>
	);
}

export function MotionTabsContent({
	value,
	children,
	style,
	className,
}: {
	value: string;
	children: React.ReactNode;
	style?: object;
	className?: string;
}) {
	const { value: current } = useTabs();
	if (current !== value) return null;

	return (
		<View className={className} style={style}>
			{children}
		</View>
	);
}
