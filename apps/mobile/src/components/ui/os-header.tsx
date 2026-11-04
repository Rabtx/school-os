import { Image, Text, View } from "react-native";
import { resolveMediaUrl } from "@/lib/media-url";
import { useAuth } from "@/modules/auth";

export function OSHeader() {
	const { user } = useAuth();

	const avatarUri =
		resolveMediaUrl(user?.profile?.avatarUrl?.trim()) ||
		(user
			? `https://avatar.vercel.sh/${encodeURIComponent(user.username)}`
			: "https://avatar.vercel.sh/guest");

	return (
		<View className="flex-row items-center gap-3 px-4 py-3">
			<Image source={{ uri: avatarUri }} className="h-9 w-9 rounded-full bg-zinc-900" />
			<View>
				<Text className="text-xs font-bold uppercase tracking-[1.5px] text-zinc-500">Account</Text>
				<Text className="text-white text-sm font-bold tracking-wider">Profile</Text>
			</View>
		</View>
	);
}
