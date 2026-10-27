import { Check, ImagePlus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from "react-native";
import { NeonColors } from "@/constants/design-system";
import { resolveMediaUrl } from "@/lib/media-url";
import { buildAvatarTemplates } from "../lib/avatar-templates";

interface AvatarPickerProps {
	seed: string;
	value: string | null | undefined;
	pending?: boolean;
	uploading?: boolean;
	onSelectTemplate: (url: string) => void;
	onPickFromDevice: () => void;
}

export function AvatarPicker({
	seed,
	value,
	pending = false,
	uploading = false,
	onSelectTemplate,
	onPickFromDevice,
}: AvatarPickerProps) {
	const templates = buildAvatarTemplates(seed);
	const busy = pending || uploading;
	const previewUri = resolveMediaUrl(value);
	const [failedUri, setFailedUri] = useState<string | null>(null);
	const previewFailed = previewUri != null && failedUri === previewUri;

	return (
		<View className="gap-3">
			<Text className="text-white text-sm font-semibold">Avatar</Text>
			<View className="flex-row items-center gap-3.5">
				<View className="w-18 h-18 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 items-center justify-center">
					{previewUri && !previewFailed ? (
						<Image
							key={previewUri}
							source={{ uri: previewUri }}
							style={{ width: "100%", height: "100%" }}
							onError={() => setFailedUri(previewUri)}
						/>
					) : (
						<Text className="text-zinc-500 text-xs">None</Text>
					)}
				</View>
				<Pressable
					className={`flex-row items-center gap-2 min-h-[44px] px-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 active:opacity-80 ${
						busy ? "opacity-50" : ""
					}`}
					disabled={busy}
					onPress={onPickFromDevice}
				>
					{uploading ? (
						<ActivityIndicator color={NeonColors.accent.green} />
					) : (
						<>
							<ImagePlus size={16} color={NeonColors.text.primary} strokeWidth={1.8} />
							<Text className="text-white text-sm font-semibold">Upload photo</Text>
						</>
					)}
				</Pressable>
			</View>

			<Text className="text-zinc-500 text-xs mt-1">Or pick a template</Text>
			<View className="flex-row flex-wrap gap-2.5">
				{templates.map((template) => {
					const selected = value === template.url;
					return (
						<Pressable
							key={template.id}
							disabled={busy}
							onPress={() => onSelectTemplate(template.url)}
							className={`w-16 h-16 rounded-2xl overflow-hidden border active:opacity-80 ${
								selected ? "border-emerald-500 border-2" : "border-zinc-800"
							} ${busy ? "opacity-50" : ""}`}
						>
							<Image source={{ uri: template.url }} style={{ width: "100%", height: "100%" }} />
							{selected ? (
								<View className="absolute right-1 bottom-1 w-4.5 h-4.5 rounded-full bg-emerald-500 items-center justify-center">
									<Check size={12} color={NeonColors.background} strokeWidth={3} />
								</View>
							) : null}
						</Pressable>
					);
				})}
			</View>
			<Text className="text-zinc-500 text-xs">JPEG, PNG, or WebP · max 2 MB</Text>
		</View>
	);
}

export function alertAvatarPermissionDenied() {
	Alert.alert(
		"Photo access needed",
		"Allow photo library access to upload an avatar from your device.",
	);
}
