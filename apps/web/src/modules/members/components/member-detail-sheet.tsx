"use client";

import { Mail01Icon, UserEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { SelectField } from "@school-os/ui/components/select-field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@school-os/ui/components/sheet";
import { Spinner } from "@school-os/ui/components/spinner";
import { useEffect, useState } from "react";
import {
	type MembershipRole,
	membershipRoleDescriptions,
	membershipRoleLabels,
} from "@/modules/tenants";
import type { ActorCapabilities, Member, MemberStatus } from "../types/member.types";
import {
	canManageMember,
	formatInviteExpiry,
	formatJoinedDate,
	memberInitials,
	roleOptionsForMember,
} from "../utils/member-ui.utils";
import { MemberRoleBadge, MemberStatusBadge, MemberVerifiedBadge } from "./member-badges";

type UpdateInput = {
	role?: MembershipRole;
	status?: MemberStatus;
	campusId?: string | null;
};

type Props = {
	member: Member | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	actor: ActorCapabilities | undefined;
	campuses: Array<{ id: string; name: string }>;
	isSelf: boolean;
	onSave: (membershipId: string, input: UpdateInput) => Promise<void>;
	onAddRole?: (
		membershipId: string,
		role: "teacher" | "parent" | "student",
		email: string,
	) => Promise<void>;
	onResendInvite?: (inviteId: string, email: string) => Promise<void>;
	pending?: boolean;
};

export function MemberDetailSheet({
	member,
	open,
	onOpenChange,
	actor,
	campuses,
	isSelf,
	onSave,
	onAddRole,
	onResendInvite,
	pending,
}: Props) {
	const [role, setRole] = useState<MembershipRole>("teacher");
	const [status, setStatus] = useState<MemberStatus>("active");
	const [campusId, setCampusId] = useState("");
	const [secondaryRole, setSecondaryRole] = useState<"teacher" | "parent" | "student">("parent");

	useEffect(() => {
		if (!member) return;
		setRole(member.role);
		setStatus(member.status);
		setCampusId(member.campusId ?? "");
		const roles = member.roles?.length ? member.roles : [member.role];
		const available = (["teacher", "parent", "student"] as const).find(
			(option) => !roles.includes(option),
		);
		if (available) setSecondaryRole(available);
	}, [member]);

	if (!member) return null;

	const manageable = actor ? canManageMember(actor, member) : false;
	const roleOptions = actor ? roleOptionsForMember(actor, member) : [member.role];
	const dirty =
		role !== member.role || status !== member.status || (campusId || null) !== member.campusId;
	const memberRoles = member.roles?.length ? member.roles : [member.role];
	const addableRoles = (["teacher", "parent", "student"] as const).filter(
		(option) => !memberRoles.includes(option),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader className="border-dashboard-border border-b pb-4">
					<div className="flex items-start gap-3 pe-8">
						<span
							aria-hidden
							className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-dashboard-surface-strong font-semibold text-[13px] text-dashboard-text-secondary ring-1 ring-dashboard-border"
						>
							{memberInitials(member)}
						</span>
						<div className="min-w-0">
							<SheetTitle className="truncate text-dashboard-text-primary">
								{member.username}
							</SheetTitle>
							<SheetDescription className="truncate">{member.email}</SheetDescription>
							<div className="mt-2 flex flex-wrap gap-1.5">
								<MemberRoleBadge role={member.role} />
								{memberRoles
									.filter((item) => item !== member.role)
									.map((item) => (
										<MemberRoleBadge key={item} role={item} />
									))}
								<MemberStatusBadge status={member.status} />
								<MemberVerifiedBadge verified={member.emailVerified} />
							</div>
						</div>
					</div>
				</SheetHeader>

				<div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
					<dl className="grid grid-cols-2 gap-3 text-[12px]">
						<div>
							<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
								Joined
							</dt>
							<dd className="mt-0.5 font-medium text-dashboard-text-secondary tabular-nums">
								{formatJoinedDate(member.createdAt)}
							</dd>
						</div>
						<div>
							<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
								Campus
							</dt>
							<dd className="mt-0.5 font-medium text-dashboard-text-secondary">
								{member.campusName ?? "All campuses"}
							</dd>
						</div>
						{member.inviteExpiresAt ? (
							<div className="col-span-2">
								<dt className="text-[10.5px] text-dashboard-text-dim uppercase tracking-[0.05em]">
									Invite
								</dt>
								<dd className="mt-0.5 text-dashboard-text-secondary">
									{formatInviteExpiry(member.inviteExpiresAt)}
								</dd>
							</div>
						) : null}
					</dl>

					{isSelf ? (
						<p className="rounded-lg border border-dashboard-border bg-dashboard-surface-elevated px-3 py-2.5 text-[12.5px] text-dashboard-text-secondary leading-5">
							You cannot change your own role or status. Ask another owner or principal to update
							your access.
						</p>
					) : manageable && actor?.canManage ? (
						<FieldGroup className="gap-4">
							<Field>
								<FieldLabel htmlFor="member-role">Role</FieldLabel>
								<SelectField
									id="member-role"
									value={role}
									onValueChange={(next) => setRole(next as MembershipRole)}
									disabled={pending}
									items={roleOptions.map((option) => ({
										label: membershipRoleLabels[option],
										value: option,
									}))}
								/>
								<p className="text-[11.5px] text-dashboard-text-dim leading-4">
									{membershipRoleDescriptions[role]}
								</p>
							</Field>
							<Field>
								<FieldLabel htmlFor="member-campus">Campus</FieldLabel>
								<SelectField
									id="member-campus"
									value={campusId}
									onValueChange={setCampusId}
									disabled={pending}
									nullable
									placeholder="All campuses"
									items={campuses.map((campus) => ({
										label: campus.name,
										value: campus.id,
									}))}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="member-status">Access status</FieldLabel>
								<SelectField
									id="member-status"
									value={status}
									onValueChange={(next) => setStatus(next as MemberStatus)}
									disabled={pending}
									items={[
										{ label: "Active", value: "active" },
										{ label: "Invited", value: "invited" },
										{ label: "Suspended", value: "suspended" },
									]}
								/>
								{status === "suspended" ? (
									<p className="text-[11.5px] text-amber-700 dark:text-amber-300">
										They will lose access immediately until reactivated.
									</p>
								) : null}
							</Field>
						</FieldGroup>
					) : (
						<p className="text-[12.5px] text-dashboard-text-muted leading-5">
							You can view this member but cannot change their role. Your role limits management to
							lower tiers.
						</p>
					)}

					{!isSelf && manageable && actor?.canManage && onAddRole && addableRoles.length > 0 ? (
						<div className="rounded-lg border border-dashboard-border bg-dashboard-surface-elevated p-3">
							<p className="mb-2 font-medium text-[13px] text-dashboard-text-primary">
								Additional access
							</p>
							<p className="mb-3 text-[12px] text-dashboard-text-muted leading-5">
								Add a secondary role when someone is both a teacher and a parent, or needs extra
								portal access without changing their primary role.
							</p>
							<FieldGroup className="gap-3">
								<Field>
									<FieldLabel htmlFor="secondary-role">Secondary role</FieldLabel>
									<SelectField
										id="secondary-role"
										value={secondaryRole}
										onValueChange={(next) =>
											setSecondaryRole(next as "teacher" | "parent" | "student")
										}
										disabled={pending}
										items={addableRoles.map((option) => ({
											label: membershipRoleLabels[option],
											value: option,
										}))}
									/>
								</Field>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={pending}
									onClick={() =>
										void onAddRole(member.id, secondaryRole, member.email).then(() =>
											onOpenChange(false),
										)
									}
								>
									Add {membershipRoleLabels[secondaryRole]} role
								</Button>
							</FieldGroup>
						</div>
					) : null}
				</div>

				<SheetFooter className="flex-row gap-2 border-dashboard-border border-t px-4 py-3">
					{member.pendingInviteId && onResendInvite ? (
						<Button
							type="button"
							variant="outline"
							disabled={pending}
							className="gap-1.5"
							onClick={() => void onResendInvite(member.pendingInviteId as string, member.email)}
						>
							<HugeiconsIcon icon={Mail01Icon} size={15} strokeWidth={2} />
							Resend invite
						</Button>
					) : null}
					{!isSelf && manageable && actor?.canManage ? (
						<Button
							type="button"
							disabled={pending || !dirty}
							className="ms-auto gap-1.5"
							onClick={() =>
								void onSave(member.id, {
									role,
									status,
									campusId: campusId || null,
								}).then(() => onOpenChange(false))
							}
						>
							{pending ? (
								<Spinner className="size-4" />
							) : (
								<HugeiconsIcon icon={UserEdit01Icon} size={15} strokeWidth={2} />
							)}
							Save changes
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							className="ms-auto"
							onClick={() => onOpenChange(false)}
						>
							Close
						</Button>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
