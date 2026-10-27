import { cn } from "@/lib/utils";

const tones = {
	accent: "bg-[color-mix(in_oklab,var(--rx-accent)_22%,transparent)] text-[var(--rx-accent)]",
	success: "bg-[color-mix(in_oklab,var(--rx-success)_22%,transparent)] text-[var(--rx-success)]",
	neutral: "bg-dashboard-hover text-dashboard-text-secondary",
};

type Props = {
	name: string;
	tone?: keyof typeof tones;
	className?: string;
};

export function nameInitials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}

/** Figma 20–24px round initials avatar used in table rows and lists. */
export function InitialsAvatar({ name, tone = "neutral", className }: Props) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-flex size-6 shrink-0 items-center justify-center rounded-full font-medium text-[11px]",
				tones[tone],
				className,
			)}
		>
			{nameInitials(name)}
		</span>
	);
}
