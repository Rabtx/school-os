import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, View } from "react-native";
import { AuthAlert } from "@/modules/auth/components/auth-alert";
import { AuthButton } from "@/modules/auth/components/auth-button";
import { AuthField } from "@/modules/auth/components/auth-field";
import { useUpdateUserProfileMutation, useUploadAvatarMutation } from "../hooks/use-user-mutations";
import type { UpdateUserProfileInput, User } from "../types/user.types";
import { AvatarPicker, alertAvatarPermissionDenied } from "./avatar-picker";

interface ProfileFormProps {
	user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
	const update = useUpdateUserProfileMutation();
	const uploadAvatar = useUploadAvatarMutation();
	const [prevUser, setPrevUser] = useState(user);
	const [form, setForm] = useState<UpdateUserProfileInput>(formFromUser(user));
	const [saved, setSaved] = useState(false);

	if (user !== prevUser) {
		setPrevUser(user);
		setForm(formFromUser(user));
	}

	const bioLength = (form.bio ?? "").length;
	const seed = form.username?.trim() || user.username;
	const errorMessage =
		(update.error instanceof Error && update.error.message) ||
		(uploadAvatar.error instanceof Error && uploadAvatar.error.message) ||
		null;

	const pickFromDevice = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			alertAvatarPermissionDenied();
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.85,
		});
		if (result.canceled || !result.assets[0]) return;

		const asset = result.assets[0];
		const mime = asset.mimeType ?? "image/jpeg";
		if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
			Alert.alert("Unsupported image", "Use a JPEG, PNG, or WebP photo.");
			return;
		}

		uploadAvatar.mutate(
			{
				uri: asset.uri,
				name: asset.fileName ?? `avatar.${mime.split("/")[1] ?? "jpg"}`,
				type: mime,
			},
			{
				onSuccess: (next) => {
					setSaved(true);
					setForm((current) => ({
						...current,
						avatarUrl: next.profile?.avatarUrl ?? null,
					}));
				},
			},
		);
	};

	return (
		<View className="gap-4">
			{errorMessage ? (
				<AuthAlert variant="destructive" title="Could not update profile" message={errorMessage} />
			) : null}
			{saved && (update.isSuccess || uploadAvatar.isSuccess) ? (
				<AuthAlert
					title="Profile updated"
					message="Your changes are now active across School OS."
				/>
			) : null}

			<AuthField
				label="Display name"
				value={form.displayName ?? ""}
				onChangeText={(displayName) =>
					setForm((current) => ({ ...current, displayName: displayName || null }))
				}
				placeholder="How your name appears"
				autoCapitalize="words"
				autoComplete="name"
				maxLength={100}
			/>
			<AuthField
				label="Username"
				value={form.username ?? ""}
				onChangeText={(username) => setForm((current) => ({ ...current, username }))}
				placeholder="your.handle"
				autoComplete="username"
				hint="Lowercase letters, numbers, dots, underscores, hyphens."
				maxLength={64}
			/>
			<AuthField
				label="Bio"
				value={form.bio ?? ""}
				onChangeText={(bio) => setForm((current) => ({ ...current, bio: bio || null }))}
				placeholder="A short introduction"
				autoCapitalize="sentences"
				multiline
				numberOfLines={4}
				maxLength={280}
				hint={`${bioLength}/280 characters`}
			/>

			<AvatarPicker
				seed={seed}
				value={form.avatarUrl}
				pending={update.isPending}
				uploading={uploadAvatar.isPending}
				onSelectTemplate={(url) => setForm((current) => ({ ...current, avatarUrl: url }))}
				onPickFromDevice={() => {
					void pickFromDevice();
				}}
			/>

			<View className="flex-row gap-3">
				<View className="flex-1">
					<AuthField
						label="Timezone"
						value={form.timezone ?? ""}
						onChangeText={(timezone) =>
							setForm((current) => ({ ...current, timezone: timezone || null }))
						}
						placeholder="America/Los_Angeles"
						maxLength={64}
					/>
				</View>
				<View className="flex-1">
					<AuthField
						label="Locale"
						value={form.locale ?? ""}
						onChangeText={(locale) =>
							setForm((current) => ({ ...current, locale: locale || null }))
						}
						placeholder="en-US"
						maxLength={16}
					/>
				</View>
			</View>

			<AuthButton
				label={update.isPending ? "Saving…" : "Save profile"}
				pending={update.isPending}
				disabled={uploadAvatar.isPending}
				onPress={() => {
					setSaved(true);
					update.mutate(normalizeProfileInput(form));
				}}
			/>
		</View>
	);
}

function formFromUser(user: User): UpdateUserProfileInput {
	return {
		username: user.username,
		displayName: user.profile?.displayName ?? null,
		avatarUrl: user.profile?.avatarUrl ?? null,
		bio: user.profile?.bio ?? null,
		timezone: user.profile?.timezone ?? null,
		locale: user.profile?.locale ?? null,
	};
}

function normalizeProfileInput(input: UpdateUserProfileInput): UpdateUserProfileInput {
	return {
		username: input.username?.trim().toLowerCase(),
		displayName: emptyToNull(input.displayName),
		avatarUrl: emptyToNull(input.avatarUrl),
		bio: emptyToNull(input.bio),
		timezone: emptyToNull(input.timezone),
		locale: emptyToNull(input.locale),
	};
}

function emptyToNull(value: string | null | undefined): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}
