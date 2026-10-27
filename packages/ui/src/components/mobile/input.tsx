import { useState } from "react";
import { Text, TextInput, View } from "react-native";

export interface MobileInputProps {
	label?: string;
	error?: string | boolean;
	placeholder?: string;
	value?: string;
	onChangeText?: (text: string) => void;
	secureTextEntry?: boolean;
	disabled?: boolean;
	style?: object;
}

export function MobileInput({
	label,
	error,
	placeholder,
	value,
	onChangeText,
	secureTextEntry = false,
	disabled = false,
	style,
}: MobileInputProps) {
	const [isFocused, setIsFocused] = useState(false);

	return (
		<View className="w-full gap-1.5">
			{label && <Text className="text-xs font-semibold text-white">{label}</Text>}
			<View
				className={`h-11 rounded-xl border bg-zinc-900 px-3 justify-center ${
					error ? "border-red-500" : isFocused ? "border-teal-500" : "border-zinc-800"
				} ${disabled ? "opacity-50" : ""}`}
				style={style}
			>
				<TextInput
					placeholder={placeholder}
					placeholderTextColor="#a1a1aa"
					value={value}
					onChangeText={onChangeText}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					editable={!disabled}
					secureTextEntry={secureTextEntry}
					className="text-sm text-white p-0"
				/>
			</View>
			{typeof error === "string" && <Text className="text-[11px] text-red-500">{error}</Text>}
		</View>
	);
}
