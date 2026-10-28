"use client";

import {
	CheckmarkCircle02Icon,
	ComputerIcon,
	Delete02Icon,
	FingerPrintAddIcon,
	FingerPrintIcon,
	GoogleIcon,
	Key01Icon,
	Link01Icon,
	LockPasswordIcon,
	Logout02Icon,
	QrCodeIcon,
	SecurityLockIcon,
	SecurityPasswordIcon,
	ShieldKeyIcon,
	SmartPhone01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { Spinner } from "@school-os/ui/components/spinner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ComponentProps, useState } from "react";
import { useConfirm } from "@/components/states";
import { useAuth } from "../context/auth-context";
import {
	useBeginTotpSetupMutation,
	useChangePasswordMutation,
	useConfirmTotpSetupMutation,
	useDeletePasskeyMutation,
	useDisableTotpMutation,
	useLinkGoogleMutation,
	useRegisterPasskeyMutation,
	useRevokeSessionMutation,
} from "../hooks/use-auth-mutations";
import { useSecurityStatusQuery, useSessionsQuery } from "../hooks/use-auth-queries";
import { AccountPageLayout, AccountSection } from "./account-page-layout";
import { GoogleIdentityButton } from "./google-identity-button";

type IconType = ComponentProps<typeof HugeiconsIcon>["icon"];

function SecurityIndicator({
	icon,
	label,
	value,
	active,
}: {
	icon: IconType;
	label: string;
	value: string;
	active: boolean;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3 bg-dashboard-surface p-3.5 sm:p-4">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-dashboard-surface-elevated text-dashboard-text-secondary">
				<HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.8} />
			</div>
			<div className="min-w-0">
				<p className="text-[11px] text-dashboard-text-muted">{label}</p>
				<p className="mt-0.5 flex items-center gap-1.5 truncate font-medium text-[13px] text-dashboard-text-primary">
					<span
						className={
							active
								? "size-1.5 rounded-full bg-emerald-500"
								: "size-1.5 rounded-full bg-dashboard-text-dim"
						}
					/>
					{value}
				</p>
			</div>
		</div>
	);
}

