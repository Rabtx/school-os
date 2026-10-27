"use client";

import { Card } from "@school-os/ui/components/card";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
	toolbar?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
};

export function DataTableShell({ toolbar, children, footer, className }: Props) {
	return (
		<Card
			className={cn(
				"gap-0 overflow-hidden rounded-[12px] border-dashboard-border bg-dashboard-surface py-0 shadow-none ring-0",
				className,
			)}
		>
			{toolbar}
			<div>{children}</div>
			{footer}
		</Card>
	);
}
