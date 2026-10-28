"use client";

import { TabNav } from "@rabtx/ui/tabs";
import Link from "next/link";
import type { ReactNode } from "react";

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
			{tabs?.length ? <TabNav label={`${title} sections`} items={tabs} linkAs={Link} /> : null}
			{toolbar ? <div className="shrink-0 border-dashboard-border border-b">{toolbar}</div> : null}
			{banner ? <div className="shrink-0 px-4 pt-3 sm:px-6">{banner}</div> : null}
			<div className="min-h-0 flex-1 overflow-auto">{children}</div>
			{footer ? <div className="shrink-0 border-dashboard-border border-t">{footer}</div> : null}
		</div>
	);
}
