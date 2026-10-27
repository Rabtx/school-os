"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ListPageTab = { label: string; href: string; active?: boolean };

type Props = {
	/** Page name for assistive tech; the active tab carries it visually. */
	title: string;
	tabs?: ListPageTab[];
	/** Filter and action row under the tabs. */
	toolbar?: ReactNode;
	/** Messages shown above the table (success, errors). */
	banner?: ReactNode;
	/** Footer bar pinned under the table. */
	footer?: ReactNode;
	children: ReactNode;
};

/**
 * Figma list layout (Students `76:56771`): tabs, a filter toolbar, an edge-to-edge table that
 * scrolls under a sticky header, and a stats footer pinned to the bottom of the page.
 */
export function ListPage({ title, tabs, toolbar, banner, footer, children }: Props) {
	return (
		<div className="flex h-full min-h-0 flex-col tracking-[-0.15px]">
			<h1 className="sr-only">{title}</h1>
			{tabs?.length ? (
				<nav
					aria-label={`${title} sections`}
					className="flex h-11 shrink-0 items-end gap-4 overflow-x-auto border-dashboard-border border-b px-4 sm:px-6"
				>
					{tabs.map((tab) => (
						<Link
							key={tab.href}
							href={tab.href}
							aria-current={tab.active ? "page" : undefined}
							className={cn(
								"-mb-px flex h-9 shrink-0 items-center border-b-2 text-[13px] transition-colors",
								tab.active
									? "border-[var(--rx-accent)] font-medium text-[var(--rx-accent)]"
									: "border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary",
							)}
						>
							{tab.label}
						</Link>
					))}
				</nav>
			) : null}
			{toolbar ? <div className="shrink-0 border-dashboard-border border-b">{toolbar}</div> : null}
			{banner ? <div className="shrink-0 px-4 pt-3 sm:px-6">{banner}</div> : null}
			<div className="min-h-0 flex-1 overflow-auto">{children}</div>
			{footer ? <div className="shrink-0 border-dashboard-border border-t">{footer}</div> : null}
		</div>
	);
}
