import { Calendar, CheckCircle2, LogOut, Mail, ShieldOff, UserRound } from "lucide-react-native";
import { useEffect } from "react";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeonCard } from "@/components/ui/neon-card";
import { OSHeader } from "@/components/ui/os-header";
import { NeonColors } from "@/constants/design-system";
import { resolveMediaUrl } from "@/lib/media-url";
import { useAuth } from "@/modules/auth";
import { AccountTabs } from "@/modules/auth/components/account-tabs";
import { AuthButton } from "@/modules/auth/components/auth-button";
import { ProfileForm } from "./profile-form";

export function ProfileScreen() {
	const { user, logout, logoutAll, refreshUser } = useAuth();

	useEffect(() => {
		void refreshUser();
	}, [refreshUser]);

	if (!user) return null;

	const displayName = user.profile?.displayName?.trim() || user.username;
	const avatarUri =
		resolveMediaUrl(user.profile?.avatarUrl?.trim()) ||
		`https://avatar.vercel.sh/${encodeURIComponent(user.username)}`;
	const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	const confirmLogout = () => {
		Alert.alert("Sign out", "End this session on this device?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: () => {
					void logout();
				},
			},
		]);
	};

	const confirmLogoutAll = () => {
		Alert.alert("Sign out everywhere", "Revoke all active sessions for this account?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out everywhere",
				style: "destructive",
				onPress: () => {
					void logoutAll();
				},
			},
		]);
	};

	return (
		<View className="flex-1 bg-zinc-950">
			<SafeAreaView edges={["top"]} className="flex-1">
				<OSHeader />
				<ScrollView
					showsVerticalScrollIndicator={false}
					contentContainerClassName="pb-12"
					keyboardShouldPersistTaps="handled"
				>
					<View className="px-4 pt-2 gap-6">
						<View className="gap-1">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px]">ACCOUNT</Text>
							<Text className="text-white text-[32px] font-light">Profile</Text>
							<Text className="text-zinc-400 text-sm mt-1 leading-5">
								Control how your identity appears across your personal OS.
							</Text>
						</View>

						<AccountTabs active="profile" />

						<NeonCard className="mt-0">
							<View className="items-center gap-2">
								<View className="relative mb-2">
									<Image
										source={{ uri: avatarUri }}
										style={{
											width: 88,
											height: 88,
											borderRadius: 44,
											backgroundColor: "#18181b",
											borderWidth: 2,
											borderColor: "rgba(255,255,255,0.08)",
										}}
									/>
									<View className="absolute right-1 bottom-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-zinc-950" />
								</View>
								<Text className="text-white text-2xl font-light">{displayName}</Text>
								<Text className="text-emerald-400 text-sm font-semibold tracking-wide">
									@{user.username}
								</Text>
								{user.profile?.bio ? (
									<Text className="text-zinc-400 text-sm leading-5 text-center mt-1 px-2">
										{user.profile.bio}
									</Text>
								) : null}
								<View className="flex-row flex-wrap justify-center gap-2 mt-3">
									<View
										className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
											user.emailVerified
												? "border-emerald-500/35 bg-emerald-500/10"
												: "border-orange-500/35 bg-orange-500/10"
										}`}
									>
										{user.emailVerified ? (
											<CheckCircle2 size={12} color={NeonColors.accent.green} strokeWidth={2.5} />
										) : (
											<Mail size={12} color={NeonColors.accent.orange} strokeWidth={2} />
										)}
										<Text
											className={`text-xs font-semibold ${
												user.emailVerified ? "text-emerald-400" : "text-orange-400"
											}`}
										>
											{user.emailVerified ? "Email verified" : "Verify email"}
										</Text>
									</View>
									<View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/40">
										<UserRound size={12} color={NeonColors.text.secondary} strokeWidth={2} />
										<Text className="text-zinc-400 text-xs font-semibold">
											{user.isActive ? "Active" : "Inactive"}
										</Text>
									</View>
								</View>
							</View>
						</NeonCard>

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
								PUBLIC PROFILE
							</Text>
							<NeonCard>
								<ProfileForm user={user} />
							</NeonCard>
						</View>

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
								ACCOUNT IDENTITY
							</Text>
							<NeonCard>
								<View className="gap-1">
									<IdentityRow icon={Mail} label="Email" value={user.email} />
									<IdentityRow
										icon={CheckCircle2}
										label="Email status"
										value={user.emailVerified ? "Verified" : "Verification required"}
										accent={user.emailVerified ? NeonColors.accent.green : NeonColors.accent.orange}
									/>
									<IdentityRow icon={Calendar} label="Member since" value={memberSince} last />
								</View>
							</NeonCard>
						</View>

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">SESSION</Text>
							<NeonCard>
								<View className="gap-3">
									<AuthButton label="Sign out" variant="outline" onPress={confirmLogout} />
									<Pressable
										className="flex-row items-center justify-center gap-2 min-h-[48px] rounded-xl border border-red-500/35 bg-red-500/10 active:opacity-80"
										onPress={confirmLogoutAll}
									>
										<ShieldOff size={16} color={NeonColors.accent.red} strokeWidth={1.8} />
										<Text className="text-red-500 text-[15px] font-bold">Sign out everywhere</Text>
									</Pressable>
									<View className="flex-row items-center justify-center gap-1.5 pt-1">
										<LogOut size={14} color={NeonColors.text.muted} strokeWidth={1.8} />
										<Text className="text-zinc-500 text-xs">
											Sign out ends only this device session
										</Text>
									</View>
								</View>
							</NeonCard>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}

function IdentityRow({
	icon: Icon,
	label,
	value,
	accent,
	last = false,
}: {
	icon: typeof Mail;
	label: string;
	value: string;
	accent?: string;
	last?: boolean;
}) {
	return (
		<View
			className={`flex-row items-center gap-3 py-3 ${last ? "" : "border-b border-zinc-800/60"}`}
		>
			<View className="w-9 h-9 rounded-xl items-center justify-center bg-zinc-900/40 border border-zinc-800">
				<Icon size={16} color={accent ?? NeonColors.text.secondary} strokeWidth={1.8} />
			</View>
			<View className="flex-1 gap-0.5">
				<Text className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">
					{label}
				</Text>
				<Text
					className="text-white text-sm font-medium"
					style={accent ? { color: accent } : undefined}
				>
					{value}
				</Text>
			</View>
		</View>
	);
}
