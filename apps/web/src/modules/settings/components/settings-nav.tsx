"use client";

import {
	Building03Icon,
	CheckmarkCircle02Icon,
	CreditCardIcon,
	Message01Icon,
	Settings02Icon,
	UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PermissionCodes, usePermissions } from "@/modules/tenants";

type Item = {
	href: string;
	label: string;
	icon: IconSvgElement;
	permission: (typeof PermissionCodes)[keyof typeof PermissionCodes];
};

const ITEMS: Item[] = [
	{
		href: "/admin/settings/general",
		label: "General",
		icon: Settings02Icon,
		permission: PermissionCodes.TENANT_SETTINGS_READ,
	},
	{
		href: "/admin/settings/campuses",
		label: "Campuses",
		icon: Building03Icon,
		permission: PermissionCodes.TENANT_SETTINGS_READ,
	},
	{
		href: "/admin/settings/members",
		label: "Members & roles",
		icon: UserGroupIcon,
		permission: PermissionCodes.TENANT_MEMBERSHIP_READ,
	},
	{
		href: "/admin/settings/communication",
		label: "Communication",
		icon: Message01Icon,
		permission: PermissionCodes.TENANT_SETTINGS_READ,
	},
	{
		href: "/admin/settings/attendance",
		label: "Attendance rules",
		icon: CheckmarkCircle02Icon,
		permission: PermissionCodes.TENANT_SETTINGS_READ,
	},
	{
		href: "/billing",
		label: "Plan & billing",
		icon: CreditCardIcon,
		permission: PermissionCodes.TENANT_SETTINGS_WRITE,
	},
];

/** Settings sub-navigation, the second column of the Figma settings frames. */
export function SettingsNav() {
	const pathname = usePathname();
	const { can } = usePermissions();
	const items = ITEMS.filter((item) => can(item.permission));

	return (
		<nav aria-label="Settings" className="tracking-[-0.15px]">
			<h2 className="mb-4 font-medium text-[20px] text-dashboard-text-primary leading-7">
				Settings
			</h2>
			<ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
				{items.map((item) => {
					const active = pathname.startsWith(item.href);
					return (
						<li key={item.href} className="shrink-0">
							<Link
								href={item.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex h-8 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] transition-colors",
									active
										? "bg-dashboard-hover-strong font-medium text-dashboard-text-primary"
										: "text-dashboard-text-secondary hover:bg-dashboard-hover hover:text-dashboard-text-primary",
								)}
							>
								<HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.8} />
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
