import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

export interface MobileSelectOption {
	value: string;
	label: string;
}

export interface MobileSelectProps {
	options: MobileSelectOption[];
	value?: string;
	onValueChange?: (val: string) => void;
	placeholder?: string;
	label?: string;
	style?: object;
}

export function MobileSelect({
	options,
	value,
	onValueChange,
	placeholder = "Select an option...",
	label,
	style,
}: MobileSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<View className="w-full gap-1.5">
			{label && <Text className="text-xs font-semibold text-white">{label}</Text>}

			<Pressable
				onPress={() => setIsOpen(true)}
				className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 justify-center"
				style={style}
			>
				<Text className={`text-sm ${selectedOption ? "text-white" : "text-zinc-400"}`}>
					{selectedOption ? selectedOption.label : placeholder}
				</Text>
			</Pressable>

			<Modal
				visible={isOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsOpen(false)}
			>
				<Pressable className="flex-1 bg-black/60 justify-end" onPress={() => setIsOpen(false)}>
					<View className="bg-zinc-900 rounded-t-2xl p-5 max-h-[320px] gap-3">
						<Text className="text-base font-bold text-white">{label || "Select Option"}</Text>
						<ScrollView className="w-full">
							{options.map((opt) => (
								<Pressable
									key={opt.value}
									onPress={() => {
										onValueChange?.(opt.value);
										setIsOpen(false);
									}}
									className={`py-3.5 px-3 rounded-lg ${opt.value === value ? "bg-zinc-800" : ""}`}
								>
									<Text
										className={`text-sm ${
											opt.value === value ? "text-white font-semibold" : "text-zinc-400"
										}`}
									>
										{opt.label}
									</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				</Pressable>
			</Modal>
		</View>
	);
}
