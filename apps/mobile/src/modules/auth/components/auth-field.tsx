import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, Text, TextInput, type TextInputProps, View } from "react-native";

interface AuthFieldProps {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder?: string;
	secureTextEntry?: boolean;
	showPasswordToggle?: boolean;
	onTogglePassword?: () => void;
	keyboardType?: "default" | "email-address" | "number-pad";
	autoComplete?: TextInputProps["autoComplete"];
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	editable?: boolean;
	hint?: string;
	errorHint?: string;
	maxLength?: number;
	multiline?: boolean;
	numberOfLines?: number;
	rightLink?: { label: string; onPress: () => void };
}

export function AuthField({
	label,
	value,
	onChangeText,
	placeholder,
	secureTextEntry,
	showPasswordToggle,
	onTogglePassword,
	keyboardType = "default",
	autoComplete,
	autoCapitalize = "none",
	editable = true,
	hint,
	errorHint,
	maxLength,
	multiline = false,
	numberOfLines,
	rightLink,
}: AuthFieldProps) {
	return (
		<View className="gap-2">
			<View className="flex-row items-center justify-between">
				<Text className="text-zinc-100 text-sm font-semibold">{label}</Text>
				{rightLink ? (
					<Pressable onPress={rightLink.onPress} hitSlop={8}>
						<Text className="text-zinc-400 text-[13px]">{rightLink.label}</Text>
					</Pressable>
				) : null}
			</View>
			<View
				className={`flex-row border border-zinc-800 rounded-2xl bg-white/5 px-3.5 min-h-[48px] ${multiline ? "items-start min-h-[112px] py-1" : "items-center"}`}
			>
				<TextInput
					className={`flex-1 text-zinc-100 text-base py-3 ${multiline ? "min-h-[96px] pt-3" : ""}`}
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#a1a1aa"
					secureTextEntry={secureTextEntry}
					keyboardType={keyboardType}
					autoComplete={autoComplete}
					autoCapitalize={autoCapitalize}
					editable={editable}
					maxLength={maxLength}
					multiline={multiline}
					numberOfLines={numberOfLines}
					textAlignVertical={multiline ? "top" : "center"}
				/>
				{showPasswordToggle ? (
					<Pressable onPress={onTogglePassword} hitSlop={8} className="pl-2">
						{secureTextEntry ? (
							<Eye size={18} color="#a1a1aa" />
						) : (
							<EyeOff size={18} color="#a1a1aa" />
						)}
					</Pressable>
				) : null}
			</View>
			{errorHint ? <Text className="text-red-500 text-xs">{errorHint}</Text> : null}
			{!errorHint && hint ? <Text className="text-zinc-500 text-xs">{hint}</Text> : null}
		</View>
	);
}
