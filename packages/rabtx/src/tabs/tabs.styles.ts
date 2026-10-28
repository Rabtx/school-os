/** The row the tabs sit in: 44px tall with a bottom rule the active underline overlaps. */
export const tabsClass =
	"flex h-11 shrink-0 items-end gap-4 overflow-x-auto border-b border-(--rx-border) px-4 sm:px-6";

/** One tab. The active one takes the accent underline and ink. */
export function tabClass(active: boolean) {
	return `-mb-px flex h-9 shrink-0 items-center border-b-2 text-[13px] tracking-[-0.15px] transition-colors ${
		active
			? "border-(--rx-accent) font-[510] text-(--rx-accent)"
			: "border-transparent text-(--rx-text-secondary) hover:text-(--rx-text)"
	}`;
}
