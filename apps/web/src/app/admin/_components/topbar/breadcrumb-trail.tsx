"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { DashboardForwardIcon } from "@/modules/dashboard";

export type Crumb = { label: string; href?: string };

type Props = {
	items: Crumb[];
	className?: string;
};

export function BreadcrumbTrail({ items, className }: Props) {
	return (
		<nav
			aria-label="Breadcrumb"
			className={cn(
				"flex min-w-0 items-center gap-1.5 overflow-hidden text-[13px] tracking-[-0.15px]",
				className,
			)}
		>
			{items.map((item, idx) => {
				const isLast = idx === items.length - 1;
				const showSeparator = idx > 0;
				// On phones only show the current page; parents clutter the topbar.
				const hideOnMobile = !isLast;
				const key = item.href ?? `${item.label}-${isLast ? "current" : "crumb"}`;
				return (
					<Fragment key={key}>
						{showSeparator && (
							<DashboardForwardIcon
								icon={ArrowRight01Icon}
								size={14}
								strokeWidth={2}
								className={cn("text-dashboard-text-dim", hideOnMobile && "hidden sm:block")}
							/>
						)}
						{item.href && !isLast ? (
							<Link
								href={item.href}
								className={cn(
									"shrink-0 text-dashboard-text-secondary transition-colors hover:text-dashboard-text-primary",
									hideOnMobile && "hidden sm:inline",
								)}
							>
								{item.label}
							</Link>
						) : (
							<span
								className={cn(
									"min-w-0 truncate",
									isLast ? "text-dashboard-text-primary" : "text-dashboard-text-secondary",
									hideOnMobile && "hidden sm:inline",
								)}
							>
								{item.label}
							</span>
						)}
					</Fragment>
				);
			})}
		</nav>
	);
}
