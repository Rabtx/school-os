export type AvatarTone = "neutral" | "accent" | "success";
export type AvatarSize = "sm" | "md" | "lg";

const tones: Record<AvatarTone, string> = {
	neutral: "bg-(--rx-selected) text-(--rx-text-secondary)",
	accent: "bg-[color-mix(in_oklab,var(--rx-accent)_22%,transparent)] text-(--rx-accent)",
	success: "bg-[color-mix(in_oklab,var(--rx-success)_22%,transparent)] text-(--rx-success)",
};

// 24px in table rows, 32px in panel headers, 56px on profiles.
const sizes: Record<AvatarSize, string> = {
	sm: "size-6 text-[11px]",
	md: "size-8 text-xs",
	lg: "size-14 text-xl",
};

/** The whole look of an Avatar as Tailwind classes. React, Solid and plain HTML all use these. */
export function avatarClass(tone: AvatarTone = "neutral", size: AvatarSize = "sm") {
	return `inline-flex shrink-0 items-center justify-center rounded-full font-[510] ${sizes[size]} ${tones[tone]}`;
}

/** Up to two initials from a name: "Ali Hassan" reads "AH", an empty name reads "?". */
export function initials(name: string): string {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "?"
	);
}
