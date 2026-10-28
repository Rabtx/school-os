"use client";

import { Mail01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { useConfirm } from "@/components/states";
import { cn } from "@/lib/utils";
import type { PendingInvite } from "../types/member.types";
import { formatInviteExpiry, isExpiringSoon, memberInitials } from "../utils/member-ui.utils";
import { MemberRoleBadge } from "./member-badges";

type Props = {
	invites: PendingInvite[];
	canInvite: boolean;
	onResend: (inviteId: string, email: string) => void;
	onRevoke: (inviteId: string, email: string) => void;
	pending?: boolean;
	className?: string;
};

export function PendingInvitesSection({
	invites,
	canInvite,
	onResend,
	onRevoke,
	pending,
	className,
}: Props) {
	const confirm = useConfirm();
	if (invites.length === 0) return null;

	return (
		<section
			className={cn(
				"overflow-hidden rounded-[14px] border border-dashboard-border bg-dashboard-surface",
				className,
			)}
		>
			<div className="border-dashboard-border border-b px-3 py-3 sm:px-4 sm:py-3.5">
				<div className="flex items-center gap-2">
					<HugeiconsIcon
						icon={Mail01Icon}
						size={16}
						strokeWidth={2}
						className="text-dashboard-accent"
					/>
					<h2 className="font-medium text-[11px] text-dashboard-text-muted uppercase tracking-[0.06em]">
						Email-only invites
					</h2>
				</div>
				<p className="mt-1 text-[12.5px] text-dashboard-text-secondary">
					{invites.length} waiting for account creation · links expire in 7 days
				</p>
			</div>
			<ul className="divide-y divide-dashboard-border-subtle">
				{invites.map((invite) => (
					<li
						key={invite.id}
						className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
					>
						<div className="flex min-w-0 items-center gap-3">
							<span
								aria-hidden
								className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dashboard-surface-strong font-semibold text-[11px] text-dashboard-text-secondary ring-1 ring-dashboard-border"
							>
								{memberInitials({
									username: invite.email.split("@")[0] ?? "?",
									email: invite.email,
								})}
							</span>
							<div className="min-w-0">
								<div className="truncate font-medium text-[13px] text-dashboard-text-primary">
									{invite.email}
								</div>
								<div className="mt-1 flex flex-wrap items-center gap-2">
									<MemberRoleBadge role={invite.role} />
									{invite.campusName ? (
										<span className="text-[11.5px] text-dashboard-text-dim">
											{invite.campusName}
										</span>
									) : null}
									<span
										className={cn(
											"text-[11px] tabular-nums",
											isExpiringSoon(invite.expiresAt)
												? "text-amber-700 dark:text-amber-300"
												: "text-dashboard-text-dim",
										)}
									>
										{formatInviteExpiry(invite.expiresAt)}
									</span>
								</div>
							</div>
						</div>
						{canInvite ? (
							<div className="flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									disabled={pending}
									className="gap-1"
									onClick={() => onResend(invite.id, invite.email)}
								>
									<HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} />
									Resend
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={pending}
									onClick={async () => {
										const confirmed = await confirm({
											title: `Revoke the invite for ${invite.email}?`,
											consequences: [
												{ label: "Their link", value: "Stops working straight away" },
												{ label: "Later", value: "You can send a new invite any time" },
											],
											confirmLabel: "Revoke invite",
										});
										if (confirmed) onRevoke(invite.id, invite.email);
									}}
								>
									Revoke
								</Button>
							</div>
						) : null}
					</li>
				))}
			</ul>
		</section>
	);
}
