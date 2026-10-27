"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { cn } from "@/lib/utils";

type Props = {
	label?: string;
	onClick?: () => void;
	className?: string;
};

export function ExportButton({ label = "Export CSV", onClick, className }: Props) {
	return (
		<Button size="sm" className={cn("h-7 gap-1.5 rounded-full", className)} onClick={onClick}>
			<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" strokeWidth={2.4} />
			<span className="sm:hidden">Export</span>
			<span className="hidden sm:inline">{label}</span>
		</Button>
	);
}
