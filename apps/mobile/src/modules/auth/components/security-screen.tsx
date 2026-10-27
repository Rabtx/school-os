import {
	CheckCircle2,
	Fingerprint,
	KeyRound,
	Lock,
	Monitor,
	Shield,
	ShieldOff,
	Smartphone,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NeonCard } from "@/components/ui/neon-card";
import { OSHeader } from "@/components/ui/os-header";
import { useAuth } from "@/modules/auth";
import { AccountTabs } from "@/modules/auth/components/account-tabs";
import { AuthAlert } from "@/modules/auth/components/auth-alert";
import { AuthButton } from "@/modules/auth/components/auth-button";
import { AuthField } from "@/modules/auth/components/auth-field";
import {
	useBeginTotpSetupMutation,
	useChangePasswordMutation,
	useConfirmTotpSetupMutation,
	useDeletePasskeyMutation,
	useDisableTotpMutation,
	useRegisterPasskeyMutation,
	useRevokeSessionMutation,
} from "@/modules/auth/hooks/use-auth-mutations";
import { useSecurityStatusQuery, useSessionsQuery } from "@/modules/auth/hooks/use-auth-queries";

export function SecurityScreen() {
	const { user, logout, logoutAll } = useAuth();
	const sessions = useSessionsQuery();
	const security = useSecurityStatusQuery();
	const changePassword = useChangePasswordMutation();
	const revoke = useRevokeSessionMutation();
	const beginTotp = useBeginTotpSetupMutation();
	const confirmTotp = useConfirmTotpSetupMutation();
	const disableTotp = useDisableTotpMutation();
	const registerPasskey = useRegisterPasskeyMutation();
	const deletePasskey = useDeletePasskeyMutation();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [totpCode, setTotpCode] = useState("");
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const [passkeyName, setPasskeyName] = useState("This device");
	const [passwordSaved, setPasswordSaved] = useState(false);

	if (!user) return null;

	const error = [
		sessions.error,
		security.error,
		changePassword.error,
		revoke.error,
		beginTotp.error,
		confirmTotp.error,
		disableTotp.error,
		registerPasskey.error,
		deletePasskey.error,
	].find((value) => value instanceof Error);

	const passkeys = security.data?.passkeys ?? [];
	const totpEnabled = security.data?.mfa.totpEnabled ?? false;
	const googleLinked = security.data?.social.googleLinked ?? false;
	const protectionCount = [
		user.emailVerified,
		user.hasPassword,
		totpEnabled,
		passkeys.length > 0,
	].filter(Boolean).length;

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

	const confirmRevoke = (sessionId: string, isCurrent: boolean) => {
		Alert.alert(
			isCurrent ? "Revoke this device?" : "Revoke session?",
			isCurrent
				? "You will be signed out on this device."
				: "That device will need to sign in again.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Revoke",
					style: "destructive",
					onPress: () => {
						revoke.mutate(sessionId, {
							onSuccess: async () => {
								if (isCurrent) await logout();
							},
						});
					},
				},
			],
		);
	};

	const confirmDeletePasskey = (passkeyId: string, name: string) => {
		Alert.alert("Remove passkey", `Remove “${name}”?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: () => deletePasskey.mutate(passkeyId),
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
							<Text className="text-zinc-100 text-[32px] font-light">Security</Text>
							<Text className="text-zinc-400 text-sm mt-1 leading-5">
								Manage sign-in methods, recovery options, and devices with access.
							</Text>
						</View>

						<AccountTabs active="security" />

						{error ? (
							<AuthAlert
								variant="destructive"
								title="Something went wrong"
								message={error.message}
							/>
						) : null}

						<View className="flex-row flex-wrap gap-2">
							<OverviewChip
								label="Email"
								value={user.emailVerified ? "Verified" : "Needs verification"}
								active={user.emailVerified}
							/>
							<OverviewChip
								label="Password"
								value={user.hasPassword ? "Configured" : "Not configured"}
								active={user.hasPassword}
							/>
							<OverviewChip
								label="Two-factor"
								value={totpEnabled ? "Enabled" : "Not enabled"}
								active={totpEnabled}
							/>
							<OverviewChip
								label="Passkeys"
								value={passkeys.length === 1 ? "1 registered" : `${passkeys.length} registered`}
								active={passkeys.length > 0}
							/>
						</View>

						<Text className="text-zinc-500 text-xs -mt-3 px-1">
							{protectionCount} of 4 protections active
							{googleLinked ? " · Google linked" : ""}
						</Text>

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
								TWO-FACTOR AUTHENTICATION
							</Text>
							<NeonCard>
								<View className="gap-[14px]">
									<Text className="text-zinc-400 text-[13px] leading-[18px]">
										Require an authenticator code after password sign-in.
									</Text>
									{security.isLoading ? (
										<ActivityIndicator color="#14b8a6" />
									) : totpEnabled ? (
										<>
											<View className="flex-row items-center gap-2">
												<CheckCircle2 size={16} color="#14b8a6" strokeWidth={2} />
												<Text className="flex-1 text-zinc-100 text-[13px] font-medium">
													Authenticator active · {security.data?.mfa.recoveryCodesRemaining ?? 0}{" "}
													recovery codes left
												</Text>
											</View>
											<AuthField
												label="Authenticator or recovery code"
												value={totpCode}
												onChangeText={setTotpCode}
												placeholder="123456"
												keyboardType="number-pad"
												autoComplete="one-time-code"
												maxLength={32}
											/>
											<AuthButton
												label={disableTotp.isPending ? "Disabling…" : "Disable 2FA"}
												variant="outline"
												pending={disableTotp.isPending}
												disabled={!totpCode.trim()}
												onPress={() => {
													disableTotp.mutate(totpCode, {
														onSuccess: () => setTotpCode(""),
													});
												}}
											/>
										</>
									) : beginTotp.data ? (
										<>
											<Image
												source={{ uri: beginTotp.data.qrCodeDataUrl }}
												className="w-40 h-40 self-center rounded-xl bg-white"
											/>
											<Text className="text-zinc-400 text-[13px] leading-[18px]">
												Scan the QR code, then enter the six-digit code from your authenticator.
											</Text>
											<Text className="text-zinc-400 text-[11px] font-mono" selectable>
												{beginTotp.data.secret}
											</Text>
											<AuthField
												label="Six-digit code"
												value={totpCode}
												onChangeText={setTotpCode}
												placeholder="123456"
												keyboardType="number-pad"
												autoComplete="one-time-code"
												maxLength={6}
											/>
											<AuthButton
												label={confirmTotp.isPending ? "Confirming…" : "Confirm 2FA"}
												pending={confirmTotp.isPending}
												disabled={totpCode.trim().length !== 6}
												onPress={() => {
													confirmTotp.mutate(totpCode, {
														onSuccess: (result) => {
															setRecoveryCodes(result.recoveryCodes);
															setTotpCode("");
														},
													});
												}}
											/>
										</>
									) : (
										<AuthButton
											label={beginTotp.isPending ? "Starting…" : "Set up authenticator"}
											pending={beginTotp.isPending}
											onPress={() => beginTotp.mutate()}
										/>
									)}
									{recoveryCodes.length > 0 ? (
										<View className="gap-1.5 p-3 rounded-xl border border-teal-500/35 bg-teal-500/10">
											<Text className="text-teal-500 text-[13px] font-bold mb-1">
												Save these recovery codes now
											</Text>
											{recoveryCodes.map((code) => (
												<Text key={code} className="text-zinc-100 text-xs font-mono" selectable>
													{code}
												</Text>
											))}
										</View>
									) : null}
								</View>
							</NeonCard>
						</View>

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
								PASSKEYS
							</Text>
							<NeonCard>
								<View className="gap-[14px]">
									<Text className="text-zinc-400 text-[13px] leading-[18px]">
										Use biometrics, a device PIN, or a physical security key. Requires a development
										build (not Expo Go).
									</Text>
									{passkeys.length === 0 ? (
										<Text className="text-zinc-500 text-[13px] text-center py-2">
											No passkeys registered
										</Text>
									) : (
										passkeys.map((passkey) => (
											<View
												key={passkey.id}
												className="flex-row items-center gap-2.5 py-2.5 border-b border-white/5"
											>
												<View className="w-8 h-8 rounded-xl items-center justify-center bg-white/5">
													<KeyRound size={16} color="#a1a1aa" strokeWidth={1.8} />
												</View>
												<View className="flex-1 gap-0.5">
													<Text className="text-zinc-100 text-[13px] font-semibold">
														{passkey.name}
													</Text>
													<Text className="text-zinc-500 text-[11px]">
														{passkey.deviceType}
														{passkey.backedUp ? " · synced" : ""}
													</Text>
												</View>
												<Pressable
													onPress={() => confirmDeletePasskey(passkey.id, passkey.name)}
													hitSlop={8}
												>
													<Text className="text-red-500 text-[13px] font-semibold">Remove</Text>
												</Pressable>
											</View>
										))
									)}
									<AuthField
										label="Device name"
										value={passkeyName}
										onChangeText={setPasskeyName}
										placeholder="This device"
										maxLength={64}
									/>
									<AuthButton
										label={registerPasskey.isPending ? "Adding…" : "Add passkey"}
										pending={registerPasskey.isPending}
										disabled={!passkeyName.trim()}
										onPress={() => registerPasskey.mutate(passkeyName.trim())}
									/>
								</View>
							</NeonCard>
						</View>

						{user.hasPassword ? (
							<View className="gap-3">
								<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
									CHANGE PASSWORD
								</Text>
								<NeonCard>
									<View className="gap-[14px]">
										<Text className="text-zinc-400 text-[13px] leading-[18px]">
											Changing it signs out every other active session.
										</Text>
										{passwordSaved && changePassword.isSuccess ? (
											<AuthAlert
												title="Password updated"
												message="Use your new password next time."
											/>
										) : null}
										<AuthField
											label="Current password"
											value={currentPassword}
											onChangeText={setCurrentPassword}
											secureTextEntry={!showCurrent}
											showPasswordToggle
											onTogglePassword={() => setShowCurrent((v) => !v)}
											autoComplete="password"
										/>
										<AuthField
											label="New password"
											value={newPassword}
											onChangeText={setNewPassword}
											secureTextEntry={!showNew}
											showPasswordToggle
											onTogglePassword={() => setShowNew((v) => !v)}
											autoComplete="new-password"
											hint="Use at least 12 characters."
										/>
										<AuthButton
											label={changePassword.isPending ? "Updating…" : "Change password"}
											pending={changePassword.isPending}
											disabled={currentPassword.length === 0 || newPassword.length < 12}
											onPress={() => {
												setPasswordSaved(true);
												changePassword.mutate(
													{ currentPassword, newPassword },
													{
														onSuccess: () => {
															setCurrentPassword("");
															setNewPassword("");
														},
													},
												);
											}}
										/>
									</View>
								</NeonCard>
							</View>
						) : null}

						<View className="gap-3">
							<Text className="text-zinc-400 text-xs font-bold tracking-[1.5px] px-1">
								ACTIVE SESSIONS
							</Text>
							<NeonCard>
								<View className="gap-[14px]">
									{sessions.isLoading ? (
										<ActivityIndicator color="#14b8a6" />
									) : sessions.data?.length ? (
										sessions.data.map((session) => (
											<View
												key={session.id}
												className="flex-row items-center gap-2.5 py-2.5 border-b border-white/5"
											>
												<View className="w-8 h-8 rounded-xl items-center justify-center bg-white/5">
													<Monitor size={16} color="#a1a1aa" strokeWidth={1.8} />
												</View>
												<View className="flex-1 gap-0.5">
													<Text
														className="text-zinc-100 text-[13px] font-semibold"
														numberOfLines={2}
													>
														{session.userAgent ?? "Unknown device"}
													</Text>
													<Text className="text-zinc-500 text-[11px]">
														{session.ipAddress ?? "Unknown IP"} ·{" "}
														{new Date(session.lastUsedAt).toLocaleString()}
														{session.isCurrent ? " · Current" : ""}
													</Text>
												</View>
												<Pressable
													onPress={() => confirmRevoke(session.id, session.isCurrent)}
													hitSlop={8}
												>
													<Text className="text-red-500 text-[13px] font-semibold">Revoke</Text>
												</Pressable>
											</View>
										))
									) : (
										<Text className="text-zinc-500 text-[13px] text-center py-2">
											No active sessions found.
										</Text>
									)}
									<Pressable
										className="flex-row items-center justify-center gap-2 min-h-[48px] rounded-2xl border border-red-500/35 bg-red-500/10 mt-1 active:opacity-85"
										onPress={confirmLogoutAll}
									>
										<ShieldOff size={16} color="#ef4444" strokeWidth={1.8} />
										<Text className="text-red-500 text-[15px] font-bold">Sign out everywhere</Text>
									</Pressable>
								</View>
							</NeonCard>
						</View>

						<View className="flex-row items-start gap-2 px-1">
							<Smartphone size={14} color="#a1a1aa" strokeWidth={1.8} />
							<Text className="flex-1 text-zinc-500 text-xs leading-4">
								Google account linking is available on the web account settings for now.
							</Text>
						</View>
					</View>
				</ScrollView>
			</SafeAreaView>
		</View>
	);
}

function OverviewChip({ label, value, active }: { label: string; value: string; active: boolean }) {
	return (
		<View className="w-[48%] flex-grow gap-1.5 p-3 rounded-2xl border border-zinc-800 bg-white/5">
			<View className="w-7 h-7 rounded-lg items-center justify-center bg-white/5">
				{label === "Two-factor" ? (
					<Shield size={14} color="#a1a1aa" strokeWidth={1.8} />
				) : label === "Passkeys" ? (
					<Fingerprint size={14} color="#a1a1aa" strokeWidth={1.8} />
				) : (
					<Lock size={14} color="#a1a1aa" strokeWidth={1.8} />
				)}
			</View>
			<Text className="text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.4px]">
				{label}
			</Text>
			<View className="flex-row items-center gap-1.5">
				<View className={`w-1.5 h-1.5 rounded-full ${active ? "bg-teal-500" : "bg-zinc-500"}`} />
				<Text className="flex-1 text-zinc-100 text-[13px] font-semibold" numberOfLines={1}>
					{value}
				</Text>
			</View>
		</View>
	);
}
