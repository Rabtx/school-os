"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
	title: string;
	description?: string;
	icon?: IconSvgElement;
	breadcrumb?: { label: string; href: string } | null;
	actions?: ReactNode;
	loading?: boolean;
	maxWidth?: "5xl" | "6xl" | "7xl";
	children: ReactNode;
	className?: string;
};

export function AdminPageShell({
	title,
	description,
	icon,
	breadcrumb,
	actions,
	loading,
	maxWidth = "6xl",
	children,
	className,
}: Props) {
	const maxWidthClass =
		maxWidth === "7xl" ? "max-w-7xl" : maxWidth === "5xl" ? "max-w-5xl" : "max-w-6xl";

	if (loading) {
		return (
			<div className="flex min-h-[280px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	return (
		<div className={cn("mx-auto w-full px-4 py-5 sm:px-6", maxWidthClass, className)}>
			{breadcrumb ? (
				<nav className="mb-3 text-[13px] text-dashboard-text-secondary">
					<Link href={breadcrumb.href} className="hover:text-dashboard-text-secondary">
						{breadcrumb.label}
					</Link>
					<span className="mx-2 text-dashboard-text-faint">/</span>
					<span className="text-dashboard-text-secondary">{title}</span>
				</nav>
			) : null}

			<header className="mb-4 flex flex-wrap items-end justify-between gap-3">
				<div className="flex min-w-0 items-start gap-2.5 tracking-[-0.15px]">
					{icon ? (
						<div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-dashboard-hover text-dashboard-text-secondary">
							<HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
						</div>
					) : null}
					<div className="min-w-0">
						<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
							{title}
						</h1>
						{description ? (
							<p className="mt-0.5 max-w-2xl text-[14px] text-dashboard-text-dim leading-5">
								{description}
							</p>
						) : null}
					</div>
				</div>
				{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
			</header>

			{children}
		</div>
	);
}
