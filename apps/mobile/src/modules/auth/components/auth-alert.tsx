import { Text, View } from "react-native";

interface AuthAlertProps {
	title?: string;
	message: string;
	variant?: "destructive" | "info";
}

export function AuthAlert({ title, message, variant = "info" }: AuthAlertProps) {
	const destructive = variant === "destructive";
	return (
		<View
			className={`rounded-xl border p-3 gap-1 ${destructive ? "border-red-500/40 bg-red-500/10" : "border-teal-500/35 bg-teal-500/10"}`}
		>
			{title ? (
				<Text className={`font-bold text-sm ${destructive ? "text-red-400" : "text-zinc-100"}`}>
					{title}
				</Text>
			) : null}
			<Text
				className={`text-[13px] leading-relaxed ${destructive ? "text-red-400" : "text-zinc-400"}`}
			>
				{message}
			</Text>
		</View>
	);
}
