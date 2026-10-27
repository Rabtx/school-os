"use client";

import { Mail01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
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
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { type MembershipRole, membershipRoleDescriptions } from "@/modules/tenants";
import { MemberRoleBadge } from "./member-badges";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	campuses: Array<{ id: string; name: string }>;
	invitableRoles: Array<Exclude<MembershipRole, "owner">>;
	onSubmit: (input: {
		email: string;
		role: Exclude<MembershipRole, "owner">;
		campusId?: string;
	}) => Promise<void>;
	pending?: boolean;
};

function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function InviteMemberSheet({
	open,
	onOpenChange,
	campuses,
	invitableRoles,
	onSubmit,
	pending,
}: Props) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Exclude<MembershipRole, "owner">>("teacher");
	const [campusId, setCampusId] = useState("");

	const roles = useMemo<Array<Exclude<MembershipRole, "owner">>>(
		() => (invitableRoles.length > 0 ? invitableRoles : ["teacher"]),
		[invitableRoles],
	);

	useEffect(() => {
		if (!open) {
			setEmail("");
			setCampusId("");
		}
	}, [open]);

	useEffect(() => {
		if (roles.length > 0 && !roles.includes(role)) {
			setRole(roles[0] ?? "teacher");
		}
	}, [role, roles]);

	const emailValid = useMemo(() => isValidEmail(email), [email]);
	const canSubmit = emailValid && !pending;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader className="border-dashboard-border border-b pb-4">
					<SheetTitle className="text-dashboard-text-primary">Invite to organization</SheetTitle>
					<SheetDescription>
						They will receive a secure email link. Existing users can accept from their inbox or
						admin banner.
					</SheetDescription>
				</SheetHeader>

				<form
					className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
					onSubmit={(event) => {
						event.preventDefault();
						if (!canSubmit) return;
						void onSubmit({
							email: email.trim(),
							role,
							...(campusId ? { campusId } : {}),
						}).then(() => onOpenChange(false));
					}}
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="invite-email">Work email</FieldLabel>
							<div className="relative">
								<HugeiconsIcon
									icon={Mail01Icon}
									size={16}
									strokeWidth={2}
									className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="invite-email"
									type="email"
									autoComplete="email"
									className="ps-9"
									placeholder="name@school.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>
							{email && !emailValid ? (
								<p className="text-[11.5px] text-destructive">Enter a valid email address.</p>
							) : (
								<p className="text-[11.5px] text-dashboard-text-dim">
									Must match the account they use to sign in.
								</p>
							)}
						</Field>
					</FieldGroup>

					<div className="space-y-2">
						<div className="font-medium text-[11px] text-dashboard-text-muted uppercase tracking-[0.06em]">
							Role
						</div>
						<div className="grid gap-2">
							{roles.map((option) => {
								const selected = role === option;
								return (
									<Button
										key={option}
										type="button"
										variant={selected ? "default" : "outline"}
										onClick={() => setRole(option)}
										className={cn(
											"h-auto w-full flex-col items-start rounded-xl px-3 py-2.5 text-start",
											selected
												? "border-dashboard-accent bg-dashboard-accent-soft/50 ring-1 ring-dashboard-accent/30"
												: "border-dashboard-border bg-dashboard-surface hover:bg-dashboard-surface-hover",
										)}
									>
										<div className="flex items-center justify-between gap-2">
											<MemberRoleBadge role={option} />
											{selected ? (
												<span className="text-[10px] text-dashboard-accent uppercase tracking-wide">
													Selected
												</span>
											) : null}
										</div>
										<p className="mt-1.5 text-[12px] text-dashboard-text-secondary leading-4">
											{membershipRoleDescriptions[option]}
										</p>
									</Button>
								);
							})}
						</div>
					</div>

					<Field>
						<FieldLabel htmlFor="invite-campus">Campus scope</FieldLabel>
						<SelectField
							id="invite-campus"
							value={campusId}
							onValueChange={setCampusId}
							nullable
							placeholder="All campuses · organization-wide"
							items={campuses.map((campus) => ({
								label: `${campus.name} only`,
								value: campus.id,
							}))}
						/>
					</Field>

					<SheetFooter className="mt-auto flex-row gap-2 border-0 px-0 pb-0">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!canSubmit} className="gap-1.5">
							{pending ? (
								<Spinner className="size-4" />
							) : (
								<HugeiconsIcon icon={SentIcon} size={15} strokeWidth={2} />
							)}
							Send invite
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
