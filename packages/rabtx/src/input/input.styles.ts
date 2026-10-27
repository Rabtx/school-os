export type InputSize = "sm" | "md" | "lg" | "xl" | "2xl";

/** The whole look of an Input as Tailwind classes. The border and fill live on the wrapper. */
const base = "rx-control rx-field flex w-full items-center [--icon:16px]";

// Padding is one pixel less than Figma because the 1px edge is a real border. Pill pads more.
const sizes: Record<InputSize, { box: string; px: string; pillPx: string }> = {
	sm: { box: "h-7 gap-2 text-[13px]/5", px: "px-[9px]", pillPx: "px-[11px]" },
	md: { box: "h-8 gap-2 text-[13px]/5", px: "px-[9px]", pillPx: "px-[11px]" },
	lg: { box: "h-9 gap-2 text-sm/5", px: "px-[11px]", pillPx: "px-[15px]" },
	xl: { box: "h-11 gap-2 text-sm/5", px: "px-[15px]", pillPx: "px-[19px]" },
	"2xl": { box: "h-12 gap-2.5 text-sm/5 [--icon:20px]", px: "px-[15px]", pillPx: "px-[19px]" },
};

type InputStyle = { size?: InputSize; pill?: boolean };

export function inputClass({ size = "md", pill }: InputStyle = {}) {
	const { box, px, pillPx } = sizes[size];
	return `${base} ${box} ${pill ? `${pillPx} rounded-full` : `${px} rounded-(--rx-r-ctl)`}`;
}

/** Classes for the parts inside an Input. */
export const inputParts = {
	field:
		"min-w-0 flex-1 bg-transparent outline-none placeholder:text-(--rx-text-tertiary) disabled:placeholder:text-(--rx-text-disabled)",
	icon: "inline-flex size-(--icon) shrink-0 text-(--rx-text-tertiary) [&>svg]:size-full",
};
