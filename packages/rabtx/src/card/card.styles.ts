export type CardPadding = "sm" | "md" | "lg";

// Padding is one pixel less than Figma (12, 16, 20) because the 1px edge is a real border.
const paddings: Record<CardPadding, string> = {
	sm: "gap-2.5 p-[11px]",
	md: "gap-3 p-[15px]",
	lg: "gap-3 p-[19px]",
};

/** The whole look of a Card as Tailwind classes. React, Solid and plain HTML all use these. */
export function cardClass(padding: CardPadding = "md") {
	return `rx-surface rx-card flex flex-col rounded-(--rx-r-box) ${paddings[padding]}`;
}

/** Text styles for the inside of a card. Put them on any element, such as an `h3` or a `p`. */
export const cardParts = {
	title: "text-[13px]/5 font-[510] tracking-[-0.15px] text-(--rx-text)",
	description: "text-[13px]/5 tracking-[-0.15px] text-(--rx-text-secondary)",
	meta: "text-xs/4 tracking-[-0.15px] text-(--rx-text-tertiary)",
};
