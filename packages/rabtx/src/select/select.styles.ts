export type SelectSize = "sm" | "md" | "lg";

const heights: Record<SelectSize, string> = { sm: "h-7", md: "h-8", lg: "h-9" };

/** The field that draws the edge. The native select covers all of it, so the whole box is clickable. */
export function selectClass(size: SelectSize = "md") {
	return `rx-control rx-field relative flex w-full items-center rounded-(--rx-r-ctl) text-[13px]/5 [--icon:16px] ${heights[size]}`;
}

/**
 * The native select. `rx-select` is the hook for the platform picker styles in `select.css`; where
 * the browser has no customizable select the OS list is used and everything else still applies.
 * Padding leaves room for the icons, which sit on top and ignore the pointer.
 */
export function selectFieldClass(leadingIcon?: boolean) {
	return `rx-select absolute inset-0 flex size-full cursor-pointer appearance-none items-center bg-transparent pr-[33px] outline-none disabled:cursor-not-allowed has-[option[value='']:checked]:text-(--rx-text-tertiary) ${leadingIcon ? "pl-[33px]" : "pl-[9px]"}`;
}

export const selectParts = {
	icon: "pointer-events-none absolute top-1/2 inline-flex size-(--icon) -translate-y-1/2 text-(--rx-text-tertiary) [&>svg]:size-full",
	leading: "left-[9px]",
	trailing: "right-[9px]",
};
