import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Variant = "pill" | "underline" | "segment";

type Ctx = {
	value: string;
	setValue: (v: string) => void;
	variant: Variant;
};

const TabsCtx = createContext<Ctx | null>(null);

function useTabs() {
	const ctx = useContext(TabsCtx);
	if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
	return ctx;
}

export function Tabs({
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

	const setValue = useCallback(
		(v: string) => {
			if (!controlled) setInternal(v);
			onValueChange?.(v);
		},
		[controlled, onValueChange],
	);

	const contextValue = useMemo(
		() => ({ value: current ?? "", setValue, variant }),
		[current, setValue, variant],
	);

	return (
		<TabsCtx.Provider value={contextValue}>
			<View className={className} style={style}>
				{children}
			</View>
		</TabsCtx.Provider>
	);
}

export function TabsList({
	children,
	style,
	className,
}: {
	children: React.ReactNode;
	style?: object;
	className?: string;
}) {
	const { variant } = useTabs();

	const variantClass =
		variant === "pill"
			? "bg-zinc-900 rounded-full p-1 gap-1"
			: variant === "underline"
				? "border-b border-zinc-800 gap-2"
				: "bg-zinc-900 rounded-lg p-0.5";

	return (
		<View
			className={`flex-row items-center self-center ${variantClass} ${className || ""}`}
			style={style}
		>
			{children}
		</View>
	);
}

export function TabsTrigger({
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
	const { value: current, setValue, variant } = useTabs();
	const active = current === value;

	const activeClass =
		active && variant === "pill"
			? "bg-white rounded-full"
			: active && variant === "segment"
				? "bg-zinc-800 rounded-md"
				: "";

	const textClass = active
		? variant === "pill"
			? "text-black font-semibold"
			: "text-white font-semibold"
		: "text-zinc-400 font-semibold";

	return (
		<Pressable
			onPress={() => setValue(value)}
			className={`px-3.5 py-2 items-center justify-center ${
				variant === "underline" ? "pb-2.5 relative" : ""
			} ${activeClass} ${className || ""}`}
			style={style}
		>
			<Text className={`text-[13px] ${textClass}`}>{children}</Text>
			{active && variant === "underline" && (
				<View className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
			)}
		</Pressable>
	);
}

export function TabsContent({
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
