import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Pressable, Text, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
} from "react-native-reanimated";

export type MobileLiquidGlassConfig = {
	themeMode?: "dark" | "light" | "auto";
	switchScaleY?: number;
	switchScaleX?: number;
	stiffness?: number;
	damping?: number;
	mass?: number;
	glassOpacity?: number;
	borderOpacity?: number;
};

type MobileBottomBarContextType = {
	value: string;
	setValue: (v: string) => void;
	registerLayout: (val: string, x: number, y: number, width: number, height: number) => void;
	indicatorAnimatedStyle: object;
	themeMode: "dark" | "light" | "auto";
};

const MobileBottomBarContext = createContext<MobileBottomBarContextType | null>(null);

function useMobileBottomBar() {
	const ctx = useContext(MobileBottomBarContext);
	if (!ctx) throw new Error("MobileBottomBar.* components must be used inside <MobileBottomBar>");
	return ctx;
}

export function MobileBottomBar({
	defaultValue = "",
	value,
	onValueChange,
	themeMode = "dark",
	switchScaleY = 1.3,
	switchScaleX = 1.15,
	stiffness = 190,
	damping = 18,
	mass = 1,
	glassOpacity = 10,
	borderOpacity = 40,
	children,
	className = "",
}: MobileLiquidGlassConfig & {
	defaultValue?: string;
	value?: string;
	onValueChange?: (v: string) => void;
	children: React.ReactNode;
	className?: string;
}) {
	const [internal, setInternal] = useState(defaultValue);
	const controlled = value !== undefined;
	const current = controlled ? value : internal;

	const indicatorX = useSharedValue(-999);
	const indicatorY = useSharedValue(0);
	const indicatorWidth = useSharedValue(0);
	const indicatorHeight = useSharedValue(0);
	const indicatorScaleX = useSharedValue(1);
	const indicatorScaleY = useSharedValue(1);
	const layoutsRef = useRef<
		Record<string, { x: number; y: number; width: number; height: number }>
	>({});

	const springConfig = useMemo(
		() => ({
			stiffness,
			damping,
			mass,
		}),
		[stiffness, damping, mass],
	);

	const isLight = themeMode === "light";

	const registerLayout = useCallback(
		(val: string, x: number, y: number, width: number, height: number) => {
			layoutsRef.current[val] = { x, y, width, height };
			if (val === current) {
				indicatorX.value = x;
				indicatorY.value = y;
				indicatorWidth.value = width;
				indicatorHeight.value = height;
			}
		},
		[current, indicatorHeight, indicatorWidth, indicatorX, indicatorY],
	);

	const setValue = useCallback(
		(v: string) => {
			if (v === current) return;
			if (!controlled) setInternal(v);
			onValueChange?.(v);

			const layout = layoutsRef.current[v];
			if (layout) {
				indicatorScaleY.value = withSequence(
					withSpring(switchScaleY, { stiffness: stiffness + 50, damping: 10 }),
					withSpring(0.94, { stiffness: stiffness + 10, damping: 14 }),
					withSpring(1, springConfig),
				);
				indicatorScaleX.value = withSequence(
					withSpring(switchScaleX, { stiffness: stiffness + 50, damping: 12 }),
					withSpring(0.97, { stiffness: stiffness + 10, damping: 14 }),
					withSpring(1, springConfig),
				);

				indicatorX.value = withSpring(layout.x, springConfig);
				indicatorY.value = withSpring(layout.y, springConfig);
				indicatorWidth.value = withSpring(layout.width, springConfig);
				indicatorHeight.value = withSpring(layout.height, springConfig);
			}
		},
		[
			controlled,
			current,
			indicatorHeight,
			indicatorScaleX,
			indicatorScaleY,
			indicatorWidth,
			indicatorX,
			indicatorY,
			onValueChange,
			springConfig,
			stiffness,
			switchScaleX,
			switchScaleY,
		],
	);

	const indicatorAnimatedStyle = useAnimatedStyle(() => {
		if (indicatorX.value < 0) return { opacity: 0 };
		return {
			position: "absolute",
			left: indicatorX.value,
			top: indicatorY.value,
			width: indicatorWidth.value,
			height: indicatorHeight.value,
			transform: [{ scaleX: indicatorScaleX.value }, { scaleY: indicatorScaleY.value }],
			backgroundColor: isLight
				? `rgba(0, 0, 0, ${(glassOpacity * 0.7) / 100})`
				: `rgba(255, 255, 255, ${glassOpacity / 100})`,
			borderColor: isLight
				? `rgba(0, 0, 0, ${borderOpacity / 100})`
				: `rgba(255, 255, 255, ${borderOpacity / 100})`,
			opacity: 1,
		};
	});

	const contextValue = useMemo(
		() => ({
			value: current,
			setValue,
			registerLayout,
			indicatorAnimatedStyle,
			themeMode,
		}),
		[current, setValue, registerLayout, indicatorAnimatedStyle, themeMode],
	);

	return (
		<MobileBottomBarContext.Provider value={contextValue}>
			<View
				className={`flex-row items-center justify-center p-2 rounded-full border shadow-2xl relative self-center ${
					isLight
						? "bg-white/85 border-black/10 shadow-black/10"
						: "bg-[#0c0c0e]/90 border-white/15 shadow-black/60"
				} ${className}`}
			>
				<Animated.View
					className="rounded-full overflow-hidden z-0 border shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
					style={[indicatorAnimatedStyle]}
				/>

				{children}
			</View>
		</MobileBottomBarContext.Provider>
	);
}

export function MobileBottomBarItem({
	value,
	icon,
	children,
	className = "",
}: {
	value: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	const { value: current, setValue, registerLayout, themeMode } = useMobileBottomBar();
	const active = current === value;
	const isLight = themeMode === "light";

	const handleLayout = (e: LayoutChangeEvent) => {
		const { x, y, width, height } = e.nativeEvent.layout;
		registerLayout(value, x, y, width, height);
	};

	return (
		<Pressable
			onLayout={handleLayout}
			onPress={() => setValue(value)}
			className={`flex-row items-center justify-center px-4 py-2.5 rounded-full z-10 gap-2 active:opacity-80 ${className}`}
		>
			{icon}
			<Text
				className={`text-sm font-medium ${
					active
						? isLight
							? "text-zinc-950 font-bold"
							: "text-white font-semibold"
						: isLight
							? "text-zinc-600"
							: "text-zinc-300"
				}`}
			>
				{children}
			</Text>
		</Pressable>
	);
}
