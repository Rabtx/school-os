import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

export type MobileTypesetPreset = "docs" | "chat" | "compact" | "reading" | "large";

interface TypesetContextValue {
	preset: MobileTypesetPreset;
	size?: number;
	leading?: number;
	flow?: number;
}

const TypesetContext = createContext<TypesetContextValue>({
	preset: "docs",
});

export function useMobileTypeset() {
	return useContext(TypesetContext);
}

export interface MobileTypesetProps {
	preset?: MobileTypesetPreset;
	size?: number;
	leading?: number;
	flow?: number;
	className?: string;
	children?: React.ReactNode;
}

const PRESET_CONTAINER_CLASS: Record<MobileTypesetPreset, string> = {
	docs: "gap-4",
	chat: "gap-2.5",
	compact: "gap-2",
	reading: "gap-6",
	large: "gap-6",
};

export function MobileTypeset({
	preset = "docs",
	size,
	leading,
	flow,
	className,
	children,
}: MobileTypesetProps) {
	const contextValue = useMemo(
		() => ({ preset, size, leading, flow }),
		[preset, size, leading, flow],
	);

	return (
		<TypesetContext.Provider value={contextValue}>
			<View className={`w-full ${PRESET_CONTAINER_CLASS[preset]} ${className || ""}`}>
				{children}
			</View>
		</TypesetContext.Provider>
	);
}

export function MobileTypesetScroll({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator
			className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 my-2 ${
				className || ""
			}`}
		>
			{children}
		</ScrollView>
	);
}

export function MobileNotTypeset({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return <View className={className}>{children}</View>;
}

export function MobileTypesetHeading({
	level = 1,
	className,
	children,
}: {
	level?: 1 | 2 | 3 | 4;
	className?: string;
	children: React.ReactNode;
}) {
	const { preset } = useMobileTypeset();

	const headingClass =
		level === 1
			? "text-2xl font-extrabold text-white tracking-tight mt-4 mb-1"
			: level === 2
				? "text-xl font-bold text-white tracking-tight mt-3 mb-1 border-b border-zinc-800 pb-1"
				: level === 3
					? "text-lg font-semibold text-white mt-2 mb-1"
					: "text-base font-semibold text-white mt-2";

	const presetScaleClass =
		preset === "reading" || preset === "large" ? "text-3xl" : preset === "compact" ? "text-xl" : "";

	return (
		<Text className={`${headingClass} ${level === 1 ? presetScaleClass : ""} ${className || ""}`}>
			{children}
		</Text>
	);
}

export function MobileTypesetParagraph({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	const { preset } = useMobileTypeset();

	const presetTextClass =
		preset === "chat"
			? "text-[13px] leading-5 text-zinc-300"
			: preset === "compact"
				? "text-xs leading-[18px] text-zinc-400"
				: preset === "reading"
					? "text-base leading-7 text-zinc-200"
					: preset === "large"
						? "text-[15px] leading-7 text-zinc-200"
						: "text-sm leading-6 text-zinc-300";

	return <Text className={`${presetTextClass} ${className || ""}`}>{children}</Text>;
}

export function MobileTypesetBlockquote({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<View className={`border-l-2 border-teal-500 pl-3.5 my-2 italic ${className || ""}`}>
			<Text className="text-sm italic text-zinc-400 leading-6">{children}</Text>
		</View>
	);
}

export function MobileTypesetCode({
	block = false,
	className,
	children,
}: {
	block?: boolean;
	className?: string;
	children: React.ReactNode;
}) {
	if (block) {
		return (
			<View
				className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 my-2 ${className || ""}`}
			>
				<Text className="font-mono text-xs text-teal-400 leading-5">{children}</Text>
			</View>
		);
	}

	return (
		<Text
			className={`font-mono text-xs text-teal-300 bg-zinc-800 px-1.5 py-0.5 rounded ${className || ""}`}
		>
			{children}
		</Text>
	);
}
