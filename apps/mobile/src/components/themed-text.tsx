import { Platform, Text, type TextProps } from "react-native";

import { Fonts, type ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
	type?: "default" | "title" | "small" | "smallBold" | "subtitle" | "link" | "linkPrimary" | "code";
	themeColor?: ThemeColor;
	className?: string;
};

export function ThemedText({
	style,
	className = "",
	type = "default",
	themeColor,
	...rest
}: ThemedTextProps) {
	const theme = useTheme();

	let typeClasses = "text-base font-medium leading-6";
	if (type === "title") typeClasses = "text-[48px] font-semibold leading-[52px]";
	else if (type === "small") typeClasses = "text-sm font-medium leading-5";
	else if (type === "smallBold") typeClasses = "text-sm font-bold leading-5";
	else if (type === "subtitle") typeClasses = "text-[32px] font-semibold leading-[44px]";
	else if (type === "link") typeClasses = "text-sm leading-7";
	else if (type === "linkPrimary") typeClasses = "text-sm leading-7 text-[#3c87f7]";
	else if (type === "code") typeClasses = "text-xs font-medium font-mono";

	return (
		<Text
			className={`${typeClasses} ${className}`}
			style={[
				{ color: theme[themeColor ?? "text"] },
				type === "code" && {
					fontFamily: Fonts.mono,
					fontWeight: Platform.select({ android: "700", default: "500" }) as any,
				},
				style,
			]}
			{...rest}
		/>
	);
}
