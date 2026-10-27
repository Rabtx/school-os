"use client";

import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@school-os/ui/components/sheet";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/modules/dashboard";
import { useTenantContext } from "@/modules/tenants";
import { AdminSidebar } from "./admin-sidebar";
import { BreadcrumbTrail, type Crumb } from "./topbar/breadcrumb-trail";
import { GlobalSearch } from "./topbar/global-search";
import { TopbarActions } from "./topbar/topbar-actions";

type Props = {
	crumbs?: Crumb[];
	className?: string;
};

function crumbsForPath(pathname: string, root: string): Crumb[] {
	if (pathname.startsWith("/admin/members")) {
		return [{ label: root, href: "/admin" }, { label: "Members" }];
	}
	if (pathname.startsWith("/admin/account/profile")) {
		return [
			{ label: root, href: "/admin" },
			{ label: "Account", href: "/admin/account/profile" },
			{ label: "Profile" },
		];
	}
	if (pathname.startsWith("/admin/account/security")) {
		return [
			{ label: root, href: "/admin" },
			{ label: "Account", href: "/admin/account/profile" },
			{ label: "Security" },
		];
	}
	if (pathname.startsWith("/admin/timetable")) {
		return [{ label: root, href: "/admin" }, { label: "Timetable" }];
	}
	const section = pathname.split("/")[2];
	const label = section
		? section.charAt(0).toUpperCase() + section.slice(1).replaceAll("-", " ")
		: "Dashboard";
	return [{ label: root, href: "/admin" }, { label }];
}

export function AdminTopbar({ crumbs, className }: Props) {
	const pathname = usePathname();
	const { activeTenant } = useTenantContext();
	const items = crumbs ?? crumbsForPath(pathname, activeTenant?.name ?? "Dashboard");
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const { dir } = useDashboardI18n();
	const mobileNavSide = dir === "rtl" ? "right" : "left";

	return (
		<header
			className={cn(
				"sticky top-0 z-10 flex h-11 shrink-0 items-center gap-2 border-dashboard-border border-b bg-dashboard-topbar-bg px-3 sm:gap-3 sm:px-5",
				className,
			)}
		>
			<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
				<SheetTrigger
					render={(props) => (
						<button
							type="button"
							{...props}
							aria-label="Open navigation"
							className="flex size-7 shrink-0 items-center justify-center rounded-md text-dashboard-text-dim transition-colors hover:bg-dashboard-hover hover:text-dashboard-text-primary lg:hidden"
						>
							<HugeiconsIcon icon={Menu01Icon} size={16} strokeWidth={1.8} />
						</button>
					)}
				/>
				<SheetContent
					side={mobileNavSide}
					className="w-[min(88vw,280px)] max-w-none gap-0 border-dashboard-border bg-dashboard-sidebar-bg p-0 text-dashboard-text-primary"
				>
					<SheetTitle className="sr-only">Admin navigation</SheetTitle>
					<AdminSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
				</SheetContent>
			</Sheet>

			<BreadcrumbTrail items={items} className="min-w-0 flex-1" />

			<GlobalSearch className="hidden w-[240px] shrink-0 md:flex" />

			<TopbarActions className="shrink-0" />
		</header>
	);
}
