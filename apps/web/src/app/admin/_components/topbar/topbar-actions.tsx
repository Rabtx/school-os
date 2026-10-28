"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@school-os/ui/components/avatar";
import { Button } from "@school-os/ui/components/button";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./notifications-panel";

type Props = {
	avatarSrc?: string;
	avatarFallback?: string;
	className?: string;
};

export function TopbarActions({ avatarSrc, avatarFallback, className }: Props) {
	const { user } = useAuth();
	const initials = avatarFallback ?? (user ? userInitials(user.username) : "?");

	return (
		<div className={cn("flex items-center gap-0.5 sm:gap-1", className)}>
			<NotificationsPanel />

			<Button
				variant="ghost"
				size="icon"
				className="ms-1 size-7 rounded-full"
				render={<Link href="/admin/account/profile" aria-label="Profile" />}
				nativeButton={false}
			>
				<Avatar className="size-6">
					{avatarSrc ? <AvatarImage src={avatarSrc} alt="Account" /> : null}
					<AvatarFallback className="bg-[color-mix(in_oklab,var(--rx-success)_22%,transparent)] font-medium text-[11px] text-dashboard-text-primary">
						{initials}
					</AvatarFallback>
				</Avatar>
			</Button>
		</div>
	);
}
