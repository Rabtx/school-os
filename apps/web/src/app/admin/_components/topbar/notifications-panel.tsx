"use client";

import {
	Mail01Icon,
	Notification03Icon,
	Settings02Icon,
	UserAdd01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@school-os/ui/components/popover";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMembersQuery, usePendingInvitesQuery } from "@/modules/members";
import {
	membershipRoleLabels,
	PermissionCodes,
	usePermissions,
	useTenantContext,
} from "@/modules/tenants";

type Item = { id: string; icon: IconSvgElement; title: string; detail: string; href: string };

/**
 * Figma "Notifications" (`209:101673`) from the bell. It lists what already needs this person:
 * invites waiting for them, and invites they sent that nobody has accepted yet. Leave, gate and
 * AI alerts join when those features land.
 */
export function NotificationsPanel() {
	const [open, setOpen] = useState(false);
	const { activeTenant } = useTenantContext();
	const { can } = usePermissions();
	const myInvites = usePendingInvitesQuery();
	const canReadMembers = can(PermissionCodes.TENANT_MEMBERSHIP_READ);
	const members = useMembersQuery(activeTenant?.id ?? null, canReadMembers);

	const items: Item[] = (myInvites.data?.invites ?? []).map((invite) => ({
		id: `invite-${invite.inviteId}`,
		icon: Mail01Icon,
		title: `Join ${invite.tenantName}`,
		detail: `Invited as ${membershipRoleLabels[invite.role]}`,
		href: "/accept-invite",
	}));
	const sentPending = members.data?.pendingInvites.length ?? 0;
	if (sentPending > 0) {
		items.push({
			id: "sent-invites",
			icon: UserAdd01Icon,
			title: `${sentPending} ${sentPending === 1 ? "invite is" : "invites are"} not accepted yet`,
			detail: "Resend or revoke them in Members & roles",
			href: "/admin/settings/members#invites",
		});
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				aria-label={items.length > 0 ? `Notifications, ${items.length} new` : "Notifications"}
				className="relative flex size-7 items-center justify-center rounded-md text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-primary"
			>
				<HugeiconsIcon icon={Notification03Icon} size={16} strokeWidth={1.8} />
				{items.length > 0 ? (
					<span
						aria-hidden
						className="absolute top-1 end-1 block size-1.5 rounded-full bg-[var(--rx-accent)] ring-2 ring-dashboard-bg"
					/>
				) : null}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[min(400px,calc(100vw-2rem))] gap-0 border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px]"
			>
				<header className="flex items-center px-4 pt-3.5 pb-3">
					<h2 className="font-medium text-[14px] text-dashboard-text-primary">Notifications</h2>
				</header>
				{items.length === 0 ? (
					<div className="border-dashboard-border border-t px-4 py-8 text-center">
						<p className="font-medium text-[14px] text-dashboard-text-primary">
							You are all caught up
						</p>
						<p className="mt-1 text-[13px] text-dashboard-text-dim">
							Invites and anything waiting on you show up here.
						</p>
					</div>
				) : (
					<ul className="border-dashboard-border border-t">
						{items.map((item) => (
							<li key={item.id} className="border-dashboard-border border-b last:border-0">
								<Link
									href={item.href}
									onClick={() => setOpen(false)}
									className={cn(
										"flex items-start gap-3 px-4 py-3 hover:bg-dashboard-hover",
										"bg-[color-mix(in_oklab,var(--rx-accent)_8%,transparent)]",
									)}
								>
									<HugeiconsIcon
										icon={item.icon}
										size={16}
										strokeWidth={1.8}
										className="mt-0.5 shrink-0 text-[var(--rx-accent)]"
									/>
									<span className="min-w-0">
										<span className="block font-medium text-[14px] text-dashboard-text-primary leading-5">
											{item.title}
										</span>
										<span className="block text-[12px] text-dashboard-text-dim leading-4">
											{item.detail}
										</span>
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
				<Link
					href="/admin/settings/communication"
					onClick={() => setOpen(false)}
					className="flex items-center gap-2 border-dashboard-border border-t px-4 py-2.5 text-[13px] text-[var(--rx-accent)] hover:bg-dashboard-hover"
				>
					<HugeiconsIcon icon={Settings02Icon} size={14} strokeWidth={1.8} />
					Notification settings
				</Link>
			</PopoverContent>
		</Popover>
	);
}
