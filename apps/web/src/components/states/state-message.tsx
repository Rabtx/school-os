import { EmptyState } from "@rabtx/ui/empty-state";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The centred message used by the Figma states (`208:93911`): a round mark (a count, "!", an
 * icon), a title, one line of explanation and the actions that get the person unstuck. The look
 * lives in `@rabtx/ui/empty-state`.
 */
export function StateMessage({
	mark,
	title,
	description,
	children,
	className,
	tone = "neutral",
}: {
	mark: ReactNode;
	title: string;
	description?: ReactNode;
	children?: ReactNode;
	className?: string;
	tone?: "neutral" | "danger";
}) {
	return (
		<EmptyState
			mark={mark}
			title={title}
			description={description}
			tone={tone}
			className={className}
		>
			{children}
		</EmptyState>
	);
}

/** Buttons sized for state messages: primary accent fill, or the outlined secondary. */
export function stateButtonClass(variant: "primary" | "secondary" = "secondary") {
	return cn(
		"inline-flex h-7 items-center rounded-[6px] px-3 font-medium text-[13px] transition-colors disabled:opacity-50",
		variant === "primary"
			? "bg-[var(--rx-accent)] text-white hover:opacity-90"
			: "border border-dashboard-border-strong text-dashboard-text-primary hover:bg-dashboard-hover",
	);
}
