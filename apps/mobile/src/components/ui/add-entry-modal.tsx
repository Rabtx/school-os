import { X } from "lucide-react-native";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { NeonColors } from "@/constants/design-system";

interface AddEntryModalProps {
	visible: boolean;
	onClose: () => void;
	onSave: (title: string, subtitle: string, value: string, delta: string) => void;
	color?: string;
	titleLabel?: string;
}

export function AddEntryModal({
	visible,
	onClose,
	onSave,
	color = NeonColors.accent.green,
	titleLabel = "Add New Entry",
}: AddEntryModalProps) {
	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [value, setValue] = useState("");
	const [delta, setDelta] = useState("");

	const handleSave = () => {
		if (!title) return;
		onSave(title, subtitle, value, delta);
		setTitle("");
		setSubtitle("");
		setValue("");
		setDelta("");
		onClose();
	};

	return (
		<Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1 justify-end bg-black/60"
			>
				<View className="bg-zinc-900 rounded-t-[32px] p-6 pb-12 border-t border-l border-r border-zinc-800 shadow-2xl">
					<View className="flex-row justify-between items-center mb-6">
						<Text className="text-xl font-semibold" style={{ color }}>
							{titleLabel}
						</Text>
						<Pressable onPress={onClose} className="p-1">
							<X size={24} color={NeonColors.text.secondary} />
						</Pressable>
					</View>

					<View className="gap-4">
						<TextInput
							className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-base"
							placeholder="Title (e.g., Avocado Toast)"
							placeholderTextColor={NeonColors.text.muted}
							value={title}
							onChangeText={setTitle}
						/>
						<TextInput
							className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-base"
							placeholder="Subtitle (e.g., Breakfast)"
							placeholderTextColor={NeonColors.text.muted}
							value={subtitle}
							onChangeText={setSubtitle}
						/>
						<TextInput
							className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-base"
							placeholder="Value (e.g., 450 kcal)"
							placeholderTextColor={NeonColors.text.muted}
							value={value}
							onChangeText={setValue}
						/>
						<TextInput
							className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-base"
							placeholder="Secondary Info (e.g., 35g Protein)"
							placeholderTextColor={NeonColors.text.muted}
							value={delta}
							onChangeText={setDelta}
						/>

						<Pressable
							className="rounded-xl p-4 items-center mt-2 active:opacity-80"
							style={{ backgroundColor: color }}
							onPress={handleSave}
						>
							<Text className="text-zinc-950 text-base font-bold">Save Entry</Text>
						</Pressable>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}
