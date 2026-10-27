import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
	title: string;
	icon: IconSvgElement;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
};

/** Figma dashboard card: icon chip and 14px title, then content. */
export function DashboardCard({ title, icon, actions, children, className }: Props) {
	return (
		<section
			className={cn(
				"flex min-w-0 flex-col rounded-[12px] border border-dashboard-border bg-dashboard-surface tracking-[-0.15px]",
				className,
			)}
		>
			<header className="flex items-center gap-2.5 px-4 pt-3.5 pb-3">
				<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-dashboard-hover text-dashboard-text-secondary">
					<HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
				</span>
				<h2 className="min-w-0 flex-1 truncate font-medium text-[14px] text-dashboard-text-primary leading-5">
					{title}
				</h2>
				{actions}
			</header>
			{children}
		</section>
	);
}

/** Small uppercase label used above values inside dashboard cards. */
export function CardLabel({ children }: { children: ReactNode }) {
	return (
		<span className="text-[12px] text-dashboard-text-dim uppercase leading-4">{children}</span>
	);
}
