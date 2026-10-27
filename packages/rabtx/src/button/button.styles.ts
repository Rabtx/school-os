export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "2xl";

/** The whole look of a Button as Tailwind classes. React, Solid and plain HTML all use these. */
const base =
	"group rx-control relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-(--rx-r-btn) font-[510] tracking-[-0.15px] [--icon:16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rx-focus)";

const variants: Record<ButtonVariant, string> = {
	primary: "rx-primary",
	secondary: "rx-secondary",
	ghost: "rx-ghost",
	accent: "rx-accent",
	danger: "rx-danger",
};

// Padding is one pixel less than the Figma value because the 1px edge is a real border.
const sizes: Record<ButtonSize, string> = {
	sm: "h-6 gap-1 px-[7px] text-xs/4 rounded-(--rx-r-btn-sm)",
	md: "h-7 gap-1.5 px-[9px] text-[13px]/5",
	lg: "h-9 gap-1.5 px-[11px] text-sm/5",
	xl: "h-11 gap-2 px-[15px] text-sm/5 [--rx-press:0.95]",
	"2xl": "h-12 gap-2 px-[19px] text-sm/5 [--icon:20px] [--rx-press:0.95]",
};

type ButtonStyle = { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean };

export function buttonClass({ variant = "primary", size = "md", iconOnly }: ButtonStyle = {}) {
	return `${base} ${variants[variant]} ${sizes[size]}${iconOnly ? " aspect-square px-0!" : ""}`;
}

/** Classes for the parts inside a Button. Loading cross-fades the content to the spinner. */
export const buttonParts = {
	content:
		"inline-flex min-w-0 items-center justify-center gap-[inherit] transition-[opacity,filter,scale] duration-300 ease-(--rx-ease-swap) group-data-loading:scale-96 group-data-loading:opacity-0 group-data-loading:blur-xs",
	icon: "inline-flex size-(--icon) shrink-0 [&>svg]:size-full",
	label: "truncate",
	spinner:
		"pointer-events-none absolute inset-0 m-auto size-(--icon) scale-25 animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-0 blur-xs transition-[opacity,filter,scale] duration-300 ease-(--rx-ease-swap) [animation-play-state:paused] group-data-loading:scale-100 group-data-loading:opacity-100 group-data-loading:blur-none group-data-loading:[animation-play-state:running]",
};