export function AccountSecurity({ basePath = "/admin/account" }: { basePath?: string }) {
	const router = useRouter();
	const { user, loading, logout, logoutAll } = useAuth();
	const confirm = useConfirm();
	const sessions = useSessionsQuery();
	const security = useSecurityStatusQuery();
	const changePassword = useChangePasswordMutation();
	const revoke = useRevokeSessionMutation();
	const beginTotp = useBeginTotpSetupMutation();
	const confirmTotp = useConfirmTotpSetupMutation();
	const disableTotp = useDisableTotpMutation();
	const registerPasskey = useRegisterPasskeyMutation();
	const deletePasskey = useDeletePasskeyMutation();
	const linkGoogle = useLinkGoogleMutation();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [totpCode, setTotpCode] = useState("");
	const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
	const [passkeyName, setPasskeyName] = useState("This device");

	if (loading || !user)
		return (
			<div className="flex min-h-48 items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);

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
		linkGoogle.error,
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

	return (
		<AccountPageLayout
			user={user}
			basePath={basePath}
			eyebrow="Account settings"
			title="Security"
			description="Manage sign-in methods, recovery options, and devices with access to your account."
			status={
				<Badge
					variant="outline"
					className="h-7 border-dashboard-border bg-dashboard-surface px-2.5 text-dashboard-text-secondary"
				>
					<HugeiconsIcon icon={ShieldKeyIcon} className="size-3.5" strokeWidth={1.8} />
					{protectionCount} of 4 protections active
				</Badge>
			}
		>
			{error ? (
				<Alert variant="destructive">
					<AlertTitle>Something went wrong</AlertTitle>
					<AlertDescription>{error.message}</AlertDescription>
				</Alert>
			) : null}

			<section
				className="grid grid-cols-1 gap-px overflow-hidden rounded-[16px] border border-dashboard-border bg-dashboard-border sm:grid-cols-2 xl:grid-cols-4"
				aria-label="Security overview"
			>
				<SecurityIndicator
					icon={CheckmarkCircle02Icon}
					label="Email"
					value={user.emailVerified ? "Verified" : "Needs verification"}
					active={user.emailVerified}
				/>
				<SecurityIndicator
					icon={LockPasswordIcon}
					label="Password"
					value={user.hasPassword ? "Configured" : "Not configured"}
					active={user.hasPassword}
				/>
				<SecurityIndicator
					icon={SecurityPasswordIcon}
					label="Two-factor"
					value={totpEnabled ? "Enabled" : "Not enabled"}
					active={totpEnabled}
				/>
				<SecurityIndicator
					icon={FingerPrintIcon}
					label="Passkeys"
					value={passkeys.length === 1 ? "1 registered" : `${passkeys.length} registered`}
					active={passkeys.length > 0}
				/>
			</section>

			<div className="grid gap-5 xl:grid-cols-2">
				<AccountSection
					title="Two-factor authentication"
					description="Require an authenticator code after password sign-in."
					icon={SecurityPasswordIcon}
					action={
						<Badge variant={totpEnabled ? "secondary" : "outline"}>
							{totpEnabled ? "Enabled" : "Not enabled"}
						</Badge>
					}
				>
					{totpEnabled ? (
						<FieldGroup className="gap-4">
							<div className="flex items-start gap-3 rounded-lg border border-dashboard-border bg-dashboard-surface-elevated p-3">
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="mt-0.5 size-4 shrink-0 text-emerald-500"
									strokeWidth={1.8}
								/>
								<div>
									<p className="font-medium text-[13px]">Authenticator is active</p>
									<p className="mt-0.5 text-[12px] text-dashboard-text-muted">
										{security.data?.mfa.recoveryCodesRemaining ?? 0} recovery codes remaining
									</p>
								</div>
							</div>
							<Field>
								<FieldLabel htmlFor="disable-totp">Authenticator or recovery code</FieldLabel>
								<Input
									id="disable-totp"
									className="h-9"
									value={totpCode}
									onChange={(event) => setTotpCode(event.target.value)}
									autoComplete="one-time-code"
								/>
							</Field>
							<Button
								variant="destructive"
								onClick={() => disableTotp.mutate(totpCode)}
								disabled={!totpCode.trim() || disableTotp.isPending}
								className="w-full sm:w-fit"
							>
								<HugeiconsIcon icon={SecurityLockIcon} data-icon="inline-start" strokeWidth={1.8} />
								Disable 2FA
							</Button>
						</FieldGroup>
					) : beginTotp.data ? (
						<FieldGroup className="gap-4">
							<div className="grid gap-4 sm:grid-cols-[144px_minmax(0,1fr)] sm:items-start">
								<Image
									src={beginTotp.data.qrCodeDataUrl}
									alt="Authenticator QR code"
									width={144}
									height={144}
									unoptimized
									className="size-36 rounded-lg border border-dashboard-border bg-white p-2"
								/>
								<div className="min-w-0">
									<p className="font-medium text-[13px]">Scan the QR code</p>
									<p className="mt-1 text-[12px] text-dashboard-text-muted">
										Then enter the six-digit code from your authenticator.
									</p>
									<code className="mt-3 block break-all rounded-md bg-dashboard-surface-elevated p-2 text-[11px]">
										{beginTotp.data.secret}
									</code>
								</div>
							</div>
							<Field>
								<FieldLabel htmlFor="confirm-totp">Six-digit code</FieldLabel>
								<Input
									id="confirm-totp"
									className="h-9"
									inputMode="numeric"
									autoComplete="one-time-code"
									value={totpCode}
									onChange={(event) => setTotpCode(event.target.value)}
								/>
							</Field>
							<Button
								onClick={() =>
									confirmTotp.mutate(totpCode, {
										onSuccess: (result) => setRecoveryCodes(result.recoveryCodes),
									})
								}
								disabled={totpCode.trim().length !== 6 || confirmTotp.isPending}
								className="w-full sm:w-fit"
							>
								<HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" strokeWidth={1.8} />
								Confirm 2FA
							</Button>
						</FieldGroup>
					) : (
						<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="max-w-sm text-[13px] text-dashboard-text-secondary">
								Use any standards-based authenticator app to generate time-limited codes.
							</p>
							<Button onClick={() => beginTotp.mutate()} disabled={beginTotp.isPending}>
								<HugeiconsIcon icon={SmartPhone01Icon} data-icon="inline-start" strokeWidth={1.8} />
								Set up authenticator
							</Button>
						</div>
					)}
					{recoveryCodes.length > 0 ? (
						<Alert className="mt-4">
							<AlertTitle>Save these recovery codes now</AlertTitle>
							<AlertDescription>
								<div className="mt-2 grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2">
									{recoveryCodes.map((code) => (
										<span key={code}>{code}</span>
									))}
								</div>
							</AlertDescription>
						</Alert>
					) : null}
				</AccountSection>

				<AccountSection
					title="Passkeys"
					description="Use biometrics, a device PIN, or a physical security key."
					icon={FingerPrintIcon}
					action={<Badge variant="outline">{passkeys.length} registered</Badge>}
				>
					<div className="grid gap-4">
						{passkeys.length > 0 ? (
							<div className="divide-y divide-dashboard-border rounded-lg border border-dashboard-border">
								{passkeys.map((passkey) => (
									<div
										key={passkey.id}
										className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
									>
										<div className="flex min-w-0 items-center gap-3">
											<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-dashboard-surface-elevated">
												<HugeiconsIcon icon={Key01Icon} className="size-4" strokeWidth={1.8} />
											</div>
											<div className="min-w-0">
												<p className="truncate font-medium text-[13px]">{passkey.name}</p>
												<p className="text-[12px] text-dashboard-text-muted">
													{passkey.deviceType}
													{passkey.backedUp ? " · synced" : ""}
												</p>
											</div>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={async () => {
												const confirmed = await confirm({
													title: `Remove ${passkey.name}?`,
													subtitle: passkey.deviceType,
													consequences: [
														{
															label: "This device",
															value: "Can no longer sign in with this passkey",
														},
														{
															label: "Other ways in",
															value: "Password, email link and other passkeys still work",
														},
													],
													confirmLabel: "Remove passkey",
												});
												if (confirmed) deletePasskey.mutate(passkey.id);
											}}
											disabled={deletePasskey.isPending}
										>
											<HugeiconsIcon
												icon={Delete02Icon}
												data-icon="inline-start"
												strokeWidth={1.8}
											/>
											Remove
										</Button>
									</div>
								))}
							</div>
						) : (
							<div className="rounded-lg border border-dashboard-border border-dashed p-4 text-center">
								<HugeiconsIcon
									icon={FingerPrintIcon}
									className="mx-auto size-5 text-dashboard-text-muted"
									strokeWidth={1.6}
								/>
								<p className="mt-2 text-[13px] text-dashboard-text-secondary">
									No passkeys registered
								</p>
							</div>
						)}
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								className="h-9"
								value={passkeyName}
								onChange={(event) => setPasskeyName(event.target.value)}
								aria-label="Passkey name"
								placeholder="Device name"
							/>
							<Button
								onClick={() => registerPasskey.mutate(passkeyName.trim())}
								disabled={!passkeyName.trim() || registerPasskey.isPending}
							>
								<HugeiconsIcon
									icon={FingerPrintAddIcon}
									data-icon="inline-start"
									strokeWidth={1.8}
								/>
								Add passkey
							</Button>
						</div>
					</div>
				</AccountSection>

				<AccountSection
					title="Connected accounts"
					description="Use a verified identity provider as an additional sign-in method."
					icon={Link01Icon}
					action={<Badge variant="outline">{googleLinked ? "Connected" : "Not connected"}</Badge>}
				>
					{googleLinked ? (
						<div className="flex items-center gap-3 rounded-lg border border-dashboard-border p-3">
							<div className="flex size-8 items-center justify-center rounded-md bg-dashboard-surface-elevated">
								<HugeiconsIcon icon={GoogleIcon} className="size-4" strokeWidth={1.8} />
							</div>
							<div>
								<p className="font-medium text-[13px]">Google</p>
								<p className="text-[12px] text-dashboard-text-muted">Available for sign-in</p>
							</div>
							<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								className="ml-auto size-4 text-emerald-500"
								strokeWidth={1.8}
							/>
						</div>
					) : (
						<GoogleIdentityButton
							onCredential={(credential) => linkGoogle.mutate(credential)}
							disabled={linkGoogle.isPending}
						/>
					)}
				</AccountSection>

				{user.hasPassword ? (
					<AccountSection
						title="Change password"
						description="Changing it signs out every other active session."
						icon={LockPasswordIcon}
					>
						<form
							onSubmit={(event) => {
								event.preventDefault();
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
						>
							<FieldGroup className="gap-4">
								<Field>
									<FieldLabel htmlFor="current-password">Current password</FieldLabel>
									<Input
										id="current-password"
										type="password"
										className="h-9"
										autoComplete="current-password"
										value={currentPassword}
										onChange={(event) => setCurrentPassword(event.target.value)}
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="new-password">New password</FieldLabel>
									<Input
										id="new-password"
										type="password"
										className="h-9"
										autoComplete="new-password"
										minLength={12}
										value={newPassword}
										onChange={(event) => setNewPassword(event.target.value)}
										required
									/>
									<FieldDescription>Use at least 12 characters.</FieldDescription>
								</Field>
								<Button
									type="submit"
									disabled={changePassword.isPending}
									className="w-full sm:w-fit"
								>
									<HugeiconsIcon
										icon={SecurityLockIcon}
										data-icon="inline-start"
										strokeWidth={1.8}
									/>
									Change password
								</Button>
							</FieldGroup>
						</form>
					</AccountSection>
				) : null}
			</div>

			<AccountSection
				title="Active sessions"
				description="Review devices with access and revoke anything you do not recognize."
				icon={ComputerIcon}
				action={<Badge variant="outline">{sessions.data?.length ?? 0} active</Badge>}
				bodyClassName="p-0 sm:p-0"
			>
				{sessions.isLoading ? (
					<div className="flex min-h-28 items-center justify-center">
						<Spinner className="size-5" />
					</div>
				) : sessions.data?.length ? (
					<div className="divide-y divide-dashboard-border">
						{sessions.data.map((session) => (
							<div
								key={session.id}
								className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
							>
								<div className="flex min-w-0 items-start gap-3">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-dashboard-surface-elevated">
										<HugeiconsIcon icon={ComputerIcon} className="size-4" strokeWidth={1.8} />
									</div>
									<div className="min-w-0">
										<p className="truncate font-medium text-[13px] text-dashboard-text-primary">
											{session.userAgent ?? "Unknown device"}
										</p>
										<p className="mt-0.5 text-[12px] text-dashboard-text-muted">
											{session.ipAddress ?? "Unknown IP"} ·{" "}
											{new Date(session.lastUsedAt).toLocaleString()}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2 sm:shrink-0">
									{session.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
									<Button
										size="sm"
										variant="outline"
										onClick={async () => {
											const confirmed = await confirm({
												title: session.isCurrent
													? "Sign out of this device?"
													: "Sign out that device?",
												subtitle: session.userAgent ?? undefined,
												consequences: [
													{
														label: "That device",
														value: session.isCurrent
															? "You are signed out here right away"
															: "Signed out the next time it does anything",
													},
												],
												confirmLabel: "Sign out device",
											});
											if (!confirmed) return;
											revoke.mutate(session.id, {
												onSuccess: async () => {
													if (session.isCurrent) {
														await logout();
														router.push("/login");
													}
												},
											});
										}}
										disabled={revoke.isPending}
									>
										Revoke
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="px-4 py-8 text-center text-[13px] text-dashboard-text-muted">
						No active sessions found.
					</div>
				)}
				<div className="flex flex-col gap-3 border-dashboard-border border-t bg-dashboard-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
					<p className="text-[12px] text-dashboard-text-muted">
						This will require every device to sign in again.
					</p>
					<Button
						variant="destructive"
						onClick={async () => {
							await logoutAll();
							router.push("/login");
						}}
					>
						<HugeiconsIcon icon={Logout02Icon} data-icon="inline-start" strokeWidth={1.8} />
						Sign out everywhere
					</Button>
				</div>
			</AccountSection>
		</AccountPageLayout>
	);
}
