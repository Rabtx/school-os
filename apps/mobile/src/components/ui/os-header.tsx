import { type Href, router, useSegments } from "expo-router";
import { Bell, Check, ChevronDown, Scan } from "lucide-react-native";
import * as React from "react";
import { Image, Modal, Pressable, Text, TouchableWithoutFeedback, View } from "react-native";
import { resolveMediaUrl } from "@/lib/media-url";
import { useAuth } from "@/modules/auth";

export type OSModule =
	| "Dashboard"
	| "Profile"
	| "Skincare"
	| "Exercise"
	| "Expenses"
	| "Nutrition"
	| "Mindfulness"
	| "Focus"
	| "Library";

function handleAvatarPress() {
	router.replace("/(modules)/(profile)" as Href);
}

export function OSHeader() {
	const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
	const segments = useSegments() as string[];
	const { user } = useAuth();

	const avatarUri =
		resolveMediaUrl(user?.profile?.avatarUrl?.trim()) ||
		(user
			? `https://avatar.vercel.sh/${encodeURIComponent(user.username)}`
			: "https://avatar.vercel.sh/guest");

	const currentModule: OSModule = React.useMemo(() => {
		if (segments.includes("(profile)")) return "Profile";
		if (segments.includes("(skincare)")) return "Skincare";
		if (segments.includes("(exercise)")) return "Exercise";
		if (segments.includes("(expenses)")) return "Expenses";
		if (segments.includes("(nutrition)")) return "Nutrition";
		if (segments.includes("(mindfulness)")) return "Mindfulness";
		if (segments.includes("(focus)")) return "Focus";
		if (segments.includes("(library)")) return "Library";
		return "Dashboard";
	}, [segments]);

	const modules: { label: OSModule; route: Href }[] = [
		{ label: "Dashboard", route: "/(modules)/(dashboard)" },
		{ label: "Profile", route: "/(modules)/(profile)" as Href },
		{ label: "Focus", route: "/(modules)/(focus)" },
		{ label: "Library", route: "/(modules)/(library)" },
		{ label: "Skincare", route: "/(modules)/(skincare)" },
		{ label: "Exercise", route: "/(modules)/(exercise)" },
		{ label: "Expenses", route: "/(modules)/(expenses)" },
		{ label: "Nutrition", route: "/(modules)/(nutrition)" },
		{ label: "Mindfulness", route: "/(modules)/(mindfulness)" },
	];

	const handleSelect = (route: Href) => {
		router.replace(route);
		setIsDropdownOpen(false);
	};

	return (
		<View className="flex-row justify-between items-center px-4 py-3 z-50">
			<View className="flex-row items-center gap-3">
				<Pressable className="relative" onPress={handleAvatarPress}>
					<Image source={{ uri: avatarUri }} className="w-9 h-9 rounded-full bg-zinc-900" />
					<View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
				</Pressable>

				<View className="relative">
					<Pressable
						className="flex-row items-center gap-1 bg-zinc-900 px-3 py-1.5 rounded-full border border-white/5"
						onPress={() => setIsDropdownOpen(true)}
					>
						<Text className="text-white text-sm font-bold tracking-wider">{currentModule}</Text>
						<ChevronDown size={16} color="#a1a1aa" />
					</Pressable>

					<Modal
						visible={isDropdownOpen}
						transparent
						animationType="fade"
						onRequestClose={() => setIsDropdownOpen(false)}
					>
						<TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
							<View className="flex-1 bg-black/40 pt-14 pl-16">
								<View className="w-44 bg-zinc-900 rounded-2xl p-2 border border-white/10 shadow-2xl">
									{modules.map((mod) => (
										<Pressable
											key={mod.label}
											className="flex-row justify-between items-center py-3 px-3 rounded-lg active:bg-zinc-800"
											onPress={() => handleSelect(mod.route)}
										>
											<Text
												className={`text-sm ${
													currentModule === mod.label
														? "text-white font-bold"
														: "text-zinc-400 font-medium"
												}`}
											>
												{mod.label}
											</Text>
											{currentModule === mod.label && (
												<Check size={16} color="#34d399" strokeWidth={3} />
											)}
										</Pressable>
									))}
								</View>
							</View>
						</TouchableWithoutFeedback>
					</Modal>
				</View>
			</View>

			<View className="flex-row items-center gap-4">
				<Pressable className="p-1">
					<Scan size={22} color="#ffffff" strokeWidth={1.5} />
				</Pressable>
				<View className="relative">
					<Pressable className="p-1">
						<Bell size={22} color="#ffffff" strokeWidth={1.5} />
					</Pressable>
					<View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-zinc-950" />
				</View>
			</View>
		</View>
	);
}
