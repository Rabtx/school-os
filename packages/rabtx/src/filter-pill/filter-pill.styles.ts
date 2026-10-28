/** Figma filter pill: a rounded outline holding a dim label, a rule, then the control. */
export const filterPillParts = {
	root: "flex h-7 w-full items-center overflow-hidden rounded-full border border-(--rx-border-strong) bg-(--rx-surface) text-[13px] tracking-[-0.15px] sm:w-auto",
	label:
		"flex h-full shrink-0 items-center border-e border-(--rx-border) px-3 text-(--rx-text-tertiary)",
	/** For the control inside: a select or trigger with no border of its own. */
	control:
		"h-full min-w-[110px] rounded-none border-0 bg-transparent font-[510] text-[13px] text-(--rx-text) shadow-none",
};

/** A native select inside the pill, with room for its arrow. */
export const filterPillSelectClass = `${filterPillParts.control} appearance-none bg-no-repeat pe-7 ps-3 outline-none focus-visible:bg-(--rx-selected)`;
