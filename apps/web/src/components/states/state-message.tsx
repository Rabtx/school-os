import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The centred message used by the Figma states (`208:93911`): a round mark (a count, "!", an
 * icon), a title, one line of explanation and the actions that get the person unstuck.
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
		<div
			role={tone === "danger" ? "alert" : "status"}
			className={cn(
				"mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center tracking-[-0.15px]",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"mb-3 flex size-14 items-center justify-center rounded-full bg-dashboard-hover font-medium text-[20px]",
					tone === "danger" ? "text-[var(--rx-danger)]" : "text-dashboard-text-secondary",
				)}
			>
				{mark}
			</span>
			<h2 className="font-medium text-[22px] text-dashboard-text-primary leading-7">{title}</h2>
			{description ? (
				<p className="mt-2 text-[13px] text-dashboard-text-secondary leading-5">{description}</p>
			) : null}
			{children ? (
				<div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>
			) : null}
		</div>
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
