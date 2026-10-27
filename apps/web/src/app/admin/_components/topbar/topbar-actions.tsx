"use client";

import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@school-os/ui/components/avatar";
import { Button } from "@school-os/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@school-os/ui/components/tooltip";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useAuth } from "@/context/auth-context";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type IconType = ComponentProps<typeof HugeiconsIcon>["icon"];

type IconBtnProps = {
	icon: IconType;
	label: string;
	dot?: boolean;
	onClick?: () => void;
	className?: string;
};

function IconButton({ icon, label, dot, onClick, className }: IconBtnProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={label}
						onClick={onClick}
						className={cn("relative size-7 text-dashboard-text-dim", className)}
					/>
				}
			>
				<HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} />
				{dot ? (
					<span
						aria-hidden
						className="absolute top-1 end-1 block size-1.5 rounded-full bg-dashboard-accent ring-2 ring-dashboard-bg"
					/>
				) : null}
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

type Props = {
	avatarSrc?: string;
	avatarFallback?: string;
	unreadNotifications?: boolean;
	className?: string;
};

export function TopbarActions({
	avatarSrc,
	avatarFallback,
	unreadNotifications = false,
	className,
}: Props) {
	const { user } = useAuth();
	const initials = avatarFallback ?? (user ? userInitials(user.username) : "?");

	return (
		<div className={cn("flex items-center gap-0.5 sm:gap-1", className)}>
			<IconButton icon={Notification03Icon} label="Notifications" dot={unreadNotifications} />

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
